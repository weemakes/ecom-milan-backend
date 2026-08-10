import http from 'http';

const data = JSON.stringify({
  user_id: "7a14c4cf-a6d0-454b-9007-46cd4904719f",
  items: [
    {
      product_id: "7a14c4cf-a6d0-454b-9007-46cd4904719f",
      shop_id: "06ac684a-767d-43b6-9a3a-b0bb7dfab0e3",
      product_name: "Test Product Bug Fix - UPDATED",
      qty: 1,
      selling_price: 899,
      vendor_payout_amount: 800,
      platform_earning: 99
    }
  ],
  subtotal: 899,
  discount: 0,
  shipping_charge: 50,
  shipping_address: {
    name: "John Doe",
    address: "123 Main St",
    city: "Mumbai",
    state: "MH",
    pincode: "400001",
    phone: "9876543210"
  },
  payment_method: "COD"
});

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/products/order',
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
