const AuthService = require('../services/AuthService');
const { success, error } = require('../utils/response');

const AuthController = {
    // 注册
    //req是 Express.js 中的请求对象，包含了客户端发送的请求信息，如请求体、查询参数、路径参数、请求头等。
    //res是 Express.js 中的响应对象，用于向客户端发送响应数据，如 JSON、HTML、状态码等。
    async register(req, res) {
        try {
            const { phone, password, username } = req.body;
            
            // 参数验证
            if (!phone || !password) {
                return error(res, '手机号和密码不能为空', 400);
            }
            
            if (!/^1[3-9]\d{9}$/.test(phone)) {
                return error(res, '手机号格式不正确', 400);
            }
            
            if (password.length < 6) {
                return error(res, '密码至少6位', 400);
            }

            const result = await AuthService.register(phone, password, username);
            success(res, result, '注册成功', 201);
        } catch (err) {
            error(res, err.message, 400);
        }
    },

    // 登录
    async login(req, res) {
        try {
            const { phone, password } = req.body;
            
            if (!phone || !password) {
                return error(res, '手机号和密码不能为空', 400);
            }

            const result = await AuthService.login(phone, password);
            success(res, result, '登录成功');
        } catch (err) {
            error(res, err.message, 401);
        }
    },

    // 获取当前用户信息
    async getProfile(req, res) {
        try {
            // req.user 从认证中间件获取
            success(res, req.user, '获取成功');
        } catch (err) {
            error(res, err.message, 500);
        }
    }
};

module.exports = AuthController;