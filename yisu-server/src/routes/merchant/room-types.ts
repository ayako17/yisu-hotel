import express from 'express';
import {
  getRoomTypes,
  createRoomType,
  updateRoomType,
  deleteRoomType,
  updateRoomTypeTags
} from '../../controllers/merchant/room-types.controller';

const router = express.Router();

router.get('/', getRoomTypes);
router.post('/', createRoomType);
router.put('/:room_type_id', updateRoomType);
router.delete('/:room_type_id', deleteRoomType);
router.put('/:room_type_id/tags', updateRoomTypeTags);

export default router;