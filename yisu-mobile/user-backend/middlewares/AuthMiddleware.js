// middlewares/auth.middleware.js - 认证拦截器（类似 Spring 的 Interceptor）
const AuthService = require('../services/AuthService');
const UserModel = require('../models/UserModel');
const { error } = require('../utils/response');

const AuthMiddleware = {
    // 验证 token 中间件
    async verifyToken(req, res, next) {
        const authHeader = req.headers.authorization;
        
        //Bearer token 是一种常见的认证方案，客户端在请求头中携带一个名为 Authorization 的字段
        //其值以 Bearer 开头，后面跟着一个空格和实际的 token。例如：
        //Authorization: Bearer <token
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return error(res, '未登录', 401);
        }

        // 从 Authorization 头中提取 token，去掉 "Bearer " 前缀
        const token = authHeader.split(' ')[1];

        try {
            // 验证 token 的合法性和有效性，如果 token 无效或过期，jwt.verify 会抛出错误
            const decoded = AuthService.verifyToken(token);
            
            // 获取用户信息
            const user = await UserModel.findById(decoded.user_id);
            if (!user) {
                return error(res, '用户不存在', 401);
            }
            
            if (user.status === 'suspended') {
                return error(res, '账号已被禁用', 403);
            }

            // 将用户信息挂载到 req 上
            req.user = user;
            // 继续处理后续请求
            next();
        } catch (err) {
            error(res, err.message, 401);
        }
    }
};

module.exports = AuthMiddleware;