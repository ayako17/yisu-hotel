// yisu-server/src/routes/admin/activeAdRoutes.ts
import express from 'express';
import {
  getActiveAds,
  deactivateAd,
  cleanExpiredAds
} from '../../controllers/admin/activeAd.controller';

const router = express.Router();

// 获取当前生效的广告列表
router.get('/', getActiveAds);

// 手动停用广告
router.post('/:ad_id/deactivate', deactivateAd);

// 清理过期广告
router.post('/clean-expired', cleanExpiredAds);

export default router;