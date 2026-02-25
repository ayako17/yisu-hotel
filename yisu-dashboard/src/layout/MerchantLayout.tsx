import React, { useState, useEffect } from 'react';
import { Layout, Menu, Button, theme, Avatar, Dropdown, Space, Badge, message } from 'antd';
import type { MenuProps } from 'antd'; 
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  DashboardOutlined,
  BankOutlined,
  ApartmentOutlined,
  CalendarOutlined,
  OrderedListOutlined,
  FileTextOutlined,
  UserOutlined,
  LogoutOutlined,
  NotificationOutlined,
  RiseOutlined
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';

const { Header, Sider, Content } = Layout;

const MerchantLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [userInfo, setUserInfo] = useState<any>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  useEffect(() => {
    const userStr = localStorage.getItem('userInfo');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        // 检查角色，非商户跳转到登录
        if (user.role !== 'merchant') {
          message.error('请使用商户账号登录');
          navigate('/login');
          return;
        }
        setUserInfo(user);
      } catch (error) {
        console.error('解析用户信息失败:', error);
        navigate('/login');
      }
    } else {
      navigate('/login');
    }
  }, []);

  const menuItems = [
    { 
      key: '/merchant/dashboard', 
      icon: <DashboardOutlined />, 
      label: '控制台首页' 
    },
    { 
      key: '/merchant/hotels', 
      icon: <BankOutlined />, 
      label: '酒店管理' 
    },
    { 
      key: '/merchant/room-types', 
      icon: <ApartmentOutlined />, 
      label: '房型管理' 
    },
    { 
      key: '/merchant/room-price', 
      icon: <CalendarOutlined />, 
      label: '房态日历' 
    },
    { 
      key: '/merchant/orders', 
      icon: <OrderedListOutlined />, 
      label: '订单中心' 
    },

{
  key: 'ads',
  icon: <RiseOutlined />,
  label: '广告推广',
  onClick: () => navigate('/merchant/ads')
},
    { 
      key: '/merchant/profile', 
      icon: <FileTextOutlined />, 
      label: '商户资料' 
    },
  ];

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userInfo');
    message.success('已退出登录');
    navigate('/login');
  };

  // 用户下拉菜单项类型定义
  const userMenuItems: MenuProps['items'] = [
    { 
      key: 'profile', 
      label: '商户资料', 
      icon: <UserOutlined />, 
      onClick: () => navigate('/merchant/profile') 
    },
    { 
      type: 'divider' 
    },
    { 
      key: 'logout', 
      label: '退出登录', 
      icon: <LogoutOutlined />, 
      onClick: handleLogout 
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider 
        trigger={null} 
        collapsible 
        collapsed={collapsed} 
        theme="light" 
        style={{ 
          borderRight: '1px solid #f0f0f0',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          zIndex: 100,
          overflowY: 'auto',
        }}
      >
        <div style={{ 
          height: 64, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          backgroundColor: '#52c41a', 
          color: '#fff',
          fontSize: collapsed ? 14 : 18,
          fontWeight: 'bold',
          padding: '0 16px',
        }}>
          {collapsed ? '易宿' : '易宿商户中心'}
        </div>
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{ borderRight: 0 }}
        />
      </Sider>
      <Layout style={{ 
        marginLeft: collapsed ? 80 : 200,
        transition: 'margin-left 0.2s'
      }}>
        <Header style={{ 
          padding: '0 16px', 
          background: colorBgContainer, 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          borderBottom: '1px solid #f0f0f0',
          position: 'fixed',
          top: 0,
          right: 0,
          left: collapsed ? 80 : 200,
          zIndex: 99,
          height: 64,
          transition: 'left 0.2s'
        }}>
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{ fontSize: '16px', width: 64, height: 64 }}
          />
          <Space size={24}>
            <Badge dot>
              <NotificationOutlined style={{ fontSize: 18, cursor: 'pointer', color: '#666' }} />
            </Badge>
            <Dropdown menu={{ items: userMenuItems }} trigger={['click']}>
              <div style={{ 
                cursor: 'pointer', 
                padding: '8px 12px', 
                borderRadius: '8px', 
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <Avatar 
                  size={36}
                  style={{ backgroundColor: '#52c41a', color: '#fff' }}
                >
                  {userInfo?.username?.charAt(0) || '商'}
                </Avatar>
                <div style={{ 
                  display: 'flex', 
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  lineHeight: '1.2'
                }}>
                  <span style={{ 
                    color: '#333', 
                    fontWeight: 500, 
                    fontSize: '13px'
                  }}>
                    {userInfo?.username || '商户'}
                  </span>
                  <span style={{ 
                    color: '#52c41a', 
                    fontSize: '11px',
                    backgroundColor: '#f6ffed',
                    padding: '2px 6px',
                    borderRadius: '4px'
                  }}>
                    商户
                  </span>
                </div>
              </div>
            </Dropdown>
          </Space>
        </Header>
        <Content
          style={{
            margin: '88px 24px 24px',
            padding: 24,
            minHeight: 280,
            background: colorBgContainer,
            borderRadius: borderRadiusLG,
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default MerchantLayout;