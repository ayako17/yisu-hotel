// controllers/FavoriteController.js
const FavoriteModel = require('../models/FavoriteModel');

const favoriteModel = new FavoriteModel();

// 安全解析 JSON 字段（mysql2 有时已自动解析，有时还是字符串）
function parseJSON(val, fallback) {
    if (!val) return fallback;
    if (typeof val === 'object') return val;
    try { return JSON.parse(val); }
    catch { return fallback; }
}

class FavoriteController {

    // 添加收藏
    async addFavorite(req, res) {
        try {
            const userId = req.user.user_id;
            const { hotelId } = req.body;

            const existing = await favoriteModel.findByUserAndHotel(userId, hotelId);
            if (existing) {
                return res.json({ code: 200, data: { isFavorite: true }, message: '已经收藏过了' });
            }

            await favoriteModel.create(userId, hotelId);
            res.json({ code: 200, data: { isFavorite: true }, message: '收藏成功' });
        } catch (error) {
            console.error('添加收藏错误:', error);
            res.status(500).json({ code: 500, message: error.message || '收藏失败' });
        }
    }

    // 取消收藏
    async removeFavorite(req, res) {
        try {
            const userId = req.user.user_id;
            const { hotelId } = req.params;

            await favoriteModel.delete(userId, hotelId);
            res.json({ code: 200, data: { isFavorite: false }, message: '取消收藏成功' });
        } catch (error) {
            console.error('取消收藏错误:', error);
            res.status(500).json({ code: 500, message: error.message || '取消收藏失败' });
        }
    }

    // 检查是否已收藏
    async checkFavorite(req, res) {
        try {
            const userId = req.user.user_id;
            const { hotelId } = req.params;

            const row = await favoriteModel.findByUserAndHotel(userId, hotelId);
            res.json({ code: 200, data: { isFavorite: !!row } });
        } catch (error) {
            console.error('检查收藏错误:', error);
            res.status(500).json({ code: 500, message: error.message || '检查收藏失败' });
        }
    }

    // 获取用户收藏列表
    async getFavorites(req, res) {
        try {
            const userId = req.user.user_id;

            const rows = await favoriteModel.findByUserId(userId);

            // 与 HotelService 保持一致：estimatedPrice 直接来自 SQL，只需解析 JSON 字段
            const processed = rows.map(item => ({
                ...item,
                images:         parseJSON(item.images, []),
                tags:           parseJSON(item.tags,   []),
                estimatedPrice: item.estimatedPrice || 0,
            }));

            res.json({ code: 200, data: processed });
        } catch (error) {
            console.error('获取收藏列表错误:', error);
            res.status(500).json({ code: 500, message: error.message || '获取收藏列表失败' });
        }
    }
}

module.exports = new FavoriteController();