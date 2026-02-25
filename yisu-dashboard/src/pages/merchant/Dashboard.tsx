import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Button, List, Statistic, message, Space, Tag } from 'antd';
import { 
  PlusOutlined, 
  BankOutlined, 
  RiseOutlined, 
  WalletOutlined,
  ShoppingOutlined,
  EditOutlined 
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import axios from '../../services/axios';

interface Hotel {
  hotel_id: number;
  name_zh: string;
  star_rating: number;
  status: 'published' | 'pending' | 'draft';
  address?: string;
}

interface DashboardStats {
  totalHotels: number;
  todayOrders: number;
  monthlyRevenue: number;
  pendingApproval: number;
}

const MerchantDashboard: React.FC = () => {
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalHotels: 0,
    todayOrders: 0,
    monthlyRevenue: 0,
    pendingApproval: 0
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // 获取酒店列表
      const hotelsRes = await axios.get('/merchant/hotels');
      if (hotelsRes.data.code === 200) {
        const hotelList = hotelsRes.data.data || [];
        setHotels(hotelList);
        
        // 更新统计数据
        setStats(prev => ({
          ...prev,
          totalHotels: hotelList.length,
          pendingApproval: hotelList.filter((h: Hotel) => h.status === 'pending').length
        }));
      }

      // 获取订单统计数据
      const ordersRes = await axios.get('/merchant/orders/stats');
      if (ordersRes.data.code === 200) {
        setStats(prev => ({ ...prev, ...ordersRes.data.data }));
      }
    } catch (error) {
      message.error('获取数据失败');
    } finally {
      setLoading(false);
    }
  };

  const getStatusTag = (status: string) => {
    const statusMap = {
      'published': { color: 'green', text: '已上线' },
      'pending': { color: 'orange', text: '审核中' },
      'draft': { color: 'default', text: '草稿' }
    };
    const item = statusMap[status as keyof typeof statusMap] || { color: 'default', text: status };
    return <Tag color={item.color}>{item.text}</Tag>;
  };

  return (
    <div>
      {/* 欢迎卡片 */}
      <Card 
        style={{ 
          background: 'linear-gradient(135deg, #f6ffed 0%, #d9f7be 100%)',
          marginBottom: 24,
          border: '1px solid #b7eb8f'
        }}
      >
        <Row justify="space-between" align="middle">
          <Col>
            <h2 style={{ margin: 0, color: '#389e0d' }}>欢迎使用易宿商户中心</h2>
            <p style={{ margin: '8px 0 0', color: '#135200' }}>
              管理您的酒店、房型和订单，提升运营效率
            </p>
          </Col>
          <Col>
            <Button 
              type="primary" 
              icon={<PlusOutlined />}
              onClick={() => navigate('/merchant/hotel-edit/new')}
              style={{ background: '#52c41a', borderColor: '#52c41a' }}
              size="large"
            >
              新增酒店
            </Button>
          </Col>
        </Row>
      </Card>

      {/* 数据统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable>
            <Statistic 
              title="我的酒店" 
              value={stats.totalHotels} 
              prefix={<BankOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
            <div style={{ marginTop: 8 }}>
              <span style={{ color: '#fa8c16' }}>{stats.pendingApproval}</span> 个待审核
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable>
            <Statistic 
              title="今日订单" 
              value={stats.todayOrders} 
              prefix={<ShoppingOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable>
            <Statistic 
              title="本月收入" 
              value={stats.monthlyRevenue} 
              prefix="¥"
              precision={2}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable>
            <Statistic 
              title="待办事项" 
              value={stats.pendingApproval} 
              prefix={<RiseOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 酒店列表 */}
      <Card 
        title={
          <Space>
            <BankOutlined />
            <span>我的酒店</span>
          </Space>
        }
        extra={
          <Button type="link" onClick={() => navigate('/merchant/hotels')}>
            查看全部
          </Button>
        }
        loading={loading}
      >
        {hotels.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <BankOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />
            <p style={{ color: '#999', marginTop: 16 }}>暂无酒店，立即创建您的第一家酒店</p>
            <Button 
              type="primary" 
              icon={<PlusOutlined />}
              onClick={() => navigate('/merchant/hotel-edit/new')}
            >
              创建酒店
            </Button>
          </div>
        ) : (
          <List
            dataSource={hotels.slice(0, 5)}
            renderItem={(hotel) => (
              <List.Item
                actions={[
                  <Button 
                    type="link" 
                    icon={<EditOutlined />}
                    onClick={() => navigate(`/merchant/hotel-edit/${hotel.hotel_id}`)}
                  >
                    编辑
                  </Button>
                ]}
              >
                <List.Item.Meta
                  title={
                    <Space>
                      <span>{hotel.name_zh}</span>
                      {getStatusTag(hotel.status)}
                    </Space>
                  }
                  description={`星级: ${hotel.star_rating}星 | 地址: ${hotel.address || '未填写'}`}
                />
              </List.Item>
            )}
          />
        )}
      </Card>

      {/* 快捷入口 */}
      <Row gutter={16} style={{ marginTop: 24 }}>
        <Col span={8}>
          <Card hoverable onClick={() => navigate('/merchant/room-price')}>
            <Statistic title="房态管理" value="更新房价" prefix="📅" />
          </Card>
        </Col>
        <Col span={8}>
          <Card hoverable onClick={() => navigate('/merchant/orders')}>
            <Statistic title="订单中心" value="处理订单" prefix="📦" />
          </Card>
        </Col>
        <Col span={8}>
          <Card hoverable onClick={() => navigate('/merchant/profile')}>
            <Statistic title="商户资料" value="完善信息" prefix="📄" />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default MerchantDashboard;