import express from 'express';
import { login, register, apply } from '../../controllers/merchant/auth.controller';

const router = express.Router();

// 登录/注册（用于商户端）
router.post('/login', login);
router.post('/register', register);
router.post('/apply', apply);

export default router;