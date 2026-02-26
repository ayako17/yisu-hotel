// yisu-dashboard/src/pages/merchant/Orders.tsx
import React, { useEffect, useState } from 'react';
import {
  Card, Table, Tag, Space, Button, message, Select,
  Input, DatePicker, Modal, Descriptions, Statistic,
  Row, Col, Tabs, Badge, Tooltip, Typography
} from 'antd';
import {
  SearchOutlined,
  ReloadOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  PrinterOutlined,
  ExportOutlined,
  HomeOutlined,
  UserOutlined,
  CalendarOutlined,
  PercentageOutlined,
  DollarOutlined
} from '@ant-design/icons';
import axios from '../../services/axios';
import dayjs from 'dayjs';

const { Option } = Select;
const { RangePicker } = DatePicker;
const { TabPane } = Tabs;
const { Text } = Typography;

// 订单接口 - 匹配数据库表结构
interface Order {
  order_id: number;
  order_no: string;
  user_id: number;
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
  username?: string;
  phone?: string;
}

// 订单统计接口
interface OrderStats {
  totalOrders: number;
  todayOrders: number;
  todayCheckIns?: number;      // 今日入住
  todayCheckOuts?: number;     // 今日离店
  pendingOrders: number;
  todayRevenue?: number;       // 今日收入
  monthlyRevenue: number;
  orderStatusCount: {
    unpaid: number;
    paid: number;
    checked_in: number;
    completed: number;
    cancelled: number;
  };
}

// 酒店接口
interface Hotel {
  hotel_id: number;
  name_zh: string;
}

const STATUS_MAP: Record<string, { text: string; color: string }> = {
  'unpaid': { text: '待付款', color: 'orange' },
  'paid': { text: '待入住', color: 'blue' },
  'checked_in': { text: '已入住', color: 'purple' },
  'completed': { text: '已完成', color: 'green' },
  'cancelled': { text: '已取消', color: 'default' }
};

const MerchantOrders: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  });
  const [filters, setFilters] = useState({
    hotel_id: undefined as number | undefined,
    keyword: '',
    status: 'all',
    dateRange: null as [dayjs.Dayjs, dayjs.Dayjs] | null
  });
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [stats, setStats] = useState<OrderStats>({
    totalOrders: 0,
    todayOrders: 0,
    pendingOrders: 0,
    monthlyRevenue: 0,
    orderStatusCount: {
      unpaid: 0,
      paid: 0,
      checked_in: 0,
      completed: 0,
      cancelled: 0
    }
  });

  useEffect(() => {
    fetchHotels();
  }, []);

  useEffect(() => {
    fetchOrders();
    fetchStats();
  }, [pagination.current, pagination.pageSize, filters]);

  const fetchHotels = async () => {
    try {
      const res = await axios.get('/merchant/hotels');
      if (res.data.code === 200) {
        setHotels(res.data.data || []);
      }
    } catch (error) {
      console.error('获取酒店列表失败:', error);
    }
  };

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params: any = {
        page: pagination.current,
        page_size: pagination.pageSize
      };
      
      if (filters.hotel_id) params.hotel_id = filters.hotel_id;
      if (filters.keyword) params.keyword = filters.keyword;
      if (filters.status !== 'all') params.status = filters.status;
      if (filters.dateRange) {
        params.start_date = filters.dateRange[0].format('YYYY-MM-DD');
        params.end_date = filters.dateRange[1].format('YYYY-MM-DD');
      }

      const res = await axios.get('/merchant/orders', { params });
      if (res.data.code === 200) {
        setOrders(res.data.data.list || []);
        setPagination(prev => ({
          ...prev,
          total: res.data.data.total || 0
        }));
      } else {
        // 兼容旧格式
        setOrders(res.data.list || []);
        setPagination(prev => ({
          ...prev,
          total: res.data.total || 0
        }));
      }
    } catch (error) {
      message.error('获取订单列表失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await axios.get('/merchant/orders/stats');
      if (res.data.code === 200) {
        setStats(res.data.data);
      }
    } catch (error) {
      console.error('获取订单统计失败:', error);
    }
  };

  const handleStatusChange = async (orderId: number, newStatus: string) => {
    try {
      const res = await axios.patch(`/merchant/orders/${orderId}/status`, {
        status: newStatus
      });
      if (res.data.code === 200) {
        message.success('状态更新成功');
        fetchOrders();
        fetchStats();
        if (selectedOrder?.order_id === orderId) {
          setSelectedOrder(null);
          setDetailVisible(false);
        }
      }
    } catch (error) {
      message.error('操作失败');
    }
  };

  const handleBatchCheckIn = async () => {
    Modal.confirm({
      title: '批量核销',
      content: '确定要将所有待入住的订单标记为已入住吗？',
      onOk: async () => {
        try {
          // 批量核销接口可能需要单独实现
          message.info('批量核销功能开发中');
        } catch (error) {
          message.error('批量核销失败');
        }
      }
    });
  };

// yisu-dashboard/src/pages/merchant/Orders.tsx

// 修改 handleExport 函数
const handleExport = async () => {
  try {
    // 构建导出参数
    const params: any = {};
    if (filters.hotel_id) params.hotel_id = filters.hotel_id;
    if (filters.keyword) params.keyword = filters.keyword;
    if (filters.status !== 'all') params.status = filters.status;
    if (filters.dateRange) {
      params.start_date = filters.dateRange[0].format('YYYY-MM-DD');
      params.end_date = filters.dateRange[1].format('YYYY-MM-DD');
    }
    
    // 显示加载提示
    message.loading('正在生成报表...', 0);
    
    // 发送请求，指定 responseType 为 blob
    const res = await axios.get('/merchant/orders/export', {
      params,
      responseType: 'blob'
    });
    
    // 关闭加载提示
    message.destroy();
    
    // 创建下载链接
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement('a');
    link.href = url;
    
    // 从响应头获取文件名，如果没有则使用默认名
    const contentDisposition = res.headers['content-disposition'];
    let fileName = `订单报表_${dayjs().format('YYYY-MM-DD_HH-mm')}.xlsx`;
    
    if (contentDisposition) {
      const match = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      if (match && match[1]) {
        fileName = match[1].replace(/['"]/g, '');
      }
    }
    
    link.setAttribute('download', decodeURIComponent(fileName));
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
    message.success('报表导出成功');
  } catch (error: any) {
    message.destroy();
    console.error('导出失败:', error);
    
    // 如果返回的是 JSON 错误信息
    if (error.response?.data instanceof Blob) {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const errorData = JSON.parse(reader.result as string);
          message.error(errorData.msg || '导出失败');
        } catch {
          message.error('导出失败');
        }
      };
      reader.readAsText(error.response.data);
    } else {
      message.error(error.response?.data?.msg || '导出失败');
    }
  }
};

  // 获取状态标签
  const getStatusTag = (status: string) => {
    const config = STATUS_MAP[status];
    return <Tag color={config?.color || 'default'}>{config?.text || status}</Tag>;
  };

  // 计算入住天数
  const calculateNights = (checkIn: string, checkOut: string) => {
    return dayjs(checkOut).diff(dayjs(checkIn), 'day');
  };

  const columns = [
    {
      title: '订单号',
      dataIndex: 'order_no',
      key: 'order_no',
      width: 180,
      render: (text: string, record: Order) => (
        <Space direction="vertical" size={0}>
          <Text copyable>{text}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {dayjs(record.created_at).format('MM-DD HH:mm')}
          </Text>
        </Space>
      )
    },
    {
      title: '酒店/房型',
      key: 'hotel',
      render: (_: any, record: Order) => (
        <Space direction="vertical" size={0}>
          <Space>
            <HomeOutlined />
            <span>{record.hotel_name || `酒店ID: ${record.hotel_id}`}</span>
          </Space>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.room_type_name || `房型ID: ${record.room_type_id}`}
          </Text>
        </Space>
      )
    },
    {
      title: '客户信息',
      key: 'guest',
      render: (_: any, record: Order) => (
        <Space direction="vertical" size={0}>
          <Space>
            <UserOutlined />
            <span>{record.username || `用户ID: ${record.user_id}`}</span>
          </Space>
          {record.phone && (
            <Text type="secondary" style={{ fontSize: 12 }}>{record.phone}</Text>
          )}
        </Space>
      )
    },
    {
      title: '入住信息',
      key: 'dates',
      render: (_: any, record: Order) => {
        const nights = calculateNights(record.check_in_date, record.check_out_date);
        return (
          <Space direction="vertical" size={0}>
            <Space>
              <CalendarOutlined />
              <span>{dayjs(record.check_in_date).format('MM-DD')} 入住</span>
            </Space>
            <Space>
              <CalendarOutlined />
              <span>{dayjs(record.check_out_date).format('MM-DD')} 离店</span>
            </Space>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {nights}晚 {record.rooms}间 | 成人:{record.adults} 儿童:{record.children}
            </Text>
          </Space>
        );
      }
    },
    {
      title: '金额',
      key: 'amount',
      render: (_: any, record: Order) => (
        <Space direction="vertical" size={0}>
          <Text strong style={{ color: '#cf1322' }}>
            ¥{record.total_amount.toLocaleString()}
          </Text>
          <Space>
            <PercentageOutlined style={{ color: '#fa8c16' }} />
            <Text type="secondary" style={{ fontSize: 12 }}>
              佣金: ¥{record.commission_amount.toLocaleString()} ({record.commission_rate}%)
            </Text>
          </Space>
        </Space>
      )
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => getStatusTag(status)
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_: any, record: Order) => (
        <Space>
          <Button 
            type="link" 
            size="small"
            onClick={() => {
              setSelectedOrder(record);
              setDetailVisible(true);
            }}
          >
            详情
          </Button>
          {record.status === 'paid' && (
            <Button 
              type="link" 
              size="small"
              onClick={() => handleStatusChange(record.order_id, 'checked_in')}
            >
              核销
            </Button>
          )}
          {record.status === 'unpaid' && (
            <Button 
              type="link" 
              size="small" 
              danger
              onClick={() => handleStatusChange(record.order_id, 'cancelled')}
            >
              取消
            </Button>
          )}
        </Space>
      )
    }
  ];

  return (
    <div style={{ padding: '24px' }}>
      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card>
            <Statistic 
              title="今日新订单" 
              value={stats.todayOrders} 
              suffix="单"
              valueStyle={{ color: '#1890ff' }}
            />
            <div style={{ marginTop: 8, fontSize: 12, color: '#999' }}>
              今日下单数量
            </div>
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic 
              title="今日入住" 
              value={stats.todayCheckIns || 0} 
              suffix="单"
              valueStyle={{ color: '#52c41a' }}
            />
            <div style={{ marginTop: 8, fontSize: 12, color: '#999' }}>
              今日预计入住
            </div>
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic 
              title="待处理订单" 
              value={stats.pendingOrders} 
              suffix="单"
              valueStyle={{ color: '#fa8c16' }}
            />
            <div style={{ marginTop: 8, fontSize: 12, color: '#999' }}>
              待付款: {stats.orderStatusCount.unpaid} | 待入住: {stats.orderStatusCount.paid}
            </div>
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic 
              title="本月收入" 
              value={stats.monthlyRevenue} 
              precision={2}
              prefix="¥"
              valueStyle={{ color: '#cf1322' }}
            />
            <div style={{ marginTop: 8, fontSize: 12, color: '#999' }}>
              今日收入: ¥{stats.todayRevenue?.toFixed(2) || '0.00'}
            </div>
          </Card>
        </Col>
      </Row>

{/* 状态分布卡片 - 保持原样 */}
<Row gutter={16} style={{ marginBottom: 16 }}>
  <Col span={24}>
    <Card size="small">
      <Space size="large">
        <span>订单分布：</span>
        <Tag color="orange">待付款: {stats.orderStatusCount.unpaid}</Tag>
        <Tag color="blue">待入住: {stats.orderStatusCount.paid}</Tag>
        <Tag color="purple">已入住: {stats.orderStatusCount.checked_in}</Tag>
        <Tag color="green">已完成: {stats.orderStatusCount.completed}</Tag>
        <Tag color="default">已取消: {stats.orderStatusCount.cancelled}</Tag>
      </Space>
    </Card>
  </Col>
</Row>

      {/* 状态分布卡片 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={24}>
          <Card size="small">
            <Space size="large">
              <span>订单分布：</span>
              <Tag color="orange">待付款: {stats.orderStatusCount.unpaid}</Tag>
              <Tag color="blue">待入住: {stats.orderStatusCount.paid}</Tag>
              <Tag color="purple">已入住: {stats.orderStatusCount.checked_in}</Tag>
              <Tag color="green">已完成: {stats.orderStatusCount.completed}</Tag>
              <Tag color="default">已取消: {stats.orderStatusCount.cancelled}</Tag>
            </Space>
          </Card>
        </Col>
      </Row>

      <Card
        title="订单管理"
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={fetchOrders}>
              刷新
            </Button>
            <Button icon={<ExportOutlined />} onClick={handleExport}>
              导出报表
            </Button>
          </Space>
        }
      >
        {/* 筛选栏 */}
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={4}>
            <Select
              placeholder="选择酒店"
              value={filters.hotel_id}
              onChange={val => setFilters(prev => ({ ...prev, hotel_id: val }))}
              style={{ width: '100%' }}
              allowClear
            >
              {hotels.map(hotel => (
                <Option key={hotel.hotel_id} value={hotel.hotel_id}>
                  {hotel.name_zh}
                </Option>
              ))}
            </Select>
          </Col>
          <Col span={5}>
            <Input
              placeholder="订单号/客户名/手机号"
              value={filters.keyword}
              onChange={e => setFilters(prev => ({ ...prev, keyword: e.target.value }))}
              prefix={<SearchOutlined />}
              allowClear
            />
          </Col>
          <Col span={3}>
            <Select
              placeholder="订单状态"
              value={filters.status}
              onChange={val => setFilters(prev => ({ ...prev, status: val }))}
              style={{ width: '100%' }}
              allowClear
            >
              <Option value="all">全部状态</Option>
              {Object.entries(STATUS_MAP).map(([key, { text }]) => (
                <Option key={key} value={key}>{text}</Option>
              ))}
            </Select>
          </Col>
          <Col span={8}>
            <RangePicker 
              style={{ width: '100%' }}
              placeholder={['开始日期', '结束日期']}
              onChange={dates => setFilters(prev => ({ ...prev, dateRange: dates as any }))}
            />
          </Col>
          <Col span={4}>
            <Button 
              type="primary" 
              onClick={() => {
                setPagination(prev => ({ ...prev, current: 1 }));
                fetchOrders();
              }}
              block
            >
              查询
            </Button>
          </Col>
        </Row>

        <Table
          columns={columns}
          dataSource={orders}
          rowKey="order_id"
          loading={loading}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条记录`
          }}
          onChange={(pagination) => setPagination({
            current: pagination.current || 1,
            pageSize: pagination.pageSize || 10,
            total: pagination.total || 0
          })}
        />
      </Card>

      {/* 订单详情弹窗 */}
      <Modal
        title={`订单详情 - ${selectedOrder?.order_no}`}
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        width={700}
        footer={[
          <Button key="print" icon={<PrinterOutlined />} onClick={() => window.print()}>
            打印
          </Button>,
          selectedOrder?.status === 'paid' && (
            <Button 
              key="checkin" 
              type="primary"
              onClick={() => {
                handleStatusChange(selectedOrder.order_id, 'checked_in');
                setDetailVisible(false);
              }}
            >
              确认入住
            </Button>
          ),
          selectedOrder?.status === 'unpaid' && (
            <Button 
              key="cancel" 
              danger
              onClick={() => {
                handleStatusChange(selectedOrder.order_id, 'cancelled');
                setDetailVisible(false);
              }}
            >
              取消订单
            </Button>
          ),
          <Button key="close" onClick={() => setDetailVisible(false)}>
            关闭
          </Button>
        ].filter(Boolean)}
      >
        {selectedOrder && (
          <Descriptions bordered column={2}>
            <Descriptions.Item label="订单状态" span={2}>
              {getStatusTag(selectedOrder.status)}
            </Descriptions.Item>
            
            <Descriptions.Item label="酒店名称">
              {selectedOrder.hotel_name || `ID: ${selectedOrder.hotel_id}`}
            </Descriptions.Item>
            <Descriptions.Item label="房型">
              {selectedOrder.room_type_name || `ID: ${selectedOrder.room_type_id}`}
            </Descriptions.Item>
            
            <Descriptions.Item label="入住日期">
              {dayjs(selectedOrder.check_in_date).format('YYYY-MM-DD')}
            </Descriptions.Item>
            <Descriptions.Item label="离店日期">
              {dayjs(selectedOrder.check_out_date).format('YYYY-MM-DD')}
            </Descriptions.Item>
            
            <Descriptions.Item label="入住天数">
              {calculateNights(selectedOrder.check_in_date, selectedOrder.check_out_date)}晚
            </Descriptions.Item>
            <Descriptions.Item label="房间数量">{selectedOrder.rooms}间</Descriptions.Item>
            
            <Descriptions.Item label="入住人数">
              {selectedOrder.adults}成人 {selectedOrder.children > 0 ? ` + ${selectedOrder.children}儿童` : ''}
            </Descriptions.Item>
            <Descriptions.Item label="客户姓名">
              {selectedOrder.username || `用户ID: ${selectedOrder.user_id}`}
            </Descriptions.Item>
            
            <Descriptions.Item label="联系电话">
              {selectedOrder.phone || '-'}
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
            <Descriptions.Item label="下单时间">
              {dayjs(selectedOrder.created_at).format('YYYY-MM-DD HH:mm:ss')}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
};

export default MerchantOrders;