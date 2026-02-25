import express from 'express';
import { getOverview } from '../../controllers/merchant/dashboard.controller';

const router = express.Router();

router.get('/overview', getOverview);

export default router;