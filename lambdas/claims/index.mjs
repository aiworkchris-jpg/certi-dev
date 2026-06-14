import pkg from 'pg';
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";

const { Client } = pkg;
const sqs = new SQSClient({ region: "eu-west-2" });

export const handler = async (event) => {

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST,OPTIONS"
      },
      body: ''
    };
  }

  const client = new Client({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: 5432,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    
    const body = JSON.parse(event.body || '{}');
    
    const result = await client.query(
      `INSERT INTO claims (shipment_id, claimant_email, claim_type, description)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [body.shipment_id || null, body.claimant_email, body.claim_type, body.description]
    );
    
    const claim = result.rows[0];
    await client.end();

    await sqs.send(new SendMessageCommand({
      QueueUrl: process.env.SQS_QUEUE_URL,
      MessageBody: JSON.stringify({ claim_id: claim.id, claim })
    }));

    return {
      statusCode: 201,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST,OPTIONS"
      },
      body: JSON.stringify({ 
        message: "Claim received and queued for processing",
        claim_id: claim.id
      })
    };
  } catch (err) {
    await client.end();
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*"
      },
      body: JSON.stringify({ error: err.message })
    };
  }
};