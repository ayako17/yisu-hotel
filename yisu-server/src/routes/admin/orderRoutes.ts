// yisu-server/src/routes/admin/orderRoutes.ts
import express from 'express';
import {
  getOrders,
  getOrderDetail,
  getOrderStats,
  getPlatformStats,
  getDailyOrderStats,
  getHotelOrderStats,
  updateOrderStatus
} from '../../controllers/admin/order.controller';

const router = express.Router();

router.get('/', getOrders);
router.get('/stats', getOrderStats);
router.get('/platform-stats', getPlatformStats);
router.get('/daily-stats', getDailyOrderStats);
router.get('/hotel-stats', getHotelOrderStats);
router.get('/:order_id', getOrderDetail);
router.patch('/:order_id/status', updateOrderStatus);

export default router;