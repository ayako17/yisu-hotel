// hotelManagementRoutes.ts
import express from 'express';
import { 
  getHotelList,
  getHotelDetail,
  offlineHotel,
  onlineHotel,
  batchOfflineHotels,
  getHotelCities,
  getHotelOperationLogs,
  getOfflineRecords
} from '../../controllers/admin/hotelManagement.controller';
import { authenticate, authorize } from '../../middleware/auth';

const router = express.Router();

// 所有路由都需要管理员权限
router.use(authenticate, authorize(['admin', 'super_admin']));

// 获取城市列表（放在动态路由前面）
router.get('/cities', getHotelCities);

// 获取操作日志
router.get('/:hotel_id/logs', getHotelOperationLogs);

// 获取所有下线记录
router.get('/offline-records', getOfflineRecords);

// 获取酒店列表
router.get('/', getHotelList);

// 获取酒店详情
router.get('/:hotel_id', getHotelDetail);

// 下线酒店
router.post('/:hotel_id/offline', offlineHotel);

// 恢复上线
router.post('/:hotel_id/online', onlineHotel);

// 批量下线
router.post('/batch/offline', batchOfflineHotels);

export default router;