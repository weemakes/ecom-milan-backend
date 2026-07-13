import { query } from '../config/db.js';

// GET all vendors
export const getAllVendors = async (req, res, next) => {
  try {
    const { search, active } = req.query;
    let sql = `SELECT id, name, email, phone, gst_number, current_address, is_active, created_at, updated_at FROM vendors`;
    const conditions = [];
    const params = [];

    if (active !== undefined && active !== '' && active !== 'all') {
      params.push(active === 'true' || active === 'active');
      conditions.push(`is_active = $${params.length}`);
    }

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(name ILIKE $${params.length} OR email ILIKE $${params.length} OR phone ILIKE $${params.length})`);
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

// GET vendor by ID
export const getVendorById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const sql = `SELECT id, name, email, phone, gst_number, current_address, is_active, created_at, updated_at FROM vendors WHERE id = $1;`;
    const result = await query(sql, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Vendor not found' });
    }

    return res.status(200).json({
      status: 'success',
      data: result.rows[0]
    });
  } catch (err) {
    next(err);
  }
};

// CREATE vendor
export const createVendor = async (req, res, next) => {
  try {
    const { name, email, phone, password_hash, gst_number, current_address, is_active } = req.body;
    if (!name || !email || !phone || !password_hash || !current_address) {
      return res.status(400).json({ status: 'error', message: 'Required fields: name, email, phone, password_hash, current_address' });
    }

    const sql = `
      INSERT INTO vendors 
        (name, email, phone, password_hash, gst_number, current_address, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, name, email, phone, gst_number, current_address, is_active, created_at, updated_at;
    `;
    
    const result = await query(sql, [
      name,
      email,
      phone,
      password_hash,
      gst_number || null,
      current_address,
      is_active !== undefined ? is_active : true
    ]);

    return res.status(201).json({
      status: 'success',
      data: result.rows[0]
    });
  } catch (err) {
    next(err);
  }
};

// UPDATE vendor
export const updateVendor = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, email, phone, password_hash, gst_number, current_address, is_active } = req.body;

    const selectSql = `SELECT * FROM vendors WHERE id = $1;`;
    const selectRes = await query(selectSql, [id]);
    if (selectRes.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Vendor not found' });
    }

    const existing = selectRes.rows[0];

    const sql = `
      UPDATE vendors
      SET 
        name = $1,
        email = $2,
        phone = $3,
        password_hash = COALESCE($4, password_hash),
        gst_number = $5,
        current_address = $6,
        is_active = $7,
        updated_at = NOW()
      WHERE id = $8
      RETURNING id, name, email, phone, gst_number, current_address, is_active, created_at, updated_at;
    `;

    const result = await query(sql, [
      name !== undefined ? name : existing.name,
      email !== undefined ? email : existing.email,
      phone !== undefined ? phone : existing.phone,
      password_hash || null,
      gst_number !== undefined ? gst_number : existing.gst_number,
      current_address !== undefined ? current_address : existing.current_address,
      is_active !== undefined ? is_active : existing.is_active,
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

// DELETE vendor
export const deleteVendor = async (req, res, next) => {
  try {
    const { id } = req.params;
    const sql = `DELETE FROM vendors WHERE id = $1 RETURNING id, name, email, phone, gst_number, current_address, is_active, created_at, updated_at;`;
    const result = await query(sql, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Vendor not found' });
    }

    return res.status(200).json({
      status: 'success',
      data: result.rows[0]
    });
  } catch (err) {
    next(err);
  }
};
