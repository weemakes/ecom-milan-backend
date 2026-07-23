import express from 'express';
import {
  subscribeCustomer,
  getCustomers,
  deleteCustomer,
} from '../controllers/customerController.js';

const router = express.Router();

// Customer Leads Routes
router.post('/subscribe', subscribeCustomer);
router.get('/', getCustomers);
router.delete('/:id', deleteCustomer);

export default router;
