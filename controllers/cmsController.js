import { query } from '../config/db.js';

// CMS team views all pending or submitted products (including vendor cost & profit to calculate margins)
export const getAllProductsForCms = async (req, res, next) => {
  try {
    const { status } = req.query;
    
    let sql = `
      SELECT p.*, s.shop_name, c.name as category_name
      FROM products p
      LEFT JOIN shops s ON p.shop_id = s.id
      LEFT JOIN categories c ON p.category_id = c.id
    `;
    const params = [];

    if (status) {
      sql += ` WHERE p.status = $1`;
      params.push(status);
    }

    sql += ` ORDER BY p.created_at DESC;`;

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

// CMS team enhances image, sets platform selling price, and approves product
export const enhanceAndApproveProduct = async (req, res, next) => {
  try {
    const { product_id } = req.params;
    const { platform_selling_price, enhanced_images, curation_score, status } = req.body;

    if (!platform_selling_price || platform_selling_price <= 0) {
      return res.status(400).json({ status: 'error', message: 'Valid platform_selling_price is required for approval' });
    }

    const sql = `
      UPDATE products
      SET 
        platform_selling_price = $1,
        enhanced_images = COALESCE($2, enhanced_images),
        curation_score = COALESCE($3, curation_score),
        status = COALESCE($4, 'APPROVED')
      WHERE id = $5
      RETURNING *;
    `;

    const values = [
      platform_selling_price,
      enhanced_images ? JSON.stringify(enhanced_images) : null,
      curation_score !== undefined ? curation_score : 100,
      status || 'APPROVED',
      product_id
    ];

    const result = await query(sql, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Product not found' });
    }

    return res.status(200).json({
      status: 'success',
      message: 'Product professionally enhanced, priced, and approved for live website.',
      data: result.rows[0]
    });
  } catch (err) {
    next(err);
  }
};

// CMS creates new categories
export const createCategory = async (req, res, next) => {
  try {
    const { name, parent_id, image } = req.body;
    if (!name) return res.status(400).json({ status: 'error', message: 'Category name required' });

    const sql = `
      INSERT INTO categories (name, parent_id, image)
      VALUES ($1, $2, $3)
      RETURNING *;
    `;
    const result = await query(sql, [name, parent_id || null, image || null]);

    return res.status(201).json({
      status: 'success',
      data: result.rows[0]
    });
  } catch (err) {
    next(err);
  }
};
