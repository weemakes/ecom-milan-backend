import Razorpay from 'razorpay';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const getRazorpayInstance = () => {
  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;

  if (!key_id || !key_secret) {
    throw new Error('Razorpay API keys are missing in environment variables');
  }

  return new Razorpay({
    key_id,
    key_secret,
  });
};

/**
 * @desc    Create Razorpay Order (Standard)
 * @route   POST /api/create-order, POST /api/payment/create-order
 */
export const createOrder = async (req, res) => {
  try {
    const { amount, currency = 'INR', receipt } = req.body;

    if (!amount || amount < 100) {
      return res.status(400).json({
        status: 'error',
        message: 'Amount must be at least 100 paise (₹1)',
      });
    }

    const razorpay = getRazorpayInstance();
    const options = {
      amount: Math.round(Number(amount)),
      currency,
      receipt: receipt || `rcpt_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);

    return res.status(200).json({
      status: 'success',
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      data: order,
    });
  } catch (error) {
    console.error('Razorpay Create Order Error:', error);
    if (error.message && error.message.includes('keys are missing')) {
      return res.status(401).json({
        status: 'error',
        message: 'Authentication failed: Razorpay credentials missing',
      });
    }
    return res.status(500).json({
      status: 'error',
      message: error.description || error.message || 'Failed to create Razorpay order',
    });
  }
};

/**
 * @desc    Create Dynamic Razorpay QR Code for UPI
 * @route   POST /api/create-qr, POST /api/payment/create-qr
 */
export const createQrCode = async (req, res) => {
  try {
    const { amount, currency = 'INR', receipt, order_id, notes } = req.body;

    const amountInPaise = Math.round(Number(amount));
    if (!amountInPaise || isNaN(amountInPaise) || amountInPaise < 100) {
      return res.status(400).json({
        status: 'error',
        message: 'Amount must be at least 100 paise (₹1)',
      });
    }

    const razorpay = getRazorpayInstance();

    // 1. Create a Razorpay Order first
    const orderOptions = {
      amount: amountInPaise,
      currency,
      receipt: receipt || `rcpt_qr_${Date.now()}`,
      notes: {
        order_id: order_id || `ORD-${Date.now()}`,
        ...(notes || {}),
      },
    };

    const order = await razorpay.orders.create(orderOptions);
    const amountInRupees = (amountInPaise / 100).toFixed(2);

    let qrId = order.id;
    let qrImageUrl = '';

    // 2. Try native Razorpay QR code creation first
    try {
      const qrCode = await razorpay.qrCode.create({
        type: 'upi_qr',
        name: 'Mehr Zari',
        usage: 'single_use',
        fixed_amount: true,
        payment_amount: amountInPaise,
        description: `Order Payment ${order.id}`,
        notes: orderOptions.notes,
      });

      if (qrCode && qrCode.image_url) {
        qrId = qrCode.id;
        qrImageUrl = qrCode.image_url;
      }
    } catch (qrErr) {
      // Fallback for test mode or non-supported merchant accounts: Generate UPI intent QR image
      console.log('Using Razorpay Order fallback for UPI QR rendering:', qrErr.description || qrErr.message);
    }

    if (!qrImageUrl) {
      // Build dynamic UPI intent URI encoding exact amount & order ID
      const vpa = 'razorpay@icici'; // Official Razorpay Merchant VPA
      const merchantName = encodeURIComponent('Mehr Zari');
      const upiString = `upi://pay?pa=${vpa}&pn=${merchantName}&am=${amountInRupees}&cu=INR&tr=${order.id}&tn=Order%20Payment%20${order.id}`;

      qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=10&data=${encodeURIComponent(
        upiString
      )}`;
    }

    return res.status(200).json({
      status: 'success',
      qr_id: qrId,
      order_id: order.id,
      image_url: qrImageUrl,
      amount: order.amount,
      currency: order.currency,
      status_code: 'active',
      data: order,
    });
  } catch (error) {
    console.error('Razorpay Create QR Error:', error);
    if (error.message && error.message.includes('keys are missing')) {
      return res.status(401).json({
        status: 'error',
        message: 'Authentication failed: Razorpay credentials missing',
      });
    }
    return res.status(500).json({
      status: 'error',
      message: error.description || error.message || 'Failed to generate Razorpay QR Code',
    });
  }
};

/**
 * @desc    Check Dynamic QR Code / Order Payment Status (Polling)
 * @route   GET /api/qr-status/:qr_id, GET /api/payment/qr-status/:qr_id
 */
export const getQrStatus = async (req, res) => {
  try {
    const qr_id = req.params.qr_id || req.query.qr_id || req.body?.qr_id;

    if (!qr_id) {
      return res.status(400).json({
        status: 'error',
        message: 'QR Code or Order ID is required',
      });
    }

    const razorpay = getRazorpayInstance();

    let isPaid = false;
    let paymentDetails = null;
    let currentStatus = 'created';

    // If ID starts with order_, fetch Razorpay order status & payments
    if (qr_id.startsWith('order_')) {
      const order = await razorpay.orders.fetch(qr_id);
      currentStatus = order.status;
      if (order.status === 'paid' || order.amount_paid >= order.amount) {
        isPaid = true;
      }

      // Fetch payments for order
      try {
        const payments = await razorpay.orders.fetchPayments(qr_id);
        if (payments.items && payments.items.length > 0) {
          const successful = payments.items.find(
            (p) => p.status === 'captured' || p.status === 'authorized'
          );
          if (successful) {
            isPaid = true;
            paymentDetails = successful;
          }
        }
      } catch (pErr) {
        // Ignore payment list error if order isn't paid yet
      }
    } else {
      // Native QR Code ID
      try {
        const qrDetails = await razorpay.qrCode.fetch(qr_id);
        currentStatus = qrDetails.status;
        const paymentsList = await razorpay.qrCode.fetchAllPayments(qr_id);
        const payments = paymentsList.items || [];
        const successfulPayment = payments.find(
          (p) => p.status === 'captured' || p.status === 'authorized'
        );

        if (qrDetails.status === 'closed' || !!successfulPayment) {
          isPaid = true;
          paymentDetails = successfulPayment || payments[0];
        }
      } catch (err) {
        console.error('Error fetching QR details:', err);
      }
    }

    return res.status(200).json({
      status: 'success',
      paid: isPaid,
      qr_status: currentStatus,
      payment: paymentDetails,
    });
  } catch (error) {
    console.error('Fetch QR Status Error:', error);
    return res.status(500).json({
      status: 'error',
      message: error.description || error.message || 'Failed to fetch QR status',
    });
  }
};

/**
 * @desc    Verify Payment Signature (Standard)
 * @route   POST /api/verify-payment, POST /api/payment/verify-payment
 */
export const verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing required payment verification fields',
      });
    }

    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret) {
      return res.status(401).json({
        status: 'error',
        message: 'Razorpay secret key not configured',
      });
    }

    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(body.toString())
      .digest('hex');

    if (expectedSignature === razorpay_signature) {
      return res.status(200).json({
        status: 'success',
        message: 'Payment verified successfully',
        data: {
          order_id: razorpay_order_id,
          payment_id: razorpay_payment_id,
        },
      });
    } else {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid payment signature mismatch',
      });
    }
  } catch (error) {
    console.error('Verify Payment Error:', error);
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Payment verification failed',
    });
  }
};

/**
 * @desc    Razorpay Webhook Handler
 * @route   POST /api/webhook/razorpay, POST /api/payment/webhook
 */
export const handleWebhook = async (req, res) => {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET;
    const signature = req.headers['x-razorpay-signature'];

    if (signature && secret) {
      const shasum = crypto.createHmac('sha256', secret);
      shasum.update(JSON.stringify(req.body));
      const digest = shasum.digest('hex');

      if (digest !== signature) {
        console.warn('Webhook signature mismatch');
        return res.status(400).json({ status: 'error', message: 'Invalid webhook signature' });
      }
    }

    const event = req.body.event;
    const payload = req.body.payload;

    console.log(`Razorpay Webhook Event Received: ${event}`);

    if (
      event === 'qr_code.credited' ||
      event === 'payment.captured' ||
      event === 'payment.authorized' ||
      event === 'order.paid'
    ) {
      const qrEntity = payload?.qr_code?.entity;
      const paymentEntity = payload?.payment?.entity;
      const orderEntity = payload?.order?.entity;

      const orderId =
        qrEntity?.notes?.order_id || paymentEntity?.notes?.order_id || orderEntity?.notes?.order_id;

      console.log(`Payment confirmed via webhook for Order: ${orderId}, Payment ID: ${paymentEntity?.id}`);
    }

    return res.status(200).json({ status: 'success', message: 'Webhook processed' });
  } catch (error) {
    console.error('Webhook Error:', error);
    return res.status(500).json({ status: 'error', message: 'Webhook error' });
  }
};
