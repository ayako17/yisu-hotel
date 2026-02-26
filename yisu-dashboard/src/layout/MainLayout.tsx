import React, { useState, useEffect } from 'react';
import { Layout, Menu, Button, theme, Avatar, Dropdown, Space, Badge, message, App } from 'antd';
import type { MenuProps } from 'antd';
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  DashboardOutlined,
  AuditOutlined,
  BankOutlined,
  OrderedListOutlined,
  BarChartOutlined,
  SettingOutlined,
  UserOutlined,
  LogoutOutlined,
  NotificationOutlined,
  TeamOutlined,
  RiseOutlined
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';

const { Header, Sider, Content } = Layout;

const MainLayout: React.FC = () => {
  const { message: antdMessage } = App.useApp();
  const [collapsed, setCollapsed] = useState(false);
  const [userInfo, setUserInfo] = useState<any>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  // 从 localStorage 加载用户信息的函数
  const loadUserInfo = () => {
    const userStr = localStorage.getItem('userInfo');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        return user;
      } catch (error) {
        console.error('解析用户信息失败:', error);
        return null;
      }
    }
    return null;
  };

  // 加载用户信息并检查角色
  useEffect(() => {
    const user = loadUserInfo();
    
    if (user) {
      // 如果是商户登录，自动跳转到商户端
      if (user.role === 'merchant') {
        antdMessage.info('商户请访问商户中心');
        navigate('/merchant/dashboard');
        return;
      }
      
      // 检查权限：只有管理员和超级管理员可以访问后台
      if (user.role !== 'admin' && user.role !== 'super_admin') {
        antdMessage.error('您没有权限访问管理后台');
        navigate('/login');
        return;
      }
      
      setUserInfo(user);
    } else {
      navigate('/login');
    }

    // 监听 storage 事件（当其他标签页修改 localStorage 时）
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'userInfo') {
        const newUser = e.newValue ? JSON.parse(e.newValue) : null;
        setUserInfo(newUser);
      }
    };

    // 监听自定义事件（当本页修改用户信息时）
    const handleUserInfoUpdated = (e: CustomEvent) => {
      setUserInfo(e.detail);
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('userInfoUpdated', handleUserInfoUpdated as EventListener);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('userInfoUpdated', handleUserInfoUpdated as EventListener);
    };
  }, []);

  // 菜单配置项 - 根据用户角色动态生成
  const getMenuItems = () => {
    const isSuperAdmin = userInfo?.role === 'super_admin';
    const isAdmin = userInfo?.role === 'admin' || isSuperAdmin;
    
    const baseItems = [
      { key: '/dashboard', icon: <DashboardOutlined />, label: '工作台概览' },
    ];

    const auditItems = isAdmin ? [
      {
        key: 'audit',
        icon: <AuditOutlined />,
        label: '审批中心',
        children: [
          { key: '/audit/merchants', label: '商户入驻审核' },
          { key: '/audit/hotels', label: '酒店上线/修改审核' },
          { key: '/audit/ads', label: '广告位租用审核' },
        ],
      },
    ] : [];

    const adminItems = isAdmin ? [
      { key: '/hotels', icon: <BankOutlined />, label: '酒店管理' },
      { key: '/orders', icon: <OrderedListOutlined />, label: '订单中心' },
      { key: '/finance', icon: <BarChartOutlined />, label: '财务统计' },
    ] : [];

    // 广告管理菜单 - 只保留生效广告
    const adManagementItems = isAdmin ? [
      {
        key: '/ads-management',
        icon: <RiseOutlined />,
        label: '广告管理',
      },
    ] : [];

    const systemItems = isSuperAdmin ? [
      {
        key: 'system',
        icon: <TeamOutlined />,
        label: '系统管理',
        children: [
          { key: '/system/admin-management', label: '管理员管理' },
          { key: '/system/invitation-management', label: '邀请码管理' },
        ],
      },
    ] : [];

    const settingsItems = isAdmin ? [
      { key: '/settings', icon: <SettingOutlined />, label: '平台配置' },
    ] : [];

    return [
      ...baseItems,
      ...auditItems,
      ...adminItems,
      ...adManagementItems,  
      ...systemItems,
      ...settingsItems,
    ];
  };

  // 处理退出登录
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userInfo');
    antdMessage.success('已退出登录');
    navigate('/login');
  };

  const handleProfile = () => {
    navigate('/profile');
  };

  // 用户下拉菜单
  const userMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      label: '个人信息',
      icon: <UserOutlined />,
      onClick: handleProfile
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      label: '退出登录',
      icon: <LogoutOutlined />,
      onClick: handleLogout
    },
  ];

  const getRoleText = (role: string) => {
    const roleMap: Record<string, string> = {
      'super_admin': '超级管理员',
      'admin': '管理员',
      'merchant': '商户',
      'user': '用户'
    };
    return roleMap[role] || role;
  };

  const getRoleColor = (role: string) => {
    const colorMap: Record<string, string> = {
      'super_admin': '#f5222d',
      'admin': '#1890ff',
      'merchant': '#fa8c16',
      'user': '#52c41a'
    };
    return colorMap[role] || '#666';
  };

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
          backgroundColor: '#0066FF',
          color: '#fff',
          fontSize: collapsed ? 14 : 18,
          fontWeight: 'bold',
          transition: 'all 0.2s',
          padding: '0 16px',
          textAlign: 'center'
        }}>
          {collapsed ? '易宿' : '易宿酒店管理系统'}
        </div>
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          defaultOpenKeys={['audit', 'system', 'ads-management']}
          items={getMenuItems()}
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
                gap: '12px',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = '#f5f5f5';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
              }}>
                <Avatar 
                  size={36}
                  style={{ 
                    backgroundColor: getRoleColor(userInfo?.role || 'user'),
                    color: '#fff',
                    fontSize: '14px',
                    fontWeight: 'bold'
                  }}
                >
                  {userInfo?.username?.charAt(0)?.toUpperCase() || 'U'}
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
                    fontSize: '13px',
                    lineHeight: '1.2',
                    maxWidth: '80px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {userInfo?.username || '用户'}
                  </span>
                  <span style={{ 
                    color: getRoleColor(userInfo?.role || 'user'), 
                    fontSize: '11px',
                    fontWeight: 500,
                    backgroundColor: `${getRoleColor(userInfo?.role || 'user')}15`,
                    padding: '2px 6px',
                    borderRadius: '4px',
                    marginTop: '2px'
                  }}>
                    {getRoleText(userInfo?.role || 'user')}
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
            overflowY: 'auto',
            marginTop: 88,
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;