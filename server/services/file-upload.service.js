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

const uploadBase64ToGCS = (base64String, folder = 'generated-images') => {
  return new Promise((resolve, reject) => {
    try {
      // 1. Extract Mime Type and Buffer
      // Format: "data:image/jpeg;base64,/9j/4AAQSk..."
      const matches = base64String.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      console.log('Base64 upload matches:', matches);
      
      if (!matches || matches.length !== 3) {
        return reject(new Error('Invalid base64 string'));
      }

      const mimeType = matches[1];
      const buffer = Buffer.from(matches[2], 'base64');
      const extension = mimeType.split('/')[1]; // e.g., 'jpeg'
      const fileName = `${folder}/${uuidv4()}.${extension}`;

      // 2. Upload to Bucket
      const blob = bucket.file(fileName);
      const blobStream = blob.createWriteStream({
        resumable: false,
        contentType: mimeType,
      });

      blobStream.on('error', (err) => reject(err));

      blobStream.on('finish', () => {
        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;
        resolve(publicUrl);
      });

      blobStream.end(buffer);

    } catch (error) {
      reject(error);
    }
  });
};

module.exports = { uploadFilesToGCS, uploadBase64ToGCS };