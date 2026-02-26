const db = require('../utils/db');

class OrderModel {
    constructor() {
    }

    // 生成订单号
    generateOrderNo() {
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        return `ORD${timestamp}${random}`;
    }

    // 从 commission_rules 表获取佣金率
    async getCommissionRate(date) {
        try {
            console.log('获取佣金率，日期:', date);
            
            const [rules] = await db.execute(
                `SELECT rate 
                FROM commission_rules 
                WHERE start_date <= ? AND end_date >= ?
                ORDER BY created_at DESC
                LIMIT 1`,
                [date, date]
            );

            console.log('佣金规则查询结果:', rules);

            if (rules.length > 0) {
                return parseFloat(rules[0].rate);
            }
            
            // 默认佣金率 10%
            return 10.00;

        } catch (error) {
            console.error('获取佣金率失败:', error);
            return 10.00; // 出错时返回默认值
        }
    }

    // 检查房间可用性（使用 room_calendar 表）
    async checkRoomAvailability(roomTypeId, checkInDate, checkOutDate, rooms) {
        try {
            console.log('检查房间可用性:', { roomTypeId, checkInDate, checkOutDate, rooms });

            const [calendarEntries] = await db.execute(
                `SELECT 
                    date,
                    available_rooms,
                    status,
                    final_price
                FROM room_calendar 
                WHERE room_type_id = ? 
                    AND date >= ? 
                    AND date < ?
                    AND status = 'open'
                ORDER BY date`,
                [roomTypeId, checkInDate, checkOutDate]
            );

            console.log('日历查询结果:', calendarEntries);

            if (calendarEntries.length === 0) {
                throw new Error('所选日期没有可用的房间');
            }

            // 检查每一天的可用房间数是否满足需求
            const datesNeeded = this.getDatesBetween(checkInDate, checkOutDate);
            
            if (calendarEntries.length !== datesNeeded.length) {
                console.log('日期不完整:', {
                    needed: datesNeeded.length,
                    found: calendarEntries.length
                });
                throw new Error('部分日期没有价格配置');
            }

            // 检查每一天的可用房间数
            for (const entry of calendarEntries) {
                if (entry.available_rooms < rooms) {
                    console.log(`日期 ${entry.date} 可用房间不足: ${entry.available_rooms} < ${rooms}`);
                    return false;
                }
            }

            return true;

        } catch (error) {
            console.error('检查房间可用性失败:', error);
            throw error;
        }
    }

    // 获取两个日期之间的所有日期
    getDatesBetween(startDate, endDate) {
        const dates = [];
        const currentDate = new Date(startDate);
        const lastDate = new Date(endDate);
        
        while (currentDate < lastDate) {
            dates.push(currentDate.toISOString().split('T')[0]);
            currentDate.setDate(currentDate.getDate() + 1);
        }
        
        return dates;
    }

    // 更新房间日历（预订后减少可用房间）
    async updateRoomCalendar(roomTypeId, checkInDate, checkOutDate, rooms, operation = 'decrease') {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            const operator = operation === 'decrease' ? '-' : '+';
            
            const [result] = await connection.execute(
                `UPDATE room_calendar 
                SET available_rooms = available_rooms ${operator} ?
                WHERE room_type_id = ? 
                    AND date >= ? 
                    AND date < ?
                    AND status = 'open'
                    AND available_rooms ${operation === 'decrease' ? '>=' : '<='} ?`,
                [rooms, roomTypeId, checkInDate, checkOutDate, rooms]
            );

            console.log('更新日历结果:', result);

            if (result.affectedRows === 0) {
                throw new Error('更新房间库存失败');
            }

            await connection.commit();
            return result;

        } catch (error) {
            await connection.rollback();
            console.error('更新房间日历失败:', error);
            throw error;
        } finally {
            connection.release();
        }
    }

    // 创建订单
    async create(orderData) {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            const {
                user_id,
                hotel_id,
                room_type_id,
                check_in_date,
                check_out_date,
                rooms,
                adults,
                children,
                total_amount,
                status = 'unpaid',
            } = orderData;

            const order_no = this.generateOrderNo();
            
            // 获取佣金率
            const commission_rate = await this.getCommissionRate(check_in_date);

            console.log('插入订单数据:', {
                order_no,
                user_id,
                hotel_id,
                room_type_id,
                check_in_date,
                check_out_date,
                rooms,
                adults,
                children,
                total_amount,
                commission_rate,
                status
            });

            // 插入订单（现在包含 rooms, adults, children 字段）
            const [result] = await connection.execute(
                `INSERT INTO orders (
                    order_no, user_id, hotel_id, room_type_id,
                    check_in_date, check_out_date, rooms, adults, children,
                    total_amount, commission_rate, status, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
                [
                    order_no,
                    user_id,
                    hotel_id,
                    room_type_id,
                    check_in_date,
                    check_out_date,
                    rooms,
                    adults,
                    children,
                    total_amount,
                    commission_rate,
                    status
                ]
            );

            console.log('插入结果:', result);

            // 如果订单是已支付状态，更新房间日历
            if (status === 'paid') {
                await this.updateRoomCalendar(room_type_id, check_in_date, check_out_date, rooms, 'decrease');
            }

            await connection.commit();
            return { insertId: result.insertId, order_no };

        } catch (error) {
            await connection.rollback();
            console.error('创建订单失败:', error);
            throw error;
        } finally {
            connection.release();
        }
    }

    // 根据ID查询订单
async findById(orderId, userId) {
    try {
        const [orders] = await db.execute(
            `SELECT o.*, 
                h.name_zh as hotel_name,
                h.name_en as hotel_name_en,
                h.address,
                h.phone as hotel_phone,
                h.star_rating,
                h.city,
                h.province,
                rt.name as room_type_name,
                rt.bed_info,
                rt.max_guests,
                rt.base_price,
                rt.area,
                rt.breakfast,
                rt.window,
                rt.cover_url as room_image,
                (SELECT JSON_ARRAYAGG(
                    JSON_OBJECT('media_id', media_id, 'media_url', media_url, 'is_cover', is_cover)
                ) FROM hotel_media WHERE hotel_id = o.hotel_id) as hotel_images
            FROM orders o
            JOIN hotels h ON o.hotel_id = h.hotel_id
            JOIN room_types rt ON o.room_type_id = rt.room_type_id
            WHERE o.order_id = ? AND o.user_id = ?`,
            [orderId, userId]
        );

        return orders[0] || null;
    } catch (error) {
        console.error('查询订单失败:', error);
        throw error;
    }
}

// 获取用户订单列表
async findByUserId(userId, filters = {}) {
    try {
        const page = Number(filters.page) || 1;
        const pageSize = Number(filters.pageSize) || 10;
        const offset = (page - 1) * pageSize;
        const { status } = filters;

        // 计数查询
        let countQuery = 'SELECT COUNT(*) as total FROM orders WHERE user_id = ?';
        const countParams = [userId];
        if (status) {
            countQuery += ' AND status = ?';
            countParams.push(status);
        }
        const [countResult] = await db.execute(countQuery, countParams);
        const total = countResult[0].total;

        // 列表查询 —— 关键：LIMIT/OFFSET 直接拼接，不用占位符
        let listQuery = `SELECT * FROM orders WHERE user_id = ?`;
        const listParams = [userId];
        if (status) {
            listQuery += ' AND status = ?';
            listParams.push(status);
        }
        // ✅ 直接拼数字，绕过 prepared statement 的参数类型校验
        listQuery += ` ORDER BY created_at DESC LIMIT ${pageSize} OFFSET ${offset}`;

        const [orders] = await db.execute(listQuery, listParams);

        console.log('查询到的订单数量:', orders.length);

        // 如果有订单，再单独查询酒店和房型信息
        if (orders.length > 0) {
            for (let order of orders) {
                // 查询酒店信息
                try {
                    const [hotels] = await db.execute(
                        'SELECT name_zh as hotel_name, city, address, phone as hotel_phone FROM hotels WHERE hotel_id = ?',
                        [order.hotel_id]
                    );
                    if (hotels.length > 0) {
                        order.hotel_name = hotels[0].hotel_name;
                        order.city = hotels[0].city;
                        order.address = hotels[0].address;
                        order.hotel_phone = hotels[0].hotel_phone;
                    }
                } catch (err) {
                    console.log('查询酒店信息失败:', err.message);
                }

                // 查询房型信息
                try {
                    const [roomTypes] = await db.execute(
                        'SELECT name as room_type_name, bed_info, max_guests, base_price, area, cover_url as room_image FROM room_types WHERE room_type_id = ?',
                        [order.room_type_id]
                    );
                    if (roomTypes.length > 0) {
                        order.room_type_name = roomTypes[0].room_type_name;
                        order.bed_info = roomTypes[0].bed_info;
                        order.max_guests = roomTypes[0].max_guests;
                        order.base_price = roomTypes[0].base_price;
                        order.area = roomTypes[0].area;
                        order.room_image = roomTypes[0].room_image;
                    }
                } catch (err) {
                    console.log('查询房型信息失败:', err.message);
                }

                // 查询酒店图片
                try {
                    const [images] = await db.execute(
                        'SELECT media_url FROM hotel_media WHERE hotel_id = ? AND is_cover = 1 LIMIT 1',
                        [order.hotel_id]
                    );
                    order.hotel_image = images.length > 0 ? images[0].media_url : null;
                } catch (err) {
                    console.log('查询酒店图片失败:', err.message);
                    order.hotel_image = null;
                }
            }
        }

        return {
            list: orders,
            pagination: {
                page: parseInt(page),
                pageSize: parseInt(pageSize),
                total,
                totalPages: Math.ceil(total / pageSize)
            }
        };
    } catch (error) {
        console.error('获取订单列表失败:', error);
        throw error;
    }
}

    // 更新订单状态
    async updateStatus(orderId, userId, status, condition = {}) {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            let sql = 'UPDATE orders SET status = ?';
            const params = [status];

            sql += ' WHERE order_id = ? AND user_id = ?';
            params.push(orderId, userId);

            // 添加额外的条件
            if (condition.currentStatus) {
                sql += ' AND status = ?';
                params.push(condition.currentStatus);
            }

            const [result] = await connection.execute(sql, params);

            // 获取订单信息用于库存更新
            const [order] = await connection.execute(
                'SELECT room_type_id, check_in_date, check_out_date, rooms, status FROM orders WHERE order_id = ?',
                [orderId]
            );

            // 如果订单变为已支付，更新房间日历
            if (status === 'paid' && result.affectedRows > 0 && order.length > 0) {
                await this.updateRoomCalendar(
                    order[0].room_type_id,
                    order[0].check_in_date,
                    order[0].check_out_date,
                    order[0].rooms,
                    'decrease'
                );
            }

            // 如果订单取消，恢复房间库存（只有已支付的订单取消才需要恢复）
            if (status === 'cancelled' && result.affectedRows > 0 && order.length > 0) {
                // 检查原订单状态是否为已支付
                const originalStatus = condition.currentStatus || order[0].status;
                if (originalStatus === 'paid') {
                    await this.updateRoomCalendar(
                        order[0].room_type_id,
                        order[0].check_in_date,
                        order[0].check_out_date,
                        order[0].rooms,
                        'increase'
                    );
                }
            }

            await connection.commit();
            return result;

        } catch (error) {
            await connection.rollback();
            console.error('更新订单状态失败:', error);
            throw error;
        } finally {
            connection.release();
        }
    }

    // 支付订单
    async payOrder(orderId, userId) {
        return this.updateStatus(orderId, userId, 'paid', { currentStatus: 'unpaid' });
    }

    // 取消订单
    async cancelOrder(orderId, userId) {
        return this.updateStatus(orderId, userId, 'cancelled', { currentStatus: 'unpaid' });
    }

    // 删除订单
    async delete(orderId, userId) {
        try {
            const [result] = await db.execute(
                `DELETE FROM orders 
                WHERE order_id = ? AND user_id = ? AND status IN (?, ?)`,
                [orderId, userId, 'completed', 'cancelled']
            );

            if (result.affectedRows === 0) {
                throw new Error('只能删除已完成或已取消的订单');
            }

            return { success: true };
        } catch (error) {
            console.error('删除订单失败:', error);
            throw error;
        }
    }

    // 检查订单是否属于用户
    async checkOwnership(orderId, userId) {
        try {
            const [orders] = await db.execute(
                'SELECT order_id FROM orders WHERE order_id = ? AND user_id = ?',
                [orderId, userId]
            );
            return orders.length > 0;
        } catch (error) {
            console.error('检查订单所有权失败:', error);
            throw error;
        }
    }
}

module.exports = OrderModel;