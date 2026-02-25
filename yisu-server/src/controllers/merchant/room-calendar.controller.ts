import { Request, Response } from 'express';
import pool from '../../config/db';
import { formatDate, getDateRange, isWeekend } from '../../utils/date-utils';

// 定义房型日历数据类型
interface RoomCalendarData {
  room_type_id: number;
  name: string;
  base_price: number;
  calendar: any[]; // 可以根据需要进一步定义 calendar 的类型
}
// 获取房态日历（按酒店）
export const getRoomCalendar = async (req: Request, res: Response) => {
  try {
    const merchant_id = req.user!.user_id;
    const { hotel_id } = req.params;
    const { start_date, end_date } = req.query;
    
    // 验证酒店权限
    const [hotelRows]: any = await pool.query(
      'SELECT hotel_id FROM hotels WHERE hotel_id = ? AND merchant_id = ?',
      [hotel_id, merchant_id]
    );
    
    if (!hotelRows.length) {
      return res.status(404).json({ msg: '酒店不存在或无权限' });
    }
    
    if (!start_date || !end_date) {
      return res.status(400).json({ msg: '缺少日期区间' });
    }

    const start = new Date(start_date as string);
    const end = new Date(end_date as string);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
      return res.status(400).json({ msg: '日期区间不合法' });
    }

    // 获取酒店的所有房型
    const [roomTypes]: any = await pool.query(
      'SELECT room_type_id, name, base_price, total_rooms FROM room_types WHERE hotel_id = ?',
      [hotel_id]
    );
    
    // 明确指定 result 的类型
    const result: RoomCalendarData[] = [];

    for (const rt of roomTypes || []) {
      // 查询已有日历
      const [calendarRows]: any = await pool.query(
        'SELECT * FROM room_calendar WHERE room_type_id = ? AND `date` >= ? AND `date` <= ? ORDER BY date',
        [rt.room_type_id, start_date, end_date]
      );
      
      const existingDates = new Set(
        (calendarRows || []).map((r: any) => {
          const d = r.date instanceof Date ? r.date.toISOString().slice(0, 10) : String(r.date).slice(0, 10);
          return d;
        })
      );

      // 自动补齐缺失日期
      let current = new Date(start);
      while (current <= end) {
        const dayStr = current.toISOString().slice(0, 10);
        if (!existingDates.has(dayStr)) {
          await pool.query(
            `INSERT INTO room_calendar (room_type_id, \`date\`, final_price, available_rooms, status) 
             VALUES (?, ?, ?, ?, ?) 
             ON DUPLICATE KEY UPDATE 
             final_price = VALUES(final_price), 
             available_rooms = VALUES(available_rooms), 
             status = VALUES(status)`,
            [rt.room_type_id, dayStr, rt.base_price, rt.total_rooms, 'open']
          );
        }
        current.setDate(current.getDate() + 1);
      }

      // 重新查询完整数据
      const [fullRows]: any = await pool.query(
        'SELECT * FROM room_calendar WHERE room_type_id = ? AND `date` >= ? AND `date` <= ? ORDER BY date',
        [rt.room_type_id, start_date, end_date]
      );

      // 将数据推送到 result 数组
      result.push({
        room_type_id: rt.room_type_id,
        name: rt.name,
        base_price: rt.base_price,
        calendar: fullRows || []
      });
    }

    res.json(result);
  } catch (error) {
    console.error('获取房态日历失败:', error);
    res.status(500).json({ msg: '房价日历加载失败' });
  }
};

// 获取单个房型的日历
export const getRoomTypeCalendar = async (req: Request, res: Response) => {
  try {
    const merchant_id = req.user!.user_id;
    const { room_type_id } = req.params;
    const { start_date, end_date } = req.query;
    
    // 验证权限
    const [rows]: any = await pool.query(
      'SELECT rt.room_type_id FROM room_types rt JOIN hotels h ON rt.hotel_id = h.hotel_id WHERE rt.room_type_id = ? AND h.merchant_id = ?',
      [room_type_id, merchant_id]
    );
    
    if (!rows.length) {
      return res.status(404).json({ msg: '房型不存在或无权限' });
    }
    
    const [calendar]: any = await pool.query(
      'SELECT * FROM room_calendar WHERE room_type_id = ? AND `date` >= ? AND `date` <= ? ORDER BY date',
      [room_type_id, start_date, end_date]
    );
    
    res.json(calendar);
  } catch (error) {
    console.error('获取房型日历失败:', error);
    res.status(500).json({ msg: '服务器错误' });
  }
};

// 批量修改价格
export const batchUpdatePrice = async (req: Request, res: Response) => {
  try {
    const merchant_id = req.user!.user_id;
    const { hotel_id } = req.params;
    const { start_date, end_date, adjust_type, adjust_value } = req.body;
    
    // 验证酒店权限
    const [hotelRows]: any = await pool.query(
      'SELECT hotel_id FROM hotels WHERE hotel_id = ? AND merchant_id = ?',
      [hotel_id, merchant_id]
    );
    
    if (!hotelRows.length) {
      return res.status(404).json({ msg: '酒店不存在或无权限' });
    }
    
    // 获取酒店的所有房型
    const [roomTypes]: any = await pool.query(
      'SELECT room_type_id FROM room_types WHERE hotel_id = ?',
      [hotel_id]
    );
    
    const v = Number(adjust_value) || 0;
    
    for (const rt of roomTypes || []) {
      // 获取该房型在日期范围内的所有日历记录
      const [calendarRows]: any = await pool.query(
        'SELECT calendar_id, final_price FROM room_calendar WHERE room_type_id = ? AND `date` >= ? AND `date` <= ?',
        [rt.room_type_id, start_date, end_date]
      );
      
      for (const r of calendarRows || []) {
        let newPrice = Number(r.final_price);
        
        if (adjust_type === 'plus') {
          newPrice += v;
        } else if (adjust_type === 'minus') {
          newPrice = Math.max(0, newPrice - v);
        } else if (adjust_type === 'percent') {
          newPrice = Math.max(0, newPrice * (1 + v / 100));
        }
        
        await pool.query(
          'UPDATE room_calendar SET final_price = ? WHERE calendar_id = ?',
          [newPrice.toFixed(2), r.calendar_id]
        );
      }
    }
    
    res.json({ msg: '批量改价成功' });
  } catch (error) {
    console.error('批量改价失败:', error);
    res.status(500).json({ msg: '服务器错误' });
  }
};

// 更新单日价格/库存
export const updateDailyPrice = async (req: Request, res: Response) => {
  try {
    const merchant_id = req.user!.user_id;
    const { room_type_id, date } = req.params;
    const { final_price, available_rooms, status } = req.body;
    
    // 验证权限
    const [rows]: any = await pool.query(
      'SELECT rt.room_type_id FROM room_types rt JOIN hotels h ON rt.hotel_id = h.hotel_id WHERE rt.room_type_id = ? AND h.merchant_id = ?',
      [room_type_id, merchant_id]
    );
    
    if (!rows.length) {
      return res.status(404).json({ msg: '房型不存在或无权限' });
    }
    
    // 检查日历是否存在
    const [existing]: any = await pool.query(
      'SELECT calendar_id FROM room_calendar WHERE room_type_id = ? AND `date` = ?',
      [room_type_id, date]
    );
    
    if (!existing.length) {
      return res.status(404).json({ msg: '该日期无日历数据，请先生成日历' });
    }
    
    const updates: string[] = [];
    const params: any[] = [];
    
    if (final_price != null) {
      updates.push('final_price = ?');
      params.push(Number(final_price));
    }
    if (available_rooms != null) {
      updates.push('available_rooms = ?');
      params.push(Number(available_rooms));
    }
    if (status != null) {
      updates.push('status = ?');
      params.push(status === 'closed' ? 'closed' : 'open');
    }
    
    if (!updates.length) {
      return res.status(400).json({ msg: '请传入 final_price 或 available_rooms 或 status' });
    }
    
    params.push(room_type_id, date);
    
    await pool.query(
      `UPDATE room_calendar SET ${updates.join(', ')} WHERE room_type_id = ? AND \`date\` = ?`,
      params
    );
    
    res.json({ msg: '已更新' });
  } catch (error) {
    console.error('更新单日价格失败:', error);
    res.status(500).json({ msg: '服务器错误' });
  }
};

// 设置关房状态
export const updateRoomStatus = async (req: Request, res: Response) => {
  try {
    const merchant_id = req.user!.user_id;
    const { room_type_id, date } = req.params;
    const { status } = req.body;
    
    // 验证权限
    const [rows]: any = await pool.query(
      'SELECT rt.room_type_id FROM room_types rt JOIN hotels h ON rt.hotel_id = h.hotel_id WHERE rt.room_type_id = ? AND h.merchant_id = ?',
      [room_type_id, merchant_id]
    );
    
    if (!rows.length) {
      return res.status(404).json({ msg: '房型不存在或无权限' });
    }
    
    await pool.query(
      'UPDATE room_calendar SET status = ? WHERE room_type_id = ? AND `date` = ?',
      [status === 'closed' ? 'closed' : 'open', room_type_id, date]
    );
    
    res.json({ msg: '状态已更新' });
  } catch (error) {
    console.error('更新房态状态失败:', error);
    res.status(500).json({ msg: '服务器错误' });
  }
};

// 批量生成日历
export const generateCalendar = async (req: Request, res: Response) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    
    const { room_type_id, start_date, days, base_price } = req.body;
    
    // 获取房型信息
    const [rtRows]: any = await conn.query(
      'SELECT total_rooms, base_price as base FROM room_types WHERE room_type_id = ?',
      [room_type_id]
    );
    
    if (!rtRows.length) {
      await conn.rollback();
      return res.status(404).json({ msg: '房型不存在' });
    }
    
    const total_rooms = rtRows[0].total_rooms || 1;
    let currentDate = new Date(start_date);
    
    for (let i = 0; i < days; i++) {
      const dateStr = currentDate.toISOString().slice(0, 10);
      let price = base_price || rtRows[0].base || 0;
      
      // 周末价格上浮20%
      const day = currentDate.getDay();
      if (day === 0 || day === 6) {
        price = +(price * 1.2).toFixed(2);
      }
      
      await conn.query(
        `INSERT INTO room_calendar (room_type_id, \`date\`, final_price, available_rooms, status) 
         VALUES (?, ?, ?, ?, ?) 
         ON DUPLICATE KEY UPDATE 
         final_price = VALUES(final_price), 
         available_rooms = VALUES(available_rooms), 
         status = VALUES(status)`,
        [room_type_id, dateStr, price, total_rooms, 'open']
      );
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    await conn.commit();
    res.json({ msg: '日历批量生成成功' });
  } catch (error: any) {
    await conn.rollback();
    console.error('生成日历失败:', error);
    res.status(500).json({ msg: error.message || '服务器错误' });
  } finally {
    conn.release();
  }
};

// 复制价格（将某天的价格复制到其他日期）
export const copyPrice = async (req: Request, res: Response) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    
    const merchant_id = req.user!.user_id;
    const { room_type_id } = req.params;
    const { source_date, target_dates } = req.body;
    
    // 验证权限
    const [rows]: any = await conn.query(
      'SELECT rt.room_type_id FROM room_types rt JOIN hotels h ON rt.hotel_id = h.hotel_id WHERE rt.room_type_id = ? AND h.merchant_id = ?',
      [room_type_id, merchant_id]
    );
    
    if (!rows.length) {
      await conn.rollback();
      return res.status(404).json({ msg: '房型不存在或无权限' });
    }
    
    // 获取源日期的价格和库存
    const [sourceRows]: any = await conn.query(
      'SELECT final_price, available_rooms, status FROM room_calendar WHERE room_type_id = ? AND `date` = ?',
      [room_type_id, source_date]
    );
    
    if (!sourceRows.length) {
      await conn.rollback();
      return res.status(404).json({ msg: '源日期无日历数据' });
    }
    
    const { final_price, available_rooms, status } = sourceRows[0];
    
    // 更新目标日期
    for (const target_date of target_dates) {
      await conn.query(
        `UPDATE room_calendar SET 
         final_price = ?, available_rooms = ?, status = ? 
         WHERE room_type_id = ? AND \`date\` = ?`,
        [final_price, available_rooms, status, room_type_id, target_date]
      );
    }
    
    await conn.commit();
    res.json({ msg: '价格复制成功' });
  } catch (error) {
    await conn.rollback();
    console.error('复制价格失败:', error);
    res.status(500).json({ msg: '服务器错误' });
  } finally {
    conn.release();
  }
};