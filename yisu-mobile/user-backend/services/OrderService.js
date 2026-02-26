const OrderModel = require('../models/OrderModel');

class OrderService {
    constructor() {
        this.orderModel = new OrderModel();
    }

    // 创建订单
    async createOrder(data) {
        try {
            const {
                user_id,
                room_type_id,
                check_in_date,
                check_out_date,
                rooms
            } = data;

            // 检查房间可用性
            const isAvailable = await this.orderModel.checkRoomAvailability(
                room_type_id,
                check_in_date,
                check_out_date,
                rooms
            );

            if (!isAvailable) {
                throw new Error('所选日期房间已满');
            }

            // 创建订单
            const result = await this.orderModel.create(data);
            
            if (!result.insertId) {
                throw new Error('订单创建失败');
            }

            // 获取完整的订单详情
            const order = await this.orderModel.findById(result.insertId, user_id);
            
            return order;

        } catch (error) {
            console.error('OrderService createOrder error:', error);
            throw error;
        }
    }

    // 获取用户订单列表
    async getUserOrders(userId, filters = {}) {
        try {
            return await this.orderModel.findByUserId(userId, filters);
        } catch (error) {
            console.error('OrderService getUserOrders error:', error);
            throw error;
        }
    }

    // 获取订单详情
    async getOrderDetail(orderId, userId) {
        try {
            const order = await this.orderModel.findById(orderId, userId);
            
            if (!order) {
                throw new Error('订单不存在');
            }
            
            return order;
        } catch (error) {
            console.error('OrderService getOrderDetail error:', error);
            throw error;
        }
    }

    // 支付订单
    async payOrder(orderId, userId) {
        try {
            const result = await this.orderModel.updateStatus(orderId, userId, 'paid', {
                currentStatus: 'unpaid'
            });

            if (result.affectedRows === 0) {
                throw new Error('订单无法支付，可能已支付或不存在');
            }

            return { orderId, status: 'paid' };
        } catch (error) {
            console.error('OrderService payOrder error:', error);
            throw error;
        }
    }

    // 取消订单
    async cancelOrder(orderId, userId) {
        try {
            const result = await this.orderModel.updateStatus(orderId, userId, 'cancelled', {
                currentStatus: 'unpaid'
            });

            if (result.affectedRows === 0) {
                throw new Error('订单无法取消，可能已支付或不存在');
            }

            return { orderId, status: 'cancelled' };
        } catch (error) {
            console.error('OrderService cancelOrder error:', error);
            throw error;
        }
    }

    // 删除订单
    async deleteOrder(orderId, userId) {
        try {
            const result = await this.orderModel.delete(orderId, userId);

            if (result.affectedRows === 0) {
                throw new Error('只能删除已完成或已取消的订单');
            }

            return { success: true };
        } catch (error) {
            console.error('OrderService deleteOrder error:', error);
            throw error;
        }
    }

    // 更新订单状态
    async updateOrderStatus(orderId, userId, status) {
        try {
            const validStatus = ['checked_in', 'completed'];
            if (!validStatus.includes(status)) {
                throw new Error('无效的订单状态');
            }

            const result = await this.orderModel.updateStatus(orderId, userId, status, {
                currentStatus: 'paid'
            });

            if (result.affectedRows === 0) {
                throw new Error('订单状态更新失败');
            }

            return { orderId, status };
        } catch (error) {
            console.error('OrderService updateOrderStatus error:', error);
            throw error;
        }
    }
}

module.exports = OrderService;