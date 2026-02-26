// config/cron.js
const cron = require('node-cron')
const OrderScheduler = require('../services/OrderScheduler')

// 每天下午 14:00 执行
// cron 表达式: 秒 分 时 日 月 周
// '0 14 * * *' 表示每天 14:00:00 执行
const scheduleOrderUpdate = () => {
  cron.schedule('0 14 * * *', async () => {
    console.log('⏰ 定时任务触发:', new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }))
    await OrderScheduler.updateOrderStatusDaily()
  }, {
    scheduled: true,
    timezone: "Asia/Shanghai" // 设置时区为北京时间
  })
  
  console.log('📅 订单状态定时任务已启动，每天 14:00 (北京时间) 执行')
}

module.exports = scheduleOrderUpdate