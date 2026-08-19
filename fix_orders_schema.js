import pkg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pkg;
const sslOption = process.env.PG_SSL === 'true' ? { rejectUnauthorized: false } : false;

const pool = new Pool({
  host: process.env.PG_HOST || 'localhost',
  port: process.env.PG_PORT || 5432,
  user: process.env.PG_USER || 'postgres',
  password: process.env.PG_PASSWORD || 'inframe123',
  database: process.env.PG_DATABASE || 'ecom_db',
  ...(sslOption ? { ssl: sslOption } : {}),
});

async function run() {
  try {
    // 1. Add missing columns to orders table
    const alterOrdersQueries = [
      `ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_number VARCHAR(50);`,
      `ALTER TABLE orders ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;`,
      `ALTER TABLE orders ADD COLUMN IF NOT EXISTS vendor_id UUID;`,
      `ALTER TABLE orders ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]'::jsonb;`,
      `ALTER TABLE orders ADD COLUMN IF NOT EXISTS subtotal DECIMAL(12, 2) DEFAULT 0;`,
      `ALTER TABLE orders ADD COLUMN IF NOT EXISTS total_discount DECIMAL(12, 2) DEFAULT 0;`,
      `ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_charge DECIMAL(12, 2) DEFAULT 0;`,
      `ALTER TABLE orders ADD COLUMN IF NOT EXISTS grand_total DECIMAL(12, 2) DEFAULT 0;`,
      `ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_address JSONB;`,
      `ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50);`
    ];

    for (const q of alterOrdersQueries) {
      await pool.query(q);
    }
    
    // 2. Create payments table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
        payment_method VARCHAR(50),
        payment_status VARCHAR(50) DEFAULT 'PENDING',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    console.log("Orders schema fixed!");
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}

run();
