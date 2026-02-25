import { Request, Response } from 'express';
import pool from '../../config/db';

// 获取酒店审核列表
export const getHotelAuditList = async (req: Request, res: Response) => {
  try {
    const { type = 'all', keyword = '' } = req.query;
    
    let sql = `
      SELECT 
        aa.apply_id,
        aa.target_type,
        aa.target_id,
        aa.hotel_id,
        aa.change_data,
        aa.apply_reason,
        aa.audit_status,
        aa.created_at,
        u.username as merchant_name,
        u.user_id as merchant_id,
        h.name_zh as hotel_name,
        h.status as hotel_status
      FROM audits_apply aa
      LEFT JOIN users u ON aa.merchant_id = u.user_id
      LEFT JOIN hotels h ON aa.target_id = h.hotel_id
      WHERE aa.target_type IN ('hotel_apply', 'hotel_update')
    `;
    
    const params: any[] = [];
    
    if (type !== 'all') {
      sql += ' AND aa.target_type = ?';
      params.push(type);
    }
    
    if (keyword) {
      sql += ` AND (
        h.name_zh LIKE ? 
        OR u.username LIKE ?
        OR JSON_UNQUOTE(JSON_EXTRACT(aa.change_data, '$.name_zh')) LIKE ?
      )`;
      params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
    }
    
    sql += ' ORDER BY aa.created_at DESC';
    
    const [rows]: any = await pool.query(sql, params);
    
    // 格式化数据
    const list = rows.map((row: any) => {
      const changeData = typeof row.change_data === 'string' 
        ? JSON.parse(row.change_data) 
        : row.change_data;
      
      // 如果是新店申请，从change_data获取酒店名称
      let hotelName = row.hotel_name;
      if (row.target_type === 'hotel_apply' && !hotelName) {
        hotelName = changeData?.name_zh || '新酒店申请';
      }
      
      return {
        apply_id: row.apply_id,
        hotel_id: row.hotel_id,
        target_id: row.target_id,
        merchant_name: row.merchant_name || '未知商户',
        merchant_id: row.merchant_id,
        target_type: row.target_type,
        hotel_name: hotelName || '未命名酒店',
        change_data: changeData,
        apply_reason: row.apply_reason || '',
        audit_status: row.audit_status,
        created_at: row.created_at
      };
    });
    
    res.json({
      code: 200,
      data: list,
      msg: '获取成功'
    });
    
  } catch (error) {
    console.error('获取酒店审核列表失败:', error);
    res.status(500).json({ code: 500, msg: '服务器错误' });
  }
};

// 审核通过
export const approveHotelAudit = async (req: Request, res: Response) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    
    const { apply_id } = req.params;
    const admin_id = (req as any).user?.user_id;
    
    // 获取审核申请
    const [applyRows]: any = await conn.query(
      'SELECT * FROM audits_apply WHERE apply_id = ?',
      [apply_id]
    );
    
    if (!applyRows.length) {
      await conn.rollback();
      return res.status(404).json({ code: 404, msg: '审核申请不存在' });
    }
    
    const apply = applyRows[0];
    const changeData = typeof apply.change_data === 'string' 
      ? JSON.parse(apply.change_data) 
      : apply.change_data;
    
    // 处理日期格式
    const formatDate = (date: any): string | null => {
      if (!date) return null;
      if (typeof date === 'string' && date.includes('T')) {
        return date.split('T')[0];
      }
      if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return date;
      }
      return null;
    };
    
    const openingDate = formatDate(changeData.opening_date);
    
    if (apply.target_type === 'hotel_apply') {
      // 新店入驻：更新已有酒店的状态，而不是创建新酒店
      await conn.query(
        `UPDATE hotels SET 
          status = ?,
          name_zh = ?,
          name_en = ?,
          phone = ?,
          star_rating = ?,
          province = ?,
          city = ?,
          address = ?,
          opening_date = ?
        WHERE hotel_id = ?`,
        [
          'approved',  // 状态改为已上线
          changeData.name_zh || '新酒店',
          changeData.name_en || null,
          changeData.phone || '',
          changeData.star_rating || 3,
          changeData.province || '',
          changeData.city || '',
          changeData.address || '',
          openingDate,
          apply.target_id  // 使用原有的 hotel_id
        ]
      );
      
    } else if (apply.target_type === 'hotel_update') {
      // 信息修改：更新酒店信息
      await conn.query(
        `UPDATE hotels SET 
          name_zh = COALESCE(?, name_zh),
          name_en = COALESCE(?, name_en),
          phone = COALESCE(?, phone),
          star_rating = COALESCE(?, star_rating),
          province = COALESCE(?, province),
          city = COALESCE(?, city),
          address = COALESCE(?, address),
          description = COALESCE(?, description),
          latitude = COALESCE(?, latitude),
          longitude = COALESCE(?, longitude),
          opening_date = COALESCE(?, opening_date),
          status = ?
        WHERE hotel_id = ?`,
        [
          changeData.name_zh || null,
          changeData.name_en || null,
          changeData.phone || null,
          changeData.star_rating || null,
          changeData.province || null,
          changeData.city || null,
          changeData.address || null,
          changeData.description || null,
          changeData.latitude || null,
          changeData.longitude || null,
          openingDate,
          'approved',
          apply.target_id
        ]
      );
    }
    
    // 更新审核状态为已完成
    await conn.query(
      'UPDATE audits_apply SET audit_status = ? WHERE apply_id = ?',
      ['completed', apply_id]
    );
    
    // 记录审核日志
    await conn.query(
      `INSERT INTO audit_logs (apply_id, admin_id, action, reason) 
       VALUES (?, ?, ?, ?)`,
      [apply_id, admin_id, 'approve', null]
    );
    
    await conn.commit();
    
    res.json({
      code: 200,
      msg: '审核通过成功'
    });
    
  } catch (error) {
    await conn.rollback();
    console.error('审核通过失败:', error);
    res.status(500).json({ code: 500, msg: '服务器错误' });
  } finally {
    conn.release();
  }
};

// 审核驳回
export const rejectHotelAudit = async (req: Request, res: Response) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    
    const { apply_id } = req.params;
    const { reason } = req.body;
    const admin_id = (req as any).user?.user_id;
    
    if (!reason) {
      return res.status(400).json({ code: 400, msg: '驳回原因不能为空' });
    }
    
    // 获取审核申请
    const [applyRows]: any = await conn.query(
      'SELECT * FROM audits_apply WHERE apply_id = ?',
      [apply_id]
    );
    
    if (!applyRows.length) {
      await conn.rollback();
      return res.status(404).json({ code: 404, msg: '审核申请不存在' });
    }
    
    const apply = applyRows[0];
    
    // 更新审核状态为已完成
    await conn.query(
      'UPDATE audits_apply SET audit_status = ? WHERE apply_id = ?',
      ['completed', apply_id]
    );
    
    // 根据审核类型更新相关表的状态
    if (apply.target_type === 'hotel_apply' || apply.target_type === 'hotel_update') {
      // 更新酒店状态为 rejected
      await conn.query(
        'UPDATE hotels SET status = ? WHERE hotel_id = ?',
        ['rejected', apply.target_id]
      );
    }
    
    // 记录审核日志
    await conn.query(
      `INSERT INTO audit_logs (apply_id, admin_id, action, reason) 
       VALUES (?, ?, ?, ?)`,
      [apply_id, admin_id, 'reject', reason]
    );
    
    await conn.commit();
    
    res.json({
      code: 200,
      msg: '已驳回'
    });
    
  } catch (error) {
    await conn.rollback();
    console.error('审核驳回失败:', error);
    res.status(500).json({ code: 500, msg: '服务器错误' });
  } finally {
    conn.release();
  }
};

// 获取单个审核详情
export const getHotelAuditDetail = async (req: Request, res: Response) => {
  try {
    const { apply_id } = req.params;
    
    const [rows]: any = await pool.query(
      `SELECT 
        aa.apply_id,
        aa.target_type,
        aa.target_id,
        aa.hotel_id,
        aa.change_data,
        aa.apply_reason,
        aa.audit_status,
        aa.created_at,
        u.username as merchant_name,
        u.user_id as merchant_id,
        h.name_zh as hotel_name,
        h.status as hotel_status
      FROM audits_apply aa
      LEFT JOIN users u ON aa.merchant_id = u.user_id
      LEFT JOIN hotels h ON aa.target_id = h.hotel_id
      WHERE aa.apply_id = ?`,
      [apply_id]
    );
    
    if (!rows.length) {
      return res.status(404).json({ code: 404, msg: '审核申请不存在' });
    }
    
    const row = rows[0];
    const changeData = typeof row.change_data === 'string' 
      ? JSON.parse(row.change_data) 
      : row.change_data;
    
    const detail = {
      apply_id: row.apply_id,
      hotel_id: row.hotel_id,
      target_id: row.target_id,
      merchant_name: row.merchant_name || '未知商户',
      merchant_id: row.merchant_id,
      target_type: row.target_type,
      hotel_name: row.hotel_name || changeData?.name_zh || '未命名酒店',
      change_data: changeData,
      apply_reason: row.apply_reason || '',
      audit_status: row.audit_status,
      created_at: row.created_at,
      hotel_status: row.hotel_status
    };
    
    res.json({
      code: 200,
      data: detail
    });
    
  } catch (error) {
    console.error('获取审核详情失败:', error);
    res.status(500).json({ code: 500, msg: '服务器错误' });
  }
};