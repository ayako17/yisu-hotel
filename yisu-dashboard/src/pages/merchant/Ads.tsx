// yisu-dashboard/src/pages/merchant/Ads.tsx
import React, { useEffect, useState } from 'react';
import {
  Card, Row, Col, Button, Statistic, Space, message, Modal,
  Form, Select, DatePicker, Upload, Image, Tabs,
  Table, Tag, Tooltip, Divider, Badge, Alert,
  Input, Typography
} from 'antd';
import {
  DollarOutlined,
  RiseOutlined,
  CalendarOutlined,
  PictureOutlined,
  PlusOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  WarningOutlined,
  InfoCircleOutlined,
  FileTextOutlined,
  UploadOutlined,
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

const RuleCard = styled(Card)<{ selected?: boolean }>`
  border-radius: 12px;
  border: 1px solid ${props => props.selected ? '#667eea' : '#f0f0f0'};
  transition: all 0.3s ease;
  cursor: pointer;
  background: ${props => props.selected ? '#f0f5ff' : 'white'};
  margin-bottom: 12px;
  
  &:hover {
    border-color: #667eea;
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.1);
  }
`;

interface Hotel {
  hotel_id: number;
  name_zh: string;
  status: string;
}

interface AdRule {
  rule_id: number;
  price: number;
  start_date: string;
  end_date: string | null;
  min_days: number;
  max_days: number;
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

const MerchantAds: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [balance, setBalance] = useState(12480);
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [adRules, setAdRules] = useState<AdRule[]>([]);
  const [selectedRule, setSelectedRule] = useState<AdRule | null>(null);
  const [orders, setOrders] = useState<AdOrder[]>([]);
  const [form] = Form.useForm();
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

      // 获取所有广告规则
      const ruleRes = await axios.get('/admin/ads/rules');
      if (ruleRes.data.code === 200) {
        const rules = ruleRes.data.data || [];
        setAdRules(rules);
        
        // 默认选中第一个规则
        if (rules.length > 0) {
          setSelectedRule(rules[0]);
        }
      }

      // 获取余额
      const balanceRes = await axios.get('/merchant/ads/balance');
      if (balanceRes.data.code === 200) {
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
    } finally {
      setLoading(false);
    }
  };

// 提交创建广告
const handleCreatePromotion = async (values: any) => {
  if (!selectedRule) {
    message.warning('请先选择广告规则');
    return;
  }

  const dates = values.date_range;
  const startDate = dates[0].format('YYYY-MM-DD');
  const endDate = dates[1].format('YYYY-MM-DD');
  const days = dates[1].diff(dates[0], 'day') + 1;

  // 处理规则日期（只取 YYYY-MM-DD 部分）
  const ruleStart = selectedRule.start_date.split('T')[0];
  const ruleEnd = selectedRule.end_date ? selectedRule.end_date.split('T')[0] : null;

  // 检查投放日期是否在规则生效期内
  if (startDate < ruleStart) {
    message.error(`投放开始日期不能早于规则生效日期：${ruleStart}`);
    return;
  }
  
  if (ruleEnd && endDate > ruleEnd) {
    message.error(`投放结束日期不能晚于规则失效日期：${ruleEnd}`);
    return;
  }

  // 检查最小/最大投放天数
  if (days < selectedRule.min_days) {
    message.error(`最少需要投放 ${selectedRule.min_days} 天`);
    return;
  }
  if (days > selectedRule.max_days) {
    message.error(`最多只能投放 ${selectedRule.max_days} 天`);
    return;
  }

  setLoading(true);
  try {
    const res = await axios.post('/merchant/ads/promotion', {
      hotel_id: values.hotel_id,
      rule_id: selectedRule.rule_id,
      start_date: startDate,
      days: days,
      image_url: values.image_url
    });

    if (res.data.code === 200) {
      message.success({
        content: '推广活动创建成功，已提交审核',
        icon: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
        duration: 3
      });
      
      // 清空表单
      form.resetFields();
      form.setFieldValue('image_url', undefined);
      
      // 重置选中的规则
      if (adRules.length > 0) {
        setSelectedRule(adRules[0]);
      }
      
      // 刷新订单列表
      fetchDashboardData();
    }
  } catch (error: any) {
    message.error(error.response?.data?.msg || '创建失败');
  } finally {
    setLoading(false);
  }
};

  // 处理图片上传
  const handleUploadImage = async (options: any) => {
    const { file, onSuccess, onError } = options;
    
    if (!file.type.startsWith('image/')) {
      onError(new Error('只支持图片文件'));
      message.error('只支持图片文件');
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
      onError(new Error('文件不能超过5MB'));
      message.error('文件不能超过5MB');
      return;
    }
    
    setUploading(true);
    
    // 立即显示本地预览
    const localPreviewUrl = URL.createObjectURL(file);
    form.setFieldValue('image_url', localPreviewUrl);
    
    const reader = new FileReader();
    reader.readAsDataURL(file);
    
    reader.onload = async () => {
      try {
        const base64 = reader.result as string;
        
        const res = await axios.post('/merchant/upload', {
          base64: base64,
          filename: file.name
        });
        
        if (res.data.code === 200) {
          const response = {
            url: res.data.relativeUrl || res.data.url,
            ...res.data
          };
          
          onSuccess(response, file);
          
          const serverUrl = res.data.relativeUrl || res.data.url;
          form.setFieldValue('image_url', serverUrl);
          
          URL.revokeObjectURL(localPreviewUrl);
          
          message.success('图片上传成功');
        } else {
          onError(new Error(res.data.msg || '上传失败'));
          message.error(res.data.msg || '上传失败');
          form.setFieldValue('image_url', undefined);
        }
      } catch (error: any) {
        console.error('上传错误:', error);
        onError(error);
        message.error(error.response?.data?.msg || '上传失败');
        form.setFieldValue('image_url', undefined);
      } finally {
        setUploading(false);
      }
    };
    
    reader.onerror = (error) => {
      console.error('文件读取错误:', error);
      onError(error);
      message.error('文件读取失败');
      form.setFieldValue('image_url', undefined);
      setUploading(false);
      URL.revokeObjectURL(localPreviewUrl);
    };
  };

  // 选择规则
  const handleSelectRule = (rule: AdRule) => {
    setSelectedRule(rule);
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
          src={url || 'https://via.placeholder.com/80x30?text=No+Image'} 
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
                {/* 广告规则选择 */}
                {adRules.length > 0 && (
                  <Card 
                    title="选择广告规则" 
                    size="small" 
                    style={{ marginBottom: 24 }}
                    extra={
                      <Tag color="blue">当前规则数量: {adRules.length}</Tag>
                    }
                  >
                    <Row gutter={16}>
                      {adRules.map(rule => {
                        const now = dayjs().format('YYYY-MM-DD');
                        const ruleStart = rule.start_date.split('T')[0];
                        const ruleEnd = rule.end_date ? rule.end_date.split('T')[0] : null;
                        const isActive = ruleStart <= now && (!ruleEnd || ruleEnd >= now);
                        
                        return (
                          <Col span={24} key={rule.rule_id}>
                            <RuleCard
                              selected={selectedRule?.rule_id === rule.rule_id}
                              onClick={() => handleSelectRule(rule)}
                              size="small"
                            >
                              <Row align="middle" justify="space-between">
                                <Col span={8}>
                                  <Space>
                                    <DollarOutlined style={{ color: '#52c41a' }} />
                                    <Text strong style={{ fontSize: 16, color: '#52c41a' }}>
                                      ¥{rule.price}
                                    </Text>
                                    <Text type="secondary">/天</Text>
                                  </Space>
                                </Col>
                                <Col span={8}>
                                  <Space>
                                    <CalendarOutlined />
                                    <Text>
                                      {ruleStart} 至 {ruleEnd || '永久'}
                                    </Text>
                                  </Space>
                                </Col>
                                <Col span={6}>
                                  <Tag color="processing">
                                    投放天数: {rule.min_days}-{rule.max_days}天
                                  </Tag>
                                </Col>
                                <Col span={2}>
                                  {isActive && <Badge status="processing" text="生效中" />}
                                  {selectedRule?.rule_id === rule.rule_id && (
                                    <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 20 }} />
                                  )}
                                </Col>
                              </Row>
                            </RuleCard>
                          </Col>
                        );
                      })}
                    </Row>
                  </Card>
                )}

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

                  <Form.Item
                    name="image_url"
                    label="广告素材"
                    rules={[{ required: true, message: '请上传广告图片' }]}
                  >
                    <Upload
                      name="file"
                      customRequest={handleUploadImage}
                      listType="picture-card"
                      showUploadList={false}
                      accept="image/*"
                    >
                      {form.getFieldValue('image_url') ? (
                        <div style={{ position: 'relative' }}>
                          <img 
                            src={form.getFieldValue('image_url')} 
                            alt="广告素材" 
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                          {uploading && (
                            <div style={{ 
                              position: 'absolute', 
                              top: 0, 
                              left: 0, 
                              right: 0, 
                              bottom: 0, 
                              background: 'rgba(0,0,0,0.5)', 
                              color: 'white',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}>
                              <span>上传中...</span>
                            </div>
                          )}
                          <div style={{ 
                            position: 'absolute', 
                            bottom: 0, 
                            left: 0, 
                            right: 0, 
                            background: 'rgba(0,0,0,0.5)', 
                            color: 'white',
                            padding: '4px',
                            fontSize: '12px',
                            textAlign: 'center'
                          }}>
                            点击重新上传
                          </div>
                        </div>
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
                <StyledCard title="投放说明">
                  <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                    <Alert
                      message="广告审核流程"
                      description={
                        <ol style={{ margin: 0, paddingLeft: 20 }}>
                          <li>选择广告规则（单价由管理员设置）</li>
                          <li>选择投放酒店和日期</li>
                          <li>上传广告素材</li>
                          <li>提交后等待管理员审核</li>
                          <li>审核通过后自动生效</li>
                        </ol>
                      }
                      type="info"
                      showIcon
                    />
                    
                    {selectedRule && (
                      <Alert
                        message="当前选中规则"
                        description={
                          <Space direction="vertical">
                            <Text strong>单价: ¥{selectedRule.price}/天</Text>
                            <Text>投放天数: {selectedRule.min_days} - {selectedRule.max_days} 天</Text>
                            <Text>生效日期: {selectedRule.start_date} 至 {selectedRule.end_date || '永久'}</Text>
                          </Space>
                        }
                        type="success"
                        showIcon
                      />
                    )}

                    <Alert
                      message="注意事项"
                      description={
                        <ul style={{ margin: 0, paddingLeft: 20 }}>
                          <li>广告位为首页Banner轮播</li>
                          <li>每天展示次数不限</li>
                          <li>按天计费，不足一天按一天计算</li>
                          <li>投放日期必须在所选规则的生效期内</li>
                        </ul>
                      }
                      type="warning"
                      showIcon
                    />
                  </Space>
                </StyledCard>
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
        </Tabs>
      </StyledCard>
    </div>
  );
};

export default MerchantAds;