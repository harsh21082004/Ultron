const express = require('express');
const { saveChat, getAllChats, getChatById, deleteAllChats, searchChats } = require('../controllers/chat.controller');
const { protect } = require('../middlewares/auth.middleware');
const router = express.Router();

router.post('/save', protect, saveChat);
router.get('/get/all/:userId',protect,  getAllChats);
router.get('/get/:chatId', protect, getChatById);
router.delete('/delete/all/:userId', protect, deleteAllChats);
router.get('/search', protect, searchChats);

module.exports = router;