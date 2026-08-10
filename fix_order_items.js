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
    await pool.query(`ALTER TABLE order_items DROP CONSTRAINT IF EXISTS order_items_shop_id_fkey;`);
    
    // Check if constraint exists before adding
    try {
        await pool.query(`ALTER TABLE order_items ADD CONSTRAINT order_items_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES vendors(id) ON DELETE SET NULL;`);
        console.log("Shop ID Foreign key updated!");
    } catch(e) {
        console.log("Constraint error:", e.message);
    }
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}

run();
