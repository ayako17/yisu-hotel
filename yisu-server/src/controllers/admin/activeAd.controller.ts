// yisu-server/src/controllers/admin/activeAd.controller.ts
import { Request, Response } from 'express';
import pool from '../../config/db';

// 获取当前生效的广告列表
export const getActiveAds = async (req: Request, res: Response) => {
  try {
    const [rows]: any = await pool.query(
      `SELECT 
        aa.*,
        h.name_zh as hotel_name,
        ao.order_no
       FROM active_ads aa
       LEFT JOIN hotels h ON aa.hotel_id = h.hotel_id
       LEFT JOIN ad_orders ao ON aa.ad_order_id = ao.ad_order_id
       WHERE aa.is_active = TRUE 
       ORDER BY aa.start_date DESC`
    );
    
    res.json({
      code: 200,
      data: rows,
      msg: '获取成功'
    });
  } catch (error) {
    console.error('获取生效广告失败:', error);
    res.status(500).json({ code: 500, msg: '服务器错误' });
  }
};

// 手动停用广告
export const deactivateAd = async (req: Request, res: Response) => {
  try {
    const { ad_id } = req.params;
    
    await pool.query(
      'UPDATE active_ads SET is_active = FALSE WHERE ad_id = ?',
      [ad_id]
    );
    
    res.json({
      code: 200,
      msg: '广告已停用'
    });
  } catch (error) {
    console.error('停用广告失败:', error);
    res.status(500).json({ code: 500, msg: '服务器错误' });
  }
};

// 清理过期广告
export const cleanExpiredAds = async (req: Request, res: Response) => {
  try {
    const [result]: any = await pool.query(
      `UPDATE active_ads 
       SET is_active = FALSE 
       WHERE end_date < CURDATE() AND is_active = TRUE`
    );
    
    res.json({
      code: 200,
      data: { affectedRows: result.affectedRows },
      msg: '过期广告已清理'
    });
  } catch (error) {
    console.error('清理过期广告失败:', error);
    res.status(500).json({ code: 500, msg: '服务器错误' });
  }
};