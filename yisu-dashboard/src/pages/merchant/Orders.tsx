import React, { useEffect, useState } from 'react';
import {
  Card, Table, Tag, Space, Button, message, Select,
  Input, DatePicker, Modal, Descriptions, Statistic,
  Row, Col, Tabs, Badge, Tooltip
} from 'antd';
import {
  SearchOutlined,
  ReloadOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  PrinterOutlined,
  ExportOutlined
} from '@ant-design/icons';
import axios from '../../services/axios';
import dayjs from 'dayjs';

const { Option } = Select;
const { RangePicker } = DatePicker;
const { TabPane } = Tabs;

interface Order {
  order_id: number;
  order_no: string;
  hotel_name: string;
  room_type_name: string;
  guest_name: string;
  guest_phone: string;
  check_in_date: string;
  check_out_date: string;
  nights: number;
  rooms: number;
  total_amount: number;
  status: 'unpaid' | 'paid' | 'checked_in' | 'completed' | 'cancelled' | 'refunding';
  source: 'ota' | 'official' | 'phone';
  created_at: string;
  payment_method?: string;
  remark?: string;
}

const STATUS_MAP: Record<string, { text: string; color: string }> = {
  'unpaid': { text: '待付款', color: 'orange' },
  'paid': { text: '待入住', color: 'blue' },
  'checked_in': { text: '已入住', color: 'purple' },
  'completed': { text: '已完成', color: 'green' },
  'cancelled': { text: '已取消', color: 'default' },
  'refunding': { text: '退款中', color: 'red' }
};

const SOURCE_MAP: Record<string, string> = {
  'ota': 'OTA平台',
  'official': '官网直订',
  'phone': '电话预订'
};

const MerchantOrders: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  });
  const [filters, setFilters] = useState({
    keyword: '',
    status: 'all',
    source: 'all',
    dateRange: null as [dayjs.Dayjs, dayjs.Dayjs] | null
  });
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [stats, setStats] = useState({
    today: 0,
    pending: 0,
    revenue: 0
  });

  useEffect(() => {
    fetchOrders();
    fetchStats();
  }, [pagination.current, pagination.pageSize, filters]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params: any = {
        page: pagination.current,
        page_size: pagination.pageSize
      };
      
      if (filters.keyword) params.keyword = filters.keyword;
      if (filters.status !== 'all') params.status = filters.status;
      if (filters.source !== 'all') params.source = filters.source;
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
          const res = await axios.post('/merchant/orders/batch-check-in');
          if (res.data.code === 200) {
            message.success(`成功核销 ${res.data.data.count} 个订单`);
            fetchOrders();
            fetchStats();
          }
        } catch (error) {
          message.error('批量核销失败');
        }
      }
    });
  };

  const handleExport = () => {
    window.open(`/api/merchant/orders/export?${new URLSearchParams({
      token: localStorage.getItem('token') || ''
    })}`, '_blank');
  };

  const columns = [
    {
      title: '订单号',
      dataIndex: 'order_no',
      key: 'order_no',
      width: 180,
      render: (text: string, record: Order) => (
        <Space direction="vertical" size={0}>
          <span>{text}</span>
          <span style={{ fontSize: 12, color: '#999' }}>
            {dayjs(record.created_at).format('MM-DD HH:mm')}
          </span>
        </Space>
      )
    },
    {
      title: '酒店/房型',
      key: 'hotel',
      render: (_: any, record: Order) => (
        <Space direction="vertical" size={0}>
          <span>{record.hotel_name}</span>
          <span style={{ fontSize: 12, color: '#666' }}>{record.room_type_name}</span>
        </Space>
      )
    },
    {
      title: '客人信息',
      key: 'guest',
      render: (_: any, record: Order) => (
        <Space direction="vertical" size={0}>
          <span>{record.guest_name}</span>
          <span style={{ fontSize: 12, color: '#999' }}>{record.guest_phone}</span>
        </Space>
      )
    },
    {
      title: '入住信息',
      key: 'dates',
      render: (_: any, record: Order) => (
        <Space direction="vertical" size={0}>
          <span>{record.check_in_date} 入住</span>
          <span>{record.check_out_date} 离店</span>
          <span style={{ fontSize: 12, color: '#999' }}>
            {record.nights}晚 {record.rooms}间
          </span>
        </Space>
      )
    },
    {
      title: '金额',
      dataIndex: 'total_amount',
      key: 'total_amount',
      render: (amount: number) => `¥${amount.toFixed(2)}`
    },
    {
      title: '来源',
      dataIndex: 'source',
      key: 'source',
      render: (source: string) => SOURCE_MAP[source] || source
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={STATUS_MAP[status]?.color}>
          {STATUS_MAP[status]?.text || status}
        </Tag>
      )
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
    <div>
      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card>
            <Statistic 
              title="今日订单" 
              value={stats.today} 
              suffix="单"
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic 
              title="待处理订单" 
              value={stats.pending} 
              suffix="单"
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic 
              title="今日收入" 
              value={stats.revenue} 
              precision={2}
              prefix="¥"
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Button 
              type="primary" 
              icon={<CheckCircleOutlined />}
              onClick={handleBatchCheckIn}
              block
            >
              批量核销
            </Button>
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
          <Col span={6}>
            <Input
              placeholder="订单号/客人姓名/手机号"
              value={filters.keyword}
              onChange={e => setFilters(prev => ({ ...prev, keyword: e.target.value }))}
              prefix={<SearchOutlined />}
              allowClear
            />
          </Col>
          <Col span={4}>
            <Select
              placeholder="订单状态"
              value={filters.status}
              onChange={val => setFilters(prev => ({ ...prev, status: val }))}
              style={{ width: '100%' }}
            >
              <Option value="all">全部状态</Option>
              {Object.entries(STATUS_MAP).map(([key, { text }]) => (
                <Option key={key} value={key}>{text}</Option>
              ))}
            </Select>
          </Col>
          <Col span={4}>
            <Select
              placeholder="订单来源"
              value={filters.source}
              onChange={val => setFilters(prev => ({ ...prev, source: val }))}
              style={{ width: '100%' }}
            >
              <Option value="all">全部来源</Option>
              <Option value="ota">OTA平台</Option>
              <Option value="official">官网直订</Option>
              <Option value="phone">电话预订</Option>
            </Select>
          </Col>
          <Col span={8}>
            <RangePicker 
              style={{ width: '100%' }}
              placeholder={['开始日期', '结束日期']}
              onChange={dates => setFilters(prev => ({ ...prev, dateRange: dates as any }))}
            />
          </Col>
          <Col span={2}>
            <Button type="primary" onClick={() => setPagination(prev => ({ ...prev, current: 1 }))}>
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
          <Button key="print" icon={<PrinterOutlined />}>
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
        ]}
      >
        {selectedOrder && (
          <Descriptions bordered column={2}>
            <Descriptions.Item label="订单状态" span={2}>
              <Tag color={STATUS_MAP[selectedOrder.status]?.color}>
                {STATUS_MAP[selectedOrder.status]?.text}
              </Tag>
            </Descriptions.Item>
            
            <Descriptions.Item label="酒店名称">{selectedOrder.hotel_name}</Descriptions.Item>
            <Descriptions.Item label="房型">{selectedOrder.room_type_name}</Descriptions.Item>
            
            <Descriptions.Item label="入住日期">{selectedOrder.check_in_date}</Descriptions.Item>
            <Descriptions.Item label="离店日期">{selectedOrder.check_out_date}</Descriptions.Item>
            
            <Descriptions.Item label="入住天数">{selectedOrder.nights}晚</Descriptions.Item>
            <Descriptions.Item label="房间数量">{selectedOrder.rooms}间</Descriptions.Item>
            
            <Descriptions.Item label="客人姓名">{selectedOrder.guest_name}</Descriptions.Item>
            <Descriptions.Item label="联系电话">{selectedOrder.guest_phone}</Descriptions.Item>
            
            <Descriptions.Item label="订单金额" span={2}>
              <span style={{ color: '#ff4d4f', fontSize: 16, fontWeight: 'bold' }}>
                ¥{selectedOrder.total_amount.toFixed(2)}
              </span>
            </Descriptions.Item>
            
            <Descriptions.Item label="支付方式">{selectedOrder.payment_method || '-'}</Descriptions.Item>
            <Descriptions.Item label="订单来源">{SOURCE_MAP[selectedOrder.source]}</Descriptions.Item>
            
            <Descriptions.Item label="下单时间" span={2}>
              {dayjs(selectedOrder.created_at).format('YYYY-MM-DD HH:mm:ss')}
            </Descriptions.Item>
            
            {selectedOrder.remark && (
              <Descriptions.Item label="备注" span={2}>
                {selectedOrder.remark}
              </Descriptions.Item>
            )}
          </Descriptions>
        )}
      </Modal>
    </div>
  );
};

export default MerchantOrders;