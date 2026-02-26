// models/AdModel.js
const db = require('../utils/db')

class AdModel {
  /**
   * 获取当前有效的广告
   * @param {string} currentDate - 当前日期，格式：YYYY-MM-DD
   * @returns {Promise<Array>} 广告列表
   */
  static async getActiveAds(currentDate) {
    try {
      const query = `
        SELECT 
          ad_id,
          hotel_id,
          ad_order_id,
          image_url,
          start_date,
          end_date,
          is_active
        FROM active_ads 
        WHERE is_active = 1 
          AND start_date <= ? 
          AND end_date >= ?
        ORDER BY 
          ad_order_id IS NULL, 
          ad_order_id ASC,
          ad_id ASC
      `
      
      const [rows] = await db.execute(query, [currentDate, currentDate])
      return rows
    } catch (error) {
      console.error('获取有效广告失败:', error)
      throw error
    }
  }

  /**
   * 根据酒店ID获取广告
   * @param {number} hotelId - 酒店ID
   * @returns {Promise<Object|null>} 广告信息
   */
  static async getAdByHotelId(hotelId) {
    try {
      const query = `
        SELECT 
          ad_id,
          hotel_id,
          image_url,
          start_date,
          end_date
        FROM active_ads 
        WHERE hotel_id = ? 
          AND is_active = 1
          AND start_date <= CURDATE()
          AND end_date >= CURDATE()
        LIMIT 1
      `
      
      const [rows] = await db.execute(query, [hotelId])
      return rows.length > 0 ? rows[0] : null
    } catch (error) {
      console.error('获取酒店广告失败:', error)
      throw error
    }
  }

  /**
   * 批量检查多个酒店的广告
   * @param {number[]} hotelIds - 酒店ID数组
   * @returns {Promise<Object>} 酒店ID到广告的映射
   */
  static async getAdsByHotelIds(hotelIds) {
    if (!hotelIds || hotelIds.length === 0) {
      return {}
    }
    
    try {
      const placeholders = hotelIds.map(() => '?').join(',')
      const query = `
        SELECT 
          hotel_id,
          ad_id,
          image_url
        FROM active_ads 
        WHERE hotel_id IN (${placeholders})
          AND is_active = 1
          AND start_date <= CURDATE()
          AND end_date >= CURDATE()
      `
      
      const [rows] = await db.execute(query, hotelIds)
      
      // 转换为映射对象
      const adMap = {}
      rows.forEach(row => {
        adMap[row.hotel_id] = {
          ad_id: row.ad_id,
          image_url: row.image_url
        }
      })
      
      return adMap
    } catch (error) {
      console.error('批量获取酒店广告失败:', error)
      throw error
    }
  }
}

module.exports = AdModel