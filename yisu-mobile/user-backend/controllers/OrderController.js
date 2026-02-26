// controllers/OrderController.js
const OrderService = require('../services/OrderService');
const db = require('../utils/db');
const orderService = new OrderService();

class OrderController {
    
    // 创建订单
    async createOrder(req, res) {
        try {
            const userId = req.user.user_id; // 从 AuthMiddleware 获取
            const orderData = {
                ...req.body,
                user_id: userId
            };
            
            const result = await orderService.createOrder(orderData);
            res.json({
                code: 200,
                data: result,
                message: '订单创建成功'
            });
        } catch (error) {
            console.error('创建订单错误:', error);
            res.status(500).json({
                code: 500,
                message: error.message || '创建订单失败'
            });
        }
    }

    // 获取用户订单列表
    async getUserOrders(req, res) {
        try {
            const userId = req.user.user_id; // 从 AuthMiddleware 获取
            const { status, page = 1, pageSize = 10 } = req.query;
            
            const result = await orderService.getUserOrders(userId, { status, page, pageSize });
            res.json({
                code: 200,
                data: result,
                message: 'success'
            });
        } catch (error) {
            console.error('获取订单列表错误:', error);
            res.status(500).json({
                code: 500,
                message: error.message || '获取订单列表失败'
            });
        }
    }

    // 获取订单详情
    async getOrderDetail(req, res) {
        try {
            const { orderId } = req.params;
            const userId = req.user.user_id; // 从 AuthMiddleware 获取
            
            const order = await orderService.getOrderDetail(orderId, userId);
            res.json({
                code: 200,
                data: order,
                message: 'success'
            });
        } catch (error) {
            console.error('获取订单详情错误:', error);
            res.status(500).json({
                code: 500,
                message: error.message || '获取订单详情失败'
            });
        }
    }

    // 支付订单
    async payOrder(req, res) {
        try {
            const { orderId } = req.params;
            const userId = req.user.user_id; // 从 AuthMiddleware 获取
            
            const result = await orderService.payOrder(orderId, userId);
            res.json({
                code: 200,
                data: result,
                message: '支付成功'
            });
        } catch (error) {
            console.error('支付订单错误:', error);
            res.status(500).json({
                code: 500,
                message: error.message || '支付失败'
            });
        }
    }

    // 取消订单
    async cancelOrder(req, res) {
        try {
            const { orderId } = req.params;
            const userId = req.user.user_id; // 从 AuthMiddleware 获取
            
            const result = await orderService.cancelOrder(orderId, userId);
            res.json({
                code: 200,
                data: result,
                message: '订单已取消'
            });
        } catch (error) {
            console.error('取消订单错误:', error);
            res.status(500).json({
                code: 500,
                message: error.message || '取消订单失败'
            });
        }
    }

    // 删除订单
    async deleteOrder(req, res) {
        try {
            const { orderId } = req.params;
            const userId = req.user.user_id; // 从 AuthMiddleware 获取
            
            const result = await orderService.deleteOrder(orderId, userId);
            res.json({
                code: 200,
                data: result,
                message: '订单删除成功'
            });
        } catch (error) {
            console.error('删除订单错误:', error);
            res.status(500).json({
                code: 500,
                message: error.message || '删除订单失败'
            });
        }
    }

    // 更新订单状态（用于入住、完成等）
    async updateOrderStatus(req, res) {
        try {
            const { orderId } = req.params;
            const { status } = req.body;
            const userId = req.user.user_id; // 从 AuthMiddleware 获取
            
            const result = await orderService.updateOrderStatus(orderId, userId, status);
            res.json({
                code: 200,
                data: result,
                message: '订单状态更新成功'
            });
        } catch (error) {
            console.error('更新订单状态错误:', error);
            res.status(500).json({
                code: 500,
                message: error.message || '更新订单状态失败'
            });
        }
    }
}

module.exports = new OrderController();