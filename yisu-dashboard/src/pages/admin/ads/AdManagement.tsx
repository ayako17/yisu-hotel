import React, { useEffect, useState } from 'react';
import {
  Card, Table, Tag, Space, Button, Typography, message,
  Row, Col, Statistic, Badge, Tooltip, Image, 
  Modal, Descriptions, Divider, Tabs, Progress} from 'antd';
import {
  RiseOutlined,
  CalendarOutlined,
  EyeOutlined,
  StopOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  WarningOutlined,
  PictureOutlined,
  HomeOutlined,
  OrderedListOutlined,
  ThunderboltOutlined
} from '@ant-design/icons';
import axios from '../../../services/axios';
import dayjs from 'dayjs';
import styled from 'styled-components';

const { Text } = Typography;
const { TabPane } = Tabs;
const { confirm } = Modal;

interface ActiveAd {
  ad_id: number;
  hotel_id: number;
  hotel_name: string;
  ad_order_id: number;
  image_url: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  order_no?: string;
}

interface AdOrder {
  ad_order_id: number;
  order_no: string;
  hotel_id: number;
  hotel_name: string;
  image_url: string;
  start_date: string;
  end_date: string;
  total_amount: number;
  unit_price: number;
  audit_status: string;
  payment_status: string;
  created_at: string;
}

interface AdStats {
  activeCount: number;
  todayCount: number;
  expiredCount: number;
  upcomingCount: number;
  totalImpressions?: number;
  totalClicks?: number;
}

const StyledCard = styled(Card)`
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
  
  &:hover {
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
  }
`;

const StatsCard = styled(Card)`
  border-radius: 12px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  
  .ant-statistic-title,
  .ant-statistic-content {
    color: white;
  }
`;


const AdManagement: React.FC = () => {
  const [activeAds, setActiveAds] = useState<ActiveAd[]>([]);
  const [approvedOrders, setApprovedOrders] = useState<AdOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<AdStats>({
    activeCount: 0,
    todayCount: 0,
    expiredCount: 0,
    upcomingCount: 0
  });
  const [selectedAd, setSelectedAd] = useState<ActiveAd | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 获取当前生效的广告
      const activeRes = await axios.get('/admin/active-ads');
      if (activeRes.data.code === 200) {
        const ads = activeRes.data.data || [];
        setActiveAds(ads);
        
        // 计算统计数据
        const now = dayjs();
        const active = ads.filter((ad: ActiveAd) => 
          dayjs(ad.end_date).isAfter(now) && dayjs(ad.start_date).isBefore(now)
        );
        const expired = ads.filter((ad: ActiveAd) => dayjs(ad.end_date).isBefore(now));
        const upcoming = ads.filter((ad: ActiveAd) => dayjs(ad.start_date).isAfter(now));
        
        setStats({
          activeCount: active.length,
          todayCount: ads.filter((ad: ActiveAd) => 
            dayjs(ad.start_date).isSame(now, 'day')
          ).length,
          expiredCount: expired.length,
          upcomingCount: upcoming.length
        });
      }

      // 获取已通过的广告订单
      const ordersRes = await axios.get('/admin/ads/orders', {
        params: { status: 'approved', pageSize: 100 }
      });
      if (ordersRes.data.code === 200) {
        setApprovedOrders(ordersRes.data.data || []);
      }

    } catch (error) {
      message.error('获取数据失败');
    } finally {
      setLoading(false);
    }
  };

  // 手动停用广告
  const handleDeactivate = (ad: ActiveAd) => {
    confirm({
      title: '确认停用广告',
      icon: <WarningOutlined />,
      content: `确定要停用 ${ad.hotel_name} 的广告吗？`,
      onOk: async () => {
        try {
          const res = await axios.post(`/admin/active-ads/${ad.ad_id}/deactivate`);
          if (res.data.code === 200) {
            message.success('广告已停用');
            fetchData();
          }
        } catch (error) {
          message.error('操作失败');
        }
      }
    });
  };

  // 查看广告详情
  const showDetail = (ad: ActiveAd) => {
    setSelectedAd(ad);
    setDetailVisible(true);
  };

  // 获取状态标签
  const getStatusTag = (ad: ActiveAd) => {
    const now = dayjs();
    const start = dayjs(ad.start_date);
    const end = dayjs(ad.end_date);
    
    if (!ad.is_active) {
      return <Tag color="default" icon={<StopOutlined />}>已停用</Tag>;
    }
    if (end.isBefore(now)) {
      return <Tag color="red" icon={<WarningOutlined />}>已过期</Tag>;
    }
    if (start.isAfter(now)) {
      return <Tag color="orange" icon={<ClockCircleOutlined />}>待生效</Tag>;
    }
    return <Tag color="green" icon={<CheckCircleOutlined />}>生效中</Tag>;
  };

  // 计算剩余天数
  const getRemainingDays = (endDate: string) => {
    const days = dayjs(endDate).diff(dayjs(), 'day');
    if (days < 0) return 0;
    return days;
  };

  // 计算进度百分比
  const getProgress = (start: string, end: string) => {
    const total = dayjs(end).diff(dayjs(start), 'day');
    const passed = dayjs().diff(dayjs(start), 'day');
    if (passed < 0) return 0;
    if (passed > total) return 100;
    return Math.round((passed / total) * 100);
  };

  // 当前生效广告列
  const activeColumns = [
    {
      title: '酒店',
      dataIndex: 'hotel_name',
      key: 'hotel_name',
      render: (text: string) => (
        <Space>
          <HomeOutlined />
          <span>{text}</span>
        </Space>
      )
    },
    {
      title: '广告素材',
      dataIndex: 'image_url',
      key: 'image_url',
      render: (url: string) => (
        <Image
          src={url.startsWith('http') ? url : `http://localhost:3000${url}`}
          width={120}
          height={40}
          style={{ objectFit: 'cover', borderRadius: 4 }}
          fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMIAAADDCAYAAADQvc6UAAABRWlDQ1BJQ0MgUHJvZmlsZQAAKJFjYGASSSwoyGFhYGDIzSspCnJ3UoiIjFJgf8LAwSDCIMogwMCcmFxc4BgQ4ANUwgCjUcG3awyMIPqyLsis7PPOq3QdDFcvjV3jOD1boQVTPQrgSkktTgbSf4A4LbmgqISBgTEFyFYuLykAsTuAbJEioKOA7DkgdjqEvQHEToKwj4DVhAQ5A9k3gGyB5IxEoBmML4BsnSQk8XQkNtReEOBxcfXxUQg1Mjc0dyHgXNJBSWpFCYh2zi+oLMpMzyhRcASGUqqCZ16yno6CkYGRAQMDKMwhqj/fAIcloxgHQqxAjIHBEugw5sUIsSQpBobtQPdLciLEVJYzMPBHMDBsayhILEqEO4DxG0txmrERhM29nYGBddr//5/DGRjYNRkY/l7////39v///y4Dmn+LgeHgA+Q3kwWuaTFhcAAAAHiczVJbS8JAEH6NpZKlYAmeriIRRBVEERVIvRfdRVEK0oItRJEEQQUVU9N/q7O5uRvPiLgR9mZ2d+XZmvm9GVpIldDwSqSoVjapulEiqXFEjHhuI5+e3yfnUsh28hEmsEkhggF4q44aG2JQI2bLtGxTnuLDP5wJuXE2YZZdoJzG2Iczm4Ey5+PADLrV51UZqYhIAc+rEUXGpmSp5C7qe3PlskA+TN1VRN8lK1mM/9xXmQrivKGYRl0gOswxpgk6uKmt4Lbqy0Em+CxRsDajjWCWv4Do8Y5ePiuoovUdxsfADdXckJ6jWgIgNxEG1565DntVULddsXU/fojRBlEfvcPo6bIu138GuY1HgwyOX36JqOCQO3A9aLBogMRphRP4X2i3GQ/Yr8IPv8IEHAAJdk5BkqL5x3mFJ/9BpJh+O4Qexu9kC8R1WlR2V2Zt0QkHyixIqoJQJKiVnLKVRdEoSzW+4qUp6v2e6ZE1q5V/hhQFSfB8Bf4XhpodYA+RT7bMOZQOaPq0p/0qkJJyYcp0j2EVZ9FKunW8Q0jQAAAABJRU5ErkJggg=="
        />
      )
    },
    {
      title: '投放周期',
      key: 'period',
      render: (_: any, record: ActiveAd) => (
        <Space direction="vertical" size={2}>
          <Space>
            <CalendarOutlined />
            <Text>{dayjs(record.start_date).format('YYYY-MM-DD')}</Text>
          </Space>
          <Space>
            <CalendarOutlined />
            <Text>{dayjs(record.end_date).format('YYYY-MM-DD')}</Text>
          </Space>
        </Space>
      )
    },
    {
      title: '状态',
      key: 'status',
      render: (_: any, record: ActiveAd) => getStatusTag(record)
    },
    {
      title: '剩余天数',
      key: 'remaining',
      render: (_: any, record: ActiveAd) => {
        const days = getRemainingDays(record.end_date);
        const progress = getProgress(record.start_date, record.end_date);
        return (
          <Tooltip title={`已进行 ${progress}%`}>
            <Space direction="vertical" size={2}>
              <Text strong>{days > 0 ? `${days}天` : '已过期'}</Text>
              <Progress percent={progress} size="small" showInfo={false} strokeColor={days > 7 ? '#52c41a' : '#fa8c16'} />
            </Space>
          </Tooltip>
        );
      }
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: ActiveAd) => (
        <Space>
          <Tooltip title="查看详情">
            <Button type="link" icon={<EyeOutlined />} onClick={() => showDetail(record)} />
          </Tooltip>
          {record.is_active && dayjs(record.end_date).isAfter(dayjs()) && (
            <Tooltip title="停用广告">
              <Button type="link" danger icon={<StopOutlined />} onClick={() => handleDeactivate(record)} />
            </Tooltip>
          )}
        </Space>
      )
    }
  ];

  return (
    <div style={{ padding: '24px' }}>
      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <StatsCard>
            <Statistic
              title="生效中广告"
              value={stats.activeCount}
              suffix="个"
              valueStyle={{ color: 'white', fontSize: 32 }}
              prefix={<RiseOutlined />}
            />
          </StatsCard>
        </Col>
        <Col span={6}>
          <StyledCard>
            <Statistic
              title="今日上线"
              value={stats.todayCount}
              suffix="个"
              valueStyle={{ color: '#52c41a' }}
              prefix={<CalendarOutlined />}
            />
          </StyledCard>
        </Col>
        <Col span={6}>
          <StyledCard>
            <Statistic
              title="待生效"
              value={stats.upcomingCount}
              suffix="个"
              valueStyle={{ color: '#fa8c16' }}
              prefix={<ClockCircleOutlined />}
            />
          </StyledCard>
        </Col>
        <Col span={6}>
          <StyledCard>
            <Statistic
              title="已过期"
              value={stats.expiredCount}
              suffix="个"
              valueStyle={{ color: '#ff4d4f' }}
              prefix={<WarningOutlined />}
            />
          </StyledCard>
        </Col>
      </Row>

      <StyledCard>
        <Tabs defaultActiveKey="active">
          <TabPane
            tab={
              <Space>
                <ThunderboltOutlined />
                <span>生效中广告</span>
                <Badge count={stats.activeCount} style={{ backgroundColor: '#52c41a' }} />
              </Space>
            }
            key="active"
          >
            <Table
              columns={activeColumns}
              dataSource={activeAds.filter(ad => 
                ad.is_active && 
                dayjs(ad.end_date).isAfter(dayjs()) && 
                dayjs(ad.start_date).isBefore(dayjs())
              )}
              rowKey="ad_id"
              loading={loading}
              pagination={{ pageSize: 10 }}
            />
          </TabPane>

          <TabPane
            tab={
              <Space>
                <ClockCircleOutlined />
                <span>待生效</span>
                <Badge count={stats.upcomingCount} style={{ backgroundColor: '#fa8c16' }} />
              </Space>
            }
            key="upcoming"
          >
            <Table
              columns={activeColumns}
              dataSource={activeAds.filter(ad => 
                ad.is_active && dayjs(ad.start_date).isAfter(dayjs())
              )}
              rowKey="ad_id"
              loading={loading}
              pagination={{ pageSize: 10 }}
            />
          </TabPane>

          <TabPane
            tab={
              <Space>
                <WarningOutlined />
                <span>已过期/停用</span>
                <Badge count={stats.expiredCount} style={{ backgroundColor: '#ff4d4f' }} />
              </Space>
            }
            key="expired"
          >
            <Table
              columns={activeColumns}
              dataSource={activeAds.filter(ad => 
                !ad.is_active || dayjs(ad.end_date).isBefore(dayjs())
              )}
              rowKey="ad_id"
              loading={loading}
              pagination={{ pageSize: 10 }}
            />
          </TabPane>

          <TabPane
            tab={
              <Space>
                <OrderedListOutlined />
                <span>历史订单</span>
              </Space>
            }
            key="history"
          >
            <Table
              columns={[
                {
                  title: '订单号',
                  dataIndex: 'order_no',
                  key: 'order_no',
                },
                {
                  title: '酒店',
                  dataIndex: 'hotel_name',
                  key: 'hotel_name',
                },
                {
                  title: '投放周期',
                  key: 'period',
                  render: (_: any, record: AdOrder) => (
                    <Space>
                      <CalendarOutlined />
                      {dayjs(record.start_date).format('MM-DD')} 至 {dayjs(record.end_date).format('MM-DD')}
                    </Space>
                  )
                },
                {
                  title: '金额',
                  dataIndex: 'total_amount',
                  key: 'total_amount',
                  render: (val: number) => `¥${val.toLocaleString()}`
                },
                {
                  title: '审核通过时间',
                  dataIndex: 'created_at',
                  key: 'created_at',
                  render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm')
                }
              ]}
              dataSource={approvedOrders}
              rowKey="ad_order_id"
              loading={loading}
              pagination={{ pageSize: 10 }}
            />
          </TabPane>
        </Tabs>
      </StyledCard>

      {/* 广告详情弹窗 */}
      <Modal
        title="广告详情"
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={null}
        width={700}
      >
        {selectedAd && (
          <div>
            <Row gutter={24}>
              <Col span={24}>
                <Descriptions bordered column={1}>
                  <Descriptions.Item label="酒店名称">
                    <HomeOutlined /> {selectedAd.hotel_name}
                  </Descriptions.Item>
                  <Descriptions.Item label="订单编号">
                    {selectedAd.order_no || '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label="投放周期">
                    {dayjs(selectedAd.start_date).format('YYYY-MM-DD')} 至 {dayjs(selectedAd.end_date).format('YYYY-MM-DD')}
                    <div style={{ marginTop: 8 }}>
                      <Progress 
                        percent={getProgress(selectedAd.start_date, selectedAd.end_date)} 
                        status={dayjs(selectedAd.end_date).isBefore(dayjs()) ? 'exception' : 'active'}
                      />
                    </div>
                  </Descriptions.Item>
                  <Descriptions.Item label="状态">
                    {getStatusTag(selectedAd)}
                  </Descriptions.Item>
                  <Descriptions.Item label="剩余天数">
                    {getRemainingDays(selectedAd.end_date)} 天
                  </Descriptions.Item>
                </Descriptions>
              </Col>
            </Row>

            <Divider>
              <PictureOutlined /> 广告素材
            </Divider>
            
            <div style={{ textAlign: 'center', background: '#f5f5f5', padding: 20, borderRadius: 8 }}>
              <Image
                src={selectedAd.image_url.startsWith('http') ? selectedAd.image_url : `http://localhost:3000${selectedAd.image_url}`}
                alt="广告素材"
                style={{ maxWidth: '100%', maxHeight: 200, objectFit: 'contain' }}
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AdManagement;