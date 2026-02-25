import express from 'express';
import { authenticate } from '../middleware/auth';

// 管理员路由
import authRoutes from './admin/authRoutes';
import adminRoutes from './admin/adminRoutes';
import invitationRoutes from './admin/invitationRoutes';
import profileRoutes from './admin/profileRoutes';
import auditRoutes from './admin/auditRoutes';
import merchantAdminRoutes from './admin/merchantRoutes';
import hotelAuditRoutes from './admin/hotelAuditRoutes';  // 新增
import hotelManagementRoutes from './admin/hotelManagementRoutes'; // 新增
import adRoutes from './admin/adRoutes'; // 新增广告路由
import activeAdRoutes from '././admin/activeAdRoutes';
import orderRoutes from './admin/orderRoutes';
import commissionRoutes from './admin/commissionRoutes';

// 商户端路由（新增）
import merchantAuthRoutes from './merchant/auth';
import merchantHotelRoutes from './merchant/hotels';
import merchantRoomTypeRoutes from './merchant/room-types';
import merchantRoomCalendarRoutes from './merchant/room-calendar';
import merchantOrderRoutes from './merchant/orders';
import merchantAdRoutes from './merchant/ads';
import merchantDashboardRoutes from './merchant/dashboard';
import merchantTagRoutes from './merchant/tags';
import merchantProfileRoutes from './merchant/profile';
import merchantUploadRoutes from './merchant/upload';
import merchantAuditRoutes from './merchant/audit';
import { getMyAuditRecords } from '../controllers/merchant/audit.controller';
import merchantHotelDetailRoutes from './merchant/hotelDetail';
const router = express.Router();

// ============ 管理员路由 (需要认证) ============
router.use('/auth', authRoutes);  // 登录注册不需要认证，但已经在 authRoutes 内处理
router.use('/admins', authenticate, adminRoutes);
router.use('/invitations', authenticate, invitationRoutes);
router.use('/profile', authenticate, profileRoutes);
router.use('/audit', authenticate, auditRoutes);
router.use('/merchant', authenticate, merchantAdminRoutes); // 原有的商户管理（管理员端）
router.use('/audit/hotels', authenticate, hotelAuditRoutes);  // 新增：酒店审核路由
router.use('/admin/hotels', authenticate, hotelManagementRoutes); // 新增：酒店管理路由
router.use('/admin/ads', authenticate, adRoutes); // 注册广告路由
router.use('/admin/active-ads', authenticate, activeAdRoutes);
router.use('/admin/orders', authenticate, orderRoutes);
router.use('/admin/commission', authenticate, commissionRoutes);


// ============ 商户端路由 ============
// 公共接口（不需要认证）
router.use('/merchant/auth', merchantAuthRoutes);  // /api/merchant/auth/login
router.use('/tags', merchantTagRoutes);            // /api/tags 公共接口

// 需要认证的商户端接口
router.use('/merchant/hotels', authenticate, merchantHotelRoutes);
router.use('/merchant/room-types', authenticate, merchantRoomTypeRoutes);
router.use('/merchant/calendar', authenticate, merchantRoomCalendarRoutes);
router.use('/merchant/orders', authenticate, merchantOrderRoutes);
router.use('/merchant/ads', authenticate, merchantAdRoutes);
router.use('/merchant/dashboard', authenticate, merchantDashboardRoutes);
router.use('/merchant/profile', authenticate, merchantProfileRoutes);
router.use('/merchant/upload', authenticate, merchantUploadRoutes);
router.use('/merchant/audit', authenticate, merchantAuditRoutes);  // 新增：商户审核路由
router.use('/merchant/hotel-detail', authenticate, merchantHotelDetailRoutes);
// ============ 兼容队友前端的老路径 ============
// 这些路由会重定向到新的商户端控制器，但保持原路径不变
router.post('/login', merchantAuthRoutes);          // /api/login
router.post('/register', merchantAuthRoutes);       // /api/register
router.post('/apply', merchantAuthRoutes);          // /api/apply
router.get('/tags', merchantTagRoutes);             // /api/tags
// 兼容多种审计记录路径
router.get('/merchant/records', authenticate, getMyAuditRecords);           // 原来的路径
router.get('/merchant/audit-records', authenticate, getMyAuditRecords);    // 新路径

// 需要认证的老路径
router.use('/hotels', authenticate, merchantHotelRoutes);           // /api/hotels
router.use('/room_types', authenticate, merchantRoomTypeRoutes);    // /api/room_types
router.use('/room_calendar', authenticate, merchantRoomCalendarRoutes); // /api/room_calendar
router.use('/orders', authenticate, merchantOrderRoutes);           // /api/orders
router.use('/ads', authenticate, merchantAdRoutes);                 // /api/ads
router.use('/dashboard', authenticate, merchantDashboardRoutes);    // /api/dashboard
router.use('/upload', authenticate, merchantUploadRoutes);          // /api/upload
router.use('/audit', authenticate, merchantAuditRoutes);  // 新增：兼容老路径
export default router;