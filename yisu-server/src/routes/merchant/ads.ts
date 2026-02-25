import express from 'express';
import {
  getBalance,
  getPlacements,
  createPromotion,
  getEffectPreview,
  getMerchantAdOrders  // 新增
} from '../../controllers/merchant/ads.controller';

const router = express.Router();

router.get('/balance', getBalance);
router.get('/placements', getPlacements);
router.post('/promotion', createPromotion);
router.get('/effect-preview', getEffectPreview);
router.get('/orders', getMerchantAdOrders);  // 新增
export default router;