// yisu-server/src/controllers/admin/adOrder.controller.ts
import { Request, Response } from 'express';
import pool from '../../config/db';
// 获取广告订单列表（管理员视图）
export const getAdOrders = async (req: Request, res: Response) => {
  try {
    const { status, hotel_name, page = 1, pageSize = 10 } = req.query;
    const offset = (Number(page) - 1) * Number(pageSize);
    
    let sql = `
      SELECT 
        ao.*,
        h.name_zh as hotel_name,
        u.username as merchant_name,
        ar.price as rule_price,
        ar.min_days,
        ar.max_days
      FROM ad_orders ao
      LEFT JOIN hotels h ON ao.hotel_id = h.hotel_id
      LEFT JOIN users u ON ao.merchant_id = u.user_id
      LEFT JOIN ad_rules ar ON ao.rule_id = ar.rule_id
      WHERE 1=1
    `;
    
    let countSql = `
      SELECT COUNT(*) as total 
      FROM ad_orders ao
      LEFT JOIN hotels h ON ao.hotel_id = h.hotel_id
      WHERE 1=1
    `;
    
    const params: any[] = [];
    const countParams: any[] = [];
    
    // 处理状态筛选
    if (status && status !== 'all' && status !== '') {
      sql += ' AND ao.audit_status = ?';
      params.push(status);
      
      countSql += ' AND ao.audit_status = ?';
      countParams.push(status);
    }
    
    // 处理酒店名称搜索
    if (hotel_name && hotel_name !== '') {
      sql += ' AND h.name_zh LIKE ?';
      params.push(`%${hotel_name}%`);
      
      countSql += ' AND h.name_zh LIKE ?';
      countParams.push(`%${hotel_name}%`);
    }
    
    // 查询总数
    const [countResult]: any = await pool.query(countSql, countParams);
    const total = countResult[0]?.total || 0;
    
    sql += ' ORDER BY ao.created_at DESC LIMIT ? OFFSET ?';
    params.push(Number(pageSize), offset);
    
    const [rows]: any = await pool.query(sql, params);
    
    res.json({
      code: 200,
      data: rows,
      total: total,
      page: Number(page),
      pageSize: Number(pageSize),
      msg: '获取成功'
    });
  } catch (error) {
    console.error('获取广告订单失败:', error);
    res.status(500).json({ code: 500, msg: '服务器错误' });
  }
};

// 获取广告订单详情
export const getAdOrderDetail = async (req: Request, res: Response) => {
  try {
    const { ad_order_id } = req.params;
    
    const [rows]: any = await pool.query(
      `SELECT 
        ao.*,
        h.name_zh as hotel_name,
        h.address as hotel_address,
        u.username as merchant_name,
        u.phone as merchant_phone,
        ar.price as rule_price,
        ar.min_days,
        ar.max_days
      FROM ad_orders ao
      LEFT JOIN hotels h ON ao.hotel_id = h.hotel_id
      LEFT JOIN users u ON ao.merchant_id = u.user_id
      LEFT JOIN ad_rules ar ON ao.rule_id = ar.rule_id
      WHERE ao.ad_order_id = ?`,
      [ad_order_id]
    );
    
    if (!rows.length) {
      return res.status(404).json({ code: 404, msg: '广告订单不存在' });
    }
    
    res.json({
      code: 200,
      data: rows[0],
      msg: '获取成功'
    });
  } catch (error) {
    console.error('获取广告订单详情失败:', error);
    res.status(500).json({ code: 500, msg: '服务器错误' });
  }
};

// yisu-server/src/controllers/admin/adOrder.controller.ts - 修改 auditAdOrder 函数

// 审核广告订单
export const auditAdOrder = async (req: Request, res: Response) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    
    const { ad_order_id } = req.params;
    const { audit_status, rejection_reason } = req.body;
    const admin_id = (req as any).user?.user_id;
    
    // 检查订单是否存在
    const [orderRows]: any = await conn.query(
      'SELECT * FROM ad_orders WHERE ad_order_id = ?',
      [ad_order_id]
    );
    
    if (!orderRows.length) {
      await conn.rollback();
      return res.status(404).json({ code: 404, msg: '广告订单不存在' });
    }
    
    const order = orderRows[0];
    
    // 更新订单审核状态
    await conn.query(
      `UPDATE ad_orders SET 
        audit_status = ?,
        rejection_reason = ?
       WHERE ad_order_id = ?`,
      [audit_status, rejection_reason || null, ad_order_id]
    );
    
    // 记录到审核申请表
    const changeData = {
      action: audit_status,
      previous_status: order.audit_status,
      operator_id: admin_id,
      operator_time: new Date(),
      reason: rejection_reason
    };
    
    await conn.query(
      `INSERT INTO audits_apply (
        target_type, target_id, merchant_id, 
        change_data, apply_reason, audit_status
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        'ad_apply',
        ad_order_id,
        order.merchant_id,
        JSON.stringify(changeData),
        rejection_reason || `管理员${audit_status === 'approved' ? '通过' : '驳回'}广告申请`,
        'completed'
      ]
    );
    
    // 如果审核通过，添加到 active_ads 表
    if (audit_status === 'approved') {
      // 检查是否已存在相同的广告（防止重复）
      const [existingAd]: any = await conn.query(
        `SELECT ad_id FROM active_ads 
         WHERE hotel_id = ? AND start_date = ? AND end_date = ?`,
        [order.hotel_id, order.start_date, order.end_date]
      );
      
      if (existingAd.length === 0) {
        // 插入到 active_ads 表
        await conn.query(
          `INSERT INTO active_ads (hotel_id, ad_order_id, image_url, start_date, end_date, is_active)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [order.hotel_id, ad_order_id, order.image_url, order.start_date, order.end_date, true]
        );
        console.log(`广告订单 ${ad_order_id} 已同步到 active_ads 表`);
      } else {
        console.log(`广告订单 ${ad_order_id} 已存在 active_ads 表中，跳过插入`);
      }
    } else if (audit_status === 'rejected' || audit_status === 'pending') {
      // 如果驳回或状态变更，从 active_ads 表中移除（如果存在）
      await conn.query(
        `UPDATE active_ads SET is_active = FALSE WHERE ad_order_id = ?`,
        [ad_order_id]
      );
      console.log(`广告订单 ${ad_order_id} 已从 active_ads 表移除`);
    }
    
    await conn.commit();
    
    res.json({
      code: 200,
      msg: `广告订单已${audit_status === 'approved' ? '通过' : '驳回'}`
    });
  } catch (error) {
    await conn.rollback();
    console.error('审核广告订单失败:', error);
    res.status(500).json({ code: 500, msg: '服务器错误' });
  } finally {
    conn.release();
  }
};

// 获取广告统计数据
export const getAdStats = async (req: Request, res: Response) => {
  try {
    // 今日新增广告数
    const [todayRows]: any = await pool.query(
      `SELECT COUNT(*) as count FROM ad_orders 
       WHERE DATE(created_at) = CURDATE()`
    );
    
    // 待审核数
    const [pendingRows]: any = await pool.query(
      `SELECT COUNT(*) as count FROM ad_orders 
       WHERE audit_status = 'pending'`
    );
    
    // 进行中的广告（已通过且未结束）
    const [activeRows]: any = await pool.query(
      `SELECT COUNT(*) as count FROM ad_orders 
       WHERE audit_status = 'approved' 
       AND end_date >= CURDATE() 
       AND start_date <= CURDATE()`
    );
    
    // 总收入（已支付的广告费）
    const [revenueRows]: any = await pool.query(
      `SELECT IFNULL(SUM(total_amount), 0) as total FROM ad_orders 
       WHERE payment_status = 'paid'`
    );
    
    res.json({
      code: 200,
      data: {
        todayCount: todayRows[0].count,
        pendingCount: pendingRows[0].count,
        activeCount: activeRows[0].count,
        totalRevenue: revenueRows[0].total
      },
      msg: '获取成功'
    });
  } catch (error) {
    console.error('获取广告统计数据失败:', error);
    res.status(500).json({ code: 500, msg: '服务器错误' });
  }
};