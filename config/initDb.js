import { query } from './db.js';

export const initDb = async () => {
  try {
    console.log('Initializing PostgreSQL Database Schema...');

    // Enable UUID extension
    await query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`);

    // 1. Users Table
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        phone VARCHAR(50) UNIQUE,
        password_hash TEXT NOT NULL,
        role VARCHAR(50) NOT NULL, -- 'VENDOR', 'CMS_ADMIN', 'CUSTOMER'
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Shops Table (For Vendors)
    await query(`
      CREATE TABLE IF NOT EXISTS shops (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
        shop_name VARCHAR(255) NOT NULL,
        address TEXT,
        logo TEXT,
        status VARCHAR(50) DEFAULT 'ACTIVE',
        pending_payout DECIMAL(12,2) DEFAULT 0.00,
        bank_account JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 3. Categories Table (Only created/managed by CMS Admin)
    await query(`
      CREATE TABLE IF NOT EXISTS categories (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
        image TEXT,
        is_active BOOLEAN DEFAULT true
      );
    `);

    // 4. Products Table with Readable Pricing Columns
    await query(`
      CREATE TABLE IF NOT EXISTS products (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
        category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        
        -- Readable Pricing Columns as requested:
        vendor_purchase_cost DECIMAL(12, 2) NOT NULL,     -- Vendor ko kitne me padi (Base Cost)
        vendor_expected_profit DECIMAL(12, 2) NOT NULL,   -- Vendor ka profit margin
        vendor_payout_price DECIMAL(12, 2) GENERATED ALWAYS AS (vendor_purchase_cost + vendor_expected_profit) STORED, -- Total vendor payout per sale
        platform_selling_price DECIMAL(12, 2) DEFAULT 0.00, -- Website par customer ko dikhne wali price (Set by CMS Team)
        
        -- Images separation:
        raw_images JSONB DEFAULT '[]'::jsonb,             -- Uploaded by vendor (unprofessional)
        enhanced_images JSONB DEFAULT '[]'::jsonb,        -- Professionally enhanced by CMS team
        
        variants JSONB DEFAULT '[]'::jsonb,
        status VARCHAR(50) DEFAULT 'PENDING_REVIEW',      -- 'PENDING_REVIEW', 'APPROVED', 'REJECTED'
        curation_score INT DEFAULT 0,                     -- To mix & show best products at top
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 5. Orders Table (Customer Parent Order)
    await query(`
      CREATE TABLE IF NOT EXISTS orders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        customer_id UUID REFERENCES users(id) ON DELETE SET NULL,
        status VARCHAR(50) DEFAULT 'PENDING',
        total_amount DECIMAL(12, 2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 6. Order Items Table (Split per vendor/product)
    await query(`
      CREATE TABLE IF NOT EXISTS order_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
        product_id UUID REFERENCES products(id) ON DELETE SET NULL,
        shop_id UUID REFERENCES shops(id) ON DELETE SET NULL,
        product_name VARCHAR(255),
        variant JSONB,
        qty INT NOT NULL DEFAULT 1,
        selling_price DECIMAL(12, 2) NOT NULL,            -- Charged from customer per item
        vendor_payout_amount DECIMAL(12, 2) NOT NULL,     -- Vendor gets this per item (vendor_payout_price)
        platform_earning DECIMAL(12, 2) NOT NULL,         -- Platform profit per item
        fulfillment_status VARCHAR(50) DEFAULT 'PENDING'
      );
    `);

    // 7. Customer Payments Table
    await query(`
      CREATE TABLE IF NOT EXISTS customer_payments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        amount DECIMAL(12, 2) NOT NULL,
        method VARCHAR(50),
        status VARCHAR(50) DEFAULT 'PENDING',
        txn_id VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 8. Shop Payouts Table
    await query(`
      CREATE TABLE IF NOT EXISTS shop_payouts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
        period_from DATE,
        period_to DATE,
        gross_amount DECIMAL(12, 2) NOT NULL,
        platform_cut DECIMAL(12, 2) DEFAULT 0.00,
        net_amount DECIMAL(12, 2) NOT NULL,
        status VARCHAR(50) DEFAULT 'PENDING',
        txn_reference VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 9. Delivery Assignments Table
    await query(`
      CREATE TABLE IF NOT EXISTS delivery_assignments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
        delivery_boy_id UUID REFERENCES users(id) ON DELETE SET NULL,
        status VARCHAR(50) DEFAULT 'ASSIGNED',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('Database Schema Initialized Successfully!');
  } catch (error) {
    console.error('Error initializing database schema:', error);
  }
};