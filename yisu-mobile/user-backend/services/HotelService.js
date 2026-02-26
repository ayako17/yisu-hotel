const HotelModel = require('../models/HotelModel');

class HotelService {
    async searchHotels(searchParams) {
        try {
            const decodedParams = {};
            for (const [key, value] of Object.entries(searchParams)) {
                if (typeof value === 'string') {
                    try { decodedParams[key] = decodeURIComponent(value); }
                    catch (e) { decodedParams[key] = value; }
                } else {
                    decodedParams[key] = value;
                }
            }

            const {
                city = '', keyword = '', checkIn, checkOut,
                rooms = 1, adults = 2, children = 0,
                minPrice, maxPrice, starRating = [], tagIds = [],
                page = 1, pageSize = 10
            } = decodedParams;

            const filters = {
                city, keyword, minPrice, maxPrice,
                starRating: Array.isArray(starRating) ? starRating : [starRating],
                tagIds:     Array.isArray(tagIds)     ? tagIds     : [tagIds],
                limit:  parseInt(pageSize),
                offset: (parseInt(page) - 1) * parseInt(pageSize)
            };
            Object.keys(filters).forEach(key => {
                if (!filters[key] || (Array.isArray(filters[key]) && filters[key].length === 0)) {
                    delete filters[key];
                }
            });

            const hotels = await HotelModel.findHotels(filters);

            let nights = 1;
            if (checkIn && checkOut) {
                nights = Math.ceil((new Date(checkOut) - new Date(checkIn)) / 86400000);
            }

            const safeJSONParse = (data, defaultValue = []) => {
                if (!data) return defaultValue;
                if (typeof data !== 'string') return data;
                try { return JSON.parse(data); } catch { return defaultValue; }
            };

            let priceMap = new Map();
            if (checkIn && hotels.length > 0) {
                const hotelIds = hotels.map(h => h.hotel_id);
                try {
                    priceMap = await HotelModel.getBatchMinPriceByDate(hotelIds, checkIn);
                } catch (e) {
                    console.warn('批量价格查询失败，降级 base_price:', e.message);
                }
            }

            const hotelsWithPrice = hotels.map(hotel => {
                const dynamicPrice   = priceMap.get(hotel.hotel_id);
                const estimatedPrice = dynamicPrice !== undefined ? dynamicPrice : (hotel.min_price || 0);
                return {
                    ...hotel,
                    images:         safeJSONParse(hotel.images, []),
                    tags:           safeJSONParse(hotel.tags,   []),
                    estimatedPrice,
                    totalPrice: estimatedPrice * nights * parseInt(rooms),
                    latitude: hotel.latitude ? parseFloat(hotel.latitude) : null,
                    longitude: hotel.longitude ? parseFloat(hotel.longitude) : null
                };
            });

            return {
                list: hotelsWithPrice,
                searchParams: { checkIn, checkOut, nights, rooms, adults, children }
            };
        } catch (error) {
            throw new Error(`搜索酒店失败: ${error.message}`);
        }
    }

    async getHotelDetail(hotelId) {
        try {
            const hotel = await HotelModel.findById(hotelId);
            if (!hotel) throw new Error('酒店不存在');
            const safeJSONParse = (data, def = []) => {
                if (!data) return def;
                if (typeof data !== 'string') return data;
                try { return JSON.parse(data); } catch { return def; }
            };
            hotel.media      = safeJSONParse(hotel.media,      []);
            hotel.tags       = safeJSONParse(hotel.tags,       []);
            hotel.room_types = safeJSONParse(hotel.room_types, []);
            return hotel;
        } catch (error) {
            throw new Error(`获取酒店详情失败: ${error.message}`);
        }
    }

    async getHotelCalendarPrices(hotelId, startDate, endDate) {
        try {
            return await HotelModel.getHotelCalendarPrices(hotelId, startDate, endDate);
        } catch (error) {
            throw new Error(`获取日历价格失败: ${error.message}`);
        }
    }

    async getRoomPricesByDate(hotelId, date) {
        try {
            const rows = await HotelModel.getRoomTypesPriceByDate(hotelId, date);
            const result = {};
            for (const row of rows) {
                result[row.room_type_id] = row.final_price !== null
                    ? parseFloat(row.final_price)
                    : parseFloat(row.base_price);
            }
            return result;
        } catch (error) {
            throw new Error(`获取房型价格失败: ${error.message}`);
        }
    }

    async getFilterOptions() {
        try {
            const TagModel = require('../models/TagModel');
            const tags = await TagModel.getAllTags();
            const starRatings = [
                {value:1,label:'一星级'},{value:2,label:'二星级'},{value:3,label:'三星级'},
                {value:4,label:'四星级'},{value:5,label:'五星级'}
            ];
            const priceRanges = [
                {label:'¥200以下',min:0,max:200},{label:'¥200–350',min:200,max:350},
                {label:'¥350–500',min:350,max:500},{label:'¥500–700',min:500,max:700},
                {label:'¥700–1000',min:700,max:1000},{label:'¥1000–1500',min:1000,max:1500},
                {label:'¥1500–2500',min:1500,max:2500},{label:'¥2500以上',min:2500,max:99999},
            ];
            return { tags, starRatings, priceRanges };
        } catch (error) {
            throw new Error(`获取筛选选项失败: ${error.message}`);
        }
    }
}

module.exports = HotelService;