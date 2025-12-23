const multer = require('multer');

// Store file in memory (RAM) so we can stream it directly to GCS
const storage = multer.memoryStorage();

// Limit file size to 5MB (optional)
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, 
});

module.exports = upload;