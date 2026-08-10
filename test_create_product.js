import http from 'http';

const data = JSON.stringify({
  product_name: "Test Product Bug Fix",
  product_slug: "test-product-bug-fix-001",
  category_id: "8a29acd4-3477-4aa4-be29-8172a3027b6a",
  vendor_id: "06ac684a-767d-43b6-9a3a-b0bb7dfab0e3",
  description: "Testing bug fix for product creation",
  price: 999,
  discounted_price: 799,
  quantity_in_stock: 25,
  is_active: true,
  is_featured: false,
  images: [],
  variants: [],
  featured_type: "TOP_PICKS,TODAY_DEALS",
  landing_section: "DEALS_ON_SAREES",
  occasion: "Eid"
});

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/products',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, (res) => {
  let resData = '';
  res.on('data', (chunk) => {
    resData += chunk;
  });
  res.on('end', () => {
    console.log(`Status Code: ${res.statusCode}`);
    console.log('Response:', resData);
  });
});

req.on('error', (error) => {
  console.error('Error:', error);
});

req.write(data);
req.end();
