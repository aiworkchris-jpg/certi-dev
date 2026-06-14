import pkg from 'pg';
import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

const { Client } = pkg;
const bedrock = new BedrockRuntimeClient({ region: "eu-west-2" });
const ses = new SESClient({ region: "eu-west-2" });

export const handler = async (event) => {
  const client = new Client({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: 5432,
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();

  for (const record of event.Records) {
    const { claim_id, claim } = JSON.parse(record.body);

    const prompt = `You are CERTI's AI claims decision engine for logistics insurance.

Analyse this claim and make a decision.

CLAIM DATA:
- Claim ID: ${claim.id}
- Claim Type: ${claim.claim_type}
- Claimant Email: ${claim.claimant_email}
- Description: ${claim.description}
- Status: ${claim.status}
- Filed At: ${claim.created_at}
- Damage Detected by Vision AI: ${claim.damage_detected ?? 'Not yet assessed'}
- Evidence Image: ${claim.evidence_image_url ?? 'None provided'}

Respond ONLY with a JSON object in this exact format:
{
  "outcome": "APPROVED" or "REJECTED" or "ESCALATED",
  "confidence_score": 0-100,
  "decision_report": "A clear, professional 2-3 sentence explanation of the decision suitable for the claimant",
  "evidence_breakdown": {
    "claim_type_assessment": "your assessment",
    "description_assessment": "your assessment",
    "damage_evidence_assessment": "your assessment",
    "fraud_indicators": "any concerns or none detected",
    "key_factors": "main factors driving the decision"
  }
}`;

    const response = await bedrock.send(new InvokeModelCommand({
      modelId: "eu.anthropic.claude-haiku-4-5-20251001-v1:0",
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify({
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: 1000,
        messages: [{ role: "user", content: prompt }]
      })
    }));

    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    const rawText = responseBody.content[0].text;
    const cleaned = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const decision = JSON.parse(cleaned);

    await client.query(
      `INSERT INTO decisions (claim_id, outcome, confidence_score, decision_report, evidence_breakdown)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        claim_id,
        decision.outcome,
        decision.confidence_score,
        decision.decision_report,
        JSON.stringify(decision.evidence_breakdown)
      ]
    );

    await client.query(
      `UPDATE claims SET status = $1 WHERE id = $2`,
      [decision.outcome.toLowerCase(), claim_id]
    );

    const outcomeColor = decision.outcome === 'APPROVED' ? '#22c55e' : 
                         decision.outcome === 'REJECTED' ? '#ef4444' : '#f59e0b';

    await ses.send(new SendEmailCommand({
      Source: process.env.SES_FROM_EMAIL,
      Destination: { ToAddresses: [process.env.SES_TO_EMAIL] },
      Message: {
        Subject: { Data: `CERTI Claim Decision: ${decision.outcome} — Claim ${claim_id.slice(0,8)}` },
        Body: {
          Html: {
            Data: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: #0f172a; padding: 24px; border-radius: 8px 8px 0 0;">
                  <h1 style="color: white; margin: 0; font-size: 24px;">CERTI</h1>
                  <p style="color: #94a3b8; margin: 4px 0 0;">Autonomous Claims Resolution</p>
                </div>
                <div style="border: 1px solid #e2e8f0; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
                  <div style="background: ${outcomeColor}20; border-left: 4px solid ${outcomeColor}; padding: 16px; margin-bottom: 24px; border-radius: 4px;">
                    <h2 style="color: ${outcomeColor}; margin: 0 0 4px;">Decision: ${decision.outcome}</h2>
                    <p style="color: #64748b; margin: 0;">Confidence Score: ${decision.confidence_score}%</p>
                  </div>
                  <h3>Claim Details</h3>
                  <p><strong>Claim ID:</strong> ${claim_id}</p>
                  <p><strong>Type:</strong> ${claim.claim_type}</p>
                  <p><strong>Description:</strong> ${claim.description}</p>
                  <h3>Decision Report</h3>
                  <p>${decision.decision_report}</p>
                  <h3>Evidence Breakdown</h3>
                  <p><strong>Claim Assessment:</strong> ${decision.evidence_breakdown.claim_type_assessment}</p>
                  <p><strong>Description Assessment:</strong> ${decision.evidence_breakdown.description_assessment}</p>
                  <p><strong>Fraud Indicators:</strong> ${decision.evidence_breakdown.fraud_indicators}</p>
                  <p><strong>Key Factors:</strong> ${decision.evidence_breakdown.key_factors}</p>
                  <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
                  <p style="color: #94a3b8; font-size: 12px;">This decision was made autonomously by CERTI's AI engine. Claim processed at ${new Date().toISOString()}</p>
                </div>
              </div>
            `
          }
        }
      }
    }));

    console.log(`Decision made for claim ${claim_id}: ${decision.outcome} (${decision.confidence_score}% confidence) — email sent`);
  }

  await client.end();
  return { statusCode: 200, body: "Decisions processed" };
};