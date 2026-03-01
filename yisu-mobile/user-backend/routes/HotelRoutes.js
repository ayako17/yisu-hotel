const express = require('express');
const router = express.Router();
const hotelController = require('../controllers/HotelController');

// 酒店搜索
router.get('/search', hotelController.searchHotels.bind(hotelController));

// 获取筛选选项
router.get('/filters', hotelController.getFilterOptions.bind(hotelController));

// GET /api/hotels/:hotelId/calendar-prices?startDate=2026-02-01&endDate=2026-04-30
router.get('/:hotelId/calendar-prices', hotelController.getCalendarPrices);

// GET /api/hotels/:hotelId/room-prices?date=2026-03-01
router.get('/:hotelId/room-prices', hotelController.getRoomPrices);


// 酒店详情
router.get('/:hotelId', hotelController.getHotelDetail.bind(hotelController));

// 获取酒店图片
router.get('/:hotelId/media', async (req, res) => {
    try {
        const { hotelId } = req.params;
        const db = require('../utils/db');
        const [media] = await db.execute(
            'SELECT * FROM hotel_media WHERE hotel_id = ? ORDER BY sort_order, is_cover DESC',
            [hotelId]
        );
        res.json({
            code: 200,
            data: media,
            message: 'success'
        });
    } catch (error) {
        res.status(500).json({ code: 500, message: error.message });
    }
});

// 获取酒店房型
router.get('/:hotelId/room-types', async (req, res) => {
    try {
        const { hotelId } = req.params;
        const db = require('../utils/db');
        const [roomTypes] = await db.execute(
            `SELECT rt.*,
                (SELECT COUNT(*) FROM orders 
                 WHERE room_type_id = rt.room_type_id 
                 AND status IN ('paid', 'checked_in')
                 AND check_in_date <= CURDATE() 
                 AND check_out_date > CURDATE()) as booked_rooms
            FROM room_types rt
            WHERE rt.hotel_id = ? AND rt.status = 'active'
            ORDER BY rt.base_price`,
            [hotelId]
        );
        res.json({
            code: 200,
            data: roomTypes,
            message: 'success'
        });
    } catch (error) {
        res.status(500).json({ code: 500, message: error.message });
    }
});

// 获取酒店标签
router.get('/:hotelId/tags', async (req, res) => {
    try {
        const { hotelId } = req.params;
        const db = require('../utils/db');
        const [tags] = await db.execute(
            `SELECT t.* 
            FROM tags t
            JOIN tag_relations tr ON t.tag_id = tr.tag_id
            WHERE tr.target_type = 'hotel' AND tr.target_id = ?
            ORDER BY t.sort_order`,
            [hotelId]
        );
        res.json({
            code: 200,
            data: tags,
            message: 'success'
        });
    } catch (error) {
        res.status(500).json({ code: 500, message: error.message });
    }
});

// 获取酒店房间标签
router.get('/:hotelId/room-types/tags', async (req, res) => {
    try {
        const { hotelId } = req.params;
        const db = require('../utils/db');
        const [rows] = await db.execute(
            `SELECT tr.target_id as room_type_id, t.* 
            FROM tags t
            JOIN tag_relations tr ON t.tag_id = tr.tag_id
            WHERE tr.target_type = 'room_type' AND tr.target_id IN (
                SELECT room_type_id FROM room_types WHERE hotel_id = ?
            )
            ORDER BY tr.target_id, t.sort_order`,
            [hotelId]
        );
        
        // 按 room_type_id 分组
        const groupedTags = {};
        rows.forEach(row => {
            const roomTypeId = row.room_type_id;
            if (!groupedTags[roomTypeId]) {
                groupedTags[roomTypeId] = [];
            }
            groupedTags[roomTypeId].push({
                id: row.tag_id,
                name: row.name,
                tag_type: row.tag_type,
                sort_order: row.sort_order
            });
        });
        
        res.json({
            code: 200,
            data: groupedTags,
            message: 'success'
        });
    } catch (error) {
        res.status(500).json({ code: 500, message: error.message });
    }
});
module.exports = router;
