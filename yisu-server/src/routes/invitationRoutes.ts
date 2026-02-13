import express from 'express';
import invitationController from '../controllers/invitationController';
import { authenticate, authorize } from '../middleware/auth';

const router = express.Router();

// 所有邀请码路由都需要认证
router.use(authenticate);

// 生成邀请码（仅超级管理员）
router.post(
  '/generate',
  authorize(['super_admin']),
  invitationController.generate.bind(invitationController)
);

// 获取邀请码列表（仅超级管理员）
router.get(
  '/',
  authorize(['super_admin']),
  invitationController.getList.bind(invitationController)
);

// 验证邀请码（公开接口，注册时使用）
router.post(
  '/verify',
  invitationController.verify.bind(invitationController)
);

// 使用邀请码（注册成功后调用）
router.post(
  '/use',
  invitationController.use.bind(invitationController)
);

// 删除邀请码（仅超级管理员）
router.delete(
  '/:id',
  authorize(['super_admin']),
  invitationController.delete.bind(invitationController)
);

export default router;