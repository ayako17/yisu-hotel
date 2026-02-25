// yisu-server/src/controllers/admin/order.controller.ts
import { Request, Response } from 'express';
import pool from '../../config/db';

// 获取订单列表
export const getOrders = async (req: Request, res: Response) => {
  try {
    const {
      status,
      keyword,
      start_date,
      end_date,
      page = 1,
      pageSize = 10
    } = req.query;

    const offset = (Number(page) - 1) * Number(pageSize);

    // 构建查询语句
    let sql = `
      SELECT 
        o.*,
        u.username as user_name,
        u.phone as user_phone,
        h.name_zh as hotel_name,
        rt.name as room_type_name
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.user_id
      LEFT JOIN hotels h ON o.hotel_id = h.hotel_id
      LEFT JOIN room_types rt ON o.room_type_id = rt.room_type_id
      WHERE 1=1
    `;

    let countSql = `
      SELECT COUNT(*) as total
      FROM orders o
      WHERE 1=1
    `;

    const params: any[] = [];
    const countParams: any[] = [];

    // 状态筛选
    if (status && status !== 'all') {
      sql += ' AND o.status = ?';
      params.push(status);
      countSql += ' AND o.status = ?';
      countParams.push(status);
    }

    // 关键词搜索（订单号、酒店名、用户名）
    if (keyword) {
      sql += ` AND (o.order_no LIKE ? OR h.name_zh LIKE ? OR u.username LIKE ?)`;
      const keywordParam = `%${keyword}%`;
      params.push(keywordParam, keywordParam, keywordParam);
      
      // 关键词搜索需要关联表
      countSql = `
        SELECT COUNT(*) as total
        FROM orders o
        LEFT JOIN users u ON o.user_id = u.user_id
        LEFT JOIN hotels h ON o.hotel_id = h.hotel_id
        WHERE 1=1
      `;
      if (status && status !== 'all') {
        countSql += ' AND o.status = ?';
        countParams.push(status);
      }
      countSql += ` AND (o.order_no LIKE ? OR h.name_zh LIKE ? OR u.username LIKE ?)`;
      countParams.push(keywordParam, keywordParam, keywordParam);
    }

    // 日期范围筛选
    if (start_date && end_date) {
      sql += ' AND DATE(o.created_at) BETWEEN ? AND ?';
      params.push(start_date, end_date);
      
      if (!keyword) {
        countSql += ' AND DATE(o.created_at) BETWEEN ? AND ?';
        countParams.push(start_date, end_date);
      }
    }

    // 查询总数
    const [countResult]: any = await pool.query(countSql, countParams);
    const total = countResult[0]?.total || 0;

    // 添加排序和分页
    sql += ' ORDER BY o.created_at DESC LIMIT ? OFFSET ?';
    params.push(Number(pageSize), offset);

    const [rows]: any = await pool.query(sql, params);

    res.json({
      code: 200,
      data: rows,
      total,
      page: Number(page),
      pageSize: Number(pageSize),
      msg: '获取成功'
    });
  } catch (error) {
    console.error('获取订单列表失败:', error);
    res.status(500).json({ code: 500, msg: '服务器错误' });
  }
};

// 获取订单详情
export const getOrderDetail = async (req: Request, res: Response) => {
  try {
    const { order_id } = req.params;

    const [rows]: any = await pool.query(
      `SELECT 
        o.*,
        u.username as user_name,
        u.phone as user_phone,
        h.name_zh as hotel_name,
        h.address as hotel_address,
        h.phone as hotel_phone,
        rt.name as room_type_name,
        rt.bed_info,
        rt.area
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.user_id
      LEFT JOIN hotels h ON o.hotel_id = h.hotel_id
      LEFT JOIN room_types rt ON o.room_type_id = rt.room_type_id
      WHERE o.order_id = ?`,
      [order_id]
    );

    if (!rows.length) {
      return res.status(404).json({ code: 404, msg: '订单不存在' });
    }

    res.json({
      code: 200,
      data: rows[0],
      msg: '获取成功'
    });
  } catch (error) {
    console.error('获取订单详情失败:', error);
    res.status(500).json({ code: 500, msg: '服务器错误' });
  }
};

// 获取订单统计数据
export const getOrderStats = async (req: Request, res: Response) => {
  try {
    // 今日订单数
    const [todayRows]: any = await pool.query(
      `SELECT COUNT(*) as count FROM orders 
       WHERE DATE(created_at) = CURDATE()`
    );

    // 总交易额（已支付订单）
    const [amountRows]: any = await pool.query(
      `SELECT IFNULL(SUM(total_amount), 0) as total 
       FROM orders 
       WHERE status IN ('paid', 'checked_in', 'completed')`
    );

    // 总佣金
    const [commissionRows]: any = await pool.query(
      `SELECT IFNULL(SUM(commission_amount), 0) as total 
       FROM orders 
       WHERE status IN ('paid', 'checked_in', 'completed')`
    );

    // 待处理订单（未支付）
    const [pendingRows]: any = await pool.query(
      `SELECT COUNT(*) as count FROM orders 
       WHERE status = 'unpaid'`
    );

    res.json({
      code: 200,
      data: {
        todayCount: todayRows[0].count,
        totalAmount: amountRows[0].total,
        totalCommission: commissionRows[0].total,
        pendingCount: pendingRows[0].count
      },
      msg: '获取成功'
    });
  } catch (error) {
    console.error('获取订单统计数据失败:', error);
    res.status(500).json({ code: 500, msg: '服务器错误' });
  }
};

// 更新订单状态（管理员手动操作）
export const updateOrderStatus = async (req: Request, res: Response) => {
  try {
    const { order_id } = req.params;
    const { status } = req.body;

    const validStatus = ['unpaid', 'paid', 'checked_in', 'completed', 'cancelled'];
    if (!validStatus.includes(status)) {
      return res.status(400).json({ code: 400, msg: '无效的订单状态' });
    }

    await pool.query(
      'UPDATE orders SET status = ? WHERE order_id = ?',
      [status, order_id]
    );

    res.json({
      code: 200,
      msg: '订单状态已更新'
    });
  } catch (error) {
    console.error('更新订单状态失败:', error);
    res.status(500).json({ code: 500, msg: '服务器错误' });
  }
};
// 获取平台统计数据
export const getPlatformStats = async (req: Request, res: Response) => {
  try {
    // 总订单数
    const [totalRows]: any = await pool.query(
      `SELECT COUNT(*) as count FROM orders`
    );

    // 总交易额（已支付、已入住、已完成）
    const [revenueRows]: any = await pool.query(
      `SELECT IFNULL(SUM(total_amount), 0) as total 
       FROM orders 
       WHERE status IN ('paid', 'checked_in', 'completed')`
    );

    // 总佣金
    const [commissionRows]: any = await pool.query(
      `SELECT IFNULL(SUM(commission_amount), 0) as total 
       FROM orders 
       WHERE status IN ('paid', 'checked_in', 'completed')`
    );

    // 今日订单数和交易额
    const [todayRows]: any = await pool.query(
      `SELECT 
        COUNT(*) as order_count,
        IFNULL(SUM(CASE WHEN status IN ('paid', 'checked_in', 'completed') THEN total_amount ELSE 0 END), 0) as revenue
       FROM orders 
       WHERE DATE(created_at) = CURDATE()`
    );

    // 本月订单数和交易额
    const [monthRows]: any = await pool.query(
      `SELECT 
        COUNT(*) as order_count,
        IFNULL(SUM(CASE WHEN status IN ('paid', 'checked_in', 'completed') THEN total_amount ELSE 0 END), 0) as revenue
       FROM orders 
       WHERE MONTH(created_at) = MONTH(CURDATE()) 
         AND YEAR(created_at) = YEAR(CURDATE())`
    );

    // 各状态订单数
    const [statusRows]: any = await pool.query(
      `SELECT 
        SUM(CASE WHEN status = 'unpaid' THEN 1 ELSE 0 END) as unpaid,
        SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) as paid,
        SUM(CASE WHEN status = 'checked_in' THEN 1 ELSE 0 END) as checked_in,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled
       FROM orders`
    );

    const totalRevenue = revenueRows[0].total;
    const totalOrders = totalRows[0].count;

    res.json({
      code: 200,
      data: {
        totalOrders,
        totalRevenue,
        totalCommission: commissionRows[0].total,
        avgOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
        todayOrders: todayRows[0].order_count,
        todayRevenue: todayRows[0].revenue,
        monthOrders: monthRows[0].order_count,
        monthRevenue: monthRows[0].revenue,
        statusStats: statusRows[0]
      },
      msg: '获取成功'
    });
  } catch (error) {
    console.error('获取平台统计数据失败:', error);
    res.status(500).json({ code: 500, msg: '服务器错误' });
  }
};

// 获取每日订单统计
export const getDailyOrderStats = async (req: Request, res: Response) => {
  try {
    const { days = 30 } = req.query;

    const [rows]: any = await pool.query(
      `SELECT 
        DATE(created_at) as date,
        COUNT(*) as total,
        SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) as paid,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
        IFNULL(SUM(CASE WHEN status IN ('paid', 'checked_in', 'completed') THEN total_amount ELSE 0 END), 0) as revenue,
        IFNULL(SUM(CASE WHEN status IN ('paid', 'checked_in', 'completed') THEN commission_amount ELSE 0 END), 0) as commission
       FROM orders
       WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
       GROUP BY DATE(created_at)
       ORDER BY date DESC`,
      [Number(days)]
    );

    res.json({
      code: 200,
      data: rows,
      msg: '获取成功'
    });
  } catch (error) {
    console.error('获取每日统计失败:', error);
    res.status(500).json({ code: 500, msg: '服务器错误' });
  }
};

// 获取酒店订单统计
export const getHotelOrderStats = async (req: Request, res: Response) => {
  try {
    const { limit = 10 } = req.query;

    const [rows]: any = await pool.query(
      `SELECT 
        h.hotel_id,
        h.name_zh as hotel_name,
        COUNT(o.order_id) as order_count,
        IFNULL(SUM(CASE WHEN o.status IN ('paid', 'checked_in', 'completed') THEN o.total_amount ELSE 0 END), 0) as total_amount,
        IFNULL(SUM(CASE WHEN o.status IN ('paid', 'checked_in', 'completed') THEN o.commission_amount ELSE 0 END), 0) as commission_amount
       FROM hotels h
       LEFT JOIN orders o ON h.hotel_id = o.hotel_id
       GROUP BY h.hotel_id, h.name_zh
       ORDER BY order_count DESC
       LIMIT ?`,
      [Number(limit)]
    );

    res.json({
      code: 200,
      data: rows,
      msg: '获取成功'
    });
  } catch (error) {
    console.error('获取酒店统计失败:', error);
    res.status(500).json({ code: 500, msg: '服务器错误' });
  }
};