import express from 'express';
import { getAllProductsForCms, enhanceAndApproveProduct, createCategory } from '../controllers/cmsController.js';
import { requireAuth, requireRole } from '../middlewares/authMiddleware.js';

const router = express.Router();

/**
 * ============================================================================
 * CMS & CURATION TEAM ROUTES (INTERNAL ADMIN PANEL)
 * Base Path: /api/cms
 * Purpose: Used by internal CMS/Media team to review vendor submissions, replace raw photos
 *          with professional Cloudinary images, set platform selling price, and manage categories.
 * Headers: Requires x-user-id and x-user-role='CMS_ADMIN'
 * ============================================================================
 */

// All routes below require CMS_ADMIN authentication
router.use(requireAuth, requireRole(['CMS_ADMIN']));

/**
 * @route   GET /api/cms/products
 * @desc    Fetch all products submitted across all vendors. CMS team can see all fields including
 *          vendor_purchase_cost, vendor_expected_profit, and platform_selling_price.
 * @query   [status] - Filter by status (e.g. 'PENDING_REVIEW', 'APPROVED', 'REJECTED')
 * @access  Private (Role: CMS_ADMIN)
 */
router.get('/products', getAllProductsForCms);

/**
 * @route   PUT /api/cms/products/:product_id/approve
 * @desc    Enhance product images, set customer-facing selling price, set curation score, and approve.
 *          Once approved, the product becomes visible on the customer website.
 * @params  product_id - UUID of the product being approved
 * @body    {
 *            platform_selling_price: number, // Website par customer ko dikhne wali price
 *            enhanced_images?: string[],     // Professional Cloudinary image URLs
 *            curation_score?: number,        // Higher score = shown at top of website category
 *            status?: 'APPROVED' | 'REJECTED'
 *          }
 * @access  Private (Role: CMS_ADMIN)
 */
router.put('/products/:product_id/approve', enhanceAndApproveProduct);

/**
 * @route   POST /api/cms/categories
 * @desc    Create a new product category (e.g., Kurta, Pants). Only CMS Admin can create categories.
 * @body    { name: string, parent_id?: UUID, image?: string }
 * @access  Private (Role: CMS_ADMIN)
 */
router.post('/categories', createCategory);

export default router;
