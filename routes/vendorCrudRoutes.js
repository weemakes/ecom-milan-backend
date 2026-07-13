import express from 'express';
import {
  getAllVendors,
  getVendorById,
  createVendor,
  updateVendor,
  deleteVendor
} from '../controllers/vendorCrudController.js';

const router = express.Router();

router.route('/')
  .get(getAllVendors)
  .post(createVendor);

router.route('/:id')
  .get(getVendorById)
  .put(updateVendor)
  .delete(deleteVendor);

export default router;
