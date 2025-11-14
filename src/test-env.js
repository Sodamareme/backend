require('dotenv').config();

console.log('Testing .env file loading:');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Found' : 'Missing');
console.log('JWT_SECRET:', process.env.JWT_SECRET ? 'Found' : 'Missing');
console.log('CLOUDINARY_CLOUD_NAME:', process.env.CLOUDINARY_CLOUD_NAME ? 'Found' : 'Missing');
console.log('CLOUDINARY_API_KEY:', process.env.CLOUDINARY_API_KEY ? 'Found' : 'Missing');
console.log('CLOUDINARY_API_SECRET:', process.env.CLOUDINARY_API_SECRET ? 'Found' : 'Missing');

// Test Cloudinary configuration
try {
  const cloudinary = require('cloudinary').v2;
  
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  
  console.log('Cloudinary configuration set successfully');
  
  // Test Cloudinary connection
  cloudinary.api.ping((error, result) => {
    if (error) {
      console.error('Cloudinary connection test failed:', error.message);
    } else {
      console.log('Cloudinary connection test succeeded:', result);
    }
  });
} catch (error) {
  console.error('Error configuring Cloudinary:', error.message);
} 