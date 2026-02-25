// yisu-server/src/routes/merchant/hotelDetail.ts
import express from 'express';
import { getMerchantHotelDetail } from '../../controllers/merchant/hotelDetail.controller';
import { authenticate } from '../../middleware/auth';

const router = express.Router();

// 需要认证的商户酒店详情接口
router.get('/:hotel_id', authenticate, getMerchantHotelDetail);

export default router;