const cloudinary = require("cloudinary").v2
const { promisify } = require('util')
const fs = require('fs')
const unlinkAsync = promisify(fs.unlink)

/**
 * Uploads a file to Cloudinary
 * @param {Object} file - The file object from multer
 * @param {String} folder - The folder in Cloudinary where to store the file
 * @param {Number} [height] - Optional height for image resizing
 * @param {Number} [quality] - Optional quality for image compression
 * @returns {Promise<Object>} - The upload result from Cloudinary
 */
exports.uploadImageToCloudinary = async (file, folder, height, quality) => {
  try {
    if (!file) {
      throw new Error('No file provided')
    }

    // express-fileupload uses 'name' and 'size', not 'originalname'
    const fileName = file.name || file.originalname || 'unknown'
    const fileSize = file.size || 0

    const options = {
      folder,
      resource_type: 'auto',
      use_filename: true,
      unique_filename: true,
      overwrite: false,
      timeout: 120000, // 2 minutes timeout
    }

    if (height) options.height = height
    if (quality) options.quality = quality

    console.log(`Uploading file to Cloudinary: ${fileName} (${fileSize} bytes)`)
    console.log('File object properties:', Object.keys(file))
    console.log('tempFilePath:', file.tempFilePath)

    if (!file.tempFilePath) {
      throw new Error('Missing required parameter - file (no tempFilePath found)')
    }

    // Upload the file
    const result = await cloudinary.uploader.upload(file.tempFilePath, options)
    
    // Clean up the temp file
    if (file.tempFilePath) {
      try {
        await unlinkAsync(file.tempFilePath)
      } catch (cleanupError) {
        console.error('Error cleaning up temp file:', cleanupError)
      }
    }

    console.log(`Successfully uploaded to Cloudinary: ${result.secure_url}`)
    return result
    
  } catch (error) {
    console.error('Error in uploadImageToCloudinary:', error)
    
    // Clean up temp file in case of error
    if (file?.tempFilePath) {
      try {
        await unlinkAsync(file.tempFilePath).catch(e => console.error('Cleanup failed:', e))
      } catch (e) {
        console.error('Error during cleanup after failed upload:', e)
      }
    }
    
    // Enhance error message for common issues
    if (error.message.includes('File size too large')) {
      throw new Error('File size too large. Maximum size is 50MB.')
    } else if (error.message.includes('Invalid image file')) {
      throw new Error('Invalid file format. Please upload a valid image or video file.')
    } else if (error.http_code === 429) {
      throw new Error('Too many uploads. Please try again later.')
    }
    
    throw error // Re-throw the original error if not handled above
  }
}
