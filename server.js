import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDb } from './config/initDb.js';

import vendorRoutes from './routes/vendorRoutes.js';
import cmsRoutes from './routes/cmsRoutes.js';
import storeRoutes from './routes/storeRoutes.js';
import productRoutes from './routes/productRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import vendorCrudRoutes from './routes/vendorCrudRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Initialize PostgreSQL Database tables
initDb();

// Routes
app.use('/api/vendor', vendorRoutes);
app.use('/api/cms', cmsRoutes);
app.use('/api/store', storeRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/vendors', vendorCrudRoutes);

// Basic Routes
app.get('/', (req, res) => {
  res.json({
    status: 'success',
    message: 'Curated Dropshipping Multi-Vendor E-commerce API is running',
    timestamp: new Date()
  });
});

app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    uptime: process.uptime(),
    timestamp: Date.now()
  });
});

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({
    status: 'error',
    message: 'Route not found'
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    status: 'error',
    message: err.message || 'Internal Server Error'
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server is running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});
