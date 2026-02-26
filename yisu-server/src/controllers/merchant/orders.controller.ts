// yisu-server/src/controllers/merchant/orders.controller.ts
import { Request, Response } from 'express';
import pool from '../../config/db';
import ExcelJS from 'exceljs';
// 获取订单列表（商户）
export const getOrders = async (req: Request, res: Response) => {
  try {
    const merchant_id = req.user!.user_id;
    const { 
      hotel_id, 
      status, 
      keyword, 
      start_date, 
      end_date, 
      page = 1, 
      page_size = 15 
    } = req.query;
    
    // 获取商户的所有酒店
    const [hotels]: any = await pool.query(
      'SELECT hotel_id FROM hotels WHERE merchant_id = ?',
      [merchant_id]
    );
    
    const hotelIds = (hotels || []).map((h: any) => h.hotel_id);
    if (!hotelIds.length) {
      return res.json({ 
        code: 200,
        data: { list: [], total: 0 } 
      });
    }
    
    // 构建数据查询
    let sql = `
      SELECT 
        o.*,
        h.name_zh as hotel_name,
        rt.name as room_type_name,
        u.username,
        u.phone
      FROM orders o
      LEFT JOIN hotels h ON o.hotel_id = h.hotel_id
      LEFT JOIN room_types rt ON o.room_type_id = rt.room_type_id
      LEFT JOIN users u ON o.user_id = u.user_id
      WHERE o.hotel_id IN (?)
    `;
    
    // 构建总数查询
    let countSql = `
      SELECT COUNT(*) as total 
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.user_id
      WHERE o.hotel_id IN (?)
    `;
    
    const params: any[] = [hotelIds];
    const countParams: any[] = [hotelIds];
    
    // 酒店筛选
    if (hotel_id) {
      sql += ' AND o.hotel_id = ?';
      params.push(hotel_id);
      countSql += ' AND o.hotel_id = ?';
      countParams.push(hotel_id);
    }
    
    // 状态筛选
    if (status && status !== 'all') {
      sql += ' AND o.status = ?';
      params.push(status);
      countSql += ' AND o.status = ?';
      countParams.push(status);
    }
    
    // 关键词搜索 - 同时搜索订单号、用户名、手机号
    if (keyword && keyword !== '') {
      const searchKeyword = `%${keyword}%`;
      
      sql += ' AND (o.order_no LIKE ? OR u.username LIKE ? OR u.phone LIKE ?)';
      params.push(searchKeyword, searchKeyword, searchKeyword);
      
      countSql += ' AND (o.order_no LIKE ? OR u.username LIKE ? OR u.phone LIKE ?)';
      countParams.push(searchKeyword, searchKeyword, searchKeyword);
    }
    
    // 日期范围筛选
    // 按入住日期范围筛选
      if (start_date && end_date) {
        sql += ' AND (o.check_in_date BETWEEN ? AND ? OR o.check_out_date BETWEEN ? AND ?)';
        params.push(start_date, end_date, start_date, end_date);
        
        countSql += ' AND (o.check_in_date BETWEEN ? AND ? OR o.check_out_date BETWEEN ? AND ?)';
        countParams.push(start_date, end_date, start_date, end_date);
      } else if (start_date) {
      // 只有开始日期
      sql += ' AND DATE(o.created_at) >= ?';
      params.push(start_date);
      
      countSql += ' AND DATE(o.created_at) >= ?';
      countParams.push(start_date);
    } else if (end_date) {
      // 只有结束日期
      sql += ' AND DATE(o.created_at) <= ?';
      params.push(end_date);
      
      countSql += ' AND DATE(o.created_at) <= ?';
      countParams.push(end_date);
    }
    
    // 查询总数
    const [countRows]: any = await pool.query(countSql, countParams);
    const total = countRows[0]?.total || 0;
    
    // 分页查询
    sql += ' ORDER BY o.created_at DESC LIMIT ? OFFSET ?';
    params.push(Number(page_size), (Number(page) - 1) * Number(page_size));
    
    const [rows]: any = await pool.query(sql, params);
    
    res.json({
      code: 200,
      data: {
        list: rows || [],
        total
      },
      msg: '获取成功'
    });
  } catch (error) {
    console.error('获取订单列表失败:', error);
    res.status(500).json({ code: 500, msg: '服务器错误' });
  }
};

// yisu-server/src/controllers/merchant/orders.controller.ts

// 获取订单统计
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
    
    // 获取今日订单数（按创建时间）
    const [todayRows]: any = await pool.query(
      `SELECT COUNT(*) as count FROM orders 
       WHERE hotel_id IN (?) AND DATE(created_at) = CURDATE()`,
      [hotelIds]
    );
    const todayOrders = todayRows[0]?.count || 0;
    
    // 获取今日入住订单（按入住日期）
    const [todayCheckInRows]: any = await pool.query(
      `SELECT COUNT(*) as count FROM orders 
       WHERE hotel_id IN (?) AND check_in_date = CURDATE()`,
      [hotelIds]
    );
    const todayCheckIns = todayCheckInRows[0]?.count || 0;
    
    // 获取今日离店订单
    const [todayCheckOutRows]: any = await pool.query(
      `SELECT COUNT(*) as count FROM orders 
       WHERE hotel_id IN (?) AND check_out_date = CURDATE()`,
      [hotelIds]
    );
    const todayCheckOuts = todayCheckOutRows[0]?.count || 0;
    
    // 获取待处理订单数（unpaid + paid）
    const [pendingRows]: any = await pool.query(
      `SELECT COUNT(*) as count FROM orders 
       WHERE hotel_id IN (?) AND status IN ('unpaid', 'paid')`,
      [hotelIds]
    );
    const pendingOrders = pendingRows[0]?.count || 0;
    
    // 获取今日收入（今日支付的订单）
    const [todayRevenueRows]: any = await pool.query(
      `SELECT IFNULL(SUM(total_amount), 0) as total FROM orders 
       WHERE hotel_id IN (?) 
       AND status IN ('paid', 'checked_in', 'completed')
       AND DATE(created_at) = CURDATE()`,
      [hotelIds]
    );
    const todayRevenue = Number(todayRevenueRows[0]?.total) || 0;
    
    // 获取本月收入
    const [monthlyRevenueRows]: any = await pool.query(
      `SELECT IFNULL(SUM(total_amount), 0) as total FROM orders 
       WHERE hotel_id IN (?) 
       AND status IN ('paid', 'checked_in', 'completed')
       AND MONTH(created_at) = MONTH(CURDATE())
       AND YEAR(created_at) = YEAR(CURDATE())`,
      [hotelIds]
    );
    const monthlyRevenue = Number(monthlyRevenueRows[0]?.total) || 0;
    
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
    
    // 计算入住率（今日入住数 / 总房量？需要房型数据）
    // 这里简单返回今日入住数
    
    res.json({
      code: 200,
      data: {
        totalOrders,
        todayOrders,
        todayCheckIns,
        todayCheckOuts,
        pendingOrders,
        todayRevenue,
        monthlyRevenue,
        orderStatusCount
      }
    });
    
  } catch (error) {
    console.error('获取订单统计失败:', error);
    res.status(500).json({ code: 500, msg: '服务器错误' });
  }
};

// 更新订单状态
export const updateOrderStatus = async (req: Request, res: Response) => {
  try {
    const merchant_id = req.user!.user_id;
    const { order_id } = req.params;
    const { status } = req.body;
    
    // 验证状态是否有效
    const validStatus = ['unpaid', 'paid', 'checked_in', 'completed', 'cancelled'];
    if (!validStatus.includes(status)) {
      return res.status(400).json({ code: 400, msg: '状态无效' });
    }
    
    // 验证权限
    const [orders]: any = await pool.query(
      `SELECT o.* FROM orders o 
       JOIN hotels h ON o.hotel_id = h.hotel_id 
       WHERE o.order_id = ? AND h.merchant_id = ?`,
      [order_id, merchant_id]
    );
    
    if (!orders.length) {
      return res.status(404).json({ code: 404, msg: '订单不存在或无权限' });
    }
    
    // 更新状态
    await pool.query(
      'UPDATE orders SET status = ? WHERE order_id = ?',
      [status, order_id]
    );
    
    res.json({
      code: 200,
      msg: '状态已更新'
    });
  } catch (error) {
    console.error('更新订单状态失败:', error);
    res.status(500).json({ code: 500, msg: '服务器错误' });
  }
};

// 获取单个订单详情（可选）
export const getOrderDetail = async (req: Request, res: Response) => {
  try {
    const merchant_id = req.user!.user_id;
    const { order_id } = req.params;
    
    const [rows]: any = await pool.query(
      `SELECT 
        o.*,
        h.name_zh as hotel_name,
        h.address as hotel_address,
        h.phone as hotel_phone,
        rt.name as room_type_name,
        rt.bed_info,
        rt.area,
        u.username,
        u.phone as user_phone
      FROM orders o
      LEFT JOIN hotels h ON o.hotel_id = h.hotel_id
      LEFT JOIN room_types rt ON o.room_type_id = rt.room_type_id
      LEFT JOIN users u ON o.user_id = u.user_id
      WHERE o.order_id = ? AND h.merchant_id = ?`,
      [order_id, merchant_id]
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

// 创建订单（如果需要商户手动创建订单）
export const createOrder = async (req: Request, res: Response) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    
    const { 
      hotel_id, 
      room_type_id, 
      check_in_date, 
      check_out_date, 
      rooms, 
      adults, 
      children,
      guest_name,
      guest_phone,
      total_amount 
    } = req.body;
    
    const merchant_id = req.user!.user_id;
    
    // 验证酒店权限
    const [hotelRows]: any = await conn.query(
      'SELECT hotel_id FROM hotels WHERE hotel_id = ? AND merchant_id = ?',
      [hotel_id, merchant_id]
    );
    
    if (!hotelRows.length) {
      await conn.rollback();
      return res.status(403).json({ code: 403, msg: '无权操作该酒店' });
    }
    
    // 获取当前佣金比例
    const [commissionRows]: any = await conn.query(
      `SELECT rate FROM commission_rules 
       WHERE start_date <= CURDATE() 
         AND (end_date IS NULL OR end_date >= CURDATE())
       ORDER BY start_date DESC LIMIT 1`
    );
    
    const commissionRate = commissionRows[0]?.rate || 10.00;
    
    // 生成订单号
    const order_no = 'ORD' + Date.now() + Math.random().toString(36).slice(2, 8).toUpperCase();
    
    // 插入订单
    const [result]: any = await conn.query(
      `INSERT INTO orders (
        order_no, user_id, hotel_id, room_type_id, 
        rooms, adults, children, 
        check_in_date, check_out_date, 
        total_amount, commission_rate, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        order_no, 
        null, // user_id 可以为空，如果是后台创建
        hotel_id, 
        room_type_id, 
        rooms || 1, 
        adults || 2, 
        children || 0, 
        check_in_date, 
        check_out_date, 
        total_amount, 
        commissionRate, 
        'unpaid'
      ]
    );
    
    await conn.commit();
    
    res.json({
      code: 200,
      data: { order_id: result.insertId, order_no },
      msg: '订单创建成功'
    });
  } catch (error: any) {
    await conn.rollback();
    console.error('创建订单失败:', error);
    res.status(500).json({ code: 500, msg: error.message || '创建订单失败' });
  } finally {
    conn.release();
  }
};
// yisu-server/src/controllers/merchant/orders.controller.ts

// 导出订单报表
export const exportOrders = async (req: Request, res: Response) => {
  try {
    const merchant_id = req.user!.user_id;
    const { 
      hotel_id, 
      status, 
      keyword, 
      start_date, 
      end_date 
    } = req.query;
    
    // 获取商户的所有酒店
    const [hotels]: any = await pool.query(
      'SELECT hotel_id FROM hotels WHERE merchant_id = ?',
      [merchant_id]
    );
    
    const hotelIds = (hotels || []).map((h: any) => h.hotel_id);
    if (!hotelIds.length) {
      return res.status(404).json({ code: 404, msg: '没有可导出的订单' });
    }
    
    // 构建查询
    let sql = `
      SELECT 
        o.order_no,
        o.created_at,
        h.name_zh as hotel_name,
        rt.name as room_type_name,
        o.check_in_date,
        o.check_out_date,
        o.rooms,
        o.adults,
        o.children,
        o.total_amount,
        o.commission_rate,
        o.commission_amount,
        o.status,
        u.username as customer_name,
        u.phone as customer_phone
      FROM orders o
      LEFT JOIN hotels h ON o.hotel_id = h.hotel_id
      LEFT JOIN room_types rt ON o.room_type_id = rt.room_type_id
      LEFT JOIN users u ON o.user_id = u.user_id
      WHERE o.hotel_id IN (?)
    `;
    
    const params: any[] = [hotelIds];
    
    // 酒店筛选
    if (hotel_id) {
      sql += ' AND o.hotel_id = ?';
      params.push(hotel_id);
    }
    
    // 状态筛选
    if (status && status !== 'all') {
      sql += ' AND o.status = ?';
      params.push(status);
    }
    
    // 关键词搜索
    if (keyword && keyword !== '') {
      const searchKeyword = `%${keyword}%`;
      sql += ' AND (o.order_no LIKE ? OR u.username LIKE ? OR u.phone LIKE ?)';
      params.push(searchKeyword, searchKeyword, searchKeyword);
    }
    
    // 日期范围筛选 - 按创建时间
    if (start_date && end_date) {
      sql += ' AND DATE(o.created_at) BETWEEN ? AND ?';
      params.push(start_date, end_date);
    }
    
    sql += ' ORDER BY o.created_at DESC';
    
    const [rows]: any = await pool.query(sql, params);
    
    if (!rows.length) {
      return res.status(404).json({ code: 404, msg: '没有符合条件的订单' });
    }
    
    // 创建工作簿
    const workbook = new ExcelJS.Workbook();
    workbook.creator = '易宿酒店管理系统';
    workbook.lastModifiedBy = '易宿酒店管理系统';
    workbook.created = new Date();
    workbook.modified = new Date();
    
    // 添加工作表
    const worksheet = workbook.addWorksheet('订单报表');
    
    // 设置列
    worksheet.columns = [
      { header: '订单号', key: 'order_no', width: 25 },
      { header: '下单时间', key: 'created_at', width: 20 },
      { header: '酒店名称', key: 'hotel_name', width: 25 },
      { header: '房型', key: 'room_type_name', width: 20 },
      { header: '入住日期', key: 'check_in_date', width: 15 },
      { header: '离店日期', key: 'check_out_date', width: 15 },
      { header: '房间数', key: 'rooms', width: 10 },
      { header: '成人', key: 'adults', width: 10 },
      { header: '儿童', key: 'children', width: 10 },
      { header: '订单金额', key: 'total_amount', width: 15 },
      { header: '佣金比例', key: 'commission_rate', width: 12 },
      { header: '佣金金额', key: 'commission_amount', width: 15 },
      { header: '客户姓名', key: 'customer_name', width: 15 },
      { header: '联系电话', key: 'customer_phone', width: 15 },
      { header: '订单状态', key: 'status', width: 12 }
    ];
    
    // 设置标题行样式
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };
    
    // 状态映射
    const statusMap: Record<string, string> = {
      'unpaid': '待付款',
      'paid': '待入住',
      'checked_in': '已入住',
      'completed': '已完成',
      'cancelled': '已取消'
    };
    
    // 计算总和
    let totalAmountSum = 0;
    let totalCommissionSum = 0;
    
    // 添加数据行 - 修复数字转换问题
    rows.forEach((row: any) => {
      // 确保金额是数字
      const totalAmount = parseFloat(row.total_amount) || 0;
      const commissionAmount = parseFloat(row.commission_amount) || 0;
      const commissionRate = parseFloat(row.commission_rate) || 0;
      
      totalAmountSum += totalAmount;
      totalCommissionSum += commissionAmount;
      
      worksheet.addRow({
        order_no: row.order_no,
        created_at: row.created_at ? new Date(row.created_at).toLocaleString('zh-CN') : '-',
        hotel_name: row.hotel_name || '-',
        room_type_name: row.room_type_name || '-',
        check_in_date: row.check_in_date,
        check_out_date: row.check_out_date,
        rooms: row.rooms,
        adults: row.adults,
        children: row.children,
        total_amount: totalAmount ? `¥${totalAmount.toFixed(2)}` : '¥0.00',
        commission_rate: commissionRate ? `${commissionRate}%` : '0%',
        commission_amount: commissionAmount ? `¥${commissionAmount.toFixed(2)}` : '¥0.00',
        customer_name: row.customer_name || '-',
        customer_phone: row.customer_phone || '-',
        status: statusMap[row.status] || row.status
      });
    });
    
    // 添加汇总行
    const totalRow = worksheet.addRow({
      order_no: '合计',
      total_amount: `¥${totalAmountSum.toFixed(2)}`,
      commission_amount: `¥${totalCommissionSum.toFixed(2)}`
    });
    
    totalRow.font = { bold: true };
    totalRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF0F0F0' }
    };
    
    // 设置边框
    worksheet.eachRow((row) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
    });
    
    // 设置响应头
    const fileName = `订单报表_${new Date().toLocaleDateString()}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${encodeURIComponent(fileName)}`);
    
    // 写入响应流
    await workbook.xlsx.write(res);
    res.end();
    
  } catch (error) {
    console.error('导出订单报表失败:', error);
    res.status(500).json({ code: 500, msg: '导出失败: ' + (error as Error).message });
  }
};