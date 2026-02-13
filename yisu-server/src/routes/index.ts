import express from 'express';
import authRoutes from './authRoutes';
import adminRoutes from './adminRoutes';
import invitationRoutes from './invitationRoutes';
import profileRoutes from './profileRoutes';
import auditRoutes from './auditRoutes';
import merchantRoutes from './merchantRoutes';
const router = express.Router();

// 注册所有路由模块
router.use('/auth', authRoutes);
router.use('/admins', adminRoutes);
router.use('/invitations', invitationRoutes);
router.use('/profile', profileRoutes);
router.use('/audit', auditRoutes);
router.use('/merchant', merchantRoutes);
export default router;