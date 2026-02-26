const express = require('express');
const router = express.Router();
const favoriteController = require('../controllers/FavoriteController');
const AuthMiddleware = require('../middlewares/AuthMiddleware');

// 所有收藏路由都需要认证
router.use(AuthMiddleware.verifyToken);

// 添加收藏
router.post('/', favoriteController.addFavorite);

// 取消收藏
router.delete('/:hotelId', favoriteController.removeFavorite);

// 检查是否收藏
router.get('/check/:hotelId', favoriteController.checkFavorite);

// 获取收藏列表
router.get('/', favoriteController.getFavorites);

module.exports = router;