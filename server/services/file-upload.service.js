const bucket = require('../config/storage');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

/**
 * Upload a single file to GCS
 */
const uploadSingleFile = (file, folder) => {
  return new Promise((resolve, reject) => {
    const uniqueName = `${folder}/${uuidv4()}${path.extname(file.originalname)}`;
    const blob = bucket.file(uniqueName);
    
    const blobStream = blob.createWriteStream({
      resumable: false,
      contentType: file.mimetype,
    });

    blobStream.on('error', (err) => reject(err));

    blobStream.on('finish', () => {
      // Public URL (assuming bucket is public)
      const publicUrl = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;
      
      resolve({
        originalName: file.originalname,
        mimeType: file.mimetype,
        url: publicUrl,
        size: file.size
      });
    });

    blobStream.end(file.buffer);
  });
};

/**
 * Upload multiple files in parallel
 */
const uploadFilesToGCS = async (files, folder = 'uploads') => {
  if (!files || files.length === 0) return [];
  
  // Map all uploads to promises and wait for all to finish
  const uploadPromises = files.map(file => uploadSingleFile(file, folder));
  return await Promise.all(uploadPromises);
};

module.exports = { uploadFilesToGCS };