const pool = require('../utils/db');

class HotelModel {
    // 查询酒店列表（支持筛选）
    static async findHotels(filters) {
        let sql = `
            SELECT h.*, 
                   (SELECT JSON_ARRAYAGG(
                       JSON_OBJECT('media_id', hm.media_id, 'media_url', hm.media_url, 'is_cover', hm.is_cover)
                   ) FROM hotel_media hm WHERE hm.hotel_id = h.hotel_id AND hm.media_type = 'image') as images,
                   (SELECT JSON_ARRAYAGG(
                       JSON_OBJECT('tag_id', t.tag_id, 'name', t.name, 'tag_type', t.tag_type)
                   ) FROM tag_relations tr 
                   JOIN tags t ON tr.tag_id = t.tag_id 
                   WHERE tr.target_type = 'hotel' AND tr.target_id = h.hotel_id) as tags,
                   (SELECT MIN(base_price) FROM room_types 
                    WHERE hotel_id = h.hotel_id AND status = 'active') as min_price,
                latitude,       
                longitude
            FROM hotels h
            WHERE h.status = 'approved'
        `;
        
        const params = [];
        
        // 城市筛选
        if (filters.city) {
            sql += ' AND h.city = ?';
            params.push(filters.city);
        }
        
        // 价格区间筛选（使用最低价格）
        if (filters.minPrice || filters.maxPrice) {
            sql += ` AND h.hotel_id IN (
                SELECT DISTINCT hotel_id FROM room_types 
                WHERE status = 'active'
                AND base_price BETWEEN ? AND ?
            )`;
            params.push(filters.minPrice || 0);
            params.push(filters.maxPrice || 999999);
        }
        
        // 星级筛选
        if (filters.starRating && filters.starRating.length > 0) {
            sql += ' AND h.star_rating IN (?)';
            params.push(filters.starRating);
        }
        
        // 标签筛选
        if (filters.tagIds && filters.tagIds.length > 0) {
            sql += ` AND h.hotel_id IN (
                SELECT target_id FROM tag_relations 
                WHERE target_type = 'hotel' AND tag_id IN (?)
                GROUP BY target_id 
                HAVING COUNT(DISTINCT tag_id) = ?
            )`;
            params.push(filters.tagIds);
            params.push(filters.tagIds.length);
        }
        
        // 关键字搜索（酒店名称、地址 + 房型名称、床型、描述 + 标签名称）
        if (filters.keyword) {
            sql += ` AND (
                h.name_zh LIKE ? 
                OR h.name_en LIKE ? 
                OR h.address LIKE ?
                OR h.hotel_id IN (
                    SELECT DISTINCT hotel_id FROM room_types 
                    WHERE status = 'active'
                    AND (
                        name LIKE ? 
                        OR bed_info LIKE ?
                        OR description LIKE ?
                    )
                )
                OR h.hotel_id IN (
                    SELECT DISTINCT tr.target_id FROM tag_relations tr
                    JOIN tags t ON tr.tag_id = t.tag_id
                    WHERE tr.target_type = 'hotel'
                    AND t.name LIKE ?
                )
            )`;
            
            const keyword = `%${filters.keyword}%`;
            // 7个参数：name_zh, name_en, address, room_types.name, room_types.bed_info, room_types.description, tags.name
            params.push(keyword, keyword, keyword, keyword, keyword, keyword, keyword);
        }
        
        // 分页
        const limit = filters.limit || 10;
        const offset = filters.offset || 0;
        sql += ' ORDER BY h.created_at DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);
        
        console.log('SQL:', sql);
        console.log('Params:', params);
        
        const [rows] = await pool.query(sql, params);
        return rows;
    }
    
    // 获取酒店详情
    static async findById(hotelId) {
        const sql = `
            SELECT h.*, 
                   (SELECT JSON_ARRAYAGG(
                       JSON_OBJECT('media_id', hm.media_id, 'media_url', hm.media_url, 'media_type', hm.media_type, 'sort_order', hm.sort_order)
                   ) FROM hotel_media hm WHERE hm.hotel_id = h.hotel_id ORDER BY hm.sort_order DESC) as media,
                   (SELECT JSON_ARRAYAGG(
                       JSON_OBJECT('tag_id', t.tag_id, 'name', t.name, 'tag_type', t.tag_type)
                   ) FROM tag_relations tr 
                   JOIN tags t ON tr.tag_id = t.tag_id 
                   WHERE tr.target_type = 'hotel' AND tr.target_id = h.hotel_id) as tags,
                   (SELECT JSON_ARRAYAGG(
                       JSON_OBJECT('room_type_id', rt.room_type_id, 'name', rt.name, 'bed_info', rt.bed_info, 
                                  'max_guests', rt.max_guests, 'base_price', rt.base_price, 'description', rt.description)
                   ) FROM room_types rt WHERE rt.hotel_id = h.hotel_id AND rt.status = 'active') as room_types
            FROM hotels h
            WHERE h.hotel_id = ? AND h.status = 'approved'
        `;
        
        const [rows] = await pool.query(sql, [hotelId]);
        return rows[0];
    }
    
    // 获取热门城市列表（有酒店的城市）
    static async getHotCities() {
        const sql = `
            SELECT city, COUNT(*) as hotel_count 
            FROM hotels 
            WHERE status = 'approved' AND city IS NOT NULL 
            GROUP BY city 
            ORDER BY hotel_count DESC 
            LIMIT 10
        `;
        const [rows] = await pool.query(sql);
        return rows;
    }
/**
 * 批量获取多个酒店在指定入住日期的最低价格
 * 逻辑：优先取 room_calendar.final_price，当天无日历记录则 fallback 到 base_price
 * @param {number[]} hotelIds
 * @param {string}   checkInDate  'YYYY-MM-DD'
 * @returns {Promise<Map<number, number>>}  hotelId -> minPrice
 */
static async getBatchMinPriceByDate(hotelIds, checkInDate) {
    if (!hotelIds || hotelIds.length === 0) return new Map();

    // 一次查询所有房型及其当天日历价（LEFT JOIN，无日历则 final_price=NULL）
    const placeholders = hotelIds.map(() => '?').join(',');
    const [rows] = await pool.query(`
        SELECT
            rt.hotel_id,
            rt.base_price,
            rc.final_price
        FROM room_types rt
        LEFT JOIN room_calendar rc
            ON  rc.room_type_id = rt.room_type_id
            AND rc.date          = ?
            AND rc.status        = 'open'
        WHERE rt.hotel_id IN (${placeholders})
    `, [checkInDate, ...hotelIds]);

    // 按 hotel_id 分组，取最低有效价
    const map = new Map();
    for (const row of rows) {
        const price = row.final_price !== null
            ? parseFloat(row.final_price)
            : parseFloat(row.base_price);
        const cur = map.get(row.hotel_id);
        if (cur === undefined || price < cur) {
            map.set(row.hotel_id, price);
        }
    }
    return map;
}

/**
 * 获取某酒店在指定日期范围内每一天的最低价
 * 用于详情页日历上展示价格
 * @param {number} hotelId
 * @param {string} startDate  'YYYY-MM-DD'（含）
 * @param {string} endDate    'YYYY-MM-DD'（含）
 * @returns {Promise<Object>}  { 'YYYY-MM-DD': minPrice, ... }
 */
static async getHotelCalendarPrices(hotelId, startDate, endDate) {
    // 1. 取该酒店所有房型及其各天日历价
    const [rows] = await pool.query(`
        SELECT
            rt.room_type_id,
            rt.base_price,
            rc.date,
            rc.final_price,
            rc.available_rooms
        FROM room_types rt
        LEFT JOIN room_calendar rc
            ON  rc.room_type_id = rt.room_type_id
            AND rc.date BETWEEN ? AND ?
            AND rc.status = 'open'
        WHERE rt.hotel_id = ?
    `, [startDate, endDate, hotelId]);

    // 2. 收集所有需要展示的日期（startDate 到 endDate 每天）
    const result = {};
    const cur = new Date(startDate);
    const end = new Date(endDate);
    while (cur <= end) {
        const ds = cur.toISOString().slice(0, 10);
        result[ds] = null; // 初始化为 null，表示还未计算
        cur.setDate(cur.getDate() + 1);
    }

    // 3. 按日期统计每个房型的有效价，取最低
    // 先整理成  { date -> { roomTypeId -> price } }
    const byDate = {};
    // 记录每个房型的 base_price（用于该日无日历时兜底）
    const basePrices = {};

    for (const row of rows) {
        basePrices[row.room_type_id] = parseFloat(row.base_price);
        if (row.date) {
            const ds = row.date instanceof Date
                ? row.date.toISOString().slice(0, 10)
                : String(row.date).slice(0, 10);
            if (!byDate[ds]) byDate[ds] = {};
            byDate[ds][row.room_type_id] = parseFloat(row.final_price);
        }
    }

    // 4. 对每个日期，找出所有房型的最低价（有日历用日历，没有用 base_price）
    const allRoomTypeIds = [...new Set(rows.map(r => r.room_type_id))];

    for (const ds of Object.keys(result)) {
        if (allRoomTypeIds.length === 0) {
            result[ds] = null;
            continue;
        }
        let minPrice = Infinity;
        for (const rtId of allRoomTypeIds) {
            const dayPrices = byDate[ds] || {};
            const price = dayPrices[rtId] !== undefined
                ? dayPrices[rtId]
                : basePrices[rtId];
            if (price < minPrice) minPrice = price;
        }
        result[ds] = minPrice === Infinity ? null : minPrice;
    }

    return result;
}

/**
 * 获取某酒店某房型在入住日当天的价格（详情页房型卡片用）
 * @param {number} roomTypeId
 * @param {string} checkInDate  'YYYY-MM-DD'
 * @param {number} basePrice    兜底价
 * @returns {Promise<number>}
 */
static async getRoomPriceByDate(roomTypeId, checkInDate, basePrice) {
    const [rows] = await pool.query(`
        SELECT final_price
        FROM room_calendar
        WHERE room_type_id = ?
          AND date         = ?
          AND status       = 'open'
        LIMIT 1
    `, [roomTypeId, checkInDate]);

    if (rows.length > 0 && rows[0].final_price !== null) {
        return parseFloat(rows[0].final_price);
    }
    return parseFloat(basePrice);
}

/**
 * 获取某酒店所有房型在指定日期的价格
 * @param {number} hotelId
 * @param {string} date  'YYYY-MM-DD'
 * @returns {Promise<Array>}  [{ room_type_id, base_price, final_price }]
 */
static async getRoomTypesPriceByDate(hotelId, date) {
    const [rows] = await pool.execute(`
        SELECT
            rt.room_type_id,
            rt.base_price,
            rc.final_price
        FROM room_types rt
        LEFT JOIN room_calendar rc
            ON  rc.room_type_id = rt.room_type_id
            AND rc.date         = ?
            AND rc.status       = 'open'
        WHERE rt.hotel_id = ?
    `, [date, hotelId]);

    return rows;
}

}

module.exports = HotelModel;