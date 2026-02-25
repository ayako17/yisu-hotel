import { Request, Response } from 'express';
import pool from '../../config/db';

// yisu-server/src/controllers/merchant/ads.controller.ts

// 获取广告位列表
export const getPlacements = async (req: Request, res: Response) => {
  try {
    const placements = [
      { id: 'banner', name: '原生首页通栏', desc: '最高流量入口,位于App首页核心位置', tag: '高曝光', cpc: 1.2 },
      { id: 'search_top', name: '搜索结果置顶', desc: '精准锁定目标客群,转化率提升40%', tag: '高转化', cpc: 0.8 },
    ];
    
    // 统一返回格式
    res.json({
      code: 200,
      data: placements,
      msg: '获取成功'
    });
  } catch (error) {
    console.error('获取广告位列表失败:', error);
    res.status(500).json({ code: 500, msg: '服务器错误' });
  }
};

// 获取余额
export const getBalance = async (req: Request, res: Response) => {
  try {
    // 这里可以从数据库查询真实余额
    res.json({
      code: 200,
      data: { balance: 12480 },
      msg: '获取成功'
    });
  } catch (error) {
    console.error('获取余额失败:', error);
    res.status(500).json({ code: 500, msg: '服务器错误' });
  }
};

// 创建推广活动
export const createPromotion = async (req: Request, res: Response) => {
  try {
    const merchant_id = req.user!.user_id;
    const { hotel_id, placement_id, start_date, days, daily_budget, image_url } = req.body;
    
    // 获取广告规则
    let [rules]: any = await pool.query('SELECT rule_id FROM ad_rules LIMIT 1');
    if (!rules || !rules.length) {
      await pool.query('INSERT INTO ad_rules (price, start_date, min_days, max_days) VALUES (100, CURDATE(), 7, 30)');
      [rules] = await pool.query('SELECT rule_id FROM ad_rules LIMIT 1');
    }
    
    const rule_id = rules && rules[0] ? rules[0].rule_id : 1;
    
    // 获取酒店ID
    let hotelId = hotel_id;
    if (!hotelId) {
      const [hotelRows]: any = await pool.query(
        'SELECT hotel_id FROM hotels WHERE merchant_id = ? LIMIT 1',
        [merchant_id]
      );
      hotelId = hotelRows[0]?.hotel_id;
    }
    
    if (!hotelId) {
      return res.status(400).json({ msg: '请先创建酒店' });
    }
    
    const start = start_date || new Date().toISOString().slice(0, 10);
    const d = new Date(start);
    d.setDate(d.getDate() + (Number(days) || 7));
    const end_date = d.toISOString().slice(0, 10);
    
    const order_no = 'AD' + Date.now();
    const unit_price = Number(daily_budget) || 100;
    const total_amount = unit_price * (Number(days) || 7);
    
    await pool.query(
      'INSERT INTO ad_orders (order_no, hotel_id, merchant_id, rule_id, image_url, start_date, end_date, unit_price, total_amount, payment_status, audit_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [order_no, hotelId, merchant_id, rule_id, image_url || '', start, end_date, unit_price, total_amount, 'unpaid', 'pending']
    );
    
    res.json({ msg: '推广活动已创建', order_no });
  } catch (error: any) {
    console.error('创建推广活动失败:', error);
    res.status(500).json({ msg: error.message || '创建失败' });
  }
};

// 获取效果预估
export const getEffectPreview = async (req: Request, res: Response) => {
  res.json({ ctr: 2.4, estimated_impressions: 45000, estimated_visitors: 1080 });
};
// yisu-server/src/controllers/merchant/ads.controller.ts - 添加获取订单列表方法

// 获取商户的广告订单
export const getMerchantAdOrders = async (req: Request, res: Response) => {
  try {
    const merchant_id = req.user!.user_id;
    
    const [rows]: any = await pool.query(
      `SELECT 
        ao.*,
        h.name_zh as hotel_name
      FROM ad_orders ao
      LEFT JOIN hotels h ON ao.hotel_id = h.hotel_id
      WHERE ao.merchant_id = ?
      ORDER BY ao.created_at DESC`,
      [merchant_id]
    );
    
    res.json({
      code: 200,
      data: rows,
      msg: '获取成功'
    });
  } catch (error) {
    console.error('获取广告订单失败:', error);
    res.status(500).json({ code: 500, msg: '服务器错误' });
  }
};