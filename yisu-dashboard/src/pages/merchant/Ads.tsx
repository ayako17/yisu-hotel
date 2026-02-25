// yisu-dashboard/src/pages/merchant/Ads.tsx
import React, { useEffect, useState } from 'react';
import {
  Card, Row, Col, Button, Statistic, Space, message, Modal,
  Form, Select, DatePicker, InputNumber, Upload, Image, Tabs,
  Table, Tag, Tooltip, Progress, Divider, Badge, Steps, Alert,
  Input, Typography
} from 'antd';
import {
  DollarOutlined,
  RiseOutlined,
  FallOutlined,
  CalendarOutlined,
  PictureOutlined,
  PlusOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  WarningOutlined,
  InfoCircleOutlined,
  BarChartOutlined,
  FileTextOutlined,
  UploadOutlined,
  DeleteOutlined,
  EyeOutlined
} from '@ant-design/icons';
import axios from '../../services/axios';
import dayjs from 'dayjs';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';

const { Option } = Select;
const { RangePicker } = DatePicker;
const { TabPane } = Tabs;
const { Text } = Typography;  

// 样式化组件
const StyledCard = styled(Card)`
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
  
  &:hover {
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
  }
`;

const BalanceCard = styled(Card)`
  border-radius: 12px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  
  .ant-statistic-title,
  .ant-statistic-content {
    color: white;
  }
  
  .ant-btn {
    background: rgba(255, 255, 255, 0.2);
    border: none;
    color: white;
    
    &:hover {
      background: rgba(255, 255, 255, 0.3);
    }
  }
`;

const PlacementCard = styled(Card)<{ selected?: boolean }>`
  border-radius: 12px;
  border: 1px solid ${props => props.selected ? '#667eea' : '#f0f0f0'};
  transition: all 0.3s ease;
  cursor: pointer;
  background: ${props => props.selected ? 'linear-gradient(135deg, #f0f5ff 0%, #e6f7ff 100%)' : 'white'};
  
  &:hover {
    border-color: #667eea;
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(102, 126, 234, 0.15);
  }
`;

const GradientButton = styled(Button)`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  color: white;
  
  &:hover {
    background: linear-gradient(135deg, #764ba2 0%, #667eea 100%);
    color: white;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
  }
`;

interface Hotel {
  hotel_id: number;
  name_zh: string;
  status: string;
}

interface Placement {
  id: string;
  name: string;
  desc: string;
  tag: string;
  cpc: number;
}

interface AdOrder {
  ad_order_id: number;
  order_no: string;
  hotel_name: string;
  image_url: string;
  start_date: string;
  end_date: string;
  unit_price: number;
  total_amount: number;
  payment_status: 'unpaid' | 'paid' | 'refunded';
  audit_status: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string;
  created_at: string;
}

interface EffectPreview {
  ctr: number;
  estimated_impressions: number;
  estimated_visitors: number;
}

const MerchantAds: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [balance, setBalance] = useState(12480);
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [placements, setPlacements] = useState<Placement[]>([]);
  const [selectedPlacement, setSelectedPlacement] = useState<Placement | null>(null);
  const [effectPreview, setEffectPreview] = useState<EffectPreview | null>(null);
  const [orders, setOrders] = useState<AdOrder[]>([]);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [previewImage, setPreviewImage] = useState<string>('');
  const [form] = Form.useForm();
  const [currentStep, setCurrentStep] = useState(0);
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
      setHotels(hotelsRes.data.data || []);
    }

    // 获取广告位列表 - 后端直接返回数组
    const placementsRes = await axios.get('/merchant/ads/placements');
    console.log('广告位原始响应:', placementsRes.data);
    
    // 处理后端返回的数据
    if (Array.isArray(placementsRes.data)) {
      // 如果直接返回数组
      setPlacements(placementsRes.data);
    } else if (placementsRes.data.code === 200) {
      // 如果返回 { code, data }
      setPlacements(placementsRes.data.data || []);
    } else {
      // 默认数据
      setPlacements([
        { id: 'banner', name: '原生首页通栏', desc: '最高流量入口,位于App首页核心位置', tag: '高曝光', cpc: 1.2 },
        { id: 'search_top', name: '搜索结果置顶', desc: '精准锁定目标客群,转化率提升40%', tag: '高转化', cpc: 0.8 },
      ]);
    }

    // 获取余额 - 后端直接返回 { balance }
    const balanceRes = await axios.get('/merchant/ads/balance');
    console.log('余额响应:', balanceRes.data);
    if (balanceRes.data.code === 200) {
      setBalance(balanceRes.data.balance);
    } else if (balanceRes.data.balance !== undefined) {
      setBalance(balanceRes.data.balance);
    }

    // 获取广告订单
    const ordersRes = await axios.get('/merchant/ads/orders');
    if (ordersRes.data.code === 200) {
      setOrders(ordersRes.data.data || []);
    }
  } catch (error) {
    console.error('获取数据失败:', error);
    message.error('获取数据失败');
    
    // 出错时使用默认数据
    setPlacements([
      { id: 'banner', name: '原生首页通栏', desc: '最高流量入口,位于App首页核心位置', tag: '高曝光', cpc: 1.2 },
      { id: 'search_top', name: '搜索结果置顶', desc: '精准锁定目标客群,转化率提升40%', tag: '高转化', cpc: 0.8 },
    ]);
  } finally {
    setLoading(false);
  }
};

  // 选择广告位时获取效果预估
  const handleSelectPlacement = async (placement: Placement) => {
    setSelectedPlacement(placement);
    try {
      const res = await axios.get('/merchant/ads/effect-preview');
      if (res.data.code === 200) {
        setEffectPreview(res.data.data);
      }
    } catch (error) {
      console.error('获取效果预估失败:', error);
    }
  };

  // 处理图片上传
  const handleUploadImage = (info: any) => {
    if (info.file.status === 'done') {
      message.success('图片上传成功');
      form.setFieldValue('image_url', info.file.response.url);
    } else if (info.file.status === 'error') {
      message.error('图片上传失败');
    }
  };

  // 提交创建广告
  const handleCreatePromotion = async (values: any) => {
    if (!selectedPlacement) {
      message.warning('请选择广告位');
      return;
    }

    setLoading(true);
    try {
      const dates = values.date_range;
      const days = dates[1].diff(dates[0], 'day') + 1;

      const res = await axios.post('/merchant/ads/promotion', {
        hotel_id: values.hotel_id,
        placement_id: selectedPlacement.id,
        start_date: dates[0].format('YYYY-MM-DD'),
        days: days,
        daily_budget: values.daily_budget,
        image_url: values.image_url
      });

      if (res.data.code === 200) {
        message.success('推广活动创建成功，等待审核');
        setCreateModalVisible(false);
        form.resetFields();
        setSelectedPlacement(null);
        fetchDashboardData();
      }
    } catch (error: any) {
      message.error(error.response?.data?.msg || '创建失败');
    } finally {
      setLoading(false);
    }
  };

  // 获取状态标签
  const getAuditStatusTag = (status: string) => {
    const config = {
      pending: { color: 'orange', icon: <ClockCircleOutlined />, text: '待审核' },
      approved: { color: 'green', icon: <CheckCircleOutlined />, text: '已通过' },
      rejected: { color: 'red', icon: <WarningOutlined />, text: '已驳回' }
    }[status as 'pending' | 'approved' | 'rejected'];
    
    return <Tag color={config.color} icon={config.icon}>{config.text}</Tag>;
  };

  const getPaymentStatusTag = (status: string) => {
    const config = {
      unpaid: { color: 'warning', text: '未支付' },
      paid: { color: 'success', text: '已支付' },
      refunded: { color: 'default', text: '已退款' }
    }[status as 'unpaid' | 'paid' | 'refunded'];
    
    return <Badge status={config.color as any} text={config.text} />;
  };

  // 表格列定义
  const columns = [
    {
      title: '订单编号',
      dataIndex: 'order_no',
      key: 'order_no',
      render: (text: string) => <Text copyable>{text}</Text>
    },
    {
      title: '酒店',
      dataIndex: 'hotel_name',
      key: 'hotel_name',
    },
    {
      title: '广告素材',
      dataIndex: 'image_url',
      key: 'image_url',
      render: (url: string) => (
        <Image 
          src={url} 
          width={80} 
          height={30} 
          style={{ objectFit: 'cover', borderRadius: 4, cursor: 'pointer' }}
          preview={{
            mask: <EyeOutlined />,
            src: url
          }}
        />
      )
    },
    {
      title: '投放周期',
      key: 'period',
      render: (_: any, record: AdOrder) => (
        <Space direction="vertical" size={0}>
          <span>{dayjs(record.start_date).format('YYYY-MM-DD')}</span>
          <span>至</span>
          <span>{dayjs(record.end_date).format('YYYY-MM-DD')}</span>
        </Space>
      )
    },
    {
      title: '金额',
      key: 'amount',
      render: (_: any, record: AdOrder) => (
        <Space direction="vertical" size={0}>
          <span>¥{record.total_amount.toLocaleString()}</span>
          <span style={{ fontSize: 12, color: '#999' }}>
            ¥{record.unit_price}/天 × {dayjs(record.end_date).diff(dayjs(record.start_date), 'day') + 1}天
          </span>
        </Space>
      )
    },
    {
      title: '支付状态',
      dataIndex: 'payment_status',
      key: 'payment_status',
      render: (status: string) => getPaymentStatusTag(status)
    },
    {
      title: '审核状态',
      dataIndex: 'audit_status',
      key: 'audit_status',
      render: (status: string, record: AdOrder) => (
        <Tooltip title={record.rejection_reason}>
          {getAuditStatusTag(status)}
        </Tooltip>
      )
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm')
    }
  ];

  return (
    <div style={{ padding: '24px' }}>
      {/* 余额卡片 */}
      <Row gutter={24} style={{ marginBottom: 24 }}>
        <Col span={8}>
          <BalanceCard>
            <Statistic
              title="账户余额"
              value={balance}
              precision={2}
              prefix="¥"
              valueStyle={{ fontSize: 32, fontWeight: 'bold' }}
            />
            <Button 
              type="primary" 
              icon={<DollarOutlined />} 
              style={{ marginTop: 16 }}
              onClick={() => message.info('充值功能开发中')}
            >
              立即充值
            </Button>
          </BalanceCard>
        </Col>
        <Col span={16}>
          <StyledCard>
            <Row gutter={16}>
              <Col span={8}>
                <Statistic
                  title="进行中广告"
                  value={orders.filter(o => 
                    o.audit_status === 'approved' && 
                    dayjs(o.end_date).isAfter(dayjs())
                  ).length}
                  suffix="个"
                  valueStyle={{ color: '#52c41a' }}
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title="待审核"
                  value={orders.filter(o => o.audit_status === 'pending').length}
                  suffix="个"
                  valueStyle={{ color: '#fa8c16' }}
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title="总花费"
                  value={orders
                    .filter(o => o.payment_status === 'paid')
                    .reduce((sum, o) => sum + o.total_amount, 0)
                  }
                  precision={2}
                  prefix="¥"
                  valueStyle={{ color: '#f5222d' }}
                />
              </Col>
            </Row>
          </StyledCard>
        </Col>
      </Row>

      {/* 主内容 */}
      <StyledCard>
        <Tabs defaultActiveKey="create">
          <TabPane 
            tab={
              <Space>
                <PlusOutlined />
                <span>创建推广</span>
              </Space>
            } 
            key="create"
          >
            <Row gutter={24}>
              <Col span={16}>
                <Form
                  form={form}
                  layout="vertical"
                  onFinish={handleCreatePromotion}
                >
                  <Form.Item
                    name="hotel_id"
                    label="选择酒店"
                    rules={[{ required: true, message: '请选择要推广的酒店' }]}
                  >
                    <Select placeholder="请选择酒店" size="large">
                      {hotels.map(hotel => (
                        <Option key={hotel.hotel_id} value={hotel.hotel_id}>
                          {hotel.name_zh}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>

                  <Form.Item label="选择广告位" required>
                    <Row gutter={16}>
                      {placements.map(placement => (
                        <Col span={12} key={placement.id}>
                          <PlacementCard
                            selected={selectedPlacement?.id === placement.id}
                            onClick={() => handleSelectPlacement(placement)}
                          >
                            <Space direction="vertical" size="small" style={{ width: '100%' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                                <span style={{ fontWeight: 'bold', fontSize: 16 }}>
                                  {placement.name}
                                </span>
                                <Tag color={placement.tag === '高曝光' ? 'blue' : 'orange'}>
                                  {placement.tag}
                                </Tag>
                              </div>
                              <span style={{ color: '#666' }}>{placement.desc}</span>
                              <Divider style={{ margin: '8px 0' }} />
                              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                                <span>
                                  <DollarOutlined style={{ color: '#52c41a' }} />
                                  单价: ¥{placement.cpc}/天
                                </span>
                                {selectedPlacement?.id === placement.id && (
                                  <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 20 }} />
                                )}
                              </div>
                            </Space>
                          </PlacementCard>
                        </Col>
                      ))}
                    </Row>
                  </Form.Item>

                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item
                        name="date_range"
                        label="投放日期"
                        rules={[{ required: true, message: '请选择投放日期' }]}
                      >
                        <RangePicker 
                          style={{ width: '100%' }} 
                          size="large"
                          disabledDate={(current) => current && current < dayjs().startOf('day')}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item
                        name="daily_budget"
                        label="每日预算"
                        rules={[{ required: true, message: '请输入每日预算' }]}
                      >
                        <InputNumber
                          style={{ width: '100%' }}
                          min={selectedPlacement?.cpc || 0}
                          step={10}
                          prefix="¥"
                          size="large"
                        />
                      </Form.Item>
                    </Col>
                  </Row>

                  <Form.Item
                    name="image_url"
                    label="广告素材"
                    rules={[{ required: true, message: '请上传广告图片' }]}
                  >
                    <Upload
                      name="file"
                      action="/api/merchant/upload"
                      listType="picture-card"
                      showUploadList={false}
                      onChange={handleUploadImage}
                      headers={{
                        Authorization: `Bearer ${localStorage.getItem('token')}`
                      }}
                    >
                      {form.getFieldValue('image_url') ? (
                        <img 
                          src={form.getFieldValue('image_url')} 
                          alt="广告素材" 
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        <div>
                          <UploadOutlined />
                          <div style={{ marginTop: 8 }}>上传图片</div>
                        </div>
                      )}
                    </Upload>
                    <div style={{ marginTop: 8, color: '#999' }}>
                      建议尺寸 750x200，JPG/PNG，不超过2MB
                    </div>
                  </Form.Item>

                  <Form.Item>
                    <GradientButton 
                      type="primary" 
                      htmlType="submit" 
                      loading={loading}
                      size="large"
                      block
                    >
                      提交审核
                    </GradientButton>
                  </Form.Item>
                </Form>
              </Col>

              <Col span={8}>
                {selectedPlacement && effectPreview && (
                  <StyledCard title="效果预估">
                    <Statistic
                      title="预估点击率"
                      value={effectPreview.ctr}
                      suffix="%"
                      precision={1}
                    />
                    <Divider />
                    <Statistic
                      title="预估曝光"
                      value={effectPreview.estimated_impressions}
                      suffix="次"
                    />
                    <Divider />
                    <Statistic
                      title="预估访问"
                      value={effectPreview.estimated_visitors}
                      suffix="人"
                    />
                    <Divider />
                    <Alert
                      message="投放建议"
                      description={`建议至少投放7天以获得最佳效果，当前广告位单价为 ¥${selectedPlacement.cpc}/天`}
                      type="info"
                      showIcon
                    />
                  </StyledCard>
                )}
              </Col>
            </Row>
          </TabPane>

          <TabPane 
            tab={
              <Space>
                <FileTextOutlined />
                <span>我的广告</span>
              </Space>
            } 
            key="orders"
          >
            <Table
              columns={columns}
              dataSource={orders}
              rowKey="ad_order_id"
              loading={loading}
              pagination={{ pageSize: 10 }}
              scroll={{ x: 1200 }}
            />
          </TabPane>

          <TabPane 
            tab={
              <Space>
                <BarChartOutlined />
                <span>效果分析</span>
              </Space>
            } 
            key="analytics"
          >
            <Row gutter={24}>
              <Col span={12}>
                <StyledCard title="曝光趋势">
                  <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
                    功能开发中，敬请期待
                  </div>
                </StyledCard>
              </Col>
              <Col span={12}>
                <StyledCard title="点击转化">
                  <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
                    功能开发中，敬请期待
                  </div>
                </StyledCard>
              </Col>
            </Row>
          </TabPane>
        </Tabs>
      </StyledCard>
    </div>
  );
};

export default MerchantAds;