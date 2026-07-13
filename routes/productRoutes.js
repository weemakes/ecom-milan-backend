import express from 'express';
import {
  getTopPicks,
  getTodayDeals,
  getDealsOnSarees,
  getBestValue,
  getNewArrivals,
  getTrendingNow,
  getShopByOccasion,
  getAllCategories,
  getProductsByCategory,
  getProductDetailsBySlug,
  addToCart,
  checkoutSummary,
  placeOrder,
  getAdminProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getUniqueOccasions,
  getProductsBySection,
  getProductsByOccasionName,
  getProductsOnSale,
  getAllProductsForAdmin
} from '../controllers/productController.js';

const router = express.Router();

// ─── Static routes FIRST (must be before /:id) ─────────────────────────────

// Admin campaign endpoints
router.get('/admin/all', getAllProductsForAdmin);
router.get('/admin/occasions', getUniqueOccasions);
router.get('/admin/section/:section', getProductsBySection);
router.get('/admin/occasion/:name', getProductsByOccasionName);
router.get('/admin/on-sale', getProductsOnSale);

// Product listing & storefront endpoints
router.get('/categories', getAllCategories);
router.get('/category/:category_slug', getProductsByCategory);
router.get('/top-picks', getTopPicks);
router.get('/today-deals', getTodayDeals);
router.get('/deals-on-sarees', getDealsOnSarees);
router.get('/best-value', getBestValue);
router.get('/new-arrivals', getNewArrivals);
router.get('/trending-now', getTrendingNow);
router.get('/shop-by-occasion', getShopByOccasion);

// E-commerce action routes
router.post('/cart/add', addToCart);
router.post('/checkout', checkoutSummary);
router.post('/order', placeOrder);

// ─── Admin CRUD — dynamic :id (after all static routes) ─────────────────────
router.get('/', getAdminProducts);
router.post('/', createProduct);
router.put('/:id', updateProduct);
router.delete('/:id', deleteProduct);
router.get('/:id', getProductById);

// Slug fallback (must be last)
router.get('/:product_slug', getProductDetailsBySlug);

export default router;

