// routes/AdRoutes.js
const express = require('express')
const router = express.Router()
const AdModel = require('../models/AdModel')

/**
 * @route GET /api/ads/active
 * @desc 获取当前所有有效的广告（用于首页轮播）
 * @access Public
 */
router.get('/active', async (req, res) => {
  try {
    // 获取当前日期，格式：YYYY-MM-DD
    const today = new Date().toISOString().split('T')[0]
    
    const ads = await AdModel.getActiveAds(today)
    
    res.json({
      code: 200,
      data: ads,
      message: '获取广告成功'
    })
  } catch (error) {
    console.error('获取广告失败:', error)
    res.status(500).json({
      code: 500,
      message: '服务器错误'
    })
  }
})

/**
 * @route GET /api/ads/hotel/:hotelId
 * @desc 获取指定酒店的广告
 * @access Public
 */
router.get('/hotel/:hotelId', async (req, res) => {
  try {
    const { hotelId } = req.params
    
    if (!hotelId) {
      return res.status(400).json({
        code: 400,
        message: '酒店ID不能为空'
      })
    }
    
    const ad = await AdModel.getAdByHotelId(hotelId)
    
    res.json({
      code: 200,
      data: ad,
      message: ad ? '获取广告成功' : '该酒店暂无广告'
    })
  } catch (error) {
    console.error('获取酒店广告失败:', error)
    res.status(500).json({
      code: 500,
      message: '服务器错误'
    })
  }
})

/**
 * @route POST /api/ads/batch
 * @desc 批量获取多个酒店的广告
 * @access Public
 */
router.post('/batch', async (req, res) => {
  try {
    const { hotelIds } = req.body
    
    if (!hotelIds || !Array.isArray(hotelIds)) {
      return res.status(400).json({
        code: 400,
        message: '请提供酒店ID数组'
      })
    }
    
    const adMap = await AdModel.getAdsByHotelIds(hotelIds)
    
    res.json({
      code: 200,
      data: adMap,
      message: '批量获取广告成功'
    })
  } catch (error) {
    console.error('批量获取广告失败:', error)
    res.status(500).json({
      code: 500,
      message: '服务器错误'
    })
  }
})

module.exports = router