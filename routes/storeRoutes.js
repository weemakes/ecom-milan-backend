import express from 'express';
import { 
  getStorefrontCategories, 
  getLiveStorefrontProducts, 
  getStorefrontProductDetails,
  createCustomerOrder 
} from '../controllers/storeController.js';

const router = express.Router();

/**
 * ============================================================================
 * PUBLIC STOREFRONT ROUTES (FOR CUSTOMER WEBSITE)
 * Base Path: /api/store
 * Purpose: Used by the customer-facing e-commerce website (React/Next.js/etc.)
 * Security: Does NOT expose vendor cost or profit margins. Only shows platform_selling_price.
 * ============================================================================
 */

/**
 * @route   GET /api/store/categories
 * @desc    Get all active product categories (e.g., Kurta, Pants, T-shirts) to display in navbar/sidebar.
 * @access  Public
 */
router.get('/categories', getStorefrontCategories);

/**
 * @route   GET /api/store/products
 * @desc    Get mixed, curated products for website catalog. Sorts best products (by curation_score) at the top.
 * @query   [category_id] - Optional UUID to filter by category
 * @query   [search] - Optional text search keyword matching product name/description
 * @access  Public
 */
router.get('/products', getLiveStorefrontProducts);

/**
 * @route   GET /api/store/products/:product_id
 * @desc    Get full details (professional images, variants, price) of a single approved product.
 * @params  product_id - UUID of the product
 * @access  Public
 */
router.get('/products/:product_id', getStorefrontProductDetails);

/**
 * @route   POST /api/store/orders
 * @desc    Customer places a new order on the website. Splits accounting per vendor item automatically.
 * @body    { customer_id?: string, items: [{ product_id: string, qty: number, variant: object }] }
 * @access  Public / Customer Auth
 */
router.post('/orders', createCustomerOrder);

export default router;
