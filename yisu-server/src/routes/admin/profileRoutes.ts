import express from 'express';
import { authenticate } from '../../middleware/auth';
import { 
  getProfile, 
  updateProfile, 
  updatePassword, 
  uploadAvatar, 
  handleAvatarUpload 
} from '../../controllers/admin/profileController';

const router = express.Router();

// 所有个人中心路由都需要认证
router.use(authenticate);

// 获取个人资料
router.get('/', getProfile);

// 更新个人资料
router.put('/', updateProfile);

// 更新密码
router.put('/password', updatePassword);

// 上传头像
router.post('/avatar', uploadAvatar, handleAvatarUpload);

export default router;