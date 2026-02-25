import express from 'express';
import { 
  getMyAuditRecords, 
  getMyAuditStatus,
  getMyPendingApplies 
} from '../../controllers/merchant/audit.controller';

const router = express.Router();

// 获取审核记录
router.get('/records', getMyAuditRecords);

// 获取审核状态
router.get('/status', getMyAuditStatus);

// 获取待审核申请
router.get('/pending', getMyPendingApplies);

export default router;