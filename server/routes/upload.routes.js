const express = require('express');
const router = express.Router();
const multer = require('multer');
const { uploadFiles } = require('../controllers/upload.controller');
const { protect } = require('../middlewares/auth.middleware');

// Memory storage keeps file in buffer for GCS streaming
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit per file
});

// Route: POST /api/upload
// Accepts multipart/form-data with key 'files' (works for 1 or multiple)
router.post('/', protect, upload.array('files', 10), uploadFiles);

module.exports = router;