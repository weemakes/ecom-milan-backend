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

let isConnectedLogged = false;
pool.on('connect', () => {
  if (!isConnectedLogged) {
    console.log('Connected to PostgreSQL database');
    isConnectedLogged = true;
  }
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  // process.exit(-1);
});

export const query = (text, params) => pool.query(text, params);
export default pool;
