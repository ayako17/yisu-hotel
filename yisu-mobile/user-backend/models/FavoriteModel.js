// models/FavoriteModel.js
const db = require('../utils/db');

class FavoriteModel {

    // 检查是否已收藏
    async findByUserAndHotel(userId, hotelId) {
        const [rows] = await db.execute(
            'SELECT favorite_id FROM favorites WHERE user_id = ? AND hotel_id = ?',
            [userId, hotelId]
        );
        return rows[0] || null;
    }

    // 添加收藏
    async create(userId, hotelId) {
        const [result] = await db.execute(
            'INSERT INTO favorites (user_id, hotel_id) VALUES (?, ?)',
            [userId, hotelId]
        );
        return result;
    }

    // 取消收藏
    async delete(userId, hotelId) {
        const [result] = await db.execute(
            'DELETE FROM favorites WHERE user_id = ? AND hotel_id = ?',
            [userId, hotelId]
        );
        return result;
    }

    // 获取用户收藏列表
    // estimatedPrice 与搜索列表保持一致：MIN(base_price)，一次 SQL 全部取出
    async findByUserId(userId) {
        const [rows] = await db.execute(`
            SELECT
                f.favorite_id,
                f.created_at,
                h.hotel_id,
                h.name_zh,
                h.name_en,
                h.star_rating,
                h.city,
                h.address,
                h.phone,
                h.latitude,
                h.longitude,
                -- 与搜索列表一致：取房型基础最低价作为估价
                (
                    SELECT MIN(base_price)
                    FROM room_types
                    WHERE hotel_id = h.hotel_id AND status = 'active'
                ) AS estimatedPrice,
                -- 封面图
                (
                    SELECT media_url
                    FROM hotel_media
                    WHERE hotel_id = h.hotel_id AND is_cover = 1
                    LIMIT 1
                ) AS hotel_image,
                -- 所有图片
                CASE
                    WHEN EXISTS (SELECT 1 FROM hotel_media WHERE hotel_id = h.hotel_id)
                    THEN (
                        SELECT JSON_ARRAYAGG(
                            JSON_OBJECT('media_url', media_url, 'is_cover', is_cover)
                        )
                        FROM hotel_media
                        WHERE hotel_id = h.hotel_id
                    )
                    ELSE NULL
                END AS images,
                -- 标签
                CASE
                    WHEN EXISTS (
                        SELECT 1 FROM tag_relations tr
                        WHERE tr.target_id = h.hotel_id
                          AND tr.target_type IN ('facility', 'special')
                    )
                    THEN (
                        SELECT JSON_ARRAYAGG(
                            JSON_OBJECT('id', t.tag_id, 'name', t.name, 'tag_type', tr.target_type)
                        )
                        FROM tag_relations tr
                        JOIN tags t ON tr.tag_id = t.tag_id
                        WHERE tr.target_id = h.hotel_id
                          AND tr.target_type IN ('facility', 'special')
                    )
                    ELSE NULL
                END AS tags
            FROM favorites f
            JOIN hotels h ON f.hotel_id = h.hotel_id
            WHERE f.user_id = ?
            ORDER BY f.created_at DESC
        `, [userId]);

        return rows;
    }
}

module.exports = FavoriteModel;