import { query } from '../config/db.js';
import { sendCouponClaimedEmail } from '../services/brevoService.js';

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

    // Trigger Brevo Email Notification in background (non-blocking)
    sendCouponClaimedEmail({
      customerContact: cleanedContact,
      couponCode: coupon_code,
      source: source,
    }).catch((err) => console.error('Failed sending Brevo notification:', err));

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
    const leadsRes = await query(`SELECT id, email_or_phone, source, coupon_code, created_at FROM customer_leads ORDER BY created_at DESC`);
    const contactRes = await query(`SELECT id, name, email, phone, topic, message, created_at FROM contact_inquiries ORDER BY created_at DESC`);

    const contactFormatted = contactRes.rows.map(item => ({
      id: item.id,
      email_or_phone: `${item.name} | ${item.email} ${item.phone ? '| ' + item.phone : ''}`,
      source: `CONTACT_FORM (${item.topic})`,
      coupon_code: item.message,
      created_at: item.created_at
    }));

    const combined = [...contactFormatted, ...leadsRes.rows];

    return res.status(200).json({
      status: 'success',
      count: combined.length,
      data: combined,
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

/**
 * Customer Storefront Login / Registration
 * POST /api/customers/login
 */
export const customerLogin = async (req, res) => {
  try {
    const { contact, name } = req.body;
    if (!contact || !contact.trim()) {
      return res.status(400).json({ status: 'error', message: 'Email or phone number is required.' });
    }

    const rawContact = contact.trim();
    const cleanContact = rawContact.toLowerCase();
    const cleanDigits = rawContact.replace(/[^0-9]/g, '');

    // Search users by email or phone digits
    let result = await query(
      `SELECT id, username, name, email, phone FROM users
       WHERE LOWER(email) = $1
          OR phone = $1
          OR ($2 <> '' AND (phone LIKE '%' || $2 || '%' OR $2 LIKE '%' || phone || '%'))`,
      [cleanContact, cleanDigits]
    );

    if (result.rows.length === 0) {
      // Search orders table by shipping_address email or phone
      const orderSearch = await query(
        `SELECT shipping_address FROM orders
         WHERE (shipping_address->>'email' ILIKE $1)
            OR ($2 <> '' AND (shipping_address->>'phone' LIKE '%' || $2 || '%' OR $2 LIKE '%' || (shipping_address->>'phone') || '%'))
         ORDER BY order_date DESC LIMIT 1`,
        [cleanContact, cleanDigits]
      );

      let customerName = name || '';
      let customerEmail = cleanContact.includes('@') ? cleanContact : '';
      let customerPhone = cleanDigits.length >= 7 ? cleanDigits : rawContact;

      if (orderSearch.rows.length > 0) {
        let addr = orderSearch.rows[0].shipping_address;
        if (typeof addr === 'string') {
          try { addr = JSON.parse(addr); } catch (e) {}
        }
        if (addr) {
          if (!customerName && (addr.fullName || addr.name)) customerName = addr.fullName || addr.name;
          if (!customerEmail && addr.email) customerEmail = addr.email;
          if (!customerPhone && addr.phone) customerPhone = addr.phone;
        }
      }

      const defaultUsername = (customerEmail || cleanContact).split('@')[0].replace(/[^a-zA-Z0-9]/g, '') || ('user_' + Date.now().toString().slice(-4));
      const finalName = customerName || defaultUsername;
      const finalEmail = customerEmail || `${defaultUsername}@mehrzari.com`;
      const finalPhone = customerPhone || cleanDigits || '9999999999';

      const newRes = await query(
        `INSERT INTO users (username, name, email, phone, password_hash, role)
         VALUES ($1, $2, $3, $4, 'hashed', 'CUSTOMER')
         RETURNING id, username, name, email, phone`,
        [defaultUsername, finalName, finalEmail, finalPhone]
      );
      const user = newRes.rows[0];

      return res.status(200).json({
        status: 'success',
        message: 'Account authenticated',
        data: {
          id: user.id,
          name: user.name || user.username,
          email: user.email,
          phone: user.phone
        }
      });
    }

    const user = result.rows[0];
    return res.status(200).json({
      status: 'success',
      message: 'Logged in successfully',
      data: {
        id: user.id,
        name: user.name || user.username || 'Customer',
        email: user.email,
        phone: user.phone
      }
    });
  } catch (error) {
    console.error('Error in customerLogin:', error);
    return res.status(500).json({ status: 'error', message: error.message || 'Failed to authenticate customer.' });
  }
};

/**
 * Save Contact Us inquiry to database
 * POST /api/customers/contact
 */
export const submitContactInquiry = async (req, res) => {
  try {
    const { name, email, phone, topic, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ status: 'error', message: 'Name, email, and message are required.' });
    }

    const result = await query(
      `INSERT INTO contact_inquiries (name, email, phone, topic, message)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [name.trim(), email.trim(), phone ? phone.trim() : '', topic || 'General', message.trim()]
    );

    console.log(`📩 [Contact Form Inquiry Received] From: ${name} (${email}, ${phone || 'No Phone'}) | Topic: ${topic} | Message: ${message}`);

    return res.status(201).json({
      status: 'success',
      message: 'Inquiry received successfully!',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error saving contact inquiry:', error);
    return res.status(500).json({ status: 'error', message: 'Failed to submit contact inquiry.' });
  }
};
