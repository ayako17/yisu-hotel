// yisu-server/src/routes/admin/commissionRoutes.ts
import express from 'express';
import {
  getCommissionRules,
  createCommissionRule,
  updateCommissionRule,
  deleteCommissionRule,
  getCurrentCommissionRate,
  getPlatformIncomeStats,
  generateDailyStats
} from '../../controllers/admin/commission.controller';

const router = express.Router();

// 佣金规则管理
router.get('/rules', getCommissionRules);
router.post('/rules', createCommissionRule);
router.put('/rules/:rule_id', updateCommissionRule);
router.delete('/rules/:rule_id', deleteCommissionRule);

// 当前生效规则
router.get('/current-rate', getCurrentCommissionRate);

// 平台收入统计
router.get('/stats', getPlatformIncomeStats);
router.post('/stats/generate', generateDailyStats);

export default router;