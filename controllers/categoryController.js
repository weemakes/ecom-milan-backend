import { query } from '../config/db.js';
import { uploadToCloudinary } from '../config/cloudinary.js';

// GET all categories
export const getAllCategories = async (req, res, next) => {
  try {
    const { search, active } = req.query;
    let sql = `SELECT * FROM product_categories`;
    const conditions = [];
    const params = [];

    if (active !== undefined && active !== '' && active !== 'all') {
      params.push(active === 'true' || active === 'active');
      conditions.push(`is_active = $${params.length}`);
    }

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`category_name ILIKE $${params.length}`);
    }

    if (conditions.length > 0) {
      sql += ` WHERE ` + conditions.join(' AND ');
    }

    sql += ` ORDER BY created_at DESC;`;

    const result = await query(sql, params);
    return res.status(200).json({
      status: 'success',
      data: result.rows
    });
  } catch (err) {
    next(err);
  }
};

// GET category by ID
export const getCategoryById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const sql = `SELECT * FROM product_categories WHERE id = $1;`;
    const result = await query(sql, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Category not found' });
    }

    return res.status(200).json({
      status: 'success',
      data: result.rows[0]
    });
  } catch (err) {
    next(err);
  }
};

// CREATE category
export const createCategory = async (req, res, next) => {
  try {
    const { category_name, category_description, category_img, parent_category_id, vendor_id, is_active } = req.body;
    if (!category_name) {
      return res.status(400).json({ status: 'error', message: 'Category name is required' });
    }

    // Generate slug from category_name
    const category_slug = category_name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^\w\-]+/g, '')
      .replace(/\-\-+/g, '-');

    const sql = `
      INSERT INTO product_categories 
        (category_name, category_slug, category_description, parent_category_id, is_active, category_img)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `;
    
    let finalImg = category_img;
    if (category_img) {
      finalImg = await uploadToCloudinary(category_img, 'categories');
    }

    const result = await query(sql, [
      category_name,
      category_slug,
      category_description || null,
      parent_category_id || null,
      is_active !== undefined ? is_active : true,
      finalImg
    ]);

    return res.status(201).json({
      status: 'success',
      data: result.rows[0]
    });
  } catch (err) {
    next(err);
  }
};

// UPDATE category
export const updateCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { category_name, category_description, category_img, parent_category_id, vendor_id, is_active } = req.body;

    const selectSql = `SELECT * FROM product_categories WHERE id = $1;`;
    const selectRes = await query(selectSql, [id]);
    if (selectRes.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Category not found' });
    }

    const existing = selectRes.rows[0];
    const finalName = category_name !== undefined ? category_name : existing.category_name;
    const category_slug = finalName
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^\w\-]+/g, '')
      .replace(/\-\-+/g, '-');

    const sql = `
      UPDATE product_categories
      SET 
        category_name = $1,
        category_slug = $2,
        category_description = $3,
        parent_category_id = $4,
        is_active = $5,
        category_img = $6
      WHERE id = $7
      RETURNING *;
    `;

    let finalImg = existing.category_img;
    if (category_img !== undefined) {
      finalImg = category_img ? await uploadToCloudinary(category_img, 'categories') : null;
    }

    const result = await query(sql, [
      finalName,
      category_slug,
      category_description !== undefined ? category_description : existing.category_description,
      parent_category_id !== undefined ? parent_category_id : existing.parent_category_id,
      is_active !== undefined ? is_active : existing.is_active,
      finalImg,
      id
    ]);

    return res.status(200).json({
      status: 'success',
      data: result.rows[0]
    });
  } catch (err) {
    next(err);
  }
};

// DELETE category
export const deleteCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // First set any referencing child categories' parent_category_id to null
    await query(`UPDATE product_categories SET parent_category_id = NULL WHERE parent_category_id = $1;`, [id]);

    const sql = `DELETE FROM product_categories WHERE id = $1 RETURNING *;`;
    const result = await query(sql, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Category not found' });
    }

    return res.status(200).json({
      status: 'success',
      data: result.rows[0]
    });
  } catch (err) {
    next(err);
  }
};
