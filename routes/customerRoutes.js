import express from 'express';
import {
  subscribeCustomer,
  getCustomers,
  deleteCustomer,
  customerLogin,
  submitContactInquiry,
} from '../controllers/customerController.js';

const router = express.Router();

// Customer Leads, Contact & Auth Routes
router.post('/subscribe', subscribeCustomer);
router.post('/login', customerLogin);
router.post('/contact', submitContactInquiry);
router.get('/', getCustomers);
router.delete('/:id', deleteCustomer);

export default router;
