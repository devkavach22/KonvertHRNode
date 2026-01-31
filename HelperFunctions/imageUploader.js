const cloudinary = require("../config/cloudinary");

/**
 * Upload base64 image/document to Cloudinary
 * Updated: Now supports overwriting and cache invalidation
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
    
    // ✅ Public ID fixed (Isse file hamesha identify hoti hai)
    const publicId = `employee_${employeeId}_${type}`;

    // ✅ Upload logic with Overwrite enabled
    const uploadResponse = await cloudinary.uploader.upload(
      `data:image/png;base64,${base64String}`,
      {
        folder: folder,
        public_id: publicId,
        overwrite: true,      // ✅ Purani image ko replace karega
        invalidate: true,     // ✅ CDN cache ko clear karega taaki naya URL/Image turant dikhe
        resource_type: "auto",
        quality: "auto:low",  // ✅ Fast loading ke liye optimized
        fetch_format: "auto"
      }
    );

    console.log(`🚀 Image updated for employee ${employeeId} (${type})`);
    return uploadResponse.secure_url;
  } catch (error) {
    console.error(`Cloudinary upload error for employee ${employeeId} (${type}):`, error.message);
    return "";
  }
};

module.exports = { uploadBase64ToCloudinary };