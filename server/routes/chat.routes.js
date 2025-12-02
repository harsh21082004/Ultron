const express = require('express');
const { saveChat, getAllChats, getChatById, deleteAllChats } = require('../controllers/chat.controller');
const { protect } = require('../middlewares/auth.middleware');
const router = express.Router();

router.post('/save', protect, saveChat);
router.get('/get/all/:userId',protect,  getAllChats);
router.get('/get/:chatId', protect, getChatById);
router.delete('/delete/all/:userId', protect, deleteAllChats)

module.exports = router;