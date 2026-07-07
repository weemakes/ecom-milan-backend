# 🚀 Curated Dropshipping Multi-Vendor API Routes Documentation

Welcome to the backend route documentation for the **Curated Hybrid Multi-Vendor E-Commerce Platform**. 

This document explains every route, its target audience (Vendor, Internal CMS Team, or Public Website Customer), required headers/authentication, input payloads, and security shielding rules.

---

## 🏗️ Architecture & Route Shielding Overview

To support your unique workflow:
1. **Vendors** only know their cost (`vendor_purchase_cost`) and profit margin (`vendor_expected_profit`). They never see the platform markup (`platform_selling_price`).
2. **CMS Team** reviews vendor items, uploads professionally enhanced Cloudinary images (`enhanced_images`), sets the retail price (`platform_selling_price`), and ranks items (`curation_score`).
3. **Website Customers** only see active/approved products with professional images and the retail price (`platform_selling_price AS price`).

---

## 🔐 Authentication Headers
Protected routes inspect the following headers (handled via `middlewares/authMiddleware.js`):
* `x-user-id`: UUID of the user
* `x-user-role`: Role of the user (`'VENDOR'`, `'CMS_ADMIN'`, `'CUSTOMER'`)

---

## 🏪 1. Vendor Panel Routes (`/api/vendor`)
**Target Audience:** Local business owners / vendors submitting inventory.
**File:** [routes/vendorRoutes.js](file:///C:/Desktop/CODE/ecommerce-office/ecom-backend/routes/vendorRoutes.js)

### `GET /api/vendor/categories`
* **Purpose:** Fetch existing categories (e.g. *Kurta*, *Pants*) so vendors can select where their product belongs.
* **Access:** Public / Vendor
* **Why:** Vendors are NOT allowed to create categories; they can only choose from existing ones created by CMS.

### `POST /api/vendor/products`
* **Purpose:** Vendor submits a new product. Initial status is automatically set to `PENDING_REVIEW`.
* **Access:** Private (`x-user-role: VENDOR` or `CMS_ADMIN`)
* **Request Body:**
  ```json
  {
    "shop_id": "uuid-of-shop",
    "category_id": "uuid-of-category",
    "name": "Silk Embroidered Kurta",
    "description": "Pure silk material with hand embroidery",
    "vendor_purchase_cost": 800.00,
    "vendor_expected_profit": 200.00,
    "raw_images": ["https://cloudinary.com/raw/img1.jpg", "https://cloudinary.com/raw/img2.jpg"],
    "variants": [{"size": "M", "stock": 10}, {"size": "L", "stock": 15}]
  }
  ```
* **Notes:** Total payout per sale (`vendor_payout_price` = `800 + 200 = 1000.00`) is automatically computed and stored by PostgreSQL.

### `GET /api/vendor/products/shop/:shop_id`
* **Purpose:** Vendor views their submitted catalog and review status.
* **Access:** Private (`x-user-role: VENDOR` or `CMS_ADMIN`)
* **Security Rule:** Strictly shields and omits `platform_selling_price`.

---

## 🎨 2. Internal CMS & Curation Routes (`/api/cms`)
**Target Audience:** Internal enhancement & pricing quality check team.
**File:** [routes/cmsRoutes.js](file:///C:/Desktop/CODE/ecommerce-office/ecom-backend/routes/cmsRoutes.js)

### `GET /api/cms/products`
* **Purpose:** View all submitted products across all vendors to check pricing margins and image quality.
* **Query Params:** `?status=PENDING_REVIEW` (optional filter)
* **Access:** Private (`x-user-role: CMS_ADMIN`)

### `PUT /api/cms/products/:product_id/approve`
* **Purpose:** CMS team uploads professional Cloudinary images, sets the customer-facing retail price, sets the curation rank score, and approves the product to go live on the website.
* **Access:** Private (`x-user-role: CMS_ADMIN`)
* **Request Body:**
  ```json
  {
    "platform_selling_price": 1799.00,
    "enhanced_images": ["https://cloudinary.com/pro/banner1.jpg", "https://cloudinary.com/pro/detail1.jpg"],
    "curation_score": 95,
    "status": "APPROVED"
  }
  ```

### `POST /api/cms/categories`
* **Purpose:** Create new product categories for the platform.
* **Access:** Private (`x-user-role: CMS_ADMIN`)

---

## 🌐 3. Customer Website E-Commerce Routes (`/api/store`)
**Target Audience:** Public frontend website (React / Next.js e-commerce website).
**File:** [routes/storeRoutes.js](file:///C:/Desktop/CODE/ecommerce-office/ecom-backend/routes/storeRoutes.js)

### `GET /api/store/categories`
* **Purpose:** Fetch active categories for the website navbar/header.
* **Access:** Public

### `GET /api/store/products`
* **Purpose:** Fetch live catalog for the website.
* **Query Params:**
  * `?category_id=uuid` - Filter by category
  * `?search=kurta` - Keyword search across names and descriptions
* **Ranking & Mixing:** Automatically sorts by `curation_score DESC, created_at DESC` so the top curated products from various vendors are mixed and shown first to attract buyers!
* **Security Rule:** Returns only `platform_selling_price AS price` and `enhanced_images AS images`. Strictly shields vendor cost and profit.

### `GET /api/store/products/:product_id`
* **Purpose:** Fetch full details, variants, and high-res professional images for the product detail page (PDP).
* **Access:** Public

### `POST /api/store/orders`
* **Purpose:** Place a customer order from the website shopping cart.
* **Request Body:**
  ```json
  {
    "customer_id": "uuid-of-customer",
    "items": [
      {
        "product_id": "uuid-of-product",
        "qty": 2,
        "variant": { "size": "L" }
      }
    ]
  }
  ```
* **Backend Accounting Magic:** The controller automatically looks up exact pricing from PostgreSQL, charges the customer `platform_selling_price`, assigns `vendor_payout_amount` (`vendor_purchase_cost + vendor_expected_profit`) to the vendor, and records `platform_earning` (`platform_selling_price - vendor_payout_amount`) for platform accounting!
