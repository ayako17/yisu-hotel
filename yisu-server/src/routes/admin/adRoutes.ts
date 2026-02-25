// yisu-server/src/routes/admin/adRoutes.ts
import express from 'express';
import {
  getAdRules,
  createAdRule,
  updateAdRule,
  deleteAdRule
} from '../../controllers/admin/adRule.controller';
import {
  getAdOrders,
  getAdOrderDetail,
  auditAdOrder,
  getAdStats
} from '../../controllers/admin/adOrder.controller';

const router = express.Router();

// ============ 广告规则管理 ============
router.get('/rules', getAdRules);
router.post('/rules', createAdRule);
router.put('/rules/:rule_id', updateAdRule);
router.delete('/rules/:rule_id', deleteAdRule);

// ============ 广告订单管理 ============
router.get('/orders', getAdOrders);
router.get('/orders/stats', getAdStats);
router.get('/orders/:ad_order_id', getAdOrderDetail);
router.post('/orders/:ad_order_id/audit', auditAdOrder);

export default router;