// yisu-server/src/controllers/merchant/hotelDetail.controller.ts
import { Request, Response } from 'express';
import pool from '../../config/db';

// 获取商户自己的酒店详情（需要认证）
export const getMerchantHotelDetail = async (req: Request, res: Response) => {
  try {
    const merchant_id = req.user!.user_id;
    const { hotel_id } = req.params;

    // 查询酒店基本信息，同时验证权限
    const [hotelRows]: any = await pool.query(
      `SELECT 
        hotel_id,
        merchant_id,
        name_zh,
        name_en,
        phone,
        star_rating,
        province,
        city,
        address,
        latitude,
        longitude,
        description,
        cover_url,
        opening_date,
        status,
        created_at,
        updated_at
       FROM hotels 
       WHERE hotel_id = ? AND merchant_id = ?`,
      [hotel_id, merchant_id]
    );

    if (!hotelRows.length) {
      return res.status(404).json({ code: 404, msg: '酒店不存在或无权限访问' });
    }

    const hotel = hotelRows[0];

    // 查询酒店媒体
    const [mediaRows]: any = await pool.query(
      'SELECT media_id, media_url, is_cover, sort_order FROM hotel_media WHERE hotel_id = ? ORDER BY is_cover DESC, sort_order ASC',
      [hotel_id]
    );

    // 查询酒店标签
    const [tagRows]: any = await pool.query(
      `SELECT t.tag_id, t.name, t.tag_type 
       FROM tags t
       INNER JOIN tag_relations tr ON t.tag_id = tr.tag_id
       WHERE tr.target_type = 'hotel' AND tr.target_id = ?
       ORDER BY t.tag_type, t.sort_order`,
      [hotel_id]
    );

    // 如果酒店状态是 rejected，查询驳回原因
    let reject_reason = null;
    if (hotel.status === 'rejected') {
      const [logRows]: any = await pool.query(
        `SELECT al.reason 
         FROM audit_logs al
         INNER JOIN audits_apply aa ON al.apply_id = aa.apply_id
         WHERE aa.target_id = ? AND aa.target_type = 'hotel_apply'
         ORDER BY al.created_at DESC
         LIMIT 1`,
        [hotel_id]
      );
      reject_reason = logRows[0]?.reason || null;
    }

    res.json({
      code: 200,
      data: {
        ...hotel,
        media: mediaRows || [],
        tags: tagRows || [],
        reject_reason
      },
      msg: '获取成功'
    });
  } catch (error) {
    console.error('获取酒店详情失败:', error);
    res.status(500).json({ code: 500, msg: '服务器错误' });
  }
};