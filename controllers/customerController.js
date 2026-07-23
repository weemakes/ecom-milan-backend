import { query } from '../config/db.js';

/**
 * Register / Subscribe a new customer lead (e.g. from 10% Off Popup)
 * POST /api/customers/subscribe
 */
export const subscribeCustomer = async (req, res) => {
  try {
    const { email_or_phone, source = 'POPUP_10OFF', coupon_code = 'WELCOME10' } = req.body;

    if (!email_or_phone || !email_or_phone.trim()) {
      return res.status(400).json({
        status: 'error',
        message: 'Email or phone number is required.',
      });
    }

    const cleanedContact = email_or_phone.trim();

    // Check if customer already registered
    const existing = await query(
      `SELECT id FROM customer_leads WHERE email_or_phone = $1`,
      [cleanedContact]
    );

    let customer;
    if (existing.rows.length > 0) {
      customer = existing.rows[0];
    } else {
      const result = await query(
        `INSERT INTO customer_leads (email_or_phone, source, coupon_code)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [cleanedContact, source, coupon_code]
      );
      customer = result.rows[0];
    }

    return res.status(201).json({
      status: 'success',
      message: 'Customer lead saved successfully!',
      data: customer,
    });
  } catch (error) {
    console.error('Error saving customer lead:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error while saving customer lead.',
    });
  }
};

/**
 * Get all customer leads
 * GET /api/customers
 */
export const getCustomers = async (req, res) => {
  try {
    const result = await query(
      `SELECT * FROM customer_leads ORDER BY created_at DESC`
    );

    return res.status(200).json({
      status: 'success',
      count: result.rows.length,
      data: result.rows,
    });
  } catch (error) {
    console.error('Error fetching customers:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error while fetching customer leads.',
    });
  }
};

/**
 * Delete a customer lead
 * DELETE /api/customers/:id
 */
export const deleteCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    await query(`DELETE FROM customer_leads WHERE id = $1`, [id]);

    return res.status(200).json({
      status: 'success',
      message: 'Customer lead deleted successfully.',
    });
  } catch (error) {
    console.error('Error deleting customer lead:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error while deleting customer lead.',
    });
  }
};
