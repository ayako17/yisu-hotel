import { Request, Response } from 'express';
import pool from '../../config/db';

// 获取房型列表
export const getRoomTypes = async (req: Request, res: Response) => {
  try {
    const merchant_id = req.user!.user_id;
    const { hotel_id } = req.query;
    
    // 验证酒店权限
    const [hotels]: any = await pool.query(
      'SELECT hotel_id FROM hotels WHERE hotel_id = ? AND merchant_id = ?',
      [hotel_id, merchant_id]
    );
    
    if (!hotels.length) {
      return res.status(404).json({ code: 404, msg: '酒店不存在或无权限' });
    }
    
    // 查询房型 - 包含所有字段，window是关键字需要用反引号括起来
    const [rows]: any = await pool.query(
      `SELECT 
        room_type_id,
        hotel_id,
        name,
        name_en,
        bed_info,
        area,
        max_guests,
        base_price,
        breakfast,
        \`window\`,  -- 使用反引号括起来
        total_rooms,
        cover_url,
        description,
        status
       FROM room_types 
       WHERE hotel_id = ? 
       ORDER BY room_type_id`,
      [hotel_id]
    );
    
    // 将window从数字转换为布尔值
    const list = rows.map((row: any) => ({
      ...row,
      window: row.window === 1 // 将 1/0 转换为 true/false
    }));
    
    // 查询每个房型的标签
    for (const rt of list) {
      const [tagRows]: any = await pool.query(
        'SELECT tag_id FROM tag_relations WHERE target_type = ? AND target_id = ?',
        ['room_type', rt.room_type_id]
      );
      rt.tag_ids = (tagRows || []).map((r: any) => r.tag_id);
    }
    
    res.json({
      code: 200,
      data: list,
      msg: '获取成功'
    });
  } catch (error) {
    console.error('获取房型列表失败:', error);
    res.status(500).json({ code: 500, msg: '服务器错误' });
  }
};

// 创建房型
export const createRoomType = async (req: Request, res: Response) => {
  try {
    const merchant_id = req.user!.user_id;
    const { 
      hotel_id, 
      name, 
      name_en,
      bed_info, 
      area,
      max_guests, 
      total_rooms, 
      base_price, 
      breakfast,
      window,
      status, 
      cover_url, 
      description 
    } = req.body;
    
    // 验证酒店权限
    const [hotels]: any = await pool.query(
      'SELECT hotel_id FROM hotels WHERE hotel_id = ? AND merchant_id = ?',
      [hotel_id, merchant_id]
    );
    
    if (!hotels.length) {
      return res.status(404).json({ code: 404, msg: '酒店不存在或无权限' });
    }
    
    // 验证必填字段
    if (!name) {
      return res.status(400).json({ code: 400, msg: '房型名称不能为空' });
    }
    if (!bed_info) {
      return res.status(400).json({ code: 400, msg: '床型不能为空' });
    }
    if (!max_guests) {
      return res.status(400).json({ code: 400, msg: '入住人数不能为空' });
    }
    if (!total_rooms) {
      return res.status(400).json({ code: 400, msg: '房间数量不能为空' });
    }
    if (base_price === undefined || base_price === null) {
      return res.status(400).json({ code: 400, msg: '基础价格不能为空' });
    }
    
    // 插入数据，包含所有字段，window是关键字需要用反引号括起来
    const [result]: any = await pool.query(
      `INSERT INTO room_types (
        hotel_id, 
        name, 
        name_en,
        bed_info, 
        area,
        max_guests, 
        total_rooms, 
        base_price, 
        breakfast,
        \`window\`,  -- 使用反引号括起来
        status, 
        cover_url, 
        description
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        hotel_id, 
        name, 
        name_en || null,
        bed_info, 
        area || null,
        max_guests, 
        total_rooms, 
        base_price, 
        breakfast || 'none',
        window ? 1 : 0, // 将布尔值转换为数字
        status || 'inactive', 
        cover_url || null, 
        description || null
      ]
    );
    
    res.json({ 
      code: 200,
      msg: '房型创建成功', 
      data: {
        room_type_id: result.insertId
      }
    });
  } catch (error) {
    console.error('创建房型失败:', error);
    res.status(500).json({ code: 500, msg: '服务器错误' });
  }
};

// 更新房型
export const updateRoomType = async (req: Request, res: Response) => {
  try {
    const merchant_id = req.user!.user_id;
    const { room_type_id } = req.params;
    const { 
      name, 
      name_en,
      bed_info, 
      area,
      max_guests, 
      total_rooms, 
      base_price, 
      breakfast,
      window,
      status, 
      cover_url, 
      description 
    } = req.body;
    
    // 验证权限
    const [rows]: any = await pool.query(
      'SELECT rt.room_type_id FROM room_types rt JOIN hotels h ON rt.hotel_id = h.hotel_id WHERE rt.room_type_id = ? AND h.merchant_id = ?',
      [room_type_id, merchant_id]
    );
    
    if (!rows.length) {
      return res.status(404).json({ code: 404, msg: '房型不存在或无权限' });
    }
    
    // 验证必填字段
    if (!name) {
      return res.status(400).json({ code: 400, msg: '房型名称不能为空' });
    }
    if (!bed_info) {
      return res.status(400).json({ code: 400, msg: '床型不能为空' });
    }
    if (!max_guests) {
      return res.status(400).json({ code: 400, msg: '入住人数不能为空' });
    }
    if (!total_rooms) {
      return res.status(400).json({ code: 400, msg: '房间数量不能为空' });
    }
    if (base_price === undefined || base_price === null) {
      return res.status(400).json({ code: 400, msg: '基础价格不能为空' });
    }
    
    // 更新数据，包含所有字段，window是关键字需要用反引号括起来
    await pool.query(
      `UPDATE room_types SET 
        name = ?, 
        name_en = ?,
        bed_info = ?, 
        area = ?,
        max_guests = ?, 
        total_rooms = ?, 
        base_price = ?, 
        breakfast = ?,
        \`window\` = ?,  -- 使用反引号括起来
        status = ?, 
        cover_url = ?, 
        description = ?
       WHERE room_type_id = ?`,
      [
        name, 
        name_en || null,
        bed_info, 
        area || null,
        max_guests, 
        total_rooms, 
        base_price, 
        breakfast || 'none',
        window ? 1 : 0, // 将布尔值转换为数字
        status, 
        cover_url || null, 
        description || null,
        room_type_id
      ]
    );
    
    res.json({ 
      code: 200, 
      msg: '房型信息已更新' 
    });
  } catch (error) {
    console.error('更新房型失败:', error);
    res.status(500).json({ code: 500, msg: '服务器错误' });
  }
};

// 删除房型
export const deleteRoomType = async (req: Request, res: Response) => {
  try {
    const merchant_id = req.user!.user_id;
    const { room_type_id } = req.params;
    
    // 验证权限
    const [rows]: any = await pool.query(
      'SELECT rt.room_type_id FROM room_types rt JOIN hotels h ON rt.hotel_id = h.hotel_id WHERE rt.room_type_id = ? AND h.merchant_id = ?',
      [room_type_id, merchant_id]
    );
    
    if (!rows.length) {
      return res.status(404).json({ code: 404, msg: '房型不存在或无权限' });
    }
    
    // 先删除关联的标签
    await pool.query(
      'DELETE FROM tag_relations WHERE target_type = ? AND target_id = ?',
      ['room_type', room_type_id]
    );
    
    // 再删除房型
    await pool.query('DELETE FROM room_types WHERE room_type_id = ?', [room_type_id]);
    
    res.json({ 
      code: 200, 
      msg: '房型已删除' 
    });
  } catch (error) {
    console.error('删除房型失败:', error);
    res.status(500).json({ code: 500, msg: '服务器错误' });
  }
};

// 更新房型标签
export const updateRoomTypeTags = async (req: Request, res: Response) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    
    const merchant_id = req.user!.user_id;
    const { room_type_id } = req.params;
    const { tag_ids } = req.body;
    
    // 验证权限
    const [rows]: any = await conn.query(
      'SELECT rt.room_type_id FROM room_types rt JOIN hotels h ON rt.hotel_id = h.hotel_id WHERE rt.room_type_id = ? AND h.merchant_id = ?',
      [room_type_id, merchant_id]
    );
    
    if (!rows.length) {
      await conn.rollback();
      return res.status(404).json({ code: 404, msg: '房型不存在或无权限' });
    }
    
    // 删除原有标签
    await conn.query(
      'DELETE FROM tag_relations WHERE target_type = ? AND target_id = ?',
      ['room_type', room_type_id]
    );
    
    // 插入新标签
    const ids = Array.isArray(tag_ids) ? tag_ids : [];
    for (const tag_id of ids) {
      if (tag_id) {
        await conn.query(
          'INSERT INTO tag_relations (target_type, target_id, tag_id) VALUES (?, ?, ?)',
          ['room_type', room_type_id, tag_id]
        );
      }
    }
    
    await conn.commit();
    res.json({ 
      code: 200, 
      msg: '房型标签已更新' 
    });
  } catch (error) {
    await conn.rollback();
    console.error('更新房型标签失败:', error);
    res.status(500).json({ code: 500, msg: '服务器错误' });
  } finally {
    conn.release();
  }
};

// 获取单个房型详情
export const getRoomTypeDetail = async (req: Request, res: Response) => {
  try {
    const merchant_id = req.user!.user_id;
    const { room_type_id } = req.params;
    
    // 查询房型详情
    const [rows]: any = await pool.query(
      `SELECT 
        rt.*,
        h.name_zh as hotel_name
       FROM room_types rt
       JOIN hotels h ON rt.hotel_id = h.hotel_id
       WHERE rt.room_type_id = ? AND h.merchant_id = ?`,
      [room_type_id, merchant_id]
    );
    
    if (!rows.length) {
      return res.status(404).json({ code: 404, msg: '房型不存在或无权限' });
    }
    
    const roomType = rows[0];
    
    // 查询标签
    const [tagRows]: any = await pool.query(
      'SELECT tag_id FROM tag_relations WHERE target_type = ? AND target_id = ?',
      ['room_type', room_type_id]
    );
    
    // 将window从数字转换为布尔值
    roomType.window = roomType.window === 1;
    roomType.tag_ids = (tagRows || []).map((r: any) => r.tag_id);
    
    res.json({
      code: 200,
      data: roomType,
      msg: '获取成功'
    });
  } catch (error) {
    console.error('获取房型详情失败:', error);
    res.status(500).json({ code: 500, msg: '服务器错误' });
  }
};