import pkg from 'pg';
const { Client } = pkg;

export const handler = async () => {
  const client = new Client({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: 5432,
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();

  try {
    console.log('Running CERTI schema migration...');

    // ── merchants ──────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS merchants (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name        VARCHAR(255) NOT NULL,
        email       VARCHAR(255) NOT NULL UNIQUE,
        phone       VARCHAR(50),
        address_line_1  VARCHAR(255),
        address_line_2  VARCHAR(255),
        city        VARCHAR(100),
        postcode    VARCHAR(20),
        country     VARCHAR(100) DEFAULT 'United Kingdom',
        created_at  TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('✅ merchants table ready');

    // ── delivery_companies ─────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS delivery_companies (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name        VARCHAR(255) NOT NULL,
        contact_email   VARCHAR(255),
        contact_phone   VARCHAR(50),
        created_at  TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('✅ delivery_companies table ready');

    // ── shipments ──────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS shipments (
        id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_reference     VARCHAR(100) NOT NULL,
        merchant_id         UUID NOT NULL REFERENCES merchants(id),
        delivery_company_id UUID REFERENCES delivery_companies(id),
        
        -- Item details
        item_description    VARCHAR(500) NOT NULL,
        item_value          NUMERIC(10,2) NOT NULL,
        item_category       VARCHAR(100) DEFAULT 'Jewellery',
        
        -- Customer details
        customer_name       VARCHAR(255) NOT NULL,
        customer_email      VARCHAR(255),
        customer_address_line_1  VARCHAR(255),
        customer_address_line_2  VARCHAR(255),
        customer_city       VARCHAR(100),
        customer_postcode   VARCHAR(20),
        customer_country    VARCHAR(100) DEFAULT 'United Kingdom',
        
        -- Shipment tracking
        status              VARCHAR(50) DEFAULT 'created'
                            CHECK (status IN ('created','in_transit','delivered','failed','claimed')),
        certi_label_id      VARCHAR(100),
        tracking_number     VARCHAR(100),
        
        -- Timestamps
        created_at          TIMESTAMPTZ DEFAULT NOW(),
        dispatched_at       TIMESTAMPTZ,
        delivered_at        TIMESTAMPTZ,
        failed_at           TIMESTAMPTZ
      );
    `);
    console.log('✅ shipments table ready');

    // ── claims (extend existing) ───────────────────────────────────────────
    // Add shipment_id FK if not already a proper FK, and ensure status enum is consistent
    await client.query(`
      ALTER TABLE claims
        ADD COLUMN IF NOT EXISTS shipment_id_ref UUID REFERENCES shipments(id),
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
    `);
    console.log('✅ claims table extended');

    // ── decisions (extend existing) ───────────────────────────────────────
    await client.query(`
      ALTER TABLE decisions
        ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
        ADD COLUMN IF NOT EXISTS overridden_by VARCHAR(255),
        ADD COLUMN IF NOT EXISTS override_reason TEXT,
        ADD COLUMN IF NOT EXISTS overridden_at TIMESTAMPTZ;
    `);
    console.log('✅ decisions table extended');

    // ── sensor_events ──────────────────────────────────────────────────────
    // Ready for when Adam provides real CERTI label data
    await client.query(`
      CREATE TABLE IF NOT EXISTS sensor_events (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        shipment_id   UUID NOT NULL REFERENCES shipments(id),
        event_type    VARCHAR(100) NOT NULL,
        event_time    TIMESTAMPTZ NOT NULL,
        
        -- Motion
        shock_g       NUMERIC(8,4),
        tilt_degrees  NUMERIC(8,4),
        
        -- Location
        latitude      NUMERIC(10,6),
        longitude     NUMERIC(10,6),
        
        -- Environment
        temperature_c NUMERIC(6,2),
        humidity_pct  NUMERIC(5,2),
        
        -- NFC
        nfc_scan_location VARCHAR(255),
        
        -- Raw data store for anything else
        raw_data      JSONB,
        
        created_at    TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('✅ sensor_events table ready');

    // ── seed data: demo merchant & delivery companies ──────────────────────
    await client.query(`
      INSERT INTO merchants (name, email, phone, address_line_1, city, postcode)
      VALUES ('Goldsmith & Co', 'orders@goldsmithandco.co.uk', '020 7123 4567',
              '42 Bond Street', 'London', 'W1S 1RB')
      ON CONFLICT (email) DO NOTHING;
    `);

    await client.query(`
      INSERT INTO delivery_companies (name, contact_email, contact_phone)
      VALUES 
        ('Brinks', 'secure@brinks.com', '0800 100 200'),
        ('Malca-Amit', 'london@malca-amit.com', '020 7123 9999'),
        ('DHL Express', 'business@dhl.co.uk', '0844 248 0844')
      ON CONFLICT DO NOTHING;
    `);
    console.log('✅ Seed data inserted');

    console.log('🎉 Migration complete');
    return { statusCode: 200, body: 'Migration complete' };

  } catch (err) {
    console.error('Migration failed:', err);
    throw err;
  } finally {
    await client.end();
  }
};