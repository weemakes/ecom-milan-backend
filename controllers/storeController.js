import { query } from '../config/db.js';

/**
 * @desc    Fetch active categories for public website navigation menu
 * @route   GET /api/store/categories
 * @access  Public (No authentication required)
 */
export const getStorefrontCategories = async (req, res, next) => {
  try {
    const sql = `
      SELECT id, name, parent_id, image 
      FROM categories 
      WHERE is_active = true 
      ORDER BY name ASC;
    `;
    const result = await query(sql);

    return res.status(200).json({
      status: 'success',
      count: result.rows.length,
      data: result.rows
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Public storefront: fetch active approved products mixed and sorted by curation score
 * @route   GET /api/store/products?category_id=xxx&search=xxx
 * @access  Public (No authentication required)
 * @note    CRITICAL: Only returns platform_selling_price (aliased as price). Strictly hides vendor_purchase_cost & vendor_expected_profit!
 */
export const getLiveStorefrontProducts = async (req, res, next) => {
  try {
    const { category_id, search } = req.query;

    let sql = `
      SELECT 
        p.id, p.name, p.description, 
        p.platform_selling_price AS price,
        p.enhanced_images AS images,
        p.variants,
        c.name AS category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.status = 'APPROVED'
    `;

    const params = [];
    let paramIdx = 1;

    if (category_id) {
      sql += ` AND p.category_id = $${paramIdx++}`;
      params.push(category_id);
    }

    if (search) {
      sql += ` AND (p.name ILIKE $${paramIdx} OR p.description ILIKE $${paramIdx})`;
      params.push(`%${search}%`);
      paramIdx++;
    }

    // Sort by curation_score DESC to mix best items from multiple vendors to the top
    sql += ` ORDER BY p.curation_score DESC, p.created_at DESC;`;

    const result = await query(sql, params);

    return res.status(200).json({
      status: 'success',
      count: result.rows.length,
      data: result.rows
    });
  } catch (err) {
    next(err);
  }
};


/**
 * @desc    Create a customer order on the website and record items per vendor
 * @route   POST /api/store/orders
 * @access  Public / Customer Auth
 */
export const createCustomerOrder = async (req, res, next) => {
  try {
    const { customer_id, items } = req.body;
    // items format: [{ product_id, qty, variant }]

    if (!items || items.length === 0) {
      return res.status(400).json({ status: 'error', message: 'Cart is empty' });
    }

    let totalOrderAmount = 0;
    const itemDetails = [];

    // Calculate exact pricing from DB to prevent frontend price manipulation
    for (const item of items) {
      const prodRes = await query(`SELECT id, shop_id, name, platform_selling_price, vendor_payout_price FROM products WHERE id = $1`, [item.product_id]);
      if (prodRes.rows.length === 0) {
        return res.status(400).json({ status: 'error', message: `Product ${item.product_id} not found` });
      }
      const prod = prodRes.rows[0];
      const sellingPrice = parseFloat(prod.platform_selling_price);
      const vendorPayout = parseFloat(prod.vendor_payout_price);
      const platformEarning = sellingPrice - vendorPayout;

      totalOrderAmount += sellingPrice * item.qty;
      itemDetails.push({
        ...item,
        shop_id: prod.shop_id,
        product_name: prod.name,
        selling_price: sellingPrice,
        vendor_payout_amount: vendorPayout,
        platform_earning: platformEarning
      });
    }

    // Insert order
    const orderRes = await query(
      `INSERT INTO orders (customer_id, status, total_amount) VALUES ($1, 'PENDING', $2) RETURNING *`,
      [customer_id || null, totalOrderAmount]
    );
    const order = orderRes.rows[0];

    // Insert order items
    for (const detail of itemDetails) {
      await query(
        `INSERT INTO order_items (order_id, product_id, shop_id, product_name, variant, qty, selling_price, vendor_payout_amount, platform_earning)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          order.id, detail.product_id, detail.shop_id, detail.product_name,
          JSON.stringify(detail.variant || {}), detail.qty,
          detail.selling_price, detail.vendor_payout_amount, detail.platform_earning
        ]
      );
    }

    return res.status(201).json({
      status: 'success',
      message: 'Order placed successfully',
      data: {
        order_id: order.id,
        total_amount: totalOrderAmount
      }
    });
  } catch (err) {
    next(err);
  }
};
