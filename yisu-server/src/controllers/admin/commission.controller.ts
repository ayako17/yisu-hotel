// yisu-server/src/controllers/admin/commission.controller.ts
import { Request, Response } from 'express';
import pool from '../../config/db';
import dayjs from 'dayjs';

// 定义统计数据类型
interface DailyStat {
  stat_date: string;
  order_count: number;
  order_amount: number;
  commission_income: number;
  ad_count: number;
  ad_income: number;
  total_income: number;
}

// 定义订单统计结果类型
interface OrderStat {
  stat_date: string;
  order_count: number;
  order_amount: number;
  commission_income: number;
}

// 定义广告统计结果类型
interface AdStat {
  stat_date: string;
  ad_count: number;
  ad_income: number;
}

// 获取佣金规则列表
export const getCommissionRules = async (req: Request, res: Response) => {
  try {
    const [rows]: any = await pool.query(
      'SELECT * FROM commission_rules ORDER BY start_date DESC'
    );
    
    res.json({
      code: 200,
      data: rows,
      msg: '获取成功'
    });
  } catch (error) {
    console.error('获取佣金规则失败:', error);
    res.status(500).json({ code: 500, msg: '服务器错误' });
  }
};

// 创建佣金规则
export const createCommissionRule = async (req: Request, res: Response) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    
    const { rate, start_date, end_date } = req.body;
    
    // 检查是否有重叠的生效规则
    const [existing]: any = await conn.query(
      `SELECT * FROM commission_rules 
       WHERE (start_date <= ? AND (end_date IS NULL OR end_date >= ?))
          OR (start_date <= ? AND (end_date IS NULL OR end_date >= ?))`,
      [start_date, start_date, end_date || '9999-12-31', end_date || '9999-12-31']
    );
    
    if (existing.length > 0) {
      await conn.rollback();
      return res.status(400).json({ 
        code: 400, 
        msg: '该时间段内已有生效的佣金规则，请调整生效日期' 
      });
    }
    
    // 如果新规则生效日期早于当前最新规则，自动结束旧规则
    await conn.query(
      `UPDATE commission_rules 
       SET end_date = DATE_SUB(?, INTERVAL 1 DAY)
       WHERE end_date IS NULL OR end_date >= ?`,
      [start_date, start_date]
    );
    
    const [result]: any = await conn.query(
      `INSERT INTO commission_rules (rate, start_date, end_date) 
       VALUES (?, ?, ?)`,
      [rate, start_date, end_date || null]
    );
    
    await conn.commit();
    
    res.json({
      code: 200,
      data: { rule_id: result.insertId },
      msg: '创建成功'
    });
  } catch (error) {
    await conn.rollback();
    console.error('创建佣金规则失败:', error);
    res.status(500).json({ code: 500, msg: '服务器错误' });
  } finally {
    conn.release();
  }
};

// 更新佣金规则
export const updateCommissionRule = async (req: Request, res: Response) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    
    const { rule_id } = req.params;
    const { rate, start_date, end_date } = req.body;
    
    // 检查规则是否存在
    const [existing]: any = await conn.query(
      'SELECT * FROM commission_rules WHERE rule_id = ?',
      [rule_id]
    );
    
    if (!existing.length) {
      await conn.rollback();
      return res.status(404).json({ code: 404, msg: '规则不存在' });
    }
    
    await conn.query(
      `UPDATE commission_rules SET 
        rate = ?, 
        start_date = ?, 
        end_date = ?
       WHERE rule_id = ?`,
      [rate, start_date, end_date || null, rule_id]
    );
    
    await conn.commit();
    
    res.json({
      code: 200,
      msg: '更新成功'
    });
  } catch (error) {
    await conn.rollback();
    console.error('更新佣金规则失败:', error);
    res.status(500).json({ code: 500, msg: '服务器错误' });
  } finally {
    conn.release();
  }
};

// 删除佣金规则
export const deleteCommissionRule = async (req: Request, res: Response) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    
    const { rule_id } = req.params;
    
    await conn.query('DELETE FROM commission_rules WHERE rule_id = ?', [rule_id]);
    
    await conn.commit();
    
    res.json({
      code: 200,
      msg: '删除成功'
    });
  } catch (error) {
    await conn.rollback();
    console.error('删除佣金规则失败:', error);
    res.status(500).json({ code: 500, msg: '服务器错误' });
  } finally {
    conn.release();
  }
};

// 获取当前生效的佣金比例
export const getCurrentCommissionRate = async (req: Request, res: Response) => {
  try {
    const [rows]: any = await pool.query(
      `SELECT * FROM commission_rules 
       WHERE start_date <= CURDATE() 
         AND (end_date IS NULL OR end_date >= CURDATE())
       ORDER BY start_date DESC 
       LIMIT 1`
    );
    
    res.json({
      code: 200,
      data: rows[0] || null,
      msg: '获取成功'
    });
  } catch (error) {
    console.error('获取当前佣金比例失败:', error);
    res.status(500).json({ code: 500, msg: '服务器错误' });
  }
};

// 获取平台收入统计（实时从订单表统计）- 简化版
export const getPlatformIncomeStats = async (req: Request, res: Response) => {
  try {
    const { days = 30 } = req.query;
    const dayCount = Number(days);
    
    // 查询订单统计
    const [orderStats]: any = await pool.query(
      `SELECT 
        DATE(created_at) as stat_date,
        COUNT(*) as order_count,
        IFNULL(SUM(total_amount), 0) as order_amount,
        IFNULL(SUM(commission_amount), 0) as commission_income
       FROM orders 
       WHERE status IN ('paid', 'checked_in', 'completed')
       GROUP BY DATE(created_at)
       ORDER BY stat_date DESC
       LIMIT ?`,
      [dayCount]
    );
    
    // 查询广告统计
    const [adStats]: any = await pool.query(
      `SELECT 
        DATE(created_at) as stat_date,
        COUNT(*) as ad_count,
        IFNULL(SUM(total_amount), 0) as ad_income
       FROM ad_orders 
       WHERE payment_status = 'paid'
         AND audit_status = 'approved'
       GROUP BY DATE(created_at)
       ORDER BY stat_date DESC
       LIMIT ?`,
      [dayCount]
    );
    
    // 创建结果 Map
    const resultMap = new Map<string, DailyStat>();
    
    // 添加订单数据
    orderStats.forEach((item: any) => {
      const date = String(item.stat_date);
      resultMap.set(date, {
        stat_date: date,
        order_count: Number(item.order_count) || 0,
        order_amount: Number(item.order_amount) || 0,
        commission_income: Number(item.commission_income) || 0,
        ad_count: 0,
        ad_income: 0,
        total_income: Number(item.commission_income) || 0
      });
    });
    
    // 添加广告数据
    adStats.forEach((item: any) => {
      const date = String(item.stat_date);
      const existing = resultMap.get(date);
      if (existing) {
        existing.ad_count = Number(item.ad_count) || 0;
        existing.ad_income = Number(item.ad_income) || 0;
        existing.total_income = existing.commission_income + existing.ad_income;
      } else {
        resultMap.set(date, {
          stat_date: date,
          order_count: 0,
          order_amount: 0,
          commission_income: 0,
          ad_count: Number(item.ad_count) || 0,
          ad_income: Number(item.ad_income) || 0,
          total_income: Number(item.ad_income) || 0
        });
      }
    });
    
    // 转换为数组并按日期排序
    const result: DailyStat[] = Array.from(resultMap.values());
    result.sort((a, b) => {
      if (!a.stat_date || !b.stat_date) return 0;
      return b.stat_date.localeCompare(a.stat_date);
    });
    
    res.json({
      code: 200,
      data: result,
      msg: '获取成功'
    });
  } catch (error) {
    console.error('获取平台收入统计失败:', error);
    res.status(500).json({ code: 500, msg: '服务器错误' });
  }
};

// 手动生成某天的统计数据（可用于定时任务）
export const generateDailyStats = async (req: Request, res: Response) => {
  const conn = await pool.getConnection();
  try {
    const { stat_date } = req.body;
    const date = stat_date || dayjs().subtract(1, 'day').format('YYYY-MM-DD');
    
    // 查询当天的订单数据（只统计已支付、已入住、已完成的订单）
    const [orderStats]: any = await conn.query(
      `SELECT 
        COUNT(*) as order_count,
        IFNULL(SUM(total_amount), 0) as order_amount,
        IFNULL(SUM(commission_amount), 0) as commission_income
       FROM orders 
       WHERE DATE(created_at) = ?
         AND status IN ('paid', 'checked_in', 'completed')`,
      [date]
    );
    
    // 查询当天的广告数据（只统计已支付且审核通过的广告）
    const [adStats]: any = await conn.query(
      `SELECT 
        COUNT(*) as ad_count,
        IFNULL(SUM(total_amount), 0) as ad_income
       FROM ad_orders 
       WHERE DATE(created_at) = ? 
         AND payment_status = 'paid'
         AND audit_status = 'approved'`,
      [date]
    );
    
    const orderCount = orderStats[0]?.order_count || 0;
    const orderAmount = Number(orderStats[0]?.order_amount) || 0;
    const commissionIncome = Number(orderStats[0]?.commission_income) || 0;
    const adCount = adStats[0]?.ad_count || 0;
    const adIncome = Number(adStats[0]?.ad_income) || 0;
    const totalIncome = commissionIncome + adIncome;
    
    // 插入或更新统计
    await conn.query(
      `INSERT INTO platform_finance_stats 
       (stat_date, order_count, order_amount, commission_income, ad_count, ad_income, total_income)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
       order_count = VALUES(order_count),
       order_amount = VALUES(order_amount),
       commission_income = VALUES(commission_income),
       ad_count = VALUES(ad_count),
       ad_income = VALUES(ad_income),
       total_income = VALUES(total_income)`,
      [date, orderCount, orderAmount, commissionIncome, adCount, adIncome, totalIncome]
    );
    
    res.json({
      code: 200,
      data: { date, orderCount, orderAmount, commissionIncome, adCount, adIncome, totalIncome },
      msg: '统计生成成功'
    });
  } catch (error) {
    console.error('生成统计数据失败:', error);
    res.status(500).json({ code: 500, msg: '服务器错误' });
  } finally {
    conn.release();
  }
};