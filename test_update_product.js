import http from 'http';

const data = JSON.stringify({
  product_name: "Test Product Bug Fix - UPDATED",
  price: 899,
  featured_type: "TOP_PICKS",
  landing_section: "DEALS_ON_KURTIS"
});

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/products/7a14c4cf-a6d0-454b-9007-46cd4904719f',
  method: 'PUT',
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
