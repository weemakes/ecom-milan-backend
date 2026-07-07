import { query } from '../config/db.js';

// Vendor uploads a new product into existing categories
export const uploadVendorProduct = async (req, res, next) => {
  try {
    const { shop_id, category_id, name, description, vendor_purchase_cost, vendor_expected_profit, raw_images, variants } = req.body;

    // Validate inputs
    if (!shop_id || !category_id || !name || vendor_purchase_cost === undefined || vendor_expected_profit === undefined) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing required fields: shop_id, category_id, name, vendor_purchase_cost, vendor_expected_profit'
      });
    }

    // Insert product with PENDING_REVIEW status
    // Note: vendor_payout_price is generated automatically by PostgreSQL
    const sql = `
      INSERT INTO products (
        shop_id, category_id, name, description,
        vendor_purchase_cost, vendor_expected_profit,
        raw_images, variants, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'PENDING_REVIEW')
      RETURNING id, shop_id, category_id, name, description, vendor_purchase_cost, vendor_expected_profit, vendor_payout_price, raw_images, status, created_at;
    `;

    const values = [
      shop_id,
      category_id,
      name,
      description || '',
      vendor_purchase_cost,
      vendor_expected_profit,
      JSON.stringify(raw_images || []),
      JSON.stringify(variants || [])
    ];

    const result = await query(sql, values);

    return res.status(201).json({
      status: 'success',
      message: 'Product submitted successfully. Pending quality & pricing check by CMS team.',
      data: result.rows[0]
    });
  } catch (err) {
    next(err);
  }
};

// Vendor views their own uploaded products
// CRITICAL: Notice we DO NOT select platform_selling_price! Vendor must not know our selling price.
export const getVendorProducts = async (req, res, next) => {
  try {
    const { shop_id } = req.params;

    const sql = `
      SELECT 
        id, shop_id, category_id, name, description,
        vendor_purchase_cost, vendor_expected_profit, vendor_payout_price,
        raw_images, variants, status, created_at
      FROM products
      WHERE shop_id = $1
      ORDER BY created_at DESC;
    `;

    const result = await query(sql, [shop_id]);

    return res.status(200).json({
      status: 'success',
      count: result.rows.length,
      data: result.rows
    });
  } catch (err) {
    next(err);
  }
};

// Vendor gets categories available to choose from (Vendors cannot create categories)
export const getAvailableCategories = async (req, res, next) => {
  try {
    const sql = `SELECT id, name, parent_id, image FROM categories WHERE is_active = true ORDER BY name ASC;`;
    const result = await query(sql);

    return res.status(200).json({
      status: 'success',
      data: result.rows
    });
  } catch (err) {
    next(err);
  }
};
