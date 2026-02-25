import express from 'express';
import { 
  getHotelAuditList,
  getHotelAuditDetail,
  approveHotelAudit,
  rejectHotelAudit
} from '../../controllers/admin/hotelAudit.controller';
import { authenticate, authorize } from '../../middleware/auth';

const router = express.Router();

// 所有路由都需要管理员权限 - 注意：使用数组形式
router.use(authenticate, authorize(['admin', 'super_admin']));

// 获取酒店审核列表
router.get('/', getHotelAuditList);

// 获取审核详情
router.get('/:apply_id', getHotelAuditDetail);

// 审核通过
router.post('/:apply_id/approve', approveHotelAudit);

// 审核驳回
router.post('/:apply_id/reject', rejectHotelAudit);

export default router;