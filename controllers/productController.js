import { query } from '../config/db.js';

// Helper function to handle common product queries
const fetchProducts = async (whereClause, params = [], reqLimit) => {
  // If the API receives a limit (e.g. ?limit=4), we use it. Otherwise, return all.
  const limitValue = parseInt(reqLimit, 10);
    const hasLimit = !isNaN(limitValue) && limitValue > 0;
  
  let sql = `
    SELECT 
      p.id, p.product_name, p.product_slug, p.description, 
      p.price, p.discounted_price, p.quantity_in_stock,
      p.sku, p.is_active, p.is_featured, p.created_at,
      p.images, p.variants,
      c.category_name, p.landing_section, p.featured_type, p.occasion
    FROM product_details p
    LEFT JOIN product_categories c ON p.category_id = c.id
    WHERE p.is_active = true ${whereClause ? `AND ${whereClause}` : ''}
    ORDER BY p.created_at DESC
  `;

  const finalParams = [...params];

  if (hasLimit) {
    finalParams.push(limitValue);
    sql += `\n    LIMIT $${finalParams.length};`;
  } else {
    sql += `;`;
  }

  return query(sql, finalParams);
};

export const getTopPicks = async (req, res, next) => {
  try {
    const result = await fetchProducts(`p.featured_type::text ILIKE '%top%pick%'`, [], req.query.limit);
    res.status(200).json({ status: 'success', count: result.rows.length, data: result.rows });
  } catch (error) {
    next(error);
  }
};

export const getTodayDeals = async (req, res, next) => {
  try {
    const result = await fetchProducts(`p.featured_type::text ILIKE '%today%deal%'`, [], req.query.limit);
    res.status(200).json({ status: 'success', count: result.rows.length, data: result.rows });
  } catch (error) {
    next(error);
  }
};

export const getDealsOnSarees = async (req, res, next) => {
  try {
    const result = await fetchProducts(`p.landing_section::text ILIKE '%deals%on%saree%'`, [], req.query.limit);
    res.status(200).json({ status: 'success', count: result.rows.length, data: result.rows });
  } catch (error) {
    next(error);
  }
};

export const getBestValue = async (req, res, next) => {
  try {
    const result = await fetchProducts(`p.featured_type::text ILIKE '%best%value%'`, [], req.query.limit);
    res.status(200).json({ status: 'success', count: result.rows.length, data: result.rows });
  } catch (error) {
    next(error);
  }
};

export const getNewArrivals = async (req, res, next) => {
  try {
    const result = await fetchProducts(`p.featured_type::text ILIKE '%new%arrival%'`, [], req.query.limit);
    res.status(200).json({ status: 'success', count: result.rows.length, data: result.rows });
  } catch (error) {
    next(error);
  }
};

export const getTrendingNow = async (req, res, next) => {
  try {
    const result = await fetchProducts(`p.featured_type::text ILIKE '%trending%now%'`, [], req.query.limit);
    res.status(200).json({ status: 'success', count: result.rows.length, data: result.rows });
  } catch (error) {
    next(error);
  }
};

export const getShopByOccasion = async (req, res, next) => {
  try {
    const occasion = req.query.occasion; // e.g. ?occasion=eid or diwali
    let whereClause = 'p.occasion IS NOT NULL';
    let params = [];
    if (occasion) {
      whereClause = `p.occasion::text ILIKE $1`;
      params = [`%${occasion}%`];
    }
    const result = await fetchProducts(whereClause, params, req.query.limit);
    res.status(200).json({ status: 'success', count: result.rows.length, data: result.rows });
  } catch (error) {
    next(error);
  }
};

export const getAllCategories = async (req, res, next) => {
  try {
    const sql = `
      SELECT 
        id, category_name, category_slug, category_description, 
        parent_category_id, category_img, is_active, created_at 
      FROM product_categories 
      WHERE is_active = true 
      ORDER BY category_name ASC;
    `;
    const result = await query(sql);
    console.log("Result Category",result)
    res.status(200).json({ status: 'success', count: result.rows.length, data: result.rows });
  } catch (error) {
    next(error);
  }
};

export const getProductsByCategory = async (req, res, next) => {
  try {
    const { category_slug } = req.params;
    const result = await fetchProducts(`c.category_slug = $1`, [category_slug], req.query.limit);
    res.status(200).json({ status: 'success', count: result.rows.length, data: result.rows });
  } catch (error) {
    next(error);
  }
};

export const getProductDetailsBySlug = async (req, res, next) => {
  try {
    const { product_slug } = req.params;
    const result = await fetchProducts(`p.product_slug = $1`, [product_slug]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Product not found' });
    }
    
    res.status(200).json({ status: 'success', data: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

// --- E-commerce Action APIs ---

export const addToCart = async (req, res, next) => {
  try {
    const { product_id, qty } = req.body;
    
    const sql = `SELECT id, product_name, price, discounted_price, quantity_in_stock, images FROM product_details WHERE id = $1 AND is_active = true`;
    const result = await query(sql, [product_id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Product not found or inactive' });
    }
    
    const product = result.rows[0];
    if (product.quantity_in_stock < (qty || 1)) {
      return res.status(400).json({ status: 'error', message: 'Insufficient stock available' });
    }
    
    res.status(200).json({ status: 'success', message: 'Product can be added to cart', data: product });
  } catch (error) {
    next(error);
  }
};

export const checkoutSummary = async (req, res, next) => {
  try {
    const { items } = req.body; // [{ product_id, qty }]
    
    if (!items || items.length === 0) {
      return res.status(400).json({ status: 'error', message: 'Cart is empty' });
    }
    
    let subtotal = 0;
    const validItems = [];
    
    for (const item of items) {
      const result = await query(`SELECT id, product_name, price, discounted_price FROM product_details WHERE id = $1`, [item.product_id]);
      if (result.rows.length > 0) {
        const product = result.rows[0];
        const finalPrice = product.discounted_price ? parseFloat(product.discounted_price) : parseFloat(product.price);
        subtotal += finalPrice * item.qty;
        validItems.push({ ...product, qty: item.qty, finalPrice });
      }
    }
    
    const shipping_charge = subtotal > 1000 ? 0 : 50; // free shipping above 1000
    const grand_total = subtotal + shipping_charge;
    
    res.status(200).json({ 
      status: 'success', 
      data: { subtotal, shipping_charge, grand_total, items: validItems } 
    });
  } catch (error) {
    next(error);
  }
};

export const placeOrder = async (req, res, next) => {
  try {
    const { user_id, items, shipping_address, payment_method } = req.body;
    
    if (!items || items.length === 0) return res.status(400).json({ status: 'error', message: 'Cart is empty' });
    if (!user_id) return res.status(400).json({ status: 'error', message: 'User ID is required' });
    if (!shipping_address) return res.status(400).json({ status: 'error', message: 'Shipping address is required' });
    
    let subtotal = 0;
    const itemDetails = [];
    
    for (const item of items) {
      const prodRes = await query(`SELECT id, vendor_id, product_name, price, discounted_price FROM product_details WHERE id = $1`, [item.product_id]);
      if (prodRes.rows.length === 0) return res.status(400).json({ status: 'error', message: `Product ${item.product_id} not found` });
      
      const prod = prodRes.rows[0];
      const sellingPrice = prod.discounted_price ? parseFloat(prod.discounted_price) : parseFloat(prod.price);
      
      // Calculate hypothetical platform earning / payout (for example, platform takes 10%)
      const platform_earning = sellingPrice * 0.10;
      const vendor_payout_amount = sellingPrice - platform_earning;
      
      subtotal += sellingPrice * item.qty;
      itemDetails.push({
        ...item,
        shop_id: prod.vendor_id, // assuming shop_id maps to vendor_id
        product_name: prod.product_name,
        selling_price: sellingPrice,
        vendor_payout_amount: vendor_payout_amount,
        platform_earning: platform_earning
      });
    }
    
    const shipping_charge = subtotal > 1000 ? 0 : 50;
    const grand_total = subtotal + shipping_charge;
    const order_number = 'ORD-' + Date.now();
    
    const order_vendor_id = itemDetails.length > 0 ? itemDetails[0].shop_id : null;
    
    // Insert into orders table
    const orderRes = await query(
      `INSERT INTO orders (order_number, user_id, vendor_id, subtotal, shipping_charge, grand_total, shipping_address, order_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'PLACED') RETURNING *`,
      [order_number, user_id, order_vendor_id, subtotal, shipping_charge, grand_total, JSON.stringify(shipping_address)]
    );
    const order = orderRes.rows[0];
    
    // Insert into order_items table
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
    
    // Insert into payments table
    await query(
      `INSERT INTO payments (order_id, payment_method, payment_status) VALUES ($1, $2, 'PENDING')`,
      [order.id, payment_method || 'COD']
    );
    
    res.status(201).json({ status: 'success', message: 'Order placed successfully', data: order });
  } catch (error) {
    next(error);
  }
};

