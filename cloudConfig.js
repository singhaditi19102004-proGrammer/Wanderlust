const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Configure Cloudinary using secure Render dashboard keys
cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.CLOUD_API_KEY,
    api_secret: process.env.CLOUD_API_SECRET || process.env.CLOUD_SECRET
});

// Establish the storage engine configuration
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        // CORRECTION: Must use snake_case 'allowed_formats' to register correctly on Cloudinary
        allowed_formats: ["png", "jpg", "jpeg"],
    },
});

module.exports = {
    cloudinary,
    storage,
};