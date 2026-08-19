import express from 'express';
import {
  subscribeCustomer,
  getCustomers,
  deleteCustomer,
  customerLogin,
} from '../controllers/customerController.js';

const router = express.Router();

// Customer Leads & Auth Routes
router.post('/subscribe', subscribeCustomer);
router.post('/login', customerLogin);
router.get('/', getCustomers);
router.delete('/:id', deleteCustomer);

export default router;
