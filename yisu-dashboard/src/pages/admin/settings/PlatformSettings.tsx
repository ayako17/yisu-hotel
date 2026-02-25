// src/pages/admin/settings/PlatformSettings.tsx
import React, { useState, useEffect } from 'react';
import { 
  Card, Tabs, Form, InputNumber, DatePicker, Button, 
  Space, Table, Tag, Typography, Alert, message, Modal, 
  Row, Col, Statistic, Divider, Tooltip, Badge, Timeline
} from 'antd';
import { 
  SettingOutlined, 
  PercentageOutlined, 
  NotificationOutlined, 
  HistoryOutlined,
  ExclamationCircleOutlined,
  SaveOutlined,
  DeleteOutlined,
  EditOutlined,
  DollarOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  RiseOutlined,
  BarChartOutlined,
  FundOutlined,
  WalletOutlined
} from '@ant-design/icons';
import axios from '../../../services/axios';
import dayjs from 'dayjs';
import styled from 'styled-components';

const { Title, Text } = Typography;
const { confirm } = Modal;

// 样式化组件
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

const RuleCard = styled(Card)`
  border-radius: 12px;
  border: 1px solid #f0f0f0;
  transition: all 0.3s ease;
  
  &:hover {
    border-color: #667eea;
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.1);
  }
`;

interface AdRule {
  rule_id: number;
  price: number;
  start_date: string;
  end_date: string | null;
  min_days: number;
  max_days: number;
  updated_at: string;
}

interface CommissionRule {
  rule_id: number;
  rate: number;
  start_date: string;
  end_date: string | null;
  created_at: string;
  updated_at: string;
}

interface FinanceStats {
  stat_date: string;
  order_count: number;
  order_amount: number;
  commission_income: number;
  ad_count: number;
  ad_income: number;
  total_income: number;
}

const PlatformSettings: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [adRules, setAdRules] = useState<AdRule[]>([]);
  const [adRulesLoading, setAdRulesLoading] = useState(false);
  const [editingRule, setEditingRule] = useState<AdRule | null>(null);
  const [ruleForm] = Form.useForm();
  const [commissionForm] = Form.useForm();
  
  // 新增的状态
  const [commissionRules, setCommissionRules] = useState<CommissionRule[]>([]);
  const [commissionLoading, setCommissionLoading] = useState(false);
  const [financeStats, setFinanceStats] = useState<FinanceStats[]>([]);
  const [statsLoading, setStatsLoading] = useState(false);
  const [editingCommission, setEditingCommission] = useState<CommissionRule | null>(null);

  // 获取佣金规则
  const fetchCommissionRules = async () => {
    setCommissionLoading(true);
    try {
      const res = await axios.get('/admin/commission/rules');
      if (res.data.code === 200) {
        setCommissionRules(res.data.data || []);
      }
    } catch (error) {
      message.error('获取佣金规则失败');
    } finally {
      setCommissionLoading(false);
    }
  };

  // 获取财务统计
  const fetchFinanceStats = async () => {
    setStatsLoading(true);
    try {
      const res = await axios.get('/admin/commission/stats', {
        params: { days: 30 }
      });
      if (res.data.code === 200) {
        setFinanceStats(res.data.data || []);
      }
    } catch (error) {
      console.error('获取财务统计失败:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    fetchCommissionRules();
    fetchFinanceStats();
  }, []);

  // 处理佣金提交
  const onFinishCommission = async (values: any) => {
    confirm({
      title: '确认调整全站佣金比例',
      icon: <ExclamationCircleOutlined />,
      content: (
        <div style={{ padding: '16px 0' }}>
          <Alert
            message="调整后将影响新订单"
            description={`新的佣金比例为 ${values.rate}%，将于 ${values.start_date.format('YYYY-MM-DD')} 起对新订单生效。此操作不可撤销。`}
            type="warning"
            showIcon
          />
        </div>
      ),
      okText: '确认调整',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        setLoading(true);
        try {
          const submitData = {
            rate: values.rate,
            start_date: values.start_date.format('YYYY-MM-DD'),
            end_date: values.end_date?.format('YYYY-MM-DD') || null
          };

          let res;
          if (editingCommission) {
            res = await axios.put(`/admin/commission/rules/${editingCommission.rule_id}`, submitData);
          } else {
            res = await axios.post('/admin/commission/rules', submitData);
          }

          if (res.data.code === 200) {
            message.success({
              content: editingCommission ? '规则更新成功' : '规则创建成功',
              icon: <CheckCircleOutlined style={{ color: '#52c41a' }} />
            });
            commissionForm.resetFields();
            setEditingCommission(null);
            fetchCommissionRules();
            fetchFinanceStats();
          }
        } catch (error) {
          message.error('操作失败');
        } finally {
          setLoading(false);
        }
      },
    });
  };

  // 删除规则
  const handleDeleteCommissionRule = (rule: CommissionRule) => {
    confirm({
      title: '确认删除佣金规则',
      icon: <ExclamationCircleOutlined />,
      content: '删除后该规则将不再可用，确定要继续吗？',
      okText: '确认删除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          const res = await axios.delete(`/admin/commission/rules/${rule.rule_id}`);
          if (res.data.code === 200) {
            message.success('删除成功');
            fetchCommissionRules();
          }
        } catch (error) {
          message.error('删除失败');
        }
      }
    });
  };

  // 编辑规则
  const handleEditCommissionRule = (rule: CommissionRule) => {
    setEditingCommission(rule);
    commissionForm.setFieldsValue({
      rate: rule.rate,
      start_date: dayjs(rule.start_date),
      end_date: rule.end_date ? dayjs(rule.end_date) : null
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 佣金规则表格列
  const commissionColumns = [
    {
      title: '佣金比例',
      dataIndex: 'rate',
      key: 'rate',
      render: (rate: number) => (
        <Space>
          <RiseOutlined style={{ color: '#fa8c16' }} />
          <Text strong style={{ fontSize: 16, color: '#fa8c16' }}>{rate}%</Text>
        </Space>
      ),
      sorter: (a: CommissionRule, b: CommissionRule) => a.rate - b.rate,
    },
    {
      title: '生效周期',
      key: 'period',
      render: (_: any, record: CommissionRule) => (
        <Space direction="vertical" size={2}>
          <Space>
            <CalendarOutlined style={{ color: '#1890ff' }} />
            <Text>{record.start_date}</Text>
          </Space>
          <Space>
            <CalendarOutlined style={{ color: '#ff4d4f' }} />
            <Text>{record.end_date || '永久有效'}</Text>
          </Space>
        </Space>
      )
    },
    {
      title: '状态',
      key: 'status',
      render: (_: any, record: CommissionRule) => {
        const now = dayjs();
        const start = dayjs(record.start_date);
        const end = record.end_date ? dayjs(record.end_date) : null;
        
        if (start.isAfter(now)) {
          return <Tag color="orange">待生效</Tag>;
        }
        if (end && end.isBefore(now)) {
          return <Tag color="default">已失效</Tag>;
        }
        return <Tag color="green">当前生效</Tag>;
      }
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => (
        <Space>
          <ClockCircleOutlined style={{ color: '#999' }} />
          <Text type="secondary">{dayjs(date).format('YYYY-MM-DD HH:mm')}</Text>
        </Space>
      )
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_: any, record: CommissionRule) => (
        <Space>
          <Tooltip title="编辑规则">
            <Button 
              type="link" 
              icon={<EditOutlined />} 
              onClick={() => handleEditCommissionRule(record)}
              style={{ color: '#1890ff' }}
            />
          </Tooltip>
          <Tooltip title="删除规则">
            <Button 
              type="link" 
              icon={<DeleteOutlined />} 
              danger
              onClick={() => handleDeleteCommissionRule(record)}
            />
          </Tooltip>
        </Space>
      )
    }
  ];

  // 财务统计表格列
  const financeColumns = [
    {
      title: '统计日期',
      dataIndex: 'stat_date',
      key: 'stat_date',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD')
    },
    {
      title: '订单数',
      dataIndex: 'order_count',
      key: 'order_count',
      render: (count: number) => <Tag color="blue">{count} 单</Tag>
    },
    {
      title: '订单总额',
      dataIndex: 'order_amount',
      key: 'order_amount',
      render: (amount: number) => (
        <Text strong style={{ color: '#52c41a' }}>¥{amount.toLocaleString()}</Text>
      )
    },
    {
      title: '佣金收入',
      dataIndex: 'commission_income',
      key: 'commission_income',
      render: (income: number) => (
        <Text type="warning">¥{income.toLocaleString()}</Text>
      )
    },
    {
      title: '广告数',
      dataIndex: 'ad_count',
      key: 'ad_count',
      render: (count: number) => <Tag color="purple">{count} 个</Tag>
    },
    {
      title: '广告收入',
      dataIndex: 'ad_income',
      key: 'ad_income',
      render: (income: number) => (
        <Text type="danger">¥{income.toLocaleString()}</Text>
      )
    },
    {
      title: '总收入',
      dataIndex: 'total_income',
      key: 'total_income',
      render: (income: number) => (
        <Text strong style={{ color: '#722ed1', fontSize: 16 }}>¥{income.toLocaleString()}</Text>
      )
    }
  ];

  // 佣金表单内容
  const CommissionTab = (
    <div style={{ padding: '20px 0' }}>
      <Row gutter={[24, 24]}>
        <Col span={24}>
          <Alert
            message={
              <Space>
                <ExclamationCircleOutlined />
                <span>配置说明</span>
              </Space>
            }
            description="调整后的佣金比例仅对规则生效日期之后产生的订单有效，已存在的订单比例不会随之改变。新规则生效时，旧规则将自动失效。"
            type="info"
            showIcon
            style={{ 
              borderRadius: 8,
              background: 'linear-gradient(135deg, #e6f7ff 0%, #bae7ff 100%)',
              border: 'none'
            }}
          />
        </Col>

        <Col span={24}>
          <RuleCard>
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              <Space>
                <div style={{ 
                  width: 40, 
                  height: 40, 
                  borderRadius: 20, 
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <PercentageOutlined style={{ color: 'white', fontSize: 20 }} />
                </div>
                <Title level={5} style={{ margin: 0 }}>
                  {editingCommission ? '编辑佣金规则' : '新增佣金规则'}
                </Title>
                {editingCommission && (
                  <Tag color="processing" style={{ marginLeft: 8 }}>编辑模式</Tag>
                )}
              </Space>

              <Form 
                form={commissionForm}
                layout="vertical" 
                onFinish={onFinishCommission} 
                initialValues={{ rate: 12, start_date: dayjs() }}
              >
                <Row gutter={16}>
                  <Col span={8}>
                    <Form.Item 
                      name="rate" 
                      label="佣金比例" 
                      rules={[{ required: true }]}
                      tooltip="取值范围：1-50%"
                    >
                      <InputNumber 
                        min={1} 
                        max={50} 
                        step={0.1}
                        addonAfter="%" 
                        style={{ width: '100%' }}
                        size="large"
                      />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item 
                      name="start_date" 
                      label="生效日期" 
                      rules={[{ required: true }]}
                    >
                      <DatePicker 
                        style={{ width: '100%' }} 
                        size="large"
                        disabledDate={(current) => current && current < dayjs().startOf('day')}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item 
                      name="end_date" 
                      label="失效日期"
                      tooltip="不填则永久有效"
                    >
                      <DatePicker 
                        style={{ width: '100%' }} 
                        size="large"
                        disabledDate={(current) => current && current < dayjs().startOf('day')}
                      />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={16}>
                  <Col span={24}>
                    <Form.Item label=" " colon={false}>
                      <Space>
                        <GradientButton 
                          type="primary" 
                          htmlType="submit" 
                          loading={loading}
                          size="large"
                          icon={<SaveOutlined />}
                        >
                          {editingCommission ? '更新规则' : '发布新规则'}
                        </GradientButton>
                        {editingCommission && (
                          <Button 
                            size="large"
                            onClick={() => {
                              setEditingCommission(null);
                              commissionForm.resetFields();
                            }}
                          >
                            取消编辑
                          </Button>
                        )}
                      </Space>
                    </Form.Item>
                  </Col>
                </Row>
              </Form>
            </Space>
          </RuleCard>
        </Col>

        <Col span={24}>
          <StyledCard>
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <Space>
                <HistoryOutlined style={{ color: '#667eea', fontSize: 20 }} />
                <Title level={5} style={{ margin: 0 }}>佣金规则列表</Title>
                <Badge count={commissionRules.length} style={{ backgroundColor: '#667eea' }} />
              </Space>
              <Table 
                size="middle"
                dataSource={commissionRules} 
                pagination={{ pageSize: 5 }}
                loading={commissionLoading}
                columns={commissionColumns}
                rowKey="rule_id"
                bordered={false}
              />
            </Space>
          </StyledCard>
        </Col>

        <Col span={24}>
          <StyledCard>
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <Space>
                <FundOutlined style={{ color: '#52c41a', fontSize: 20 }} />
                <Title level={5} style={{ margin: 0 }}>平台收入统计（近30天）</Title>
              </Space>
              <Table 
                size="small"
                dataSource={financeStats} 
                pagination={{ pageSize: 10 }}
                loading={statsLoading}
                columns={financeColumns}
                rowKey="stat_date"
                bordered={false}
                scroll={{ x: 1000 }}
              />
            </Space>
          </StyledCard>
        </Col>
      </Row>
    </div>
  );

  // 获取广告规则
  const fetchAdRules = async () => {
    setAdRulesLoading(true);
    try {
      const res = await axios.get('/admin/ads/rules');
      if (res.data.code === 200) {
        setAdRules(res.data.data || []);
      }
    } catch (error) {
      message.error('获取广告规则失败');
    } finally {
      setAdRulesLoading(false);
    }
  };

  useEffect(() => {
    fetchAdRules();
  }, []);

  // 处理广告规则提交
  const onFinishAdRules = async (values: any) => {
    setLoading(true);
    try {
      const submitData = {
        price: values.price,
        start_date: values.start_date.format('YYYY-MM-DD'),
        end_date: values.end_date?.format('YYYY-MM-DD') || null,
        min_days: values.min_days,
        max_days: values.max_days
      };

      let res;
      if (editingRule) {
        res = await axios.put(`/admin/ads/rules/${editingRule.rule_id}`, submitData);
      } else {
        res = await axios.post('/admin/ads/rules', submitData);
      }

      if (res.data.code === 200) {
        message.success({
          content: editingRule ? '规则更新成功' : '规则创建成功',
          icon: <CheckCircleOutlined style={{ color: '#52c41a' }} />
        });
        ruleForm.resetFields();
        setEditingRule(null);
        fetchAdRules();
      }
    } catch (error) {
      message.error('操作失败');
    } finally {
      setLoading(false);
    }
  };

  // 删除规则
  const handleDeleteRule = (rule: AdRule) => {
    confirm({
      title: '确认删除广告规则',
      icon: <ExclamationCircleOutlined />,
      content: '删除后该规则将不再可用，确定要继续吗？',
      okText: '确认删除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          const res = await axios.delete(`/admin/ads/rules/${rule.rule_id}`);
          if (res.data.code === 200) {
            message.success('删除成功');
            fetchAdRules();
          }
        } catch (error) {
          message.error('删除失败');
        }
      }
    });
  };

  // 编辑规则
  const handleEditRule = (rule: AdRule) => {
    setEditingRule(rule);
    ruleForm.setFieldsValue({
      price: rule.price,
      start_date: dayjs(rule.start_date),
      end_date: rule.end_date ? dayjs(rule.end_date) : null,
      min_days: rule.min_days,
      max_days: rule.max_days
    });
    
    // 滚动到表单位置
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 广告规则表格列
  const adRuleColumns = [
    {
      title: '单价',
      dataIndex: 'price',
      key: 'price',
      render: (price: number) => (
        <Space>
          <DollarOutlined style={{ color: '#52c41a' }} />
          <Text strong style={{ color: '#52c41a', fontSize: 16 }}>¥{price}</Text>
          <Text type="secondary">/天</Text>
        </Space>
      ),
      sorter: (a: AdRule, b: AdRule) => a.price - b.price,
    },
    {
      title: '生效周期',
      key: 'period',
      render: (_: any, record: AdRule) => (
        <Space direction="vertical" size={2}>
          <Space>
            <CalendarOutlined style={{ color: '#1890ff' }} />
            <Text>{record.start_date}</Text>
          </Space>
          <Space>
            <CalendarOutlined style={{ color: '#ff4d4f' }} />
            <Text>{record.end_date || '永久有效'}</Text>
          </Space>
        </Space>
      )
    },
    {
      title: '投放天数',
      key: 'days',
      render: (_: any, record: AdRule) => (
        <Tag color="processing" style={{ padding: '4px 12px' }}>
          {record.min_days} - {record.max_days} 天
        </Tag>
      )
    },
    {
      title: '更新时间',
      dataIndex: 'updated_at',
      key: 'updated_at',
      render: (date: string) => (
        <Space>
          <ClockCircleOutlined style={{ color: '#999' }} />
          <Text type="secondary">{dayjs(date).format('YYYY-MM-DD HH:mm')}</Text>
        </Space>
      )
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_: any, record: AdRule) => (
        <Space>
          <Tooltip title="编辑规则">
            <Button 
              type="link" 
              icon={<EditOutlined />} 
              onClick={() => handleEditRule(record)}
              style={{ color: '#1890ff' }}
            />
          </Tooltip>
          <Tooltip title="删除规则">
            <Button 
              type="link" 
              icon={<DeleteOutlined />} 
              danger
              onClick={() => handleDeleteRule(record)}
            />
          </Tooltip>
        </Space>
      )
    }
  ];

  // 广告规则内容
  const AdRulesTab = (
    <div style={{ padding: '20px 0' }}>
      <Row gutter={[24, 24]}>
        <Col span={24}>
          <Alert
            message={
              <Space>
                <ExclamationCircleOutlined />
                <span>广告定价提示</span>
              </Space>
            }
            description="管理员可根据节假日或平台流量情况动态调整单日租金，调整后商户在提交新申请时将看到新价格。"
            type="warning"
            showIcon
            style={{ 
              borderRadius: 8,
              background: 'linear-gradient(135deg, #fff7e6 0%, #ffe7ba 100%)',
              border: 'none'
            }}
          />
        </Col>

        <Col span={24}>
          <RuleCard>
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              <Space>
                <div style={{ 
                  width: 40, 
                  height: 40, 
                  borderRadius: 20, 
                  background: 'linear-gradient(135deg, #fa8c16 0%, #f5222d 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <NotificationOutlined style={{ color: 'white', fontSize: 20 }} />
                </div>
                <Title level={5} style={{ margin: 0 }}>
                  {editingRule ? '编辑广告规则' : '新增广告规则'}
                </Title>
                {editingRule && (
                  <Tag color="processing" style={{ marginLeft: 8 }}>编辑模式</Tag>
                )}
              </Space>

              <Form 
                form={ruleForm}
                layout="vertical" 
                onFinish={onFinishAdRules} 
                initialValues={{ price: 500, min_days: 7, max_days: 30 }}
              >
                <Row gutter={16}>
                  <Col span={8}>
                    <Form.Item 
                      name="price" 
                      label="首页 Banner 租金" 
                      rules={[{ required: true }]}
                      tooltip="单价：元/天"
                    >
                      <InputNumber 
                        min={0} 
                        style={{ width: '100%' }} 
                        prefix="¥" 
                        size="large"
                      />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item 
                      name="start_date" 
                      label="生效日期" 
                      rules={[{ required: true }]}
                    >
                      <DatePicker 
                        style={{ width: '100%' }} 
                        size="large"
                      />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item 
                      name="end_date" 
                      label="失效日期"
                      tooltip="不填则永久有效"
                    >
                      <DatePicker 
                        style={{ width: '100%' }} 
                        size="large"
                      />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={16}>
                  <Col span={8}>
                    <Form.Item 
                      name="min_days" 
                      label="最小租用天数" 
                      rules={[{ required: true }]}
                    >
                      <InputNumber 
                        min={1} 
                        style={{ width: '100%' }} 
                        size="large"
                      />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item 
                      name="max_days" 
                      label="最大租用天数" 
                      rules={[{ required: true }]}
                    >
                      <InputNumber 
                        min={1} 
                        style={{ width: '100%' }} 
                        size="large"
                      />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item label=" " colon={false}>
                      <Space>
                        <GradientButton 
                          type="primary" 
                          htmlType="submit" 
                          loading={loading}
                          size="large"
                          icon={<SaveOutlined />}
                        >
                          {editingRule ? '更新规则' : '保存配置'}
                        </GradientButton>
                        {editingRule && (
                          <Button 
                            size="large"
                            onClick={() => {
                              setEditingRule(null);
                              ruleForm.resetFields();
                            }}
                          >
                            取消编辑
                          </Button>
                        )}
                      </Space>
                    </Form.Item>
                  </Col>
                </Row>
              </Form>
            </Space>
          </RuleCard>
        </Col>

        <Col span={24}>
          <StyledCard>
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <Space>
                <BarChartOutlined style={{ color: '#fa8c16', fontSize: 20 }} />
                <Title level={5} style={{ margin: 0 }}>广告规则列表</Title>
                <Badge count={adRules.length} style={{ backgroundColor: '#667eea' }} />
              </Space>
              <Table 
                size="middle"
                dataSource={adRules} 
                rowKey="rule_id"
                pagination={{ 
                  pageSize: 5,
                  showTotal: (total) => `共 ${total} 条规则`
                }}
                loading={adRulesLoading}
                columns={adRuleColumns}
                bordered={false}
              />
            </Space>
          </StyledCard>
        </Col>
      </Row>
    </div>
  );

  return (
    <div style={{ padding: '24px' }}>
      <StyledCard>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Space align="center">
            <div style={{ 
              width: 48, 
              height: 48, 
              borderRadius: 24, 
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <SettingOutlined style={{ color: 'white', fontSize: 24 }} />
            </div>
            <div>
              <Title level={3} style={{ margin: 0 }}>平台全局规则配置</Title>
              <Text type="secondary">管理佣金比例、广告定价等平台规则</Text>
            </div>
          </Space>

          <Divider style={{ margin: '12px 0' }} />

          <Tabs
            defaultActiveKey="1"
            size="large"
            items={[
              {
                key: '1',
                label: (
                  <Space>
                    <PercentageOutlined />
                    <span>佣金比例配置</span>
                  </Space>
                ),
                children: CommissionTab,
              },
              {
                key: '2',
                label: (
                  <Space>
                    <NotificationOutlined />
                    <span>广告位规则配置</span>
                  </Space>
                ),
                children: AdRulesTab,
              },
            ]}
          />
        </Space>
      </StyledCard>
    </div>
  );
};

export default PlatformSettings;