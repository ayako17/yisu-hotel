import React, { useState, useEffect } from 'react';
import { 
  Row, Col, Card, Statistic, Tag, Button, Space, Typography, 
  Progress, Table, Tooltip, Badge, Avatar, Empty, Flex, Tabs 
} from 'antd';
import { 
  PayCircleOutlined, 
  SafetyCertificateOutlined, 
  ShopOutlined, 
  UserAddOutlined,
  ArrowUpOutlined,
  RightOutlined,
  RiseOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  HomeOutlined,
  BankOutlined,
  PercentageOutlined,
  DollarOutlined,
  EyeOutlined,
  FileTextOutlined,
  UserOutlined,
  TeamOutlined,
  FundOutlined,
  WalletOutlined,
  ReloadOutlined,
  ArrowDownOutlined,
  OrderedListOutlined,
  ThunderboltOutlined,
  EditOutlined,
  DeleteOutlined,
  CopyOutlined,
  SettingOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import axios from '../../../services/axios';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

interface PendingTask {
  id: number;
  type: 'merchant_audit' | 'hotel_audit' | 'hotel_apply' | 'hotel_update' | 'ad_audit';
  title: string;
  subtitle: string;
  count: number;
  url: string;
  icon: React.ReactNode;
  color: string;
}

// 广告到期提醒
interface AdExpiring {
  ad_id: number;
  hotel_name: string;
  end_date: string;
  remaining_days: number;
}

// 订单类型
interface Order {
  order_id: number;
  order_no: string;
  hotel_name: string;
  total_amount: number;
  status: string;
  created_at: string;
}

// 快捷入口类型
interface QuickAction {
  key: string;
  title: string;
  icon: React.ReactNode;
  url: string;
  color: string;
  description?: string;
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    // 商户审核统计
    merchantPending: 0,
    merchantApproved: 0,
    merchantRejected: 0,
    
    // 酒店统计
    hotelTotal: 0,
    hotelActive: 0,
    hotelOffline: 0,
    hotelPending: 0,
    
    // 广告统计
    adActive: 0,
    adPending: 0,
    adExpiring: 0,
    
    // 订单统计
    orderToday: 0,
    orderPending: 0,
    orderCompleted: 0,
    
    // 财务统计
    totalRevenue: 0,
    totalCommission: 0,
    adRevenue: 0,

     hotelApplyPending: 0,   // 新店入驻待审核
    hotelUpdatePending: 0,  // 信息修改待审核
  });
  
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [pendingTasks, setPendingTasks] = useState<PendingTask[]>([]);
  const [expiringAds, setExpiringAds] = useState<AdExpiring[]>([]);

  // 快捷入口配置 - 保留广告管理、财务统计、酒店管理
  const quickActions: QuickAction[] = [
    {
      key: 'merchant_audit',
      title: '商户入驻审批',
      icon: <UserAddOutlined />,
      url: '/audit/merchants',
      color: '#52c41a',
      description: '审核新商户申请'
    },
    {
      key: 'hotel_audit',
      title: '酒店审核',  // 改为通用名称
      icon: <HomeOutlined />,
      url: '/audit/hotels',
      color: '#1890ff',
      description: '审核酒店申请'
    },
    {
      key: 'ad_audit',
      title: '广告位审批',
      icon: <EyeOutlined />,
      url: '/audit/ads',
      color: '#722ed1',
      description: '审核广告投放'
    },
    {
      key: 'hotel_management',
      title: '酒店管理',
      icon: <BankOutlined />,
      url: '/hotels',
      color: '#13c2c2',
      description: '管理酒店信息'
    },
    {
      key: 'ad_management',
      title: '广告管理',
      icon: <ThunderboltOutlined />,
      url: '/ads-management',
      color: '#f5222d',
      description: '管理生效广告'
    },
    {
      key: 'finance_stats',
      title: '财务统计',
      icon: <WalletOutlined />,
      url: '/finance',
      color: '#eb2f96',
      description: '查看财务数据'
    }
  ];

// 获取所有统计数据
const fetchDashboardData = async () => {
  setLoading(true);
  try {
    // 并行请求各个模块的数据
    const [
      merchantRes,
      hotelAuditRes,  // 改为获取酒店审核列表，而不是酒店列表
      adAuditRes,
      activeAdsRes,
      commissionRes,
      ordersRes
    ] = await Promise.allSettled([
      axios.get('/audit/merchant-applies', { params: { status: 'pending' } }),
      axios.get('/audit/hotels', { params: { status: 'pending' } }), // 获取待审核的酒店申请
      axios.get('/admin/ads/orders', { params: { status: 'pending' } }),
      axios.get('/admin/active-ads'),
      axios.get('/admin/commission/stats', { params: { days: 30 } }),
      axios.get('/admin/orders', { params: { pageSize: 5 } })
    ]);

    // 处理商户审核数据
    if (merchantRes.status === 'fulfilled' && merchantRes.value.data.code === 200) {
      const data = merchantRes.value.data.data || [];
      setStats(prev => ({
        ...prev,
        merchantPending: data.length || 0
      }));
    }

    // 处理酒店审核数据 - 统计所有待审核的酒店申请（包括新店入驻和信息修改）
    if (hotelAuditRes.status === 'fulfilled' && hotelAuditRes.value.data.code === 200) {
      const data = hotelAuditRes.value.data.data || [];
      // 只统计待审核的记录
      const pendingHotels = data.filter((item: any) => item.audit_status === 'pending');
      
      // 分别统计新店入驻和信息修改
      const hotelApplyPending = pendingHotels.filter((item: any) => item.target_type === 'hotel_apply').length;
      const hotelUpdatePending = pendingHotels.filter((item: any) => item.target_type === 'hotel_update').length;
      
      setStats(prev => ({
        ...prev,
        hotelApplyPending,      // 新店入驻待审核数量
        hotelUpdatePending,     // 信息修改待审核数量
        hotelPending: pendingHotels.length  // 总数（保持兼容）
      }));
    }

    // 处理广告审核数据
    if (adAuditRes.status === 'fulfilled' && adAuditRes.value.data.code === 200) {
      const data = adAuditRes.value.data.data || [];
      setStats(prev => ({
        ...prev,
        adPending: data.length || 0
      }));
    }

    // 处理生效广告数据
    if (activeAdsRes.status === 'fulfilled' && activeAdsRes.value.data.code === 200) {
      const ads = activeAdsRes.value.data.data || [];
      const now = dayjs();
      const active = ads.filter((ad: any) => 
        ad.is_active && 
        dayjs(ad.end_date).isAfter(now) && 
        dayjs(ad.start_date).isBefore(now)
      );
      const expiring = ads.filter((ad: any) => {
        const days = dayjs(ad.end_date).diff(now, 'day');
        return days <= 3 && days >= 0;
      });
      
      setStats(prev => ({
        ...prev,
        adActive: active.length,
        adExpiring: expiring.length
      }));
      
      setExpiringAds(expiring.map((ad: any) => ({
        ad_id: ad.ad_id,
        hotel_name: ad.hotel_name,
        end_date: ad.end_date,
        remaining_days: dayjs(ad.end_date).diff(now, 'day')
      })));
    }

    // 处理财务数据 - 从commission/stats获取订单数据
    if (commissionRes.status === 'fulfilled' && commissionRes.value.data.code === 200) {
      const data = commissionRes.value.data.data || [];
      const totalRevenue = data.reduce((sum: number, item: any) => sum + (item.total_income || 0), 0);
      const totalCommission = data.reduce((sum: number, item: any) => sum + (item.commission_income || 0), 0);
      const adRevenue = data.reduce((sum: number, item: any) => sum + (item.ad_income || 0), 0);
      
      // 计算今日订单数（从最近7天的数据中取今天）
      const today = dayjs().format('YYYY-MM-DD');
      const todayStats = data.find((item: any) => dayjs(item.stat_date).format('YYYY-MM-DD') === today);
      
      setStats(prev => ({
        ...prev,
        totalRevenue,
        totalCommission,
        adRevenue,
        orderToday: todayStats?.order_count || 0,
        orderCompleted: data.reduce((sum: number, item: any) => sum + (item.order_count || 0), 0)
      }));
    }

    // 处理订单列表数据
    if (ordersRes.status === 'fulfilled' && ordersRes.value.data.code === 200) {
      setRecentOrders(ordersRes.value.data.data || []);
    }

    // 同时也获取酒店总数用于活跃酒店统计（可选）
    try {
      const hotelRes = await axios.get('/admin/hotels', { params: { pageSize: 100 } });
      if (hotelRes.data.code === 200) {
        const data = hotelRes.data.data || [];
        const active = data.filter((h: any) => h.status === 'approved').length;
        const offline = data.filter((h: any) => h.status === 'offline').length;
        
        setStats(prev => ({
          ...prev,
          hotelTotal: data.length,
          hotelActive: active,
          hotelOffline: offline
        }));
      }
    } catch (error) {
      console.error('获取酒店列表失败:', error);
    }

  } catch (error) {
    console.error('获取仪表盘数据失败:', error);
  } finally {
    setLoading(false);
  }
};

  useEffect(() => {
    fetchDashboardData();
  }, []);

// 生成待办任务列表（依赖stats更新）
useEffect(() => {
  const tasks: PendingTask[] = [];
  
  if (stats.merchantPending > 0) {
    tasks.push({
      id: 1,
      type: 'merchant_audit',
      title: '商户入驻审核',
      subtitle: '新商户申请入驻',
      count: stats.merchantPending,
      url: '/audit/merchants',
      icon: <UserAddOutlined />,
      color: '#52c41a'
    });
  }
  
  // 新店入驻审核
  if (stats.hotelApplyPending > 0) {
    tasks.push({
      id: 2,
      type: 'hotel_apply',  // 使用新类型
      title: '新店入驻审核',
      subtitle: '新酒店申请上线',
      count: stats.hotelApplyPending,
      url: '/audit/hotels?type=hotel_apply',
      icon: <HomeOutlined />,
      color: '#1890ff'
    });
  }
  
  // 酒店信息修改审核
  if (stats.hotelUpdatePending > 0) {
    tasks.push({
      id: 3,
      type: 'hotel_audit',
      title: '酒店信息修改审核',
      subtitle: '酒店信息变更申请',
      count: stats.hotelUpdatePending,
      url: '/audit/hotels?type=hotel_update',  // 可以带参数筛选
      icon: <EditOutlined />,
      color: '#722ed1'
    });
  }
  
  if (stats.adPending > 0) {
    tasks.push({
      id: 4,
      type: 'ad_audit',
      title: '广告位审核',
      subtitle: '广告投放申请',
      count: stats.adPending,
      url: '/audit/ads',
      icon: <EyeOutlined />,
      color: '#722ed1'
    });
  }

  setPendingTasks(tasks);
}, [stats.merchantPending, stats.hotelApplyPending, stats.hotelUpdatePending, stats.adPending]);
  
// 获取订单状态标签
  const getOrderStatusTag = (status: string) => {
    const statusMap: Record<string, { color: string; text: string }> = {
      'unpaid': { color: 'default', text: '待支付' },
      'paid': { color: 'blue', text: '已支付' },
      'checked_in': { color: 'processing', text: '已入住' },
      'completed': { color: 'green', text: '已完成' },
      'cancelled': { color: 'red', text: '已取消' }
    };
    const config = statusMap[status] || { color: 'default', text: status };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  // 处理导航
  const handleNavigate = (url: string) => {
    // 检查用户是否已登录
    const token = localStorage.getItem('token');
    if (!token) {
      // 如果未登录，跳转到登录页
      window.location.href = '/login';
      return;
    }
    
    // 已登录，正常跳转
    navigate(url);
  };

  // 处理待办任务点击
  const handleTaskClick = (url: string) => {
    handleNavigate(url);
  };

  // 处理全部任务点击
  const handleAllTasksClick = () => {
    if (pendingTasks.length > 0) {
      // 如果有待办任务，跳转到第一个任务的页面
      handleNavigate(pendingTasks[0].url);
    } else {
      // 如果没有待办任务，跳转到商户审核页面（默认）
      handleNavigate('/audit/merchants');
    }
  };

  return (
    <div style={{ padding: '24px' }}>
      {/* 欢迎语 */}
      <Flex justify="space-between" align="center" style={{ marginBottom: 24 }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>工作台概览</Title>
          <Text type="secondary">欢迎回来，以下是平台今日运行简报</Text>
        </div>
        <Button icon={<ReloadOutlined />} onClick={fetchDashboardData} loading={loading}>
          刷新数据
        </Button>
      </Flex>

      {/* 核心指标卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card 
            hoverable 
            style={{ 
              borderRadius: 12, 
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              border: 'none'
            }}
          >
            <Statistic
              title={<span style={{ color: 'rgba(255,255,255,0.85)' }}>待审核任务</span>}
              value={stats.merchantPending + stats.hotelPending + stats.adPending}
              prefix={<FileTextOutlined style={{ color: 'white' }} />}
              suffix="项"
              styles={{
                content: { color: 'white', fontSize: 28, fontWeight: 'bold' }
              }}
            />
            <div style={{ marginTop: 8 }}>
              <Space size="small" wrap>
                {stats.merchantPending > 0 && (
                  <Tag 
                    color="orange" 
                    style={{ cursor: 'pointer' }} 
                    onClick={() => handleNavigate('/audit/merchants')}
                  >
                    商户 {stats.merchantPending}
                  </Tag>
                )}
                {stats.hotelPending > 0 && (
                  <Tag 
                    color="blue" 
                    style={{ cursor: 'pointer' }} 
                    onClick={() => handleNavigate('/audit/hotels')}
                  >
                    酒店 {stats.hotelPending}
                  </Tag>
                )}
                {stats.adPending > 0 && (
                  <Tag 
                    color="purple" 
                    style={{ cursor: 'pointer' }} 
                    onClick={() => handleNavigate('/audit/ads')}
                  >
                    广告 {stats.adPending}
                  </Tag>
                )}
              </Space>
            </div>
          </Card>
        </Col>
        
        <Col xs={24} sm={12} md={6}>
          <Card 
            hoverable 
            style={{ borderRadius: 12, background: '#f6ffed', border: '1px solid #b7eb8f' }}
            onClick={() => handleNavigate('/hotels')}
          >
            <Statistic
              title="活跃酒店"
              value={stats.hotelActive}
              prefix={<HomeOutlined style={{ color: '#52c41a' }} />}
              suffix={`/ ${stats.hotelTotal}`}
              styles={{
                content: { color: '#52c41a', fontSize: 28, fontWeight: 'bold' }
              }}
            />
            <div style={{ marginTop: 8 }}>
              <Space>
                <Text type="secondary">在线率</Text>
                <Progress 
                  percent={stats.hotelTotal ? Math.round((stats.hotelActive / stats.hotelTotal) * 100) : 0} 
                  size="small" 
                  showInfo={false} 
                  strokeColor="#52c41a"
                  style={{ width: 80 }}
                />
                <Text strong>{stats.hotelTotal ? Math.round((stats.hotelActive / stats.hotelTotal) * 100) : 0}%</Text>
              </Space>
            </div>
          </Card>
        </Col>
        
        <Col xs={24} sm={12} md={6}>
          <Card 
            hoverable 
            style={{ borderRadius: 12, background: '#e6f7ff', border: '1px solid #91d5ff' }}
            onClick={() => handleNavigate('/ads-management')}
          >
            <Statistic
              title="生效广告"
              value={stats.adActive}
              prefix={<RiseOutlined style={{ color: '#1890ff' }} />}
              suffix="个"
              styles={{
                content: { color: '#1890ff', fontSize: 28, fontWeight: 'bold' }
              }}
            />
            <div style={{ marginTop: 8 }}>
              {stats.adExpiring > 0 ? (
                <Tag color="warning" icon={<WarningOutlined />}>
                  {stats.adExpiring}个即将到期
                </Tag>
              ) : (
                <Text type="secondary">暂无即将到期广告</Text>
              )}
            </div>
          </Card>
        </Col>
        
        <Col xs={24} sm={12} md={6}>
          <Card 
            hoverable 
            style={{ borderRadius: 12, background: '#fff7e6', border: '1px solid #ffd591' }}
            onClick={() => handleNavigate('/orders')}
          >
            <Statistic
              title="今日订单"
              value={stats.orderToday}
              prefix={<CalendarOutlined style={{ color: '#fa8c16' }} />}
              suffix="笔"
              styles={{
                content: { color: '#fa8c16', fontSize: 28, fontWeight: 'bold' }
              }}
            />
            <div style={{ marginTop: 8 }}>
              <Text type="secondary">累计订单 {stats.orderCompleted} 笔</Text>
            </div>
          </Card>
        </Col>
      </Row>

      {/* 第二行：财务指标 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col span={8}>
          <Card 
            size="small" 
            variant="borderless"
            hoverable
            onClick={() => handleNavigate('/finance')}
          >
            <Flex align="center" gap="middle">
              <Avatar size={40} icon={<WalletOutlined />} style={{ backgroundColor: '#722ed1' }} />
              <div>
                <Text type="secondary" style={{ fontSize: 12 }}>平台总收入</Text>
                <div style={{ fontSize: 18, fontWeight: 600 }}>¥{stats.totalRevenue.toLocaleString()}</div>
              </div>
            </Flex>
          </Card>
        </Col>
        <Col span={8}>
          <Card 
            size="small" 
            variant="borderless"
            hoverable
            onClick={() => handleNavigate('/settings/commission')}
          >
            <Flex align="center" gap="middle">
              <Avatar size={40} icon={<PercentageOutlined />} style={{ backgroundColor: '#fa8c16' }} />
              <div>
                <Text type="secondary" style={{ fontSize: 12 }}>总佣金收入</Text>
                <div style={{ fontSize: 18, fontWeight: 600 }}>¥{stats.totalCommission.toLocaleString()}</div>
              </div>
            </Flex>
          </Card>
        </Col>
        <Col span={8}>
          <Card 
            size="small" 
            variant="borderless"
            hoverable
            onClick={() => handleNavigate('/ads-management')}
          >
            <Flex align="center" gap="middle">
              <Avatar size={40} icon={<RiseOutlined />} style={{ backgroundColor: '#13c2c2' }} />
              <div>
                <Text type="secondary" style={{ fontSize: 12 }}>广告总收入</Text>
                <div style={{ fontSize: 18, fontWeight: 600 }}>¥{stats.adRevenue.toLocaleString()}</div>
              </div>
            </Flex>
          </Card>
        </Col>
      </Row>

      {/* 主内容区域 */}
      <Row gutter={[16, 16]}>
        {/* 左侧：待办任务 + 近期订单 */}
        <Col span={16}>
          {/* 待办任务卡片 */}
          <Card 
            title={
              <Space>
                <ClockCircleOutlined style={{ color: '#fa8c16' }} />
                <span>待处理任务</span>
                {pendingTasks.length > 0 && (
                  <Badge count={pendingTasks.length} style={{ backgroundColor: '#fa8c16' }} />
                )}
              </Space>
            }
            variant="borderless"
            style={{ marginBottom: 16, borderRadius: 12 }}
            extra={
              <Button 
                type="link" 
                onClick={handleAllTasksClick}
              >
                全部任务
              </Button>
            }
          >
            {pendingTasks.length > 0 ? (
              <div>
                {pendingTasks.map(item => (
                  <div 
                    key={item.id} 
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between',
                      padding: '12px 0',
                      borderBottom: '1px solid #f0f0f0',
                      cursor: 'pointer'
                    }}
                    onClick={() => handleTaskClick(item.url)}
                  >
                    <Flex align="center" gap="middle">
                      <Avatar 
                        icon={item.icon}
                        style={{ backgroundColor: item.color }}
                      />
                      <div>
                        <Text strong>{item.title}</Text>
                        <div>
                          <Tag color="orange">{item.count} 条待处理</Tag>
                          <Text type="secondary" style={{ fontSize: 12 }}>{item.subtitle}</Text>
                        </div>
                      </div>
                    </Flex>
                    <Button 
                      type="link" 
                      size="small" 
                      icon={<RightOutlined />}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTaskClick(item.url);
                      }}
                    >
                      处理
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <Empty 
                image={Empty.PRESENTED_IMAGE_SIMPLE} 
                description="暂无待处理任务" 
              />
            )}
          </Card>

          {/* 近期订单 */}
          <Card 
            title={
              <Space>
                <OrderedListOutlined style={{ color: '#1890ff' }} />
                <span>近期订单</span>
              </Space>
            }
            variant="borderless"
            style={{ borderRadius: 12 }}
            extra={<Button type="link" onClick={() => handleNavigate('/orders')}>查看全部</Button>}
          >
            {recentOrders.length > 0 ? (
              <Table
                dataSource={recentOrders}
                rowKey="order_id"
                pagination={false}
                size="small"
                onRow={(record) => ({
                  onClick: () => handleNavigate('/orders'),
                  style: { cursor: 'pointer' }
                })}
                columns={[
                  {
                    title: '订单号',
                    dataIndex: 'order_no',
                    key: 'order_no',
                    render: (text) => <Text copyable style={{ fontSize: 12 }}>{text?.slice(-8)}</Text>
                  },
                  {
                    title: '酒店',
                    dataIndex: 'hotel_name',
                    key: 'hotel_name',
                    ellipsis: true,
                  },
                  {
                    title: '金额',
                    dataIndex: 'total_amount',
                    key: 'total_amount',
                    render: (val) => <Text type="danger">¥{val?.toLocaleString()}</Text>
                  },
                  {
                    title: '状态',
                    dataIndex: 'status',
                    key: 'status',
                    render: (status) => getOrderStatusTag(status)
                  },
                  {
                    title: '时间',
                    dataIndex: 'created_at',
                    key: 'created_at',
                    render: (date) => dayjs(date).format('HH:mm')
                  }
                ]}
              />
            ) : (
              <Empty 
                image={Empty.PRESENTED_IMAGE_SIMPLE} 
                description="暂无订单数据" 
              />
            )}
          </Card>
        </Col>

        {/* 右侧：广告到期提醒 */}
        <Col span={8}>
          <Card 
            title={
              <Space>
                <WarningOutlined style={{ color: '#fa8c16' }} />
                <span>广告即将到期</span>
              </Space>
            }
            variant="borderless"
            style={{ borderRadius: 12 }}
            extra={<Button type="link" onClick={() => handleNavigate('/ads-management')}>管理广告</Button>}
          >
            {expiringAds.length > 0 ? (
              <div>
                {expiringAds.map((item) => (
                  <div 
                    key={item.ad_id} 
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between',
                      padding: '12px 0',
                      borderBottom: '1px solid #f0f0f0',
                      cursor: 'pointer'
                    }}
                    onClick={() => handleNavigate('/ads-management')}
                  >
                    <div>
                      <Text strong>{item.hotel_name}</Text>
                      <div>
                        <Space>
                          <CalendarOutlined style={{ color: '#999' }} />
                          <Text type="secondary">剩余 {item.remaining_days} 天</Text>
                        </Space>
                      </div>
                    </div>
                    <Tag color={item.remaining_days <= 1 ? 'red' : 'orange'}>
                      {item.remaining_days <= 1 ? '今日到期' : `${item.remaining_days}天后`}
                    </Tag>
                  </div>
                ))}
              </div>
            ) : (
              <Empty 
                image={Empty.PRESENTED_IMAGE_SIMPLE} 
                description="暂无即将到期的广告" 
              />
            )}
          </Card>
        </Col>
      </Row>

      {/* 快捷入口 - 保留广告管理、财务统计、酒店管理 */}
      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col span={24}>
          <Card title="快捷入口" variant="borderless" style={{ borderRadius: 12 }}>
            <Space size="large" wrap>
              {quickActions.map(action => (
                <Button 
                  key={action.key}
                  type="primary" 
                  ghost
                  icon={action.icon}
                  onClick={() => handleNavigate(action.url)}
                  style={{ 
                    borderColor: action.color, 
                    color: action.color,
                    minWidth: 140,
                    height: 40
                  }}
                >
                  {action.title}
                </Button>
              ))}
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;