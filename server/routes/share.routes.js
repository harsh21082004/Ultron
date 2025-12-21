const express = require('express');
const router = express.Router();
const shareController = require('../controllers/share.controller');
const { protect } = require('../middlewares/auth.middleware');

// POST /api/share/create - Protected
router.post('/create', protect, shareController.createShareLink);

// GET /api/share/:shareId/preview - Public (No auth needed to view preview)
router.get('/:shareId/preview', shareController.getSharedPreview);
 
// POST /api/share/:shareId/import - Protected (Need account to save)
router.post('/:shareId/import', protect, shareController.importSharedChat);

module.exports = router;