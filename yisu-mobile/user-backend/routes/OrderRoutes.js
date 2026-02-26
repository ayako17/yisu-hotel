// routes/OrderRoutes.js
const express = require('express');
const router = express.Router();
const orderController = require('../controllers/OrderController');
const AuthMiddleware = require('../middlewares/AuthMiddleware');

// 所有订单路由都需要认证
router.use(AuthMiddleware.verifyToken);

// 创建订单  POST /api/orders
// body: { hotel_id, room_type_id, check_in_date, check_out_date, rooms, adults, children, total_amount, status }
// status 传 'paid'(确认支付) 或 'unpaid'(稍后付款)
router.post('/', orderController.createOrder);

// 获取用户订单列表  GET /api/orders
// query: status? (可选筛选)
router.get('/', orderController.getUserOrders);

// 获取订单详情  GET /api/orders/:orderId
router.get('/:orderId', orderController.getOrderDetail);

// 支付订单  PUT /api/orders/:orderId/pay
router.put('/:orderId/pay', orderController.payOrder);

// 取消订单  PUT /api/orders/:orderId/cancel
router.put('/:orderId/cancel', orderController.cancelOrder);

// 删除订单  DELETE /api/orders/:orderId
router.delete('/:orderId', orderController.deleteOrder);

// 更新订单状态（入住/完成）  PUT /api/orders/:orderId/status
router.put('/:orderId/status', orderController.updateOrderStatus);

module.exports = router;