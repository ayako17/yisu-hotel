import express from 'express';
import {
  createOrder,
  getOrders,
  updateOrderStatus,
  getOrderStats  // 新增导入
} from '../../controllers/merchant/orders.controller';

const router = express.Router();

router.post('/', createOrder);
router.get('/', getOrders);
router.get('/stats', getOrderStats);  // 新增统计路由
router.patch('/:order_id/status', updateOrderStatus);

export default router;