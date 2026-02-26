// services/OrderScheduler.js
const db = require('../utils/db')
const fs = require('fs')
const path = require('path')

class OrderScheduler {
  /**
   * 写入日志
   */
  static log(message, type = 'info') {
    const timestamp = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })
    const logMessage = `[${timestamp}] [${type}] ${message}\n`
    
    // 控制台输出
    console.log(logMessage)
    
    // 写入文件日志
    const logDir = path.join(__dirname, '../logs')
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true })
    }
    
    const logFile = path.join(logDir, `order-scheduler-${new Date().toISOString().split('T')[0]}.log`)
    fs.appendFileSync(logFile, logMessage)
  }

  /**
   * 每天下午两点执行：更新订单状态
   */
  static async updateOrderStatusDaily() {
    this.log('🕑 开始执行每日订单状态更新任务')
    
    try {
      const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD
      
      this.log(`📅 当前日期: ${today}`)
      
      // 开启事务，确保数据一致性
      await db.beginTransaction()
      
      // 1. 将超过支付时间的未支付订单自动取消（假设支付时限为30分钟）
      const [cancelUnpaidResult] = await db.execute(`
        UPDATE orders 
        SET status = 'cancelled', updated_at = NOW()
        WHERE status = 'unpaid' 
          AND created_at < DATE_SUB(NOW(), INTERVAL 30 MINUTE)
      `)
      this.log(`⏱️ 超时取消订单: ${cancelUnpaidResult.affectedRows} 个`)
      
      // 2. 今天入住的订单：从 paid 变为 checked_in
      const [checkInResult] = await db.execute(`
        UPDATE orders 
        SET status = 'checked_in', updated_at = NOW()
        WHERE status = 'paid' 
          AND check_in_date = ?
      `, [today])
      this.log(`🏨 今日入住订单: ${checkInResult.affectedRows} 个`)
      
      // 3. 今天离店的订单：从 checked_in 变为 completed
      const [checkOutResult] = await db.execute(`
        UPDATE orders 
        SET status = 'completed', updated_at = NOW()
        WHERE status = 'checked_in' 
          AND check_out_date = ?
      `, [today])
      this.log(`🧳 今日离店订单: ${checkOutResult.affectedRows} 个`)
      
      // 4. 处理过期的订单：如果已过了离店日期但状态还是 paid 或 checked_in
      const [overdueResult] = await db.execute(`
        UPDATE orders 
        SET status = 'completed', updated_at = NOW()
        WHERE (status = 'paid' OR status = 'checked_in')
          AND check_out_date < ?
      `, [today])
      this.log(`⚠️ 过期订单处理: ${overdueResult.affectedRows} 个`)
      
      await db.commit()
      
      const stats = {
        cancelled: cancelUnpaidResult.affectedRows || 0,
        checkedIn: checkInResult.affectedRows || 0,
        completed: checkOutResult.affectedRows || 0,
        overdue: overdueResult.affectedRows || 0
      }
      
      this.log(`✅ 订单状态更新完成: ${JSON.stringify(stats)}`)
      
      return {
        success: true,
        stats
      }
      
    } catch (error) {
      await db.rollback()
      this.log(`❌ 订单状态更新失败: ${error.message}`, 'error')
      console.error(error)
      
      return {
        success: false,
        error: error.message
      }
    }
  }
}

module.exports = OrderScheduler