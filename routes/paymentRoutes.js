import express from 'express';
import {
  createOrder,
  createQrCode,
  getQrStatus,
  verifyPayment,
  handleWebhook,
} from '../controllers/paymentController.js';

const router = express.Router();

// Order creation & QR generation
router.post('/create-order', createOrder);
router.post('/create-qr', createQrCode);
router.post('/payment/create-order', createOrder);
router.post('/payment/create-qr', createQrCode);

// Verification & Status checking
router.post('/verify-payment', verifyPayment);
router.post('/payment/verify-payment', verifyPayment);
router.get('/qr-status/:qr_id', getQrStatus);
router.get('/payment/qr-status/:qr_id', getQrStatus);
router.post('/verify-qr-payment', getQrStatus);

// Razorpay Webhook
router.post('/webhook/razorpay', handleWebhook);
router.post('/payment/webhook', handleWebhook);

export default router;
