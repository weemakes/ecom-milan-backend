import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const uploadToCloudinary = async (base64Image, folder = 'ecom-milan') => {
  if (!base64Image) return null;
  
  // If already a URL, return as-is
  if (base64Image.startsWith('http://') || base64Image.startsWith('https://')) {
    return base64Image;
  }
  
  // If Cloudinary is not configured, warn and return as-is
  if (!process.env.CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME === 'your_cloud_name') {
    console.warn('Cloudinary is not configured. Returning original image reference.');
    return base64Image;
  }
  
  try {
    const uploadRes = await cloudinary.uploader.upload(base64Image, {
      folder: folder,
    });
    return uploadRes.secure_url;
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw error;
  }
};
