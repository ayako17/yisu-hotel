import { Request, Response } from 'express';
import pool from '../../config/db';

// 获取酒店列表
export const getHotels = async (req: Request, res: Response) => {
  try {
    const merchant_id = req.user!.user_id;
    const [rows]: any = await pool.query(
      'SELECT * FROM hotels WHERE merchant_id = ?',
      [merchant_id]
    );
    
    res.json({
      code: 200,
      data: rows
    });
  } catch (error) {
    console.error('获取酒店列表失败:', error);
    res.status(500).json({ code: 500, msg: '服务器错误' });
  }
};

// 创建酒店
export const createHotel = async (req: Request, res: Response) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    
    const merchant_id = req.user!.user_id;
    const { name_zh, name_en, phone, star_rating, province, city, address, 
            latitude, longitude, description, opening_date } = req.body;
    
    // 1. 先在hotels表创建草稿记录
    const [result]: any = await conn.query(
      `INSERT INTO hotels 
       (merchant_id, name_zh, name_en, phone, star_rating, province, city, address, 
        latitude, longitude, description, opening_date, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        merchant_id, 
        name_zh || '新酒店', 
        name_en || null, 
        phone || '', 
        star_rating || 3, 
        province || null, 
        city || null, 
        address || '',
        latitude || null, 
        longitude || null, 
        description || null, 
        opening_date || null, 
        'draft'  // 初始状态为草稿
      ]
    );
    
    const hotel_id = result.insertId;
    
    // 2. 创建审核申请记录
    const changeData = {
      name_zh: name_zh || '新酒店',
      name_en: name_en || null,
      phone: phone || '',
      star_rating: star_rating || 3,
      province: province || null,
      city: city || null,
      address: address || '',
      latitude: latitude || null,
      longitude: longitude || null,
      description: description || null,
      opening_date: opening_date || null
    };
    
    await conn.query(
      `INSERT INTO audits_apply (
        target_type, target_id, hotel_id, merchant_id, 
        change_data, apply_reason, audit_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        'hotel_apply',  // 新店入驻
        hotel_id,
        hotel_id,
        merchant_id,
        JSON.stringify(changeData),
        '申请新酒店入驻',
        'pending'  // 待审核
      ]
    );
    
    // 3. 更新酒店状态为待审核
    await conn.query(
      'UPDATE hotels SET status = ? WHERE hotel_id = ?',
      ['pending', hotel_id]
    );
    
    await conn.commit();
    
    res.json({
      code: 200,
      data: { hotel_id },
      msg: '酒店创建成功，已提交审核'
    });
    
  } catch (error) {
    await conn.rollback();
    console.error('创建酒店失败:', error);
    res.status(500).json({ code: 500, msg: '服务器错误' });
  } finally {
    conn.release();
  }
};
// 提交酒店审核
export const submitHotelForAudit = async (req: Request, res: Response) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    
    const merchant_id = req.user!.user_id;
    const { hotel_id } = req.params;
    
    // 检查酒店是否存在且属于该商户
    const [hotelRows]: any = await conn.query(
      'SELECT * FROM hotels WHERE hotel_id = ? AND merchant_id = ?',
      [hotel_id, merchant_id]
    );
    
    if (!hotelRows.length) {
      await conn.rollback();
      return res.status(404).json({ code: 404, msg: '酒店不存在或无权限' });
    }
    
    const hotel = hotelRows[0];
    
    // 检查是否已经提交过审核
    const [existRows]: any = await conn.query(
      `SELECT * FROM audits_apply 
       WHERE target_type = 'hotel_apply' 
       AND target_id = ? 
       AND audit_status IN ('pending', 'processing')`,
      [hotel_id]
    );
    
    if (existRows.length) {
      await conn.rollback();
      return res.status(400).json({ code: 400, msg: '该酒店已有审核中的申请' });
    }
    
    // 1. 更新酒店状态为 pending
    await conn.query(
      'UPDATE hotels SET status = ? WHERE hotel_id = ?',
      ['pending', hotel_id]
    );
    
    // 2. 创建审核申请记录
    const changeData = {
      name_zh: hotel.name_zh,
      name_en: hotel.name_en,
      phone: hotel.phone,
      star_rating: hotel.star_rating,
      province: hotel.province,
      city: hotel.city,
      address: hotel.address,
      description: hotel.description,
      opening_date: hotel.opening_date
    };
    
    await conn.query(
      `INSERT INTO audits_apply (
        target_type, target_id, hotel_id, merchant_id, 
        change_data, apply_reason, audit_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        'hotel_apply',
        hotel_id,
        hotel_id,
        merchant_id,
        JSON.stringify(changeData),
        '申请酒店上线',
        'pending'
      ]
    );
    
    await conn.commit();
    
    res.json({
      code: 200,
      msg: '已提交审核，请等待管理员审批'
    });
    
  } catch (error) {
    await conn.rollback();
    console.error('提交审核失败:', error);
    res.status(500).json({ code: 500, msg: '服务器错误' });
  } finally {
    conn.release();
  }
};

// 获取酒店详情
export const getHotelDetail = async (req: Request, res: Response) => {
  try {
    const merchant_id = req.user!.user_id;
    const { hotel_id } = req.params;
    
    // 查询酒店基本信息
    const [hotelRows]: any = await pool.query(
      'SELECT * FROM hotels WHERE hotel_id = ? AND merchant_id = ?',
      [hotel_id, merchant_id]
    );
    
    if (!hotelRows.length) {
      return res.status(404).json({ code: 404, msg: '酒店不存在或无权限' });
    }
    
    const hotel = hotelRows[0];
    
    // 如果酒店状态是 rejected，查询驳回原因
    let reject_reason = null;
    if (hotel.status === 'rejected') {
      // 使用 JOIN 替代子查询
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
    
    // 查询媒体信息
    const [mediaRows]: any = await pool.query(
      'SELECT media_id, media_url, sort_order, is_cover FROM hotel_media WHERE hotel_id = ? ORDER BY is_cover DESC, sort_order DESC',
      [hotel_id]
    );
    
    // 查询标签
    const [tagRows]: any = await pool.query(
      'SELECT tag_id FROM tag_relations WHERE target_type = ? AND target_id = ?',
      ['hotel', hotel_id]
    );
    
    // 处理日期
    const opening_date = hotel.opening_date 
      ? (typeof hotel.opening_date === 'string' 
          ? hotel.opening_date 
          : hotel.opening_date.toISOString().slice(0, 10))
      : null;
    
    res.json({
      code: 200,
      data: {
        ...hotel,
        opening_date,
        reject_reason,
        media: mediaRows || [],
        tag_ids: (tagRows || []).map((r: any) => r.tag_id)
      }
    });
  } catch (error) {
    console.error('获取酒店详情失败:', error);
    res.status(500).json({ code: 500, msg: '服务器错误' });
  }
};
// 更新酒店
export const updateHotel = async (req: Request, res: Response) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    
    const merchant_id = req.user!.user_id;
    const { hotel_id } = req.params;
    const { name_zh, name_en, phone, star_rating, province, city, address, 
            latitude, longitude, description, opening_date } = req.body;
    
    // 检查权限并获取当前酒店信息
    const [hotelRows]: any = await conn.query(
      'SELECT * FROM hotels WHERE hotel_id = ? AND merchant_id = ?',
      [hotel_id, merchant_id]
    );
    
    if (!hotelRows.length) {
      await conn.rollback();
      return res.status(404).json({ code: 404, msg: '酒店不存在或无权限' });
    }
    
    const currentHotel = hotelRows[0];
    
    // 检查是否有正在审核中的申请
    const [existRows]: any = await conn.query(
      `SELECT * FROM audits_apply 
       WHERE target_id = ? 
       AND target_type IN ('hotel_apply', 'hotel_update')
       AND audit_status = 'pending'`,
      [hotel_id]
    );
    
    if (existRows.length) {
      await conn.rollback();
      return res.status(400).json({ 
        code: 400, 
        msg: '该酒店已有审核中的申请，请等待审核完成后再修改' 
      });
    }
    
    // 准备变更数据
    const changeData: any = {};
    
    // 只记录有变化的字段
    if (name_zh !== undefined && name_zh !== currentHotel.name_zh) changeData.name_zh = name_zh;
    if (name_en !== undefined && name_en !== currentHotel.name_en) changeData.name_en = name_en;
    if (phone !== undefined && phone !== currentHotel.phone) changeData.phone = phone;
    if (star_rating !== undefined && star_rating !== currentHotel.star_rating) changeData.star_rating = star_rating;
    if (province !== undefined && province !== currentHotel.province) changeData.province = province;
    if (city !== undefined && city !== currentHotel.city) changeData.city = city;
    if (address !== undefined && address !== currentHotel.address) changeData.address = address;
    if (latitude !== undefined && latitude !== currentHotel.latitude) changeData.latitude = latitude;
    if (longitude !== undefined && longitude !== currentHotel.longitude) changeData.longitude = longitude;
    if (description !== undefined && description !== currentHotel.description) changeData.description = description;
    if (opening_date !== undefined && opening_date !== currentHotel.opening_date) changeData.opening_date = opening_date;
    
    // 如果没有变化，直接返回
    if (Object.keys(changeData).length === 0) {
      await conn.rollback();
      return res.json({ code: 200, msg: '没有信息需要更新' });
    }
    
    // 创建审核申请记录
    await conn.query(
      `INSERT INTO audits_apply (
        target_type, target_id, hotel_id, merchant_id, 
        change_data, apply_reason, audit_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        'hotel_update',  // 信息修改
        hotel_id,
        hotel_id,
        merchant_id,
        JSON.stringify({
          new: changeData,
          old: {
            name_zh: currentHotel.name_zh,
            name_en: currentHotel.name_en,
            phone: currentHotel.phone,
            star_rating: currentHotel.star_rating,
            province: currentHotel.province,
            city: currentHotel.city,
            address: currentHotel.address,
            latitude: currentHotel.latitude,
            longitude: currentHotel.longitude,
            description: currentHotel.description,
            opening_date: currentHotel.opening_date
          }
        }),
        '申请修改酒店信息',
        'pending'
      ]
    );
    
    // 更新酒店状态为待审核
    await conn.query(
      'UPDATE hotels SET status = ? WHERE hotel_id = ?',
      ['pending', hotel_id]
    );
    
    await conn.commit();
    
    res.json({ 
      code: 200, 
      msg: '修改已提交审核，请等待管理员审批' 
    });
    
  } catch (error) {
    await conn.rollback();
    console.error('更新酒店失败:', error);
    res.status(500).json({ code: 500, msg: '服务器错误' });
  } finally {
    conn.release();
  }
};

// 更新酒店状态（上线/下线）
export const updateHotelStatus = async (req: Request, res: Response) => {
  try {
    const merchant_id = req.user!.user_id;
    const { hotel_id } = req.params;
    const { status } = req.body;
    
    if (!['offline', 'draft', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({ code: 400, msg: '状态无效' });
    }
    
    const [hotelRows]: any = await pool.query(
      'SELECT * FROM hotels WHERE hotel_id = ? AND merchant_id = ?',
      [hotel_id, merchant_id]
    );
    
    if (!hotelRows.length) {
      return res.status(404).json({ code: 404, msg: '酒店不存在或无权限' });
    }
    
    await pool.query(
      'UPDATE hotels SET status = ? WHERE hotel_id = ?',
      [status, hotel_id]
    );
    
    res.json({ code: 200, msg: '状态已更新' });
  } catch (error) {
    console.error('更新酒店状态失败:', error);
    res.status(500).json({ code: 500, msg: '服务器错误' });
  }
};

// 更新酒店媒体
export const updateHotelMedia = async (req: Request, res: Response) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    
    const merchant_id = req.user!.user_id;
    const { hotel_id } = req.params;
    const { media } = req.body;
    
    // 检查权限
    const [hotelRows]: any = await conn.query(
      'SELECT * FROM hotels WHERE hotel_id = ? AND merchant_id = ?',
      [hotel_id, merchant_id]
    );
    
    if (!hotelRows.length) {
      await conn.rollback();
      return res.status(404).json({ code: 404, msg: '酒店不存在或无权限' });
    }
    
    // 删除原有媒体
    await conn.query('DELETE FROM hotel_media WHERE hotel_id = ?', [hotel_id]);
    
    let coverUrl = null;
    
    // 插入新媒体
    if (Array.isArray(media) && media.length) {
      for (let i = 0; i < media.length; i++) {
        const { media_url, is_cover, sort_order } = media[i];
        await conn.query(
          'INSERT INTO hotel_media (hotel_id, media_url, sort_order, is_cover) VALUES (?, ?, ?, ?)',
          [hotel_id, media_url || '', (sort_order ?? i), is_cover ? 1 : 0]
        );
        
        // 如果是封面，记录URL
        if (is_cover) {
          coverUrl = media_url;
        }
      }
    }
    
    // 如果找到了封面图，更新hotels表的cover_url
    if (coverUrl) {
      await conn.query(
        'UPDATE hotels SET cover_url = ? WHERE hotel_id = ?',
        [coverUrl, hotel_id]
      );
    } else {
      // 如果没有封面图，将cover_url设置为null
      await conn.query(
        'UPDATE hotels SET cover_url = NULL WHERE hotel_id = ?',
        [hotel_id]
      );
    }
    
    await conn.commit();
    res.json({ code: 200, msg: '媒体已更新' });
  } catch (error) {
    await conn.rollback();
    console.error('更新酒店媒体失败:', error);
    res.status(500).json({ code: 500, msg: '服务器错误' });
  } finally {
    conn.release();
  }
};
// 更新酒店标签
export const updateHotelTags = async (req: Request, res: Response) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    
    const merchant_id = req.user!.user_id;
    const { hotel_id } = req.params;
    const { tag_ids } = req.body;
    
    // 检查权限
    const [hotelRows]: any = await conn.query(
      'SELECT * FROM hotels WHERE hotel_id = ? AND merchant_id = ?',
      [hotel_id, merchant_id]
    );
    
    if (!hotelRows.length) {
      await conn.rollback();
      return res.status(404).json({ code: 404, msg: '酒店不存在或无权限' });
    }
    
    // 删除原有标签
    await conn.query(
      'DELETE FROM tag_relations WHERE target_type = ? AND target_id = ?',
      ['hotel', hotel_id]
    );
    
    // 插入新标签
    const ids = Array.isArray(tag_ids) ? tag_ids : [];
    for (const tag_id of ids) {
      if (tag_id) {
        await conn.query(
          'INSERT INTO tag_relations (target_type, target_id, tag_id) VALUES (?, ?, ?)',
          ['hotel', hotel_id, tag_id]
        );
      }
    }
    
    await conn.commit();
    res.json({ code: 200, msg: '标签已更新' });
  } catch (error) {
    await conn.rollback();
    console.error('更新酒店标签失败:', error);
    res.status(500).json({ code: 500, msg: '服务器错误' });
  } finally {
    conn.release();
  }
};