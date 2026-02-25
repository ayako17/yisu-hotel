// yisu-server/src/utils/cronJobs.ts
import cron from 'node-cron';
import pool from '../config/db';

// 每天凌晨1点自动清理过期广告
cron.schedule('0 1 * * *', async () => {
  try {
    const [result]: any = await pool.query(
      `UPDATE active_ads 
       SET is_active = FALSE 
       WHERE end_date < CURDATE() AND is_active = TRUE`
    );
    console.log(`[定时任务] ${new Date().toLocaleString()} - 已自动清理 ${result.affectedRows} 条过期广告`);
  } catch (error) {
    console.error('[定时任务] 清理失败:', error);
  }
});

// 每天凌晨2点发送过期提醒
cron.schedule('0 2 * * *', async () => {
  try {
    const [rows]: any = await pool.query(
      `SELECT 
        aa.*,
        h.name_zh as hotel_name,
        u.username as merchant_name,
        u.phone as merchant_phone
       FROM active_ads aa
       LEFT JOIN hotels h ON aa.hotel_id = h.hotel_id
       LEFT JOIN users u ON h.merchant_id = u.user_id
       WHERE aa.end_date = DATE_ADD(CURDATE(), INTERVAL 3 DAY)
         AND aa.is_active = TRUE`
    );
    
    rows.forEach((ad: any) => {
      console.log(`[过期提醒] ${ad.hotel_name} 的广告将在3天后过期`);
      // 这里可以添加发送短信或邮件通知的逻辑
    });
  } catch (error) {
    console.error('[过期提醒] 查询失败:', error);
  }
});

// 每天凌晨3点统计广告效果（示例）
cron.schedule('0 3 * * *', async () => {
  try {
    console.log(`[统计任务] ${new Date().toLocaleString()} - 开始统计广告效果`);
    // 这里可以添加广告效果统计的逻辑
  } catch (error) {
    console.error('[统计任务] 失败:', error);
  }
});