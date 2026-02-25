// yisu-server/src/controllers/admin/adRule.controller.ts
import { Request, Response } from 'express';
import pool from '../../config/db';

// 获取广告规则列表
export const getAdRules = async (req: Request, res: Response) => {
  try {
    const [rows]: any = await pool.query(
      'SELECT * FROM ad_rules ORDER BY start_date DESC'
    );
    
    res.json({
      code: 200,
      data: rows,
      msg: '获取成功'
    });
  } catch (error) {
    console.error('获取广告规则失败:', error);
    res.status(500).json({ code: 500, msg: '服务器错误' });
  }
};

// 创建广告规则
export const createAdRule = async (req: Request, res: Response) => {
  try {
    const { price, start_date, end_date, min_days, max_days } = req.body;
    
    const [result]: any = await pool.query(
      `INSERT INTO ad_rules (price, start_date, end_date, min_days, max_days) 
       VALUES (?, ?, ?, ?, ?)`,
      [price, start_date, end_date || null, min_days || 7, max_days || 30]
    );
    
    res.json({
      code: 200,
      data: { rule_id: result.insertId },
      msg: '创建成功'
    });
  } catch (error) {
    console.error('创建广告规则失败:', error);
    res.status(500).json({ code: 500, msg: '服务器错误' });
  }
};

// 更新广告规则
export const updateAdRule = async (req: Request, res: Response) => {
  try {
    const { rule_id } = req.params;
    const { price, start_date, end_date, min_days, max_days } = req.body;
    
    await pool.query(
      `UPDATE ad_rules SET 
        price = ?, 
        start_date = ?, 
        end_date = ?, 
        min_days = ?, 
        max_days = ?
       WHERE rule_id = ?`,
      [price, start_date, end_date || null, min_days, max_days, rule_id]
    );
    
    res.json({
      code: 200,
      msg: '更新成功'
    });
  } catch (error) {
    console.error('更新广告规则失败:', error);
    res.status(500).json({ code: 500, msg: '服务器错误' });
  }
};

// 删除广告规则
export const deleteAdRule = async (req: Request, res: Response) => {
  try {
    const { rule_id } = req.params;
    
    await pool.query('DELETE FROM ad_rules WHERE rule_id = ?', [rule_id]);
    
    res.json({
      code: 200,
      msg: '删除成功'
    });
  } catch (error) {
    console.error('删除广告规则失败:', error);
    res.status(500).json({ code: 500, msg: '服务器错误' });
  }
};