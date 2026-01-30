const cloudinary = require("../config/cloudinary");

/**
 * Check if image already exists on Cloudinary
 */
const checkImageExists = async (publicId) => {
  try {
    await cloudinary.api.resource(publicId);
    return true; // Image exists
  } catch (error) {
    return false; // Image doesn't exist
  }
};

/**
 * Upload base64 image/document to Cloudinary (with caching)
 */
const uploadBase64ToCloudinary = async (base64String, employeeId, type = "profile") => {
  try {
    if (!base64String) return "";

    const folderMap = {
      profile: "employee_images",
      driving_license: "employee_documents/driving_licenses",
      passbook: "employee_documents/passbooks"
    };

    const folder = folderMap[type] || "employee_documents";
    const publicId = `${folder}/employee_${employeeId}_${type}`;

    // ✅ Check if image already exists (skip upload if exists)
    const exists = await checkImageExists(publicId);
    if (exists) {
      console.log(`⚡ Cache hit: ${publicId} already exists`);
      return `https://res.cloudinary.com/dqfc9zm73/image/upload/${publicId}.jpg`;
    }

    // ✅ Upload only if doesn't exist
    const uploadResponse = await cloudinary.uploader.upload(
      `data:image/png;base64,${base64String}`,
      {
        folder: folder,
        public_id: `employee_${employeeId}_${type}`,
        overwrite: false, // ✅ Don't overwrite existing images
        resource_type: "auto",
        quality: "auto:low", // ✅ Reduce quality for faster uploads
        fetch_format: "auto" // ✅ Auto-optimize format
      }
    );

    return uploadResponse.secure_url;
  } catch (error) {
    console.error(`Cloudinary upload error for employee ${employeeId} (${type}):`, error.message);
    return "";
  }
};

module.exports = { uploadBase64ToCloudinary };