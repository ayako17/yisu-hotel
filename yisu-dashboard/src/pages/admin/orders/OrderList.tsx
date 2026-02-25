// src/pages/admin/orders/OrderList.tsx
import React, { useState, useEffect } from 'react';
import {
  Table, Card, Form, Input, Select, DatePicker, Typography,
  Tag, Space, Button, Badge, Tooltip, Row, Col, Statistic,
  Modal, Descriptions, message, Progress,
  Tabs
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  SearchOutlined,
  EyeOutlined,
  ReloadOutlined,
  CalendarOutlined,
  UserOutlined,
  HomeOutlined,
  PercentageOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  BankOutlined,
  BarChartOutlined,
  PieChartOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined} from '@ant-design/icons';
import axios from '../../../services/axios';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;
const { TabPane } = Tabs;

// 订单接口定义
interface Order {
  order_id: number;
  order_no: string;
  user_id: number;
  user_name?: string;
  user_phone?: string;
  hotel_id: number;
  hotel_name?: string;
  room_type_id: number;
  room_type_name?: string;
  rooms: number;
  adults: number;
  children: number;
  check_in_date: string;
  check_out_date: string;
  total_amount: number;
  commission_rate: number;
  commission_amount: number;
  status: 'unpaid' | 'paid' | 'checked_in' | 'completed' | 'cancelled';
  created_at: string;
}

// 每日订单统计
interface DailyOrderStat {
  date: string;
  total: number;
  paid: number;
  completed: number;
  cancelled: number;
  revenue: number;
  commission: number;
}

// 酒店订单统计
interface HotelOrderStat {
  hotel_id: number;
  hotel_name: string;
  order_count: number;
  total_amount: number;
  commission_amount: number;
}

// 平台统计数据
interface PlatformStats {
  totalOrders: number;
  totalRevenue: number;
  totalCommission: number;
  avgOrderValue: number;
  todayOrders: number;
  todayRevenue: number;
  monthOrders: number;
  monthRevenue: number;
  statusStats: {
    unpaid: number;
    paid: number;
    checked_in: number;
    completed: number;
    cancelled: number;
  };
}

const OrderList: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [platformStats, setPlatformStats] = useState<PlatformStats>({
    totalOrders: 0,
    totalRevenue: 0,
    totalCommission: 0,
    avgOrderValue: 0,
    todayOrders: 0,
    todayRevenue: 0,
    monthOrders: 0,
    monthRevenue: 0,
    statusStats: {
      unpaid: 0,
      paid: 0,
      checked_in: 0,
      completed: 0,
      cancelled: 0
    }
  });
  const [dailyStats, setDailyStats] = useState<DailyOrderStat[]>([]);
  const [hotelStats, setHotelStats] = useState<HotelOrderStat[]>([]);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [searchForm] = Form.useForm();
  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [activeTab, setActiveTab] = useState('list');

  // 获取订单列表
  const fetchOrders = async (page = 1, pageSize = 10) => {
    setLoading(true);
    try {
      const values = await searchForm.validateFields().catch(() => ({}));
      
      const params: any = {
        page,
        pageSize,
        status: values.status,
        keyword: values.keyword,
        start_date: values.dateRange?.[0]?.format('YYYY-MM-DD'),
        end_date: values.dateRange?.[1]?.format('YYYY-MM-DD')
      };

      const res = await axios.get('/admin/orders', { params });
      if (res.data.code === 200) {
        setOrders(res.data.data || []);
        setPagination({
          current: res.data.page || page,
          pageSize: res.data.pageSize || pageSize,
          total: res.data.total || 0
        });
      }
    } catch (error) {
      message.error('获取订单列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 获取平台统计数据
  const fetchPlatformStats = async () => {
    try {
      const res = await axios.get('/admin/orders/platform-stats');
      if (res.data.code === 200) {
        setPlatformStats(res.data.data);
      }
    } catch (error) {
      console.error('获取平台统计数据失败:', error);
    }
  };

  // 获取每日统计
  const fetchDailyStats = async () => {
    try {
      const res = await axios.get('/admin/orders/daily-stats', {
        params: { days: 30 }
      });
      if (res.data.code === 200) {
        setDailyStats(res.data.data || []);
      }
    } catch (error) {
      console.error('获取每日统计失败:', error);
    }
  };

  // 获取酒店统计
  const fetchHotelStats = async () => {
    try {
      const res = await axios.get('/admin/orders/hotel-stats', {
        params: { limit: 10 }
      });
      if (res.data.code === 200) {
        setHotelStats(res.data.data || []);
      }
    } catch (error) {
      console.error('获取酒店统计失败:', error);
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchPlatformStats();
    fetchDailyStats();
    fetchHotelStats();
  }, []);

  // 查看订单详情
  const handleViewDetail = async (orderId: number) => {
    try {
      const res = await axios.get(`/admin/orders/${orderId}`);
      if (res.data.code === 200) {
        setSelectedOrder(res.data.data);
        setDetailVisible(true);
      }
    } catch (error) {
      message.error('获取订单详情失败');
    }
  };

  // 获取状态标签
  const getStatusTag = (status: string) => {
    const configMap: Record<string, { color: string; icon: React.ReactNode; text: string }> = {
      unpaid: { color: 'default', icon: <ClockCircleOutlined />, text: '待支付' },
      paid: { color: 'blue', icon: <CheckCircleOutlined />, text: '已支付' },
      checked_in: { color: 'processing', icon: <BankOutlined />, text: '已入住' },
      completed: { color: 'green', icon: <CheckCircleOutlined />, text: '已完成' },
      cancelled: { color: 'red', icon: <CloseCircleOutlined />, text: '已取消' }
    };
    
    const config = configMap[status as keyof typeof configMap];
    return config ? <Tag color={config.color} icon={config.icon}>{config.text}</Tag> : null;
  };

  // 表格列定义
  const columns: ColumnsType<Order> = [
    {
      title: '订单编号',
      dataIndex: 'order_no',
      key: 'order_no',
      width: 180,
      render: (text: string) => <Text copyable strong>{text}</Text>
    },
    {
      title: '酒店信息',
      key: 'hotel_info',
      width: 200,
      render: (_: any, record: Order) => (
        <Space direction="vertical" size={2}>
          <Space>
            <HomeOutlined />
            <span>{record.hotel_name || `ID: ${record.hotel_id}`}</span>
          </Space>
          <Space>
            <BankOutlined />
            <span>{record.room_type_name || `房型ID: ${record.room_type_id}`}</span>
          </Space>
        </Space>
      )
    },
    {
      title: '客户信息',
      key: 'user_info',
      width: 150,
      render: (_: any, record: Order) => (
        <Space direction="vertical" size={2}>
          <Space>
            <UserOutlined />
            <span>{record.user_name || `用户ID: ${record.user_id}`}</span>
          </Space>
          {record.user_phone && (
            <Text type="secondary" style={{ fontSize: 12 }}>{record.user_phone}</Text>
          )}
        </Space>
      )
    },
    {
      title: '入住信息',
      key: 'stay_info',
      width: 200,
      render: (_: any, record: Order) => {
        const nights = dayjs(record.check_out_date).diff(dayjs(record.check_in_date), 'day');
        return (
          <Space direction="vertical" size={2}>
            <Space>
              <CalendarOutlined />
              <span>{dayjs(record.check_in_date).format('MM-DD')} 至 {dayjs(record.check_out_date).format('MM-DD')}</span>
            </Space>
            <Space>
              <span>{record.rooms}间</span>
              <span>成人: {record.adults}</span>
              <span>儿童: {record.children}</span>
            </Space>
            <Text type="secondary">共 {nights} 晚</Text>
          </Space>
        );
      }
    },
    {
      title: '订单金额',
      key: 'amount',
      width: 150,
      render: (_: any, record: Order) => (
        <Space direction="vertical" size={2}>
          <Text strong style={{ color: '#cf1322' }}>¥{record.total_amount.toLocaleString()}</Text>
          <Space>
            <PercentageOutlined style={{ color: '#fa8c16' }} />
            <Text type="secondary">佣金: ¥{record.commission_amount.toLocaleString()}</Text>
          </Space>
        </Space>
      )
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => getStatusTag(status)
    },
    {
      title: '下单时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 150,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm')
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      fixed: 'right' as const,
      render: (_: any, record: Order) => (
        <Button
          type="link"
          icon={<EyeOutlined />}
          onClick={() => handleViewDetail(record.order_id)}
        >
          详情
        </Button>
      )
    }
  ];

  // 计算环比

  return (
    <Card bordered={false}>
      <Title level={4} style={{ marginBottom: 24 }}>订单数据中心</Title>

      {/* 平台概览卡片 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="总订单数"
              value={platformStats.totalOrders}
              suffix="单"
              valueStyle={{ color: '#1890ff', fontSize: 28 }}
              prefix={<BarChartOutlined />}
            />
            <div style={{ marginTop: 8 }}>
              <Text type="secondary">今日新增 {platformStats.todayOrders} 单</Text>
            </div>
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="总交易额"
              value={platformStats.totalRevenue}
              precision={2}
              prefix="¥"
              valueStyle={{ color: '#52c41a', fontSize: 28 }}
            />
            <div style={{ marginTop: 8 }}>
              <Text type="secondary">今日 ¥{platformStats.todayRevenue.toLocaleString()}</Text>
            </div>
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="总佣金"
              value={platformStats.totalCommission}
              precision={2}
              prefix="¥"
              valueStyle={{ color: '#fa8c16', fontSize: 28 }}
            />
            <div style={{ marginTop: 8 }}>
              <Text type="secondary">平均佣金率 {((platformStats.totalCommission / platformStats.totalRevenue) * 100).toFixed(1)}%</Text>
            </div>
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="客单价"
              value={platformStats.avgOrderValue}
              precision={2}
              prefix="¥"
              valueStyle={{ color: '#722ed1', fontSize: 28 }}
            />
            <div style={{ marginTop: 8 }}>
              <Text type="secondary">本月 {platformStats.monthOrders} 单</Text>
            </div>
          </Card>
        </Col>
      </Row>

    {/* 订单状态分布 */}
      <Card 
        title={
          <Space>
            <PieChartOutlined style={{ color: '#722ed1' }} />
            <span style={{ fontWeight: 500 }}>订单状态分布</span>
          </Space>
        }
        style={{ marginBottom: 24, borderRadius: 12 }}
        extra={
          <Tag color="processing" style={{ borderRadius: 12 }}>
            总订单: {platformStats.totalOrders} 单
          </Tag>
        }
      >
        <Row gutter={[16, 16]}>
          {/* 待支付 */}
          <Col xs={24} sm={12} md={8} lg={4}>
            <Tooltip title="用户已下单但未完成支付的订单">
              <div style={{ 
                padding: 16, 
                background: '#fafafa', 
                borderRadius: 12,
                borderLeft: '4px solid #d9d9d9',
                transition: 'all 0.3s',
                cursor: 'help'
              }}>
                <Space direction="vertical" size={2} style={{ width: '100%' }}>
                  <Space align="center" style={{ justifyContent: 'space-between', width: '100%' }}>
                    <span style={{ color: '#666', fontSize: 13 }}>待支付</span>
                    <ClockCircleOutlined style={{ color: '#999' }} />
                  </Space>
                  <div style={{ fontSize: 24, fontWeight: 600, color: '#666' }}>
                    {platformStats.statusStats.unpaid}
                    <span style={{ fontSize: 14, fontWeight: 400, color: '#999', marginLeft: 8 }}>单</span>
                  </div>
                  <Progress 
                    percent={Math.round((platformStats.statusStats.unpaid / platformStats.totalOrders) * 100) || 0} 
                    size="small" 
                    showInfo={false}
                    strokeColor="#d9d9d9"
                    style={{ margin: '4px 0' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                    <span style={{ color: '#999', fontSize: 12 }}>占比</span>
                    <span style={{ color: '#666', fontSize: 12, fontWeight: 500 }}>
                      {Math.round((platformStats.statusStats.unpaid / platformStats.totalOrders) * 100) || 0}%
                    </span>
                  </div>
                </Space>
              </div>
            </Tooltip>
          </Col>

          {/* 已支付 */}
          <Col xs={24} sm={12} md={8} lg={4}>
            <Tooltip title="用户已支付，等待入住的订单">
              <div style={{ 
                padding: 16, 
                background: '#e6f7ff', 
                borderRadius: 12,
                borderLeft: '4px solid #1890ff',
                transition: 'all 0.3s',
                cursor: 'help'
              }}>
                <Space direction="vertical" size={2} style={{ width: '100%' }}>
                  <Space align="center" style={{ justifyContent: 'space-between', width: '100%' }}>
                    <span style={{ color: '#1890ff', fontSize: 13 }}>已支付</span>
                    <CheckCircleOutlined style={{ color: '#1890ff' }} />
                  </Space>
                  <div style={{ fontSize: 24, fontWeight: 600, color: '#1890ff' }}>
                    {platformStats.statusStats.paid}
                    <span style={{ fontSize: 14, fontWeight: 400, color: '#1890ff', marginLeft: 8 }}>单</span>
                  </div>
                  <Progress 
                    percent={Math.round((platformStats.statusStats.paid / platformStats.totalOrders) * 100) || 0} 
                    size="small" 
                    showInfo={false}
                    strokeColor="#1890ff"
                    style={{ margin: '4px 0' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                    <span style={{ color: '#999', fontSize: 12 }}>占比</span>
                    <span style={{ color: '#1890ff', fontSize: 12, fontWeight: 500 }}>
                      {Math.round((platformStats.statusStats.paid / platformStats.totalOrders) * 100) || 0}%
                    </span>
                  </div>
                </Space>
              </div>
            </Tooltip>
          </Col>

          {/* 已入住 */}
          <Col xs={24} sm={12} md={8} lg={4}>
            <Tooltip title="客人已办理入住的订单">
              <div style={{ 
                padding: 16, 
                background: '#f9f0ff', 
                borderRadius: 12,
                borderLeft: '4px solid #722ed1',
                transition: 'all 0.3s',
                cursor: 'help'
              }}>
                <Space direction="vertical" size={2} style={{ width: '100%' }}>
                  <Space align="center" style={{ justifyContent: 'space-between', width: '100%' }}>
                    <span style={{ color: '#722ed1', fontSize: 13 }}>已入住</span>
                    <BankOutlined style={{ color: '#722ed1' }} />
                  </Space>
                  <div style={{ fontSize: 24, fontWeight: 600, color: '#722ed1' }}>
                    {platformStats.statusStats.checked_in}
                    <span style={{ fontSize: 14, fontWeight: 400, color: '#722ed1', marginLeft: 8 }}>单</span>
                  </div>
                  <Progress 
                    percent={Math.round((platformStats.statusStats.checked_in / platformStats.totalOrders) * 100) || 0} 
                    size="small" 
                    showInfo={false}
                    strokeColor="#722ed1"
                    style={{ margin: '4px 0' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                    <span style={{ color: '#999', fontSize: 12 }}>占比</span>
                    <span style={{ color: '#722ed1', fontSize: 12, fontWeight: 500 }}>
                      {Math.round((platformStats.statusStats.checked_in / platformStats.totalOrders) * 100) || 0}%
                    </span>
                  </div>
                </Space>
              </div>
            </Tooltip>
          </Col>

          {/* 已完成 */}
          <Col xs={24} sm={12} md={8} lg={4}>
            <Tooltip title="客人已退房，订单完成的订单">
              <div style={{ 
                padding: 16, 
                background: '#f6ffed', 
                borderRadius: 12,
                borderLeft: '4px solid #52c41a',
                transition: 'all 0.3s',
                cursor: 'help'
              }}>
                <Space direction="vertical" size={2} style={{ width: '100%' }}>
                  <Space align="center" style={{ justifyContent: 'space-between', width: '100%' }}>
                    <span style={{ color: '#52c41a', fontSize: 13 }}>已完成</span>
                    <CheckCircleOutlined style={{ color: '#52c41a' }} />
                  </Space>
                  <div style={{ fontSize: 24, fontWeight: 600, color: '#52c41a' }}>
                    {platformStats.statusStats.completed}
                    <span style={{ fontSize: 14, fontWeight: 400, color: '#52c41a', marginLeft: 8 }}>单</span>
                  </div>
                  <Progress 
                    percent={Math.round((platformStats.statusStats.completed / platformStats.totalOrders) * 100) || 0} 
                    size="small" 
                    showInfo={false}
                    strokeColor="#52c41a"
                    style={{ margin: '4px 0' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                    <span style={{ color: '#999', fontSize: 12 }}>占比</span>
                    <span style={{ color: '#52c41a', fontSize: 12, fontWeight: 500 }}>
                      {Math.round((platformStats.statusStats.completed / platformStats.totalOrders) * 100) || 0}%
                    </span>
                  </div>
                </Space>
              </div>
            </Tooltip>
          </Col>

          {/* 已取消 */}
          <Col xs={24} sm={12} md={8} lg={4}>
            <Tooltip title="用户取消或系统自动取消的订单">
              <div style={{ 
                padding: 16, 
                background: '#fff2f0', 
                borderRadius: 12,
                borderLeft: '4px solid #ff4d4f',
                transition: 'all 0.3s',
                cursor: 'help'
              }}>
                <Space direction="vertical" size={2} style={{ width: '100%' }}>
                  <Space align="center" style={{ justifyContent: 'space-between', width: '100%' }}>
                    <span style={{ color: '#ff4d4f', fontSize: 13 }}>已取消</span>
                    <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
                  </Space>
                  <div style={{ fontSize: 24, fontWeight: 600, color: '#ff4d4f' }}>
                    {platformStats.statusStats.cancelled}
                    <span style={{ fontSize: 14, fontWeight: 400, color: '#ff4d4f', marginLeft: 8 }}>单</span>
                  </div>
                  <Progress 
                    percent={Math.round((platformStats.statusStats.cancelled / platformStats.totalOrders) * 100) || 0} 
                    size="small" 
                    showInfo={false}
                    strokeColor="#ff4d4f"
                    style={{ margin: '4px 0' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                    <span style={{ color: '#999', fontSize: 12 }}>占比</span>
                    <span style={{ color: '#ff4d4f', fontSize: 12, fontWeight: 500 }}>
                      {Math.round((platformStats.statusStats.cancelled / platformStats.totalOrders) * 100) || 0}%
                    </span>
                  </div>
                </Space>
              </div>
            </Tooltip>
          </Col>

          {/* 完成率环形图 */}
          <Col xs={24} sm={12} md={8} lg={4}>
            <div style={{ 
              padding: 16, 
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: 12,
              color: 'white',
              textAlign: 'center'
            }}>
              <Space direction="vertical" size={2} align="center">
                <span style={{ opacity: 0.9, fontSize: 13 }}>订单完成率</span>
                <Progress
                  type="circle"
                  percent={Math.round((platformStats.statusStats.completed / platformStats.totalOrders) * 100) || 0}
                  width={80}
                  strokeColor="#fff"
                  trailColor="rgba(255,255,255,0.3)"
                  format={(percent) => (
                    <span style={{ color: 'white', fontSize: 18, fontWeight: 600 }}>{percent}%</span>
                  )}
                />
                <div style={{ marginTop: 8 }}>
                  <span style={{ opacity: 0.9, fontSize: 12 }}>已完成 {platformStats.statusStats.completed} 单</span>
                </div>
              </Space>
            </div>
          </Col>
        </Row>
      </Card>

{/* 添加状态说明卡片 */}
<Card style={{ marginBottom: 24, background: '#fafafa', borderRadius: 12 }} size="small">
  <Row gutter={16}>
    <Col span={24}>
      <Space wrap size={[16, 8]}>
        <Space>
          <Badge color="#d9d9d9" />
          <span style={{ fontSize: 12, color: '#666' }}>待支付: 用户已下单未支付</span>
        </Space>
        <Space>
          <Badge color="#1890ff" />
          <span style={{ fontSize: 12, color: '#666' }}>已支付: 已支付等待入住</span>
        </Space>
        <Space>
          <Badge color="#722ed1" />
          <span style={{ fontSize: 12, color: '#666' }}>已入住: 已办理入住</span>
        </Space>
        <Space>
          <Badge color="#52c41a" />
          <span style={{ fontSize: 12, color: '#666' }}>已完成: 已退房完成</span>
        </Space>
        <Space>
          <Badge color="#ff4d4f" />
          <span style={{ fontSize: 12, color: '#666' }}>已取消: 订单取消</span>
        </Space>
      </Space>
    </Col>
  </Row>
</Card>

      {/* 搜索表单 */}
      <Form
        form={searchForm}
        layout="vertical"
        style={{ marginBottom: 24, background: '#fafafa', padding: 16, borderRadius: 8 }}
        onFinish={() => fetchOrders(1, pagination.pageSize)}
      >
        <Row gutter={16}>
          <Col span={6}>
            <Form.Item name="keyword" label="搜索" style={{ marginBottom: 0 }}>
              <Input placeholder="订单号/酒店名/客户" allowClear />
            </Form.Item>
          </Col>
          <Col span={4}>
            <Form.Item name="status" label="订单状态" style={{ marginBottom: 0 }}>
              <Select placeholder="全部状态" allowClear>
                <Option value="unpaid">待支付</Option>
                <Option value="paid">已支付</Option>
                <Option value="checked_in">已入住</Option>
                <Option value="completed">已完成</Option>
                <Option value="cancelled">已取消</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="dateRange" label="下单日期" style={{ marginBottom: 0 }}>
              <RangePicker style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item label=" " style={{ marginBottom: 0 }}>
              <Space>
                <Button type="primary" htmlType="submit" icon={<SearchOutlined />}>
                  检索
                </Button>
                <Button
                  icon={<ReloadOutlined />}
                  onClick={() => {
                    searchForm.resetFields();
                    fetchOrders(1, pagination.pageSize);
                  }}
                >
                  重置
                </Button>
              </Space>
            </Form.Item>
          </Col>
        </Row>
      </Form>

      {/* 订单列表 */}
      <Table
        columns={columns}
        dataSource={orders}
        rowKey="order_id"
        loading={loading}
        pagination={{
          ...pagination,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => `共 ${total} 条订单`
        }}
        scroll={{ x: 1500 }}
      />

      {/* 订单详情弹窗 */}
      <Modal
        title="订单详情"
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDetailVisible(false)}>
            关闭
          </Button>
        ]}
        width={700}
      >
        {selectedOrder && (
          <div>
            <Descriptions bordered column={2}>
              <Descriptions.Item label="订单编号" span={2}>
                <Text copyable>{selectedOrder.order_no}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="酒店名称">
                {selectedOrder.hotel_name || `ID: ${selectedOrder.hotel_id}`}
              </Descriptions.Item>
              <Descriptions.Item label="房型">
                {selectedOrder.room_type_name || `ID: ${selectedOrder.room_type_id}`}
              </Descriptions.Item>
              <Descriptions.Item label="客户姓名">
                {selectedOrder.user_name || `用户ID: ${selectedOrder.user_id}`}
              </Descriptions.Item>
              <Descriptions.Item label="联系电话">
                {selectedOrder.user_phone || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="入住信息" span={2}>
                <Space direction="vertical">
                  <span>
                    {dayjs(selectedOrder.check_in_date).format('YYYY-MM-DD')} 至 {dayjs(selectedOrder.check_out_date).format('YYYY-MM-DD')}
                  </span>
                  <span>
                    {selectedOrder.rooms}间房 | 成人: {selectedOrder.adults} 儿童: {selectedOrder.children}
                  </span>
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="订单金额">
                <Text strong style={{ color: '#cf1322', fontSize: 16 }}>
                  ¥{selectedOrder.total_amount.toLocaleString()}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="佣金">
                <Text type="warning">
                  ¥{selectedOrder.commission_amount.toLocaleString()} ({selectedOrder.commission_rate}%)
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="订单状态">
                {getStatusTag(selectedOrder.status)}
              </Descriptions.Item>
              <Descriptions.Item label="下单时间">
                {dayjs(selectedOrder.created_at).format('YYYY-MM-DD HH:mm:ss')}
              </Descriptions.Item>
            </Descriptions>
          </div>
        )}
      </Modal>
    </Card>
  );
};

export default OrderList;