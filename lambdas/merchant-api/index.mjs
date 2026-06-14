import pkg from 'pg';
const { Client } = pkg;

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET,POST,PATCH,OPTIONS",
  "Content-Type": "application/json"
};

const getClient = () => new Client({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: 5432,
  ssl: { rejectUnauthorized: false }
});

const ok = (data) => ({ statusCode: 200, headers, body: JSON.stringify(data) });
const created = (data) => ({ statusCode: 201, headers, body: JSON.stringify(data) });
const notFound = (msg) => ({ statusCode: 404, headers, body: JSON.stringify({ error: msg }) });
const badRequest = (msg) => ({ statusCode: 400, headers, body: JSON.stringify({ error: msg }) });
const serverError = (err) => ({ statusCode: 500, headers, body: JSON.stringify({ error: err.message }) });

export const handler = async (event) => {

  // CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const method = event.httpMethod;
  const path = event.path;
  const pathParts = path.split('/').filter(Boolean);

  const client = getClient();
  await client.connect();

  try {

    // ── GET /merchant/delivery-companies ──────────────────────────────────
    if (method === 'GET' && path.endsWith('/delivery-companies')) {
      const result = await client.query(
        `SELECT id, name, contact_email, contact_phone
         FROM delivery_companies
         ORDER BY name ASC`
      );
      return ok(result.rows);
    }

    // ── GET /merchant/shipments ───────────────────────────────────────────
    if (method === 'GET' && path.endsWith('/shipments')) {
      const merchantId = event.queryStringParameters?.merchant_id;
      if (!merchantId) return badRequest('merchant_id query parameter required');

      const result = await client.query(
        `SELECT 
          s.id,
          s.order_reference,
          s.item_description,
          s.item_value,
          s.item_category,
          s.customer_name,
          s.customer_email,
          s.customer_city,
          s.customer_postcode,
          s.status,
          s.tracking_number,
          s.certi_label_id,
          s.created_at,
          s.dispatched_at,
          s.delivered_at,
          s.failed_at,
          dc.name AS delivery_company_name,
          c.id AS claim_id,
          c.status AS claim_status,
          d.outcome AS claim_outcome,
          d.confidence_score
         FROM shipments s
         LEFT JOIN delivery_companies dc ON s.delivery_company_id = dc.id
         LEFT JOIN claims c ON c.shipment_id = s.id
         LEFT JOIN decisions d ON d.claim_id = c.id
         WHERE s.merchant_id = $1
         ORDER BY s.created_at DESC`,
        [merchantId]
      );
      return ok(result.rows);
    }

    // ── GET /merchant/shipments/:id ───────────────────────────────────────
    if (method === 'GET' && pathParts.includes('shipments') && pathParts.length >= 3) {
      const shipmentId = pathParts[pathParts.indexOf('shipments') + 1];

      const shipResult = await client.query(
        `SELECT 
          s.*,
          dc.name AS delivery_company_name,
          dc.contact_email AS delivery_company_email,
          dc.contact_phone AS delivery_company_phone
         FROM shipments s
         LEFT JOIN delivery_companies dc ON s.delivery_company_id = dc.id
         WHERE s.id = $1`,
        [shipmentId]
      );

      if (shipResult.rows.length === 0) return notFound('Shipment not found');

      const shipment = shipResult.rows[0];

      // Get claim and decision if exists
      const claimResult = await client.query(
        `SELECT c.*, d.outcome, d.confidence_score, d.decision_report, d.evidence_breakdown
         FROM claims c
         LEFT JOIN decisions d ON d.claim_id = c.id
         WHERE c.shipment_id = $1
         ORDER BY c.created_at DESC
         LIMIT 1`,
        [shipmentId]
      );

      // Get sensor events
      const sensorResult = await client.query(
        `SELECT * FROM sensor_events
         WHERE shipment_id = $1
         ORDER BY event_time ASC`,
        [shipmentId]
      );

      return ok({
        ...shipment,
        claim: claimResult.rows[0] || null,
        sensor_events: sensorResult.rows
      });
    }

    // ── POST /merchant/shipments ──────────────────────────────────────────
    if (method === 'POST' && path.endsWith('/shipments')) {
      const body = JSON.parse(event.body || '{}');

      const {
        merchant_id,
        delivery_company_id,
        item_description,
        item_value,
        item_category = 'Jewellery',
        customer_name,
        customer_email,
        customer_address_line_1,
        customer_address_line_2,
        customer_city,
        customer_postcode,
        customer_country = 'United Kingdom',
        tracking_number
      } = body;

      if (!merchant_id || !item_description || !item_value || !customer_name) {
        return badRequest('merchant_id, item_description, item_value and customer_name are required');
      }

      // Generate order reference
      const orderRef = `ORD-${Date.now().toString(36).toUpperCase()}`;

      const result = await client.query(
        `INSERT INTO shipments (
          order_reference, merchant_id, delivery_company_id,
          item_description, item_value, item_category,
          customer_name, customer_email,
          customer_address_line_1, customer_address_line_2,
          customer_city, customer_postcode, customer_country,
          tracking_number, status
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'created')
         RETURNING *`,
        [
          orderRef, merchant_id, delivery_company_id || null,
          item_description, item_value, item_category,
          customer_name, customer_email || null,
          customer_address_line_1 || null, customer_address_line_2 || null,
          customer_city || null, customer_postcode || null, customer_country,
          tracking_number || null
        ]
      );

      return created(result.rows[0]);
    }

    // ── PATCH /merchant/shipments/:id/status ──────────────────────────────
    if (method === 'PATCH' && path.includes('/status')) {
      const shipmentId = pathParts[pathParts.indexOf('shipments') + 1];
      const body = JSON.parse(event.body || '{}');
      const { status } = body;

      const validStatuses = ['created', 'in_transit', 'delivered', 'failed', 'claimed'];
      if (!validStatuses.includes(status)) {
        return badRequest(`status must be one of: ${validStatuses.join(', ')}`);
      }

      const timestampField = {
        'in_transit': 'dispatched_at',
        'delivered': 'delivered_at',
        'failed': 'failed_at'
      }[status];

      const result = await client.query(
        `UPDATE shipments 
         SET status = $1 ${timestampField ? `, ${timestampField} = NOW()` : ''}
         WHERE id = $2
         RETURNING *`,
        [status, shipmentId]
      );

      if (result.rows.length === 0) return notFound('Shipment not found');
      return ok(result.rows[0]);
    }

    // ── POST /merchant/claims ─────────────────────────────────────────────
    if (method === 'POST' && path.endsWith('/claims')) {
      const body = JSON.parse(event.body || '{}');
      const { shipment_id, claimant_email, claim_type, description } = body;

      if (!shipment_id || !claimant_email || !claim_type || !description) {
        return badRequest('shipment_id, claimant_email, claim_type and description are required');
      }

      // Check shipment exists and is in a claimable state
      const shipCheck = await client.query(
        `SELECT id, status FROM shipments WHERE id = $1`,
        [shipment_id]
      );

      if (shipCheck.rows.length === 0) return notFound('Shipment not found');
      if (!['failed', 'in_transit', 'delivered'].includes(shipCheck.rows[0].status)) {
        return badRequest('Shipment is not in a claimable status');
      }

      // Insert claim
      const result = await client.query(
        `INSERT INTO claims (shipment_id, claimant_email, claim_type, description, status)
         VALUES ($1, $2, $3, $4, 'pending')
         RETURNING *`,
        [shipment_id, claimant_email, claim_type, description]
      );

      const claim = result.rows[0];

      // Update shipment status to claimed
      await client.query(
        `UPDATE shipments SET status = 'claimed' WHERE id = $1`,
        [shipment_id]
      );

      // Push to SQS for AI processing
      const { SQSClient, SendMessageCommand } = await import('@aws-sdk/client-sqs');
      const sqs = new SQSClient({ region: 'eu-west-2' });
      await sqs.send(new SendMessageCommand({
        QueueUrl: process.env.SQS_QUEUE_URL,
        MessageBody: JSON.stringify({ claim_id: claim.id, claim })
      }));

      return created({
        message: 'Claim filed and queued for AI processing',
        claim_id: claim.id,
        claim
      });
    }

    // ── GET /merchant/claims ──────────────────────────────────────────────
    if (method === 'GET' && path.endsWith('/claims')) {
      const merchantId = event.queryStringParameters?.merchant_id;
      if (!merchantId) return badRequest('merchant_id query parameter required');

      const result = await client.query(
        `SELECT 
          c.id, c.claim_type, c.description, c.status, c.created_at,
          s.order_reference, s.item_description, s.item_value,
          d.outcome, d.confidence_score, d.decision_report
         FROM claims c
         JOIN shipments s ON s.id = c.shipment_id
         LEFT JOIN decisions d ON d.claim_id = c.id
         WHERE s.merchant_id = $1
         ORDER BY c.created_at DESC`,
        [merchantId]
      );
      return ok(result.rows);
    }

    return notFound('Route not found');

  } catch (err) {
    console.error(err);
    return serverError(err);
  } finally {
    await client.end();
  }
};
