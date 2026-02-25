import { Request, Response } from 'express';
import pool from '../../config/db';

// 获取仪表盘概览数据
export const getOverview = async (req: Request, res: Response) => {
  try {
    const merchant_id = req.user!.user_id;
    
    // 获取商户的所有酒店
    const [hotelsRows]: any = await pool.query(
      'SELECT hotel_id FROM hotels WHERE merchant_id = ?',
      [merchant_id]
    );
    
    const hotelIds = hotelsRows.map((r: any) => r.hotel_id);
    if (!hotelIds.length) {
      return res.json({ 
        bookings_today: 0, 
        estimated_revenue: 0, 
        occupancy_rate: 0, 
        trends: [], 
        room_status: [] 
      });
    }
    
    // 今日预订量
    const [bookRows]: any = await pool.query(
      `SELECT COUNT(*) as cnt FROM orders 
       WHERE hotel_id IN (?) AND DATE(created_at) = CURDATE()`,
      [hotelIds]
    );
    const bookings_today = bookRows[0].cnt || 0;
    
    // 预计营业额和入住率
    const [statRows]: any = await pool.query(
      `SELECT IFNULL(SUM(order_income),0) as total_income, 
              IFNULL(AVG(occupancy_rate),0) as occupancy_rate 
       FROM hotel_finance_stats 
       WHERE hotel_id IN (?) 
       ORDER BY stat_date DESC LIMIT 15`,
      [hotelIds]
    );
    const estimated_revenue = statRows.length ? Number(statRows[0].total_income || 0) : 0;
    const occupancy_rate = statRows.length ? Number(statRows[0].occupancy_rate || 0) : 0;
    
    // 近15日营业额趋势
    const [trendRows]: any = await pool.query(
      `SELECT stat_date as date, SUM(order_income) as income 
       FROM hotel_finance_stats 
       WHERE hotel_id IN (?) 
       GROUP BY stat_date 
       ORDER BY stat_date DESC LIMIT 15`,
      [hotelIds]
    );
    const trends = (trendRows || [])
      .map((r: any) => ({ 
        date: r.date ? r.date.toISOString().slice(0,10) : '', 
        income: Number(r.income || 0) 
      }))
      .reverse();
    
    // 房态摘要
    const [roomRows]: any = await pool.query(
      `SELECT rt.room_type_id, rt.name, 
              SUM(rc.available_rooms) as available, 
              SUM(rt.total_rooms) as total 
       FROM room_types rt 
       JOIN room_calendar rc ON rt.room_type_id = rc.room_type_id 
       WHERE rt.hotel_id IN (?) AND rc.date = CURDATE() 
       GROUP BY rt.room_type_id`,
      [hotelIds]
    );
    const room_status = (roomRows || []).map((r: any) => ({ 
      room_type_id: r.room_type_id, 
      name: r.name, 
      available: Number(r.available || 0), 
      total: Number(r.total || 0) 
    }));
    
    res.json({ 
      bookings_today, 
      estimated_revenue, 
      occupancy_rate, 
      trends, 
      room_status 
    });
  } catch (error) {
    console.error('获取仪表盘数据失败:', error);
    res.status(500).json({ msg: '服务器错误' });
  }
};