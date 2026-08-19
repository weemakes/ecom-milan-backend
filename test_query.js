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
    const res = await pool.query('SELECT id FROM users LIMIT 1');
    console.log('User ID:', res.rows[0]?.id);
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}

run();
