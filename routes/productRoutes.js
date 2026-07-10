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
  placeOrder
} from '../controllers/productController.js';

const router = express.Router();

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

// Slug route (must be at the end)
router.get('/:product_slug', getProductDetailsBySlug);

export default router;
