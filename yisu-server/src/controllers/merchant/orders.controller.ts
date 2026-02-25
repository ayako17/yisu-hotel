import { Request, Response } from 'express';
import pool from '../../config/db';

// 创建订单
export const createOrder = async (req: Request, res: Response) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    
    const { user_id, hotel_id, room_type_id, check_in, check_out, room_count, guest_name, guest_phone } = req.body;
    
    const checkIn = new Date(check_in);
    const checkOut = new Date(check_out);
    const nights = Math.floor((checkOut.getTime() - checkIn.getTime()) / (24 * 3600 * 1000));
    
    if (nights <= 0) {
      throw new Error('入住/离店日期不合法');
    }
    
    let total_amount = 0;
    
    // 计算每晚价格并扣减库存
    for (let i = 0; i < nights; i++) {
      const d = new Date(checkIn);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().slice(0, 10);
      
      const [rows]: any = await conn.query(
        'SELECT final_price, available_rooms FROM room_calendar WHERE room_type_id = ? AND `date` = ? FOR UPDATE',
        [room_type_id, dateStr]
      );
      
      if (!rows.length) {
        throw new Error(`日期 ${dateStr} 未设置日历`);
      }
      
      const { final_price, available_rooms } = rows[0];
      if (available_rooms < room_count) {
        throw new Error('库存不足');
      }
      
      total_amount += final_price * room_count;
      
      await conn.query(
        'UPDATE room_calendar SET available_rooms = available_rooms - ? WHERE room_type_id = ? AND `date` = ?',
        [room_count, room_type_id, dateStr]
      );
    }
    
    // 生成订单号
    const order_no = 'ST' + new Date().toISOString().slice(0,10).replace(/-/g,'') + 
                     Math.floor(Math.random()*10000).toString().padStart(4,'0');
    
    const [ins]: any = await conn.query(
      'INSERT INTO orders (order_no, user_id, hotel_id, room_type_id, check_in_date, check_out_date, total_amount, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [order_no, user_id || req.user?.user_id || null, hotel_id, room_type_id, check_in, check_out, total_amount, 'unpaid']
    );
    
    await conn.commit();
    res.json({ order_id: ins.insertId, order_no, total_amount });
  } catch (error: any) {
    await conn.rollback();
    console.error('创建订单失败:', error);
    res.status(400).json({ msg: error.message || '创建订单失败' });
  } finally {
    conn.release();
  }
};

// 获取订单列表（商户）
export const getOrders = async (req: Request, res: Response) => {
  try {
    const merchant_id = req.user!.user_id;
    const { hotel_id, status, keyword, page = 1, page_size = 15 } = req.query;
    
    // 获取商户的所有酒店
    const [hotels]: any = await pool.query(
      'SELECT hotel_id FROM hotels WHERE merchant_id = ?',
      [merchant_id]
    );
    
    const hotelIds = (hotels || []).map((h: any) => h.hotel_id);
    if (!hotelIds.length) {
      return res.json({ list: [], total: 0 });
    }
    
    // 构建查询条件
    let sql = 'SELECT o.*, rt.name AS room_type_name FROM orders o JOIN room_types rt ON o.room_type_id = rt.room_type_id WHERE o.hotel_id IN (?)';
    const params: any[] = [hotelIds];
    
    if (hotel_id) {
      sql += ' AND o.hotel_id = ?';
      params.push(hotel_id);
    }
    
    if (status && status !== 'all') {
      sql += ' AND o.status = ?';
      params.push(status);
    }
    
    if (keyword) {
      sql += ' AND (o.order_no LIKE ?)';
      params.push('%' + keyword + '%');
    }
    
    // 查询总数
    const countParams = [...params];
    const [countRows]: any = await pool.query(
      'SELECT COUNT(*) as total FROM orders o WHERE o.hotel_id IN (?)' + 
      (hotel_id ? ' AND o.hotel_id = ?' : '') + 
      (status && status !== 'all' ? ' AND o.status = ?' : '') + 
      (keyword ? ' AND o.order_no LIKE ?' : ''),
      countParams
    );
    
    const total = countRows && countRows[0] ? countRows[0].total : 0;
    
    // 分页查询
    sql += ' ORDER BY o.created_at DESC LIMIT ? OFFSET ?';
    params.push(Number(page_size), (Number(page) - 1) * Number(page_size));
    
    const [list]: any = await pool.query(sql, params);
    
    // 查询用户信息
    const [usersRows]: any = await pool.query(
      'SELECT user_id, username, phone FROM users WHERE user_id IN (SELECT DISTINCT user_id FROM orders WHERE hotel_id IN (?))',
      [hotelIds]
    );
    
    const usersMap: Record<number, any> = {};
    (usersRows || []).forEach((u: any) => { usersMap[u.user_id] = u; });
    
    const listWithUser = (list || []).map((o: any) => ({ 
      ...o, 
      username: usersMap[o.user_id]?.username, 
      phone: usersMap[o.user_id]?.phone 
    }));
    
    res.json({ list: listWithUser, total });
  } catch (error) {
    console.error('获取订单列表失败:', error);
    res.status(500).json({ msg: '服务器错误' });
  }
};

// 更新订单状态
export const updateOrderStatus = async (req: Request, res: Response) => {
  try {
    const merchant_id = req.user!.user_id;
    const { order_id } = req.params;
    const { status } = req.body;
    
    if (!['paid', 'checked_in', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({ msg: '状态无效' });
    }
    
    // 验证权限
    const [orders]: any = await pool.query(
      'SELECT o.* FROM orders o JOIN hotels h ON o.hotel_id = h.hotel_id WHERE o.order_id = ? AND h.merchant_id = ?',
      [order_id, merchant_id]
    );
    
    if (!orders.length) {
      return res.status(404).json({ msg: '订单不存在或无权限' });
    }
    
    await pool.query(
      'UPDATE orders SET status = ? WHERE order_id = ?',
      [status, order_id]
    );
    
    res.json({ msg: '状态已更新' });
  } catch (error) {
    console.error('更新订单状态失败:', error);
    res.status(500).json({ msg: '服务器错误' });
  }
};
// 新增：获取订单统计
export const getOrderStats = async (req: Request, res: Response) => {
  try {
    const merchant_id = req.user!.user_id;
    
    // 获取商户的所有酒店
    const [hotelsRows]: any = await pool.query(
      'SELECT hotel_id FROM hotels WHERE merchant_id = ?',
      [merchant_id]
    );
    
    const hotelIds = hotelsRows.map((h: any) => h.hotel_id);
    
    // 如果没有酒店，返回空统计
    if (!hotelIds.length) {
      return res.json({
        code: 200,
        data: {
          totalOrders: 0,
          todayOrders: 0,
          pendingOrders: 0,
          monthlyRevenue: 0,
          orderStatusCount: {
            unpaid: 0,
            paid: 0,
            checked_in: 0,
            completed: 0,
            cancelled: 0
          }
        }
      });
    }
    
    // 获取今日订单数
    const [todayRows]: any = await pool.query(
      `SELECT COUNT(*) as count FROM orders 
       WHERE hotel_id IN (?) AND DATE(created_at) = CURDATE()`,
      [hotelIds]
    );
    const todayOrders = todayRows[0]?.count || 0;
    
    // 获取待处理订单数（unpaid + paid）
    const [pendingRows]: any = await pool.query(
      `SELECT COUNT(*) as count FROM orders 
       WHERE hotel_id IN (?) AND status IN ('unpaid', 'paid')`,
      [hotelIds]
    );
    const pendingOrders = pendingRows[0]?.count || 0;
    
    // 获取本月收入
    const [revenueRows]: any = await pool.query(
      `SELECT SUM(total_amount) as total FROM orders 
       WHERE hotel_id IN (?) 
       AND status IN ('paid', 'checked_in', 'completed')
       AND MONTH(created_at) = MONTH(CURDATE())
       AND YEAR(created_at) = YEAR(CURDATE())`,
      [hotelIds]
    );
    const monthlyRevenue = revenueRows[0]?.total || 0;
    
    // 获取各状态订单数量
    const [statusRows]: any = await pool.query(
      `SELECT status, COUNT(*) as count FROM orders 
       WHERE hotel_id IN (?) 
       GROUP BY status`,
      [hotelIds]
    );
    
    const orderStatusCount = {
      unpaid: 0,
      paid: 0,
      checked_in: 0,
      completed: 0,
      cancelled: 0
    };
    
    statusRows.forEach((row: any) => {
      if (orderStatusCount.hasOwnProperty(row.status)) {
        orderStatusCount[row.status as keyof typeof orderStatusCount] = row.count;
      }
    });
    
    // 总订单数
    const totalOrders = Object.values(orderStatusCount).reduce((a, b) => a + b, 0);
    
    res.json({
      code: 200,
      data: {
        totalOrders,
        todayOrders,
        pendingOrders,
        monthlyRevenue: Number(monthlyRevenue),
        orderStatusCount
      }
    });
    
  } catch (error) {
    console.error('获取订单统计失败:', error);
    res.status(500).json({ code: 500, msg: '服务器错误' });
  }
};