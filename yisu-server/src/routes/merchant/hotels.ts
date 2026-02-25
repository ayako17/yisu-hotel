import express from 'express';
import {
  getHotels,
  createHotel,
  getHotelDetail,
  updateHotel,
  updateHotelStatus,
  updateHotelMedia,
  updateHotelTags,
  submitHotelForAudit
} from '../../controllers/merchant/hotels.controller';
import { authenticate } from '../../middleware/auth';

const router = express.Router();

router.get('/', getHotels);
router.post('/', createHotel);
router.get('/:hotel_id/detail', getHotelDetail);
router.put('/:hotel_id', updateHotel);
router.patch('/:hotel_id/status', updateHotelStatus);
router.put('/:hotel_id/media', updateHotelMedia);
router.put('/:hotel_id/tags', updateHotelTags);
// 提交酒店审核
router.post('/:hotel_id/submit-audit', authenticate, submitHotelForAudit);
export default router;