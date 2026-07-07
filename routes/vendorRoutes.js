import express from 'express';
import { uploadVendorProduct, getVendorProducts, getAvailableCategories } from '../controllers/vendorController.js';
import { requireAuth, requireRole } from '../middlewares/authMiddleware.js';

const router = express.Router();

/**
 * ============================================================================
 * VENDOR PANEL ROUTES
 * Base Path: /api/vendor
 * Purpose: Used by local business owners / vendors to submit products & check their catalog.
 * Security: Shielded from platform retail markup. Vendors only see their base cost & profit.
 * Headers: Requires x-user-id and x-user-role='VENDOR'
 * ============================================================================
 */

/**
 * @route   GET /api/vendor/categories
 * @desc    Fetch available platform categories so vendors can choose where to list their product.
 *          Note: Vendors cannot create new categories; they can only select existing ones.
 * @access  Public / Vendor
 */
router.get('/categories', getAvailableCategories);

/**
 * @route   POST /api/vendor/products
 * @desc    Vendor submits a new product with raw images and pricing.
 *          Status defaults to 'PENDING_REVIEW' so CMS team can inspect and enhance images first.
 * @body    {
 *            shop_id: UUID,
 *            category_id: UUID,
 *            name: string,
 *            description?: string,
 *            vendor_purchase_cost: number,   // Kitne me vendor ko padi
 *            vendor_expected_profit: number, // Vendor ka profit margin
 *            raw_images?: string[],          // Vendor uploaded photos
 *            variants?: object[]
 *          }
 * @access  Private (Role: VENDOR or CMS_ADMIN)
 */
router.post('/products', requireAuth, requireRole(['VENDOR', 'CMS_ADMIN']), uploadVendorProduct);

/**
 * @route   GET /api/vendor/products/shop/:shop_id
 * @desc    Fetch all products submitted by a specific shop/vendor.
 *          Returns vendor_purchase_cost, vendor_expected_profit, and vendor_payout_price.
 *          CRITICAL: Does NOT return platform_selling_price!
 * @params  shop_id - UUID of the shop
 * @access  Private (Role: VENDOR or CMS_ADMIN)
 */
router.get('/products/shop/:shop_id', requireAuth, requireRole(['VENDOR', 'CMS_ADMIN']), getVendorProducts);

export default router;
