import express from 'express';
import { register, login } from '../../controllers/admin/authController';

const router = express.Router();

// 所有注册都使用同一个controller
router.post('/register', register);
router.post('/register/admin', register);  // 兼容前端代码

// 登录使用controller
router.post('/login', login);

export default router;