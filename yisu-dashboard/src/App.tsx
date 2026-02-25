import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import MainLayout from './layout/MainLayout';
import MerchantLayout from './layout/MerchantLayout';
import Login from './pages/login/Login';
import Register from './pages/login/Register';
import Dashboard from './pages/admin/dashboard/index';
import MerchantAudit from './pages/audit/MerchantAudit';
import HotelAudit from './pages/admin/audit/HotelAudit';
import AdAudit from './pages/admin/audit/AdAudit';
import FinanceStats from './pages/admin/finance/FinanceStats';
import PlatformSettings from './pages/admin/settings/PlatformSettings';
import HotelList from './pages/admin/hotels/HotelList';
import OrderList from './pages/admin/orders/OrderList';
import Profile from './pages/admin/profile/Profile';
import InvitationManagement from './pages/admin/system/InvitationManagement';
import AdminManagement from './pages/admin/system/AdminManagement';
import MerchantQualification from './pages/login/MerchantQualification';
import AdManagement from './pages/admin/ads/AdManagement';
// 商户端页面
import MerchantDashboard from './pages/merchant/Dashboard';
import MerchantHotels from './pages/merchant/Hotels';
import MerchantHotelEdit from './pages/merchant/HotelEdit';
import MerchantRoomTypes from './pages/merchant/RoomTypes';
import MerchantRoomPrice from './pages/merchant/RoomPrice';
import MerchantOrders from './pages/merchant/Orders';
import MerchantProfile from './pages/merchant/Profile';
import MerchantHotelDetail from './pages/merchant/HotelDetail';
import MerchantAds from './pages/merchant/Ads';
const App: React.FC = () => {
  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          colorPrimary: '#0066FF',
          colorInfo: '#0066FF',
          borderRadius: 4,
        },
        components: {
          Layout: {
            headerBg: '#ffffff',
            siderBg: '#ffffff',
          },
        },
      }}
    >
      <BrowserRouter>
        <Routes>
          {/* ============ 公共路由 ============ */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/merchant/qualification" element={<MerchantQualification />} />

          {/* ============ 管理员端路由 ============ */}
          <Route path="/" element={<MainLayout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            
            {/* 审批中心 */}
            <Route path="audit">
              <Route path="merchants" element={<MerchantAudit />} />
              <Route path="hotels" element={<HotelAudit />} />
              <Route path="ads" element={<AdAudit />} />
            </Route>

            {/* 核心管理功能 */}
            <Route path="hotels" element={<HotelList />} />
            <Route path="orders" element={<OrderList />} />
            <Route path="finance" element={<FinanceStats />} />
            <Route path="settings" element={<PlatformSettings />} />
            
            {/* 个人中心 */}
            <Route path="profile" element={<Profile />} />
            
            {/* 系统管理（仅超级管理员） */}
            <Route path="system">
              <Route path="invitation-management" element={<InvitationManagement />} />
              <Route path="admin-management" element={<AdminManagement />} />
            </Route>

              
            <Route path="ads-management" element={<AdManagement />} />
          </Route>

          {/* ============ 商户端路由 ============ */}
          <Route path="/merchant" element={<MerchantLayout />}>
            <Route index element={<Navigate to="/merchant/dashboard" replace />} />
            
            {/* 控制台 */}
            <Route path="dashboard" element={<MerchantDashboard />} />
            
            {/* 酒店管理 */}
            <Route path="hotels" element={<MerchantHotels />} />
            <Route path="hotel-edit/:id" element={<MerchantHotelEdit />} />
            <Route path="/merchant/hotel-detail/:id" element={<MerchantHotelDetail />} />
            {/* 房型管理 */}
            <Route path="room-types" element={<MerchantRoomTypes />} />
            
            {/* 房态日历 */}
            <Route path="room-price" element={<MerchantRoomPrice />} />
            
            {/* 订单中心 */}
            <Route path="orders" element={<MerchantOrders />} />
            {/* 广告管理 */}
            <Route path="/merchant/ads" element={<MerchantAds />} />
            {/* 商户资料 */}
            <Route path="profile" element={<MerchantProfile />} />
          </Route>

          {/* ============ 404 重定向 ============ */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  );
};

export default App;