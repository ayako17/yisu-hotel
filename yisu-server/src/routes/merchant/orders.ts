// yisu-server/src/routes/merchant/orders.ts
import express from 'express';
import {
  createOrder,
  getOrders,
  getOrderDetail,  // 新增
  updateOrderStatus,
  getOrderStats,
  exportOrders  // 新增导入
} from '../../controllers/merchant/orders.controller';

const router = express.Router();

router.post('/', createOrder);
router.get('/', getOrders);
router.get('/stats', getOrderStats);
router.get('/export', exportOrders);
router.get('/:order_id', getOrderDetail);  // 新增详情路由
router.patch('/:order_id/status', updateOrderStatus);

export default router;