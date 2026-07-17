import { query } from '../config/db.js';
import { uploadToCloudinary } from '../config/cloudinary.js';

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
      c.category_name,
      (SELECT string_agg(campaign_name, ', ') FROM product_campaigns WHERE product_id = p.id AND campaign_type = 'SECTION') as landing_section,
      (SELECT string_agg(campaign_name, ', ') FROM product_campaigns WHERE product_id = p.id AND campaign_type = 'SECTION') as featured_type,
      (SELECT string_agg(campaign_name, ', ') FROM product_campaigns WHERE product_id = p.id AND campaign_type = 'OCCASION') as occasion
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
    const result = await fetchProducts(`EXISTS (SELECT 1 FROM product_campaigns WHERE product_id = p.id AND campaign_type = 'SECTION' AND campaign_name = 'TOP_PICKS')`, [], req.query.limit);
    res.status(200).json({ status: 'success', count: result.rows.length, data: result.rows });
  } catch (error) {
    next(error);
  }
};

export const getTodayDeals = async (req, res, next) => {
  try {
    const result = await fetchProducts(`EXISTS (SELECT 1 FROM product_campaigns WHERE product_id = p.id AND campaign_type = 'SECTION' AND campaign_name = 'TODAY_DEALS')`, [], req.query.limit);
    res.status(200).json({ status: 'success', count: result.rows.length, data: result.rows });
  } catch (error) {
    next(error);
  }
};

export const getDealsOnSarees = async (req, res, next) => {
  try {
    const result = await fetchProducts(`EXISTS (SELECT 1 FROM product_campaigns WHERE product_id = p.id AND campaign_type = 'SECTION' AND campaign_name = 'DEALS_ON_SAREES')`, [], req.query.limit);
    res.status(200).json({ status: 'success', count: result.rows.length, data: result.rows });
  } catch (error) {
    next(error);
  }
};

export const getBestValue = async (req, res, next) => {
  try {
    const result = await fetchProducts(`EXISTS (SELECT 1 FROM product_campaigns WHERE product_id = p.id AND campaign_type = 'SECTION' AND campaign_name = 'BEST_VALUES')`, [], req.query.limit);
    res.status(200).json({ status: 'success', count: result.rows.length, data: result.rows });
  } catch (error) {
    next(error);
  }
};

export const getNewArrivals = async (req, res, next) => {
  try {
    const result = await fetchProducts(`EXISTS (SELECT 1 FROM product_campaigns WHERE product_id = p.id AND campaign_type = 'SECTION' AND campaign_name = 'NEW_ARRIVALS')`, [], req.query.limit);
    res.status(200).json({ status: 'success', count: result.rows.length, data: result.rows });
  } catch (error) {
    next(error);
  }
};

export const getTrendingNow = async (req, res, next) => {
  try {
    const result = await fetchProducts(`EXISTS (SELECT 1 FROM product_campaigns WHERE product_id = p.id AND campaign_type = 'SECTION' AND campaign_name = 'TRENDING_NOW')`, [], req.query.limit);
    res.status(200).json({ status: 'success', count: result.rows.length, data: result.rows });
  } catch (error) {
    next(error);
  }
};

export const getShopByOccasion = async (req, res, next) => {
  try {
    const occasion = req.query.occasion; // e.g. ?occasion=eid or diwali
    let whereClause = `EXISTS (SELECT 1 FROM product_campaigns WHERE product_id = p.id AND campaign_type = 'OCCASION')`;
    let params = [];
    if (occasion) {
      whereClause = `EXISTS (SELECT 1 FROM product_campaigns WHERE product_id = p.id AND campaign_type = 'OCCASION' AND campaign_name ILIKE $1)`;
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

// --- Product Admin CRUD Controllers ---

export const getAdminProducts = async (req, res, next) => {
  try {
    const { search, categoryId, vendorId, active } = req.query;
    let sql = `
      SELECT 
        p.id, p.product_name, p.product_slug, p.description, 
        p.price, p.discounted_price, p.quantity_in_stock,
        p.sku, p.is_active, p.is_featured, p.created_at,
        p.images, p.variants, p.category_id, p.vendor_id,
        c.category_name, v.name as vendor_name,
        (SELECT string_agg(campaign_name, ', ') FROM product_campaigns WHERE product_id = p.id AND campaign_type = 'SECTION') as landing_section,
        (SELECT string_agg(campaign_name, ', ') FROM product_campaigns WHERE product_id = p.id AND campaign_type = 'SECTION') as featured_type,
        (SELECT string_agg(campaign_name, ', ') FROM product_campaigns WHERE product_id = p.id AND campaign_type = 'OCCASION') as occasion
      FROM product_details p
      LEFT JOIN product_categories c ON p.category_id = c.id
      LEFT JOIN vendors v ON p.vendor_id = v.id
    `;
    const conditions = [];
    const params = [];

    if (categoryId) {
      params.push(categoryId);
      conditions.push(`p.category_id = $${params.length}`);
    }

    if (vendorId) {
      params.push(vendorId);
      conditions.push(`p.vendor_id = $${params.length}`);
    }

    if (active !== undefined && active !== '' && active !== 'all') {
      params.push(active === 'true' || active === 'active');
      conditions.push(`p.is_active = $${params.length}`);
    }

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(p.product_name ILIKE $${params.length} OR p.description ILIKE $${params.length})`);
    }

    if (conditions.length > 0) {
      sql += ` WHERE ` + conditions.join(' AND ');
    }

    sql += ` ORDER BY p.created_at DESC;`;

    const result = await query(sql, params);
    return res.status(200).json({
      status: 'success',
      data: result.rows
    });
  } catch (error) {
    next(error);
  }
};

export const getProductById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return next(); // Fall through
    }

    const sql = `
      SELECT 
        p.id, p.product_name, p.product_slug, p.description, 
        p.price, p.discounted_price, p.quantity_in_stock,
        p.sku, p.is_active, p.is_featured, p.created_at,
        p.images, p.variants, p.category_id, p.vendor_id,
        c.category_name, v.name as vendor_name,
        (SELECT string_agg(campaign_name, ', ') FROM product_campaigns WHERE product_id = p.id AND campaign_type = 'SECTION') as landing_section,
        (SELECT string_agg(campaign_name, ', ') FROM product_campaigns WHERE product_id = p.id AND campaign_type = 'SECTION') as featured_type,
        (SELECT string_agg(campaign_name, ', ') FROM product_campaigns WHERE product_id = p.id AND campaign_type = 'OCCASION') as occasion
      FROM product_details p
      LEFT JOIN product_categories c ON p.category_id = c.id
      LEFT JOIN vendors v ON p.vendor_id = v.id
      WHERE p.id = $1;
    `;
    const result = await query(sql, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Product not found' });
    }
    return res.status(200).json({ status: 'success', data: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

export const createProduct = async (req, res, next) => {
  try {
    const {
      product_name, product_slug, category_id, vendor_id,
      description, price, discounted_price, quantity_in_stock,
      sku, is_active, is_featured, images, variants,
      featured_type, landing_section, occasion
    } = req.body;

    if (!product_name || !product_slug || !category_id || !vendor_id || price === undefined) {
      return res.status(400).json({
        status: 'error',
        message: 'Required fields: product_name, product_slug, category_id, vendor_id, price'
      });
    }

    const sql = `
      INSERT INTO product_details (
        product_name, product_slug, category_id, vendor_id,
        description, price, discounted_price, quantity_in_stock,
        sku, is_active, is_featured, images, variants,
        featured_type, landing_section, occasion
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *;
    `;

    const uploadedImages = [];
    if (images && Array.isArray(images)) {
      for (const img of images) {
        if (img) {
          const url = await uploadToCloudinary(img, 'products');
          uploadedImages.push(url);
        }
      }
    }

    const result = await query(sql, [
      product_name,
      product_slug,
      category_id,
      vendor_id,
      description || '',
      price,
      discounted_price || null,
      quantity_in_stock !== undefined ? quantity_in_stock : 10,
      sku && sku.trim() ? sku.trim() : null,
      is_active !== undefined ? is_active : true,
      is_featured !== undefined ? is_featured : false,
      JSON.stringify(uploadedImages || []),
      JSON.stringify(variants || []),
      featured_type || null,
      landing_section || null,
      occasion || null
    ]);

    const createdProd = result.rows[0];
    if (featured_type) {
      const parts = featured_type.split(',').map(s => s.trim()).filter(Boolean);
      for (const part of parts) {
        await query(`INSERT INTO product_campaigns (product_id, campaign_type, campaign_name) VALUES ($1, 'SECTION', $2) ON CONFLICT DO NOTHING;`, [createdProd.id, part]);
      }
    }
    if (landing_section) {
      const parts = landing_section.split(',').map(s => s.trim()).filter(Boolean);
      for (const part of parts) {
        await query(`INSERT INTO product_campaigns (product_id, campaign_type, campaign_name) VALUES ($1, 'SECTION', $2) ON CONFLICT DO NOTHING;`, [createdProd.id, part]);
      }
    }
    if (occasion) {
      const parts = occasion.split(',').map(s => s.trim()).filter(Boolean);
      for (const part of parts) {
        await query(`INSERT INTO product_campaigns (product_id, campaign_type, campaign_name) VALUES ($1, 'OCCASION', $2) ON CONFLICT DO NOTHING;`, [createdProd.id, part]);
      }
    }

    return res.status(201).json({
      status: 'success',
      data: createdProd
    });
  } catch (error) {
    next(error);
  }
};

export const updateProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return next(); // Fall through
    }

    const {
      product_name, product_slug, category_id, vendor_id,
      description, price, discounted_price, quantity_in_stock,
      sku, is_active, is_featured, images, variants,
      featured_type, landing_section, occasion
    } = req.body;

    const selectSql = `SELECT * FROM product_details WHERE id = $1;`;
    const selectRes = await query(selectSql, [id]);
    if (selectRes.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Product not found' });
    }
    const existing = selectRes.rows[0];

    const sql = `
      UPDATE product_details
      SET
        product_name = $1,
        product_slug = $2,
        category_id = $3,
        vendor_id = $4,
        description = $5,
        price = $6,
        discounted_price = $7,
        quantity_in_stock = $8,
        sku = $9,
        is_active = $10,
        is_featured = $11,
        images = $12,
        variants = $13,
        featured_type = $14,
        landing_section = $15,
        occasion = $16,
        updated_at = NOW()
      WHERE id = $17
      RETURNING *;
    `;

    let uploadedImages = existing.images || [];
    if (images !== undefined && Array.isArray(images)) {
      const temp = [];
      for (const img of images) {
        if (img) {
          const url = await uploadToCloudinary(img, 'products');
          temp.push(url);
        }
      }
      uploadedImages = temp;
    }

    const result = await query(sql, [
      product_name !== undefined ? product_name : existing.product_name,
      product_slug !== undefined ? product_slug : existing.product_slug,
      category_id !== undefined ? category_id : existing.category_id,
      vendor_id !== undefined ? vendor_id : existing.vendor_id,
      description !== undefined ? description : existing.description,
      price !== undefined ? price : existing.price,
      discounted_price !== undefined ? discounted_price : existing.discounted_price,
      quantity_in_stock !== undefined ? quantity_in_stock : existing.quantity_in_stock,
      sku !== undefined ? (sku && sku.trim() ? sku.trim() : null) : existing.sku,
      is_active !== undefined ? is_active : existing.is_active,
      is_featured !== undefined ? is_featured : existing.is_featured,
      JSON.stringify(uploadedImages || []),
      variants !== undefined ? JSON.stringify(variants || []) : JSON.stringify(existing.variants || []),
      featured_type !== undefined ? featured_type : existing.featured_type,
      landing_section !== undefined ? landing_section : existing.landing_section,
      occasion !== undefined ? occasion : existing.occasion,
      id
    ]);

    if (featured_type !== undefined) {
      await query(`DELETE FROM product_campaigns WHERE product_id = $1 AND campaign_type = 'SECTION' AND campaign_name NOT LIKE 'DEALS_ON_%';`, [id]);
      if (featured_type) {
        const parts = featured_type.split(',').map(s => s.trim()).filter(Boolean);
        for (const part of parts) {
          await query(`INSERT INTO product_campaigns (product_id, campaign_type, campaign_name) VALUES ($1, 'SECTION', $2) ON CONFLICT (product_id, campaign_type, campaign_name) DO NOTHING;`, [id, part]);
        }
      }
    }
    if (landing_section !== undefined) {
      await query(`DELETE FROM product_campaigns WHERE product_id = $1 AND campaign_type = 'SECTION' AND campaign_name LIKE 'DEALS_ON_%';`, [id]);
      if (landing_section) {
        const parts = landing_section.split(',').map(s => s.trim()).filter(Boolean);
        for (const part of parts) {
          await query(`INSERT INTO product_campaigns (product_id, campaign_type, campaign_name) VALUES ($1, 'SECTION', $2) ON CONFLICT (product_id, campaign_type, campaign_name) DO NOTHING;`, [id, part]);
        }
      }
    }
    if (occasion !== undefined) {
      await query(`DELETE FROM product_campaigns WHERE product_id = $1 AND campaign_type = 'OCCASION';`, [id]);
      if (occasion) {
        const parts = occasion.split(',').map(s => s.trim()).filter(Boolean);
        for (const part of parts) {
          await query(`INSERT INTO product_campaigns (product_id, campaign_type, campaign_name) VALUES ($1, 'OCCASION', $2) ON CONFLICT (product_id, campaign_type, campaign_name) DO NOTHING;`, [id, part]);
        }
      }
    }

    return res.status(200).json({
      status: 'success',
      data: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
};

export const deleteProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return next(); // Fall through
    }

    const sql = `DELETE FROM product_details WHERE id = $1 RETURNING *;`;
    const result = await query(sql, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Product not found' });
    }

    return res.status(200).json({
      status: 'success',
      data: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
};

// ─── Admin Campaign Controllers ────────────────────────────────────────────────

export const getUniqueOccasions = async (req, res, next) => {
  try {
    const result = await query(`
      SELECT name, image FROM occasions
      ORDER BY name ASC;
    `);
    return res.status(200).json({ status: 'success', data: result.rows });
  } catch (error) {
    next(error);
  }
};

export const getProductsBySection = async (req, res, next) => {
  try {
    const { section } = req.params;

    const SECTION_MAP = {
      'top-picks':       { col: 'featured_type', val: 'TOP_PICKS' },
      'today-deals':     { col: 'featured_type', val: 'TODAY_DEALS' },
      'deals-on-sarees': { col: 'featured_type', val: 'DEALS_ON_SAREES' },
      'best-value':      { col: 'featured_type', val: 'BEST_VALUES' },
      'new-arrivals':    { col: 'featured_type', val: 'NEW_ARRIVALS' },
      'trending-now':    { col: 'featured_type', val: 'TRENDING_NOW' },
    };

    const mapping = SECTION_MAP[section];
    if (!mapping) {
      return res.status(400).json({ status: 'error', message: `Unknown section: ${section}` });
    }

    const result = await query(`
      SELECT p.id, p.product_name, p.product_slug, p.price, p.discounted_price,
             p.images, p.is_active, c.category_name,
             (SELECT string_agg(campaign_name, ', ') FROM product_campaigns WHERE product_id = p.id AND campaign_type = 'SECTION') as landing_section,
             (SELECT string_agg(campaign_name, ', ') FROM product_campaigns WHERE product_id = p.id AND campaign_type = 'SECTION') as featured_type,
             (SELECT string_agg(campaign_name, ', ') FROM product_campaigns WHERE product_id = p.id AND campaign_type = 'OCCASION') as occasion
      FROM product_details p
      LEFT JOIN product_categories c ON p.category_id = c.id
      WHERE EXISTS (
        SELECT 1 FROM product_campaigns 
        WHERE product_id = p.id AND campaign_type = 'SECTION' AND campaign_name = $1
      )
      ORDER BY p.created_at DESC;
    `, [mapping.val]);

    return res.status(200).json({ status: 'success', count: result.rows.length, data: result.rows });
  } catch (error) {
    next(error);
  }
};

export const getProductsByOccasionName = async (req, res, next) => {
  try {
    const { name } = req.params;
    const result = await query(`
      SELECT p.id, p.product_name, p.product_slug, p.price, p.discounted_price,
             p.images, p.is_active, c.category_name,
             (SELECT string_agg(campaign_name, ', ') FROM product_campaigns WHERE product_id = p.id AND campaign_type = 'SECTION') as landing_section,
             (SELECT string_agg(campaign_name, ', ') FROM product_campaigns WHERE product_id = p.id AND campaign_type = 'SECTION') as featured_type,
             (SELECT string_agg(campaign_name, ', ') FROM product_campaigns WHERE product_id = p.id AND campaign_type = 'OCCASION') as occasion
      FROM product_details p
      LEFT JOIN product_categories c ON p.category_id = c.id
      WHERE EXISTS (
        SELECT 1 FROM product_campaigns 
        WHERE product_id = p.id AND campaign_type = 'OCCASION' AND campaign_name ILIKE $1
      )
      ORDER BY p.created_at DESC;
    `, [`%${name}%`]);
    return res.status(200).json({ status: 'success', count: result.rows.length, data: result.rows });
  } catch (error) {
    next(error);
  }
};

export const getProductsOnSale = async (req, res, next) => {
  try {
    const result = await query(`
      SELECT p.id, p.product_name, p.product_slug, p.price, p.discounted_price,
             p.images, p.is_active, c.category_name,
             (SELECT string_agg(campaign_name, ', ') FROM product_campaigns WHERE product_id = p.id AND campaign_type = 'SECTION') as landing_section,
             (SELECT string_agg(campaign_name, ', ') FROM product_campaigns WHERE product_id = p.id AND campaign_type = 'SECTION') as featured_type,
             (SELECT string_agg(campaign_name, ', ') FROM product_campaigns WHERE product_id = p.id AND campaign_type = 'OCCASION') as occasion
      FROM product_details p
      LEFT JOIN product_categories c ON p.category_id = c.id
      WHERE p.discounted_price IS NOT NULL
      ORDER BY p.created_at DESC;
    `);
    return res.status(200).json({ status: 'success', count: result.rows.length, data: result.rows });
  } catch (error) {
    next(error);
  }
};

export const getAllProductsForAdmin = async (req, res, next) => {
  try {
    const result = await query(`
      SELECT p.id, p.product_name, p.product_slug, p.price, p.discounted_price,
             p.images, p.is_active, c.category_name,
             (SELECT string_agg(campaign_name, ', ') FROM product_campaigns WHERE product_id = p.id AND campaign_type = 'SECTION') as landing_section,
             (SELECT string_agg(campaign_name, ', ') FROM product_campaigns WHERE product_id = p.id AND campaign_type = 'SECTION') as featured_type,
             (SELECT string_agg(campaign_name, ', ') FROM product_campaigns WHERE product_id = p.id AND campaign_type = 'OCCASION') as occasion
      FROM product_details p
      LEFT JOIN product_categories c ON p.category_id = c.id
      ORDER BY p.product_name ASC;
    `);
    return res.status(200).json({ status: 'success', count: result.rows.length, data: result.rows });
  } catch (error) {
    next(error);
  }
};

export const createOrUpdateOccasion = async (req, res, next) => {
  try {
    const { name, image } = req.body;
    if (!name) return res.status(400).json({ status: 'error', message: 'Name is required' });
    
    let finalImage = image;
    if (image) {
      finalImage = await uploadToCloudinary(image, 'occasions');
    }

    const result = await query(`
      INSERT INTO occasions (name, image)
      VALUES ($1, $2)
      ON CONFLICT (name) DO UPDATE SET image = EXCLUDED.image
      RETURNING *;
    `, [name, finalImage]);
    return res.status(200).json({ status: 'success', data: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

export const updateOccasion = async (req, res, next) => {
  try {
    const { oldName } = req.params;
    const { name, image } = req.body;
    if (!name) return res.status(400).json({ status: 'error', message: 'New name is required' });
    
    let finalImage = image;
    if (image) {
      finalImage = await uploadToCloudinary(image, 'occasions');
    }

    const result = await query(`
      UPDATE occasions
      SET name = $1, image = $2
      WHERE name = $3
      RETURNING *;
    `, [name, finalImage, oldName]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Occasion not found' });
    }

    await query(`
      UPDATE product_campaigns
      SET campaign_name = $1
      WHERE campaign_type = 'OCCASION' AND campaign_name = $2;
    `, [name, oldName]);

    return res.status(200).json({ status: 'success', data: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

export const deleteOccasion = async (req, res, next) => {
  try {
    const { name } = req.params;
    if (!name) return res.status(400).json({ status: 'error', message: 'Name is required' });

    await query(`DELETE FROM product_campaigns WHERE campaign_type = 'OCCASION' AND campaign_name = $1;`, [name]);
    await query(`DELETE FROM occasions WHERE name = $1;`, [name]);

    return res.status(200).json({ status: 'success', message: 'Occasion deleted successfully' });
  } catch (error) {
    next(error);
  }
};
