// hotelManagement.controller.ts

import { Request, Response } from 'express';
import pool from '../../config/db';

// 获取酒店列表（管理员视图）- 添加分页支持
export const getHotelList = async (req: Request, res: Response) => {
  try {
    const { city, keyword, status, page = 1, pageSize = 10 } = req.query;
    
    const offset = (Number(page) - 1) * Number(pageSize);
    
    // 查询总数
    let countSql = `
      SELECT COUNT(*) as total
      FROM hotels h
      LEFT JOIN users u ON h.merchant_id = u.user_id
      WHERE 1=1
    `;
    
    // 查询数据
    let dataSql = `
      SELECT 
        h.hotel_id,
        h.name_zh,
        h.name_en,
        h.city,
        h.star_rating,
        h.cover_url,
        h.status,
        h.created_at,
        h.updated_at,
        h.address,
        u.username as merchant_name,
        u.user_id as merchant_id
      FROM hotels h
      LEFT JOIN users u ON h.merchant_id = u.user_id
      WHERE 1=1
    `;
    
    const params: any[] = [];
    
    if (city && city !== 'all' && city !== '全部城市') {
      countSql += ' AND h.city = ?';
      dataSql += ' AND h.city = ?';
      params.push(city);
    }
    
    if (status && status !== 'all' && status !== '全部状态') {
      countSql += ' AND h.status = ?';
      dataSql += ' AND h.status = ?';
      params.push(status);
    }
    
    if (keyword) {
      countSql += ` AND (h.name_zh LIKE ? OR h.name_en LIKE ? OR h.address LIKE ? OR h.hotel_id LIKE ?)`;
      dataSql += ` AND (h.name_zh LIKE ? OR h.name_en LIKE ? OR h.address LIKE ? OR h.hotel_id LIKE ?)`;
      const keywordParam = `%${keyword}%`;
      params.push(keywordParam, keywordParam, keywordParam, keywordParam);
    }
    
    // 获取总数
    const [countResult]: any = await pool.query(countSql, params);
    const total = countResult[0].total;
    
    // 添加排序和分页
    dataSql += ' ORDER BY h.created_at DESC LIMIT ? OFFSET ?';
    const dataParams = [...params, Number(pageSize), offset];
    
    const [rows]: any = await pool.query(dataSql, dataParams);
    
    res.json({
      code: 200,
      data: rows,
      total,
      page: Number(page),
      pageSize: Number(pageSize),
      msg: '获取成功'
    });
    
  } catch (error) {
    console.error('获取酒店列表失败:', error);
    res.status(500).json({ code: 500, msg: '服务器错误' });
  }
};

// 获取酒店详情（管理员视图）
export const getHotelDetail = async (req: Request, res: Response) => {
  try {
    const { hotel_id } = req.params;
    
    const [rows]: any = await pool.query(
      `SELECT 
        h.*,
        u.username as merchant_name,
        u.phone as merchant_phone
      FROM hotels h
      LEFT JOIN users u ON h.merchant_id = u.user_id
      WHERE h.hotel_id = ?`,
      [hotel_id]
    );
    
    if (!rows.length) {
      return res.status(404).json({ code: 404, msg: '酒店不存在' });
    }
    
    const hotel = rows[0];
    
    // 查询酒店媒体
    const [mediaRows]: any = await pool.query(
      'SELECT media_id, media_url, is_cover FROM hotel_media WHERE hotel_id = ? ORDER BY is_cover DESC',
      [hotel_id]
    );
    
    // 查询酒店标签
    const [tagRows]: any = await pool.query(
      `SELECT t.tag_id, t.name, t.tag_type 
       FROM tags t
       INNER JOIN tag_relations tr ON t.tag_id = tr.tag_id
       WHERE tr.target_type = 'hotel' AND tr.target_id = ?`,
      [hotel_id]
    );
    
    res.json({
      code: 200,
      data: {
        ...hotel,
        media: mediaRows || [],
        tags: tagRows || []
      }
    });
    
  } catch (error) {
    console.error('获取酒店详情失败:', error);
    res.status(500).json({ code: 500, msg: '服务器错误' });
  }
};

// 获取城市列表
export const getHotelCities = async (req: Request, res: Response) => {
  try {
    // 查询所有有酒店的城市（去重）
    const [rows]: any = await pool.query(`
      SELECT DISTINCT city 
      FROM hotels 
      WHERE city IS NOT NULL AND city != ''
      ORDER BY city
    `);
    
    // 提取城市名数组
    const cities = rows.map((row: any) => row.city);
    
    res.json({
      code: 200,
      data: cities,
      msg: '获取成功'
    });
  } catch (error) {
    console.error('获取城市列表失败:', error);
    res.status(500).json({ code: 500, msg: '服务器错误' });
  }
};

// 下线酒店
export const offlineHotel = async (req: Request, res: Response) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    
    const { hotel_id } = req.params;
    const admin_id = (req as any).user?.user_id;
    
    // 检查酒店是否存在
    const [hotelRows]: any = await conn.query(
      'SELECT * FROM hotels WHERE hotel_id = ?',
      [hotel_id]
    );
    
    if (!hotelRows.length) {
      await conn.rollback();
      return res.status(404).json({ code: 404, msg: '酒店不存在' });
    }
    
    const hotel = hotelRows[0];
    
    // 检查酒店状态
    if (!['approved', 'pending'].includes(hotel.status)) {
      await conn.rollback();
      return res.status(400).json({ 
        code: 400, 
        msg: '只有已上线或审核中的酒店可以下线' 
      });
    }
    
    // 更新酒店状态为 offline
    await conn.query(
      'UPDATE hotels SET status = ? WHERE hotel_id = ?',
      ['offline', hotel_id]
    );
    
    // 创建审核申请记录（使用 hotel_offline 类型）
    const changeData = {
      action: 'offline_by_admin',
      previous_status: hotel.status,
      operator_id: admin_id,
      operator_time: new Date(),
      reason: '管理员下线酒店'
    };
    
    const [applyResult]: any = await conn.query(
      `INSERT INTO audits_apply (
        target_type, target_id, hotel_id, merchant_id, 
        change_data, apply_reason, audit_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        'hotel_offline',
        hotel_id,
        hotel_id,
        hotel.merchant_id,
        JSON.stringify(changeData),
        '管理员下线酒店',
        'completed'
      ]
    );
    
    // 记录操作日志到 audit_logs
    await conn.query(
      `INSERT INTO audit_logs (
        apply_id, admin_id, action, reason, created_at
      ) VALUES (?, ?, ?, ?, ?)`,
      [
        applyResult.insertId,
        admin_id,
        'offline',
        '管理员下线酒店操作',
        new Date()
      ]
    );
    
    await conn.commit();
    
    res.json({
      code: 200,
      msg: '酒店已下线',
      data: {
        apply_id: applyResult.insertId
      }
    });
    
  } catch (error) {
    await conn.rollback();
    console.error('下线酒店失败:', error);
    res.status(500).json({ code: 500, msg: '服务器错误' });
  } finally {
    conn.release();
  }
};

// 恢复上线酒店
export const onlineHotel = async (req: Request, res: Response) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    
    const { hotel_id } = req.params;
    const admin_id = (req as any).user?.user_id;
    
    // 检查酒店是否存在
    const [hotelRows]: any = await conn.query(
      'SELECT * FROM hotels WHERE hotel_id = ?',
      [hotel_id]
    );
    
    if (!hotelRows.length) {
      await conn.rollback();
      return res.status(404).json({ code: 404, msg: '酒店不存在' });
    }
    
    const hotel = hotelRows[0];
    
    // 检查酒店状态
    if (hotel.status !== 'offline') {
      await conn.rollback();
      return res.status(400).json({ 
        code: 400, 
        msg: '只有已下线的酒店可以恢复上线' 
      });
    }
    
    // 更新酒店状态为 approved
    await conn.query(
      'UPDATE hotels SET status = ? WHERE hotel_id = ?',
      ['approved', hotel_id]
    );
    
    // 创建审核申请记录（使用 hotel_recovery 类型）
    const changeData = {
      action: 'online_by_admin',
      previous_status: hotel.status,
      operator_id: admin_id,
      operator_time: new Date(),
      reason: '管理员恢复酒店上线'
    };
    
    const [applyResult]: any = await conn.query(
      `INSERT INTO audits_apply (
        target_type, target_id, hotel_id, merchant_id, 
        change_data, apply_reason, audit_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        'hotel_recovery',
        hotel_id,
        hotel_id,
        hotel.merchant_id,
        JSON.stringify(changeData),
        '管理员恢复酒店上线',
        'completed'
      ]
    );
    
    // 记录操作日志到 audit_logs
    await conn.query(
      `INSERT INTO audit_logs (
        apply_id, admin_id, action, reason, created_at
      ) VALUES (?, ?, ?, ?, ?)`,
      [
        applyResult.insertId,
        admin_id,
        'approve',
        '管理员恢复酒店上线操作',
        new Date()
      ]
    );
    
    await conn.commit();
    
    res.json({
      code: 200,
      msg: '酒店已恢复上线',
      data: {
        apply_id: applyResult.insertId
      }
    });
    
  } catch (error) {
    await conn.rollback();
    console.error('恢复酒店失败:', error);
    res.status(500).json({ code: 500, msg: '服务器错误' });
  } finally {
    conn.release();
  }
};

// 批量下线酒店 - 修复类型错误
export const batchOfflineHotels = async (req: Request, res: Response) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    
    const { hotel_ids } = req.body;
    const admin_id = (req as any).user?.user_id;
    
    if (!hotel_ids || !Array.isArray(hotel_ids) || hotel_ids.length === 0) {
      return res.status(400).json({ code: 400, msg: '请选择要操作的酒店' });
    }
    
    // 检查所有酒店是否存在且状态为 approved
    const [hotelRows]: any = await conn.query(
      `SELECT hotel_id, status, merchant_id FROM hotels 
       WHERE hotel_id IN (?)`,
      [hotel_ids]
    );
    
    const invalidHotels = hotelRows.filter((h: any) => h.status !== 'approved');
    if (invalidHotels.length > 0) {
      await conn.rollback();
      return res.status(400).json({ 
        code: 400, 
        msg: `部分酒店不是已上线状态，无法批量下线` 
      });
    }
    
    // 批量更新状态
    await conn.query(
      `UPDATE hotels SET status = 'offline' WHERE hotel_id IN (?)`,
      [hotel_ids]
    );
    
    // 批量创建审核记录和日志
    const applyIds: number[] = [];
    for (const hotel of hotelRows) {
      const changeData = {
        action: 'offline_by_admin',
        previous_status: 'approved',
        operator_id: admin_id,
        operator_time: new Date(),
        reason: '管理员批量下线酒店'
      };
      
      const [applyResult]: any = await conn.query(
        `INSERT INTO audits_apply (
          target_type, target_id, hotel_id, merchant_id, 
          change_data, apply_reason, audit_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          'hotel_offline',
          hotel.hotel_id,
          hotel.hotel_id,
          hotel.merchant_id,
          JSON.stringify(changeData),
          '管理员批量下线酒店',
          'completed'
        ]
      );
      
      applyIds.push(applyResult.insertId);
      
      // 记录操作日志
      await conn.query(
        `INSERT INTO audit_logs (
          apply_id, admin_id, action, reason, created_at
        ) VALUES (?, ?, ?, ?, ?)`,
        [
          applyResult.insertId,
          admin_id,
          'offline',
          '管理员批量下线酒店操作',
          new Date()
        ]
      );
    }
    
    await conn.commit();
    
    res.json({
      code: 200,
      msg: `成功下线 ${hotel_ids.length} 家酒店`,
      data: {
        apply_ids: applyIds
      }
    });
    
  } catch (error) {
    await conn.rollback();
    console.error('批量下线酒店失败:', error);
    res.status(500).json({ code: 500, msg: '服务器错误' });
  } finally {
    conn.release();
  }
};

// 获取酒店的操作日志
export const getHotelOperationLogs = async (req: Request, res: Response) => {
  try {
    const { hotel_id } = req.params;
    
    const [rows]: any = await pool.query(`
      SELECT 
        al.log_id,
        al.apply_id,
        al.admin_id,
        al.action,
        al.reason,
        al.created_at,
        u.username as admin_name,
        aa.target_type,
        aa.change_data
      FROM audit_logs al
      LEFT JOIN users u ON al.admin_id = u.user_id
      LEFT JOIN audits_apply aa ON al.apply_id = aa.apply_id
      WHERE aa.hotel_id = ?
      ORDER BY al.created_at DESC
    `, [hotel_id]);
    
    res.json({
      code: 200,
      data: rows,
      msg: '获取成功'
    });
    
  } catch (error) {
    console.error('获取操作日志失败:', error);
    res.status(500).json({ code: 500, msg: '服务器错误' });
  }
};

// 获取所有下线记录
export const getOfflineRecords = async (req: Request, res: Response) => {
  try {
    const { page = 1, pageSize = 10 } = req.query;
    const offset = (Number(page) - 1) * Number(pageSize);
    
    const [rows]: any = await pool.query(`
      SELECT 
        aa.apply_id,
        aa.target_type,
        aa.target_id,
        aa.hotel_id,
        aa.merchant_id,
        aa.change_data,
        aa.apply_reason,
        aa.audit_status,
        aa.created_at,
        h.name_zh as hotel_name,
        u.username as admin_name,
        al.action as log_action
      FROM audits_apply aa
      LEFT JOIN hotels h ON aa.hotel_id = h.hotel_id
      LEFT JOIN audit_logs al ON aa.apply_id = al.apply_id
      LEFT JOIN users u ON al.admin_id = u.user_id
      WHERE aa.target_type IN ('hotel_offline', 'hotel_recovery')
      ORDER BY aa.created_at DESC
      LIMIT ? OFFSET ?
    `, [Number(pageSize), offset]);
    
    const [countResult]: any = await pool.query(`
      SELECT COUNT(*) as total
      FROM audits_apply
      WHERE target_type IN ('hotel_offline', 'hotel_recovery')
    `);
    
    res.json({
      code: 200,
      data: rows,
      total: countResult[0].total,
      page: Number(page),
      pageSize: Number(pageSize),
      msg: '获取成功'
    });
    
  } catch (error) {
    console.error('获取下线记录失败:', error);
    res.status(500).json({ code: 500, msg: '服务器错误' });
  }
};