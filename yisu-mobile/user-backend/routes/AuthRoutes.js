// routes/auth.routes.js - 定义路由（类似 Spring 的 RequestMapping）
const express = require('express');
const router = express.Router();// Express.js 的路由模块，用于定义 API 路径和处理函数
const AuthController = require('../controllers/AuthController');
const AuthMiddleware = require('../middlewares/AuthMiddleware');

// 公开接口
router.post('/register', AuthController.register);
router.post('/login', AuthController.login);

// 需要登录的接口,express调用不用手动传参
router.get('/profile', AuthMiddleware.verifyToken, AuthController.getProfile);

module.exports = router;