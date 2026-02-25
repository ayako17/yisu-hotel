// src/pages/admin/audit/AdAudit.tsx
import React, { useState, useEffect } from 'react';
import { 
  Table, Tag, Space, Button, Card, Form, Input, Select, 
  Modal, Typography, message, Image, Descriptions, Statistic, Row, Col,
  Badge, Divider} from 'antd';
import { 
  SearchOutlined, ReloadOutlined, 
  EyeOutlined, PictureOutlined, CalendarOutlined} from '@ant-design/icons';
import axios from '../../../services/axios';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

// 定义广告审核记录类型 (对应 ad_orders 表)
interface AdAuditRecord {
  ad_order_id: number;
  order_no: string;
  hotel_id: number;
  hotel_name: string;
  merchant_id: number;
  merchant_name: string;
  image_url: string;
  start_date: string;
  end_date: string;
  total_amount: number;
  unit_price: number;
  audit_status: 'pending' | 'approved' | 'rejected';
  payment_status: 'paid' | 'unpaid' | 'refunded';
  rejection_reason?: string;
  created_at: string;
  rule_price?: number;
  min_days?: number;
  max_days?: number;
}

interface AdStats {
  todayCount: number;
  pendingCount: number;
  activeCount: number;
  totalRevenue: number;
}

const AdAudit: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<AdAuditRecord | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const [data, setData] = useState<AdAuditRecord[]>([]);
  const [stats, setStats] = useState<AdStats>({
    todayCount: 0,
    pendingCount: 0,
    activeCount: 0,
    totalRevenue: 0
  });
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [searchForm] = Form.useForm();

  // 获取统计数据
  const fetchStats = async () => {
    try {
      const res = await axios.get('/admin/ads/orders/stats');
      if (res.data.code === 200) {
        setStats(res.data.data);
      }
    } catch (error) {
      console.error('获取统计数据失败:', error);
    }
  };

  // 获取广告订单列表
const fetchOrders = async (page = 1, pageSize = 10) => {
  setTableLoading(true);
  try {
    const values = await searchForm.validateFields().catch(() => ({}));
    
    const params: any = {
      page,
      pageSize,
    };
    
    // 只有当 status 有值且不是 'all' 时才传递
    if (values.status && values.status !== 'all') {
      params.status = values.status;
    }
    
    // 只有当 hotel_name 有值时才传递
    if (values.hotel_name && values.hotel_name.trim() !== '') {
      params.hotel_name = values.hotel_name.trim();
    }

    console.log('请求参数:', params);

    const res = await axios.get('/admin/ads/orders', { params });
    console.log('响应数据:', res.data);
    
    if (res.data.code === 200) {
      setData(res.data.data || []);
      setPagination({
        current: res.data.page || page,
        pageSize: res.data.pageSize || pageSize,
        total: res.data.total || 0
      });
    }
  } catch (error) {
    console.error('获取广告订单失败:', error);
    message.error('获取广告订单失败');
  } finally {
    setTableLoading(false);
  }
};

  useEffect(() => {
    fetchStats();
    fetchOrders();
  }, []);

  // 审批操作
  const handleAudit = async (action: 'approved' | 'rejected') => {
    if (action === 'rejected' && !rejectReason) {
      return message.warning('请填写驳回具体原因！');
    }
    
    if (!selectedRecord) return;
    
    setLoading(true);
    try {
      const res = await axios.post(`/admin/ads/orders/${selectedRecord.ad_order_id}/audit`, {
        audit_status: action,
        rejection_reason: rejectReason
      });

      if (res.data.code === 200) {
        message.success(res.data.msg);
        setIsModalOpen(false);
        setRejectReason('');
        fetchStats();
        fetchOrders(pagination.current, pagination.pageSize);
      }
    } catch (error: any) {
      message.error(error.response?.data?.msg || '操作失败');
    } finally {
      setLoading(false);
    }
  };

  // 表格列定义
  const columns = [
    {
      title: '订单编号',
      dataIndex: 'order_no',
      key: 'order_no',
      width: 180,
      render: (text: string) => <Text copyable>{text}</Text>
    },
    {
      title: '申请酒店',
      dataIndex: 'hotel_name',
      key: 'hotel_name',
      render: (text: string) => <Text strong>{text}</Text>
    },
    {
      title: '商户',
      dataIndex: 'merchant_name',
      key: 'merchant_name',
    },
    {
      title: '广告素材',
      dataIndex: 'image_url',
      key: 'image_url',
      width: 120,
      render: (url: string) => {
        console.log('原始图片URL:', url);
        
        // 如果URL为空或未定义，显示占位图
        if (!url) {
          return (
            <div style={{ 
              width: 100, 
              height: 30, 
              background: '#f5f5f5', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              borderRadius: 2,
              color: '#999',
              fontSize: 12
            }}>
              暂无图片
            </div>
          );
        }
        
        // 构建完整URL
        let fullUrl = url;
        if (url.startsWith('/uploads')) {
          fullUrl = `http://localhost:3000${url}`;
        } else if (!url.startsWith('http')) {
          fullUrl = `http://localhost:3000/uploads/${url}`;
        }
        
        console.log('完整图片URL:', fullUrl);
        
        return (
          <Image 
            src={fullUrl} 
            width={100} 
            height={30} 
            style={{ objectFit: 'cover', borderRadius: 2 }}
            fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMIAAADDCAYAAADQvc6UAAABRWlDQ1BJQ0MgUHJvZmlsZQAAKJFjYGASSSwoyGFhYGDIzSspCnJ3UoiIjFJgf8LAwSDCIMogwMCcmFxc4BgQ4ANUwgCjUcG3awyMIPqyLsis7PPOq3QdDFcvjV3jOD1boQVTPQrgSkktTgbSf4A4LbmgqISBgTEFyFYuLykAsTuAbJEioKOA7DkgdjqEvQHEToKwj4DVhAQ5A9k3gGyB5IxEoBmML4BsnSQk8XQkNtReEOBxcfXxUQg1Mjc0dyHgXNJBSWpFCYh2zi+oLMpMzyhRcASGUqqCZ16yno6CkYGRAQMDKMwhqj/fAIcloxgHQqxAjIHBEugw5sUIsSQpBobtQPdLciLEVJYzMPBHMDBsayhILEqEO4DxG0txmrERhM29nYGBddr//5/DGRjYNRkY/l7////39v///y4Dmn+LgeHgA+Q3kwWuaTFhcAAAAHiczVJbS8JAEH6NpZKlYAmeriIRRBVEERVIvRfdRVEK0oItRJEEQQUVU9N/q7O5uRvPiLgR9mZ2d+XZmvm9GVpIldDwSqSoVjapulEiqXFEjHhuI5+e3yfnUsh28hEmsEkhggF4q44aG2JQI2bLtGxTnuLDP5wJuXE2YZZdoJzG2Iczm4Ey5+PADLrV51UZqYhIAc+rEUXGpmSp5C7qe3PlskA+TN1VRN8lK1mM/9xXmQrivKGYRl0gOswxpgk6uKmt4Lbqy0Em+CxRsDajjWCWv4Do8Y5ePiuoovUdxsfADdXckJ6jWgIgNxEG1565DntVULddsXU/fojRBlEfvcPo6bIu138GuY1HgwyOX36JqOCQO3A9aLBogMRphRP4X2i3GQ/Yr8IPv8IEHAAJdk5BkqL5x3mFJ/9BpJh+O4Qexu9kC8R1WlR2V2Zt0QkHyixIqoJQJKiVnLKVRdEoSzW+4qUp6v2e6ZE1q5V/hhQFSfB8Bf4XhpodYA+RT7bMOZQOaPq0p/0qkJJyYcp0j2EVZ9FKunW8Q0jQAAAABJRU5ErkJggg=="
            onError={(e) => {
              console.error('图片加载失败:', fullUrl);
            }}
          />
        );
      }
    },
    {
      title: '投放周期',
      key: 'period',
      width: 150,
      render: (_: any, record: AdAuditRecord) => (
        <Space direction="vertical" size={0}>
          <Text><CalendarOutlined /> {dayjs(record.start_date).format('YYYY-MM-DD')}</Text>
          <Text><CalendarOutlined /> {dayjs(record.end_date).format('YYYY-MM-DD')}</Text>
        </Space>
      )
    },
    {
      title: '金额',
      dataIndex: 'total_amount',
      key: 'total_amount',
      width: 120,
      render: (val: number) => <Text type="danger">¥{val.toLocaleString()}</Text>
    },
    {
      title: '支付状态',
      dataIndex: 'payment_status',
      key: 'payment_status',
      width: 100,
      render: (status: string) => {
        const config = {
          paid: { color: 'success', text: '已支付' },
          unpaid: { color: 'warning', text: '未支付' },
          refunded: { color: 'default', text: '已退款' }
        }[status as 'paid' | 'unpaid' | 'refunded'];
        return <Badge status={config.color as any} text={config.text} />;
      }
    },
    {
      title: '审核状态',
      dataIndex: 'audit_status',
      key: 'audit_status',
      width: 100,
      render: (status: string) => {
        const config = {
          pending: { color: 'orange', text: '待审核' },
          approved: { color: 'green', text: '已通过' },
          rejected: { color: 'red', text: '已驳回' }
        }[status as 'pending' | 'approved' | 'rejected'];
        return <Tag color={config.color}>{config.text}</Tag>;
      }
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_: any, record: AdAuditRecord) => (
        <Button 
          type="link" 
          icon={<EyeOutlined />} 
          onClick={() => { 
            setSelectedRecord(record); 
            setIsModalOpen(true); 
            setRejectReason(record.rejection_reason || '');
          }}
        >
          审批
        </Button>
      ),
    },
  ];

  return (
    <Card bordered={false}>
      <Title level={4} style={{ marginBottom: 24 }}>广告租用审批</Title>

      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic 
              title="今日新增" 
              value={stats.todayCount} 
              suffix="单"
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic 
              title="待审核" 
              value={stats.pendingCount} 
              suffix="单"
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic 
              title="进行中" 
              value={stats.activeCount} 
              suffix="单"
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic 
              title="总收入" 
              value={stats.totalRevenue} 
              precision={2}
              prefix="¥"
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 搜索表单 */}
      <Form 
        form={searchForm}
        layout="inline" 
        style={{ marginBottom: 24 }}
        onFinish={() => fetchOrders(1, pagination.pageSize)}
        initialValues={{ status: 'all' }} // 设置默认值为 'all'
      >
        <Form.Item name="hotel_name" label="酒店名称">
          <Input placeholder="搜索酒店" allowClear style={{ width: 180 }} />
        </Form.Item>
        <Form.Item name="status" label="审核状态" initialValue="all">
          <Select style={{ width: 120 }} allowClear>
            <Option value="all">全部</Option>
            <Option value="pending">待审核</Option>
            <Option value="approved">已通过</Option>
            <Option value="rejected">已驳回</Option>
          </Select>
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" icon={<SearchOutlined />}>
            查询
          </Button>
          <Button 
            style={{ marginLeft: 8 }} 
            icon={<ReloadOutlined />}
            onClick={() => {
              searchForm.resetFields();
              fetchOrders(1, pagination.pageSize);
            }}
          >
            重置
          </Button>
        </Form.Item>
      </Form>

      {/* 表格 */}
      <Table 
        columns={columns} 
        dataSource={data} 
        rowKey="ad_order_id"
        loading={tableLoading}
        pagination={{
          ...pagination,
          showSizeChanger: true,
          showTotal: (total) => `共 ${total} 条记录`,
          onChange: (page, pageSize) => fetchOrders(page, pageSize)
        }}
        scroll={{ x: 1200 }}
      />

      {/* 审核弹窗 */}
      <Modal
        title="广告位素材及周期审批"
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        width={900}
        footer={[
          <Button key="back" onClick={() => setIsModalOpen(false)}>
            取消
          </Button>,
          <Button 
            key="re" 
            danger 
            onClick={() => handleAudit('rejected')} 
            loading={loading}
            disabled={selectedRecord?.audit_status !== 'pending'}
          >
            驳回素材
          </Button>,
          <Button 
            key="ok" 
            type="primary" 
            onClick={() => handleAudit('approved')} 
            loading={loading}
            disabled={selectedRecord?.audit_status !== 'pending'}
          >
            通过并排期
          </Button>,
        ]}
      >
        {selectedRecord && (
          <div style={{ marginTop: 20 }}>
            <Row gutter={24}>
              <Col span={16}>
                <Descriptions title="投放明细" bordered column={1} size="small">
                  <Descriptions.Item label="关联酒店">{selectedRecord.hotel_name}</Descriptions.Item>
                  <Descriptions.Item label="商户名称">{selectedRecord.merchant_name}</Descriptions.Item>
                  <Descriptions.Item label="订单编号">{selectedRecord.order_no}</Descriptions.Item>
                  <Descriptions.Item label="投放周期">
                    <Text strong>{dayjs(selectedRecord.start_date).format('YYYY-MM-DD')}</Text> 至 <Text strong>{dayjs(selectedRecord.end_date).format('YYYY-MM-DD')}</Text>
                    <div>共 {dayjs(selectedRecord.end_date).diff(dayjs(selectedRecord.start_date), 'day') + 1} 天</div>
                  </Descriptions.Item>
                  <Descriptions.Item label="支付状态">
                    <Badge 
                      status={
                        selectedRecord.payment_status === 'paid' ? 'success' : 
                        selectedRecord.payment_status === 'unpaid' ? 'warning' : 'default'
                      } 
                      text={
                        selectedRecord.payment_status === 'paid' ? '已支付' : 
                        selectedRecord.payment_status === 'unpaid' ? '未支付' : '已退款'
                      } 
                    />
                  </Descriptions.Item>
                  {selectedRecord.audit_status === 'rejected' && selectedRecord.rejection_reason && (
                    <Descriptions.Item label="驳回原因">
                      <Text type="danger">{selectedRecord.rejection_reason}</Text>
                    </Descriptions.Item>
                  )}
                </Descriptions>
              </Col>
              <Col span={8}>
                <Card size="small" title="金额核算" style={{ background: '#fafafa' }}>
                  <Statistic 
                    title="单价 (元/天)" 
                    value={selectedRecord.unit_price} 
                    prefix="¥" 
                  />
                  <Divider style={{ margin: '12px 0' }} />
                  <Statistic 
                    title="订单总额" 
                    value={selectedRecord.total_amount} 
                    precision={2} 
                    prefix="¥" 
                    valueStyle={{ color: '#cf1322', fontSize: 24 }} 
                  />
                </Card>
              </Col>
            </Row>

            <div style={{ marginTop: 24 }}>
              <Divider>
                <PictureOutlined /> 广告 Banner 素材预览
              </Divider>
              <div style={{ textAlign: 'center', background: '#f0f2f5', padding: '20px', borderRadius: '8px' }}>
                <Image 
                  src={selectedRecord.image_url} 
                  alt="广告素材" 
                  style={{ maxWidth: '100%', maxHeight: 200, objectFit: 'contain' }}
                  fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMIAAADDCAYAAADQvc6UAAABRWlDQ1BJQ0MgUHJvZmlsZQAAKJFjYGASSSwoyGFhYGDIzSspCnJ3UoiIjFJgf8LAwSDCIMogwMCcmFxc4BgQ4ANUwgCjUcG3awyMIPqyLsis7PPOq3QdDFcvjV3jOD1boQVTPQrgSkktTgbSf4A4LbmgqISBgTEFyFYuLykAsTuAbJEioKOA7DkgdjqEvQHEToKwj4DVhAQ5A9k3gGyB5IxEoBmML4BsnSQk8XQkNtReEOBxcfXxUQg1Mjc0dyHgXNJBSWpFCYh2zi+oLMpMzyhRcASGUqqCZ16yno6CkYGRAQMDKMwhqj/fAIcloxgHQqxAjIHBEugw5sUIsSQpBobtQPdLciLEVJYzMPBHMDBsayhILEqEO4DxG0txmrERhM29nYGBddr//5/DGRjYNRkY/l7////39v///y4Dmn+LgeHgA+Q3kwWuaTFhcAAAAHiczVJbS8JAEH6NpZKlYAmeriIRRBVEERVIvRfdRVEK0oItRJEEQQUVU9N/q7O5uRvPiLgR9mZ2d+XZmvm9GVpIldDwSqSoVjapulEiqXFEjHhuI5+e3yfnUsh28hEmsEkhggF4q44aG2JQI2bLtGxTnuLDP5wJuXE2YZZdoJzG2Iczm4Ey5+PADLrV51UZqYhIAc+rEUXGpmSp5C7qe3PlskA+TN1VRN8lK1mM/9xXmQrivKGYRl0gOswxpgk6uKmt4Lbqy0Em+CxRsDajjWCWv4Do8Y5ePiuoovUdxsfADdXckJ6jWgIgNxEG1565DntVULddsXU/fojRBlEfvcPo6bIu138GuY1HgwyOX36JqOCQO3A9aLBogMRphRP4X2i3GQ/Yr8IPv8IEHAAJdk5BkqL5x3mFJ/9BpJh+O4Qexu9kC8R1WlR2V2Zt0QkHyixIqoJQJKiVnLKVRdEoSzW+4qUp6v2e6ZE1q5V/hhQFSfB8Bf4XhpodYA+RT7bMOZQOaPq0p/0qkJJyYcp0j2EVZ9FKunW8Q0jQAAAABJRU5ErkJggg=="
                />
                <div style={{ marginTop: 10 }}>
                  <Text type="secondary">请检查图片是否清晰、无违规内容、无侵权标志</Text>
                </div>
              </div>
            </div>

            {selectedRecord.audit_status === 'pending' && (
              <div style={{ marginTop: 24 }}>
                <Text type="secondary">驳回理由 (若素材不合规)：</Text>
                <TextArea 
                  rows={3} 
                  placeholder="例如：图片分辨率过低、文字包含敏感词、尺寸不符合规范等..." 
                  style={{ marginTop: 8 }} 
                  value={rejectReason} 
                  onChange={e => setRejectReason(e.target.value)} 
                />
              </div>
            )}
          </div>
        )}
      </Modal>
    </Card>
  );
};

export default AdAudit;