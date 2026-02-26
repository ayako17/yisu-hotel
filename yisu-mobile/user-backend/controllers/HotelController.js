const HotelService = require('../services/HotelService');
const hotelService = new HotelService();

class HotelController {
    async searchHotels(req, res) {
        try {
            console.log('搜索参数:', req.query);
            const result = await hotelService.searchHotels(req.query);
            res.json(result);
        } catch (error) {
            console.error('搜索酒店错误:', error);
            res.status(500).json({ error: '服务器错误', message: error.message, stack: error.stack });
        }
    }

    async getHotelDetail(req, res) {
        try {
            const { hotelId } = req.params;
            const hotel = await hotelService.getHotelDetail(hotelId);
            res.json({ code: 200, data: hotel, message: 'success' });
        } catch (error) {
            res.status(500).json({ code: 500, message: error.message });
        }
    }

    async getFilterOptions(req, res) {
        try {
            const options = await hotelService.getFilterOptions();
            res.json({ code: 200, data: options, message: 'success' });
        } catch (error) {
            res.status(500).json({ code: 500, message: error.message });
        }
    }

    // 新增：GET /api/hotels/:hotelId/calendar-prices?startDate=&endDate=
    async getCalendarPrices(req, res) {
        try {
            const { hotelId } = req.params;
            const { startDate, endDate } = req.query;
            if (!startDate || !endDate) {
                return res.status(400).json({ code: 400, message: 'startDate 和 endDate 必填' });
            }
            const prices = await hotelService.getHotelCalendarPrices(hotelId, startDate, endDate);
            res.json({ code: 200, data: prices, message: 'success' });
        } catch (error) {
            console.error('获取日历价格错误:', error);
            res.status(500).json({ code: 500, message: error.message });
        }
    }

    // 新增：GET /api/hotels/:hotelId/room-prices?date=
    async getRoomPrices(req, res) {
        try {
            const { hotelId } = req.params;
            const { date } = req.query;
            if (!date) {
                return res.status(400).json({ code: 400, message: 'date 必填' });
            }
            const prices = await hotelService.getRoomPricesByDate(hotelId, date);
            res.json({ code: 200, data: prices, message: 'success' });
        } catch (error) {
            console.error('获取房型价格错误:', error);
            res.status(500).json({ code: 500, message: error.message });
        }
    }
}

module.exports = new HotelController();