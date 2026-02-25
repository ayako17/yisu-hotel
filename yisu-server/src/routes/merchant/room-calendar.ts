import express from 'express';
import {
  getRoomCalendar,
  getRoomTypeCalendar,
  batchUpdatePrice,
  updateDailyPrice,
  updateRoomStatus,
  generateCalendar,
  copyPrice
} from '../../controllers/merchant/room-calendar.controller';

const router = express.Router();

// 按酒店查询所有房型的日历（房态管理主视图）
router.get('/hotels/:hotel_id', getRoomCalendar);

// 查询单个房型的日历
router.get('/:room_type_id', getRoomTypeCalendar);

// 批量修改价格
router.post('/hotels/:hotel_id/batch-price', batchUpdatePrice);

// 修改单日价格/库存
router.patch('/:room_type_id/date/:date', updateDailyPrice);

// 设置关房状态
router.patch('/:room_type_id/date/:date/status', updateRoomStatus);

// 批量生成日历
router.post('/generate', generateCalendar);

// 复制价格
router.post('/:room_type_id/copy-price', copyPrice);

export default router;