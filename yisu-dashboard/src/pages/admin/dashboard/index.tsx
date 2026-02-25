import React from 'react';
import { Row, Col, Card, Statistic, List, Tag, Button, Space, Typography } from 'antd';
import { 
  PayCircleOutlined, 
  SafetyCertificateOutlined, 
  ShopOutlined, 
  UserAddOutlined,
  ArrowUpOutlined,
  RightOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;

const Dashboard: React.FC = () => {
  const navigate = useNavigate();

  // 模拟待办数据
  const pendingTasks = [
    { id: 1, type: '商户审核', name: '如家精选上海店', time: '10分钟前', status: '待审核' },
    { id: 2, type: '酒店上线', name: '杭州开元大酒店', time: '30分钟前', status: '待审核' },
    { id: 3, type: '广告续费', name: '全季酒店广告位', time: '1小时前', status: '待审批' },
    { id: 4, type: '修改信息', name: '希尔顿逸林房型修改', time: '2小时前', status: '待审核' },
  ];

  return (
    <div style={{ padding: '4px' }}>
      <div style={{ marginBottom: 24 }}>
        <Title level={4}>工作台概览</Title>
        <Text type="secondary">欢迎回来，超级管理员。以下是平台今日运行简报：</Text>
      </div>

      {/* 第一行：统计卡片 */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={6}>
          <Card variant="borderless" hoverable>
            <Statistic
              title="今日总营收"
              value={45800}
              precision={2}
              styles={{ content: { color: '#0066FF' } }}
              prefix={<PayCircleOutlined />}
              suffix={<Text style={{ fontSize: 12, color: '#3f8600' }}><ArrowUpOutlined /> 12%</Text>}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card variant="borderless" hoverable>
            <Statistic
              title="今日总佣金"
              value={4580}
              precision={2}
              styles={{ content: { color: '#FF9900' } }} 
              prefix={<SafetyCertificateOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card variant="borderless" hoverable>
            <Statistic
              title="待审核任务"
              value={12}
              styles={{ content: { color: '#cf1322' } }} 
              prefix={<ShopOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card variant="borderless" hoverable>
            <Statistic
              title="活跃酒店数"
              value={358}
              prefix={<UserAddOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* 第二行：图表占位与待办列表 */}
      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col span={16}>
          <Card 
            title="平台营收趋势 (近7日)" 
            variant="borderless" 
            extra={<Button type="link">查看详情</Button>}
            style={{ height: '400px', display: 'flex', flexDirection: 'column' }}
          >
            {/* 后续可以集成 Echarts 或 Ant Design Charts */}
            <div style={{ 
              flex: 1, 
              background: '#f9f9f9', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              borderRadius: 8,
              border: '1px dashed #ddd'
            }}>
              <Text type="secondary">营收统计图表加载中... (待集成 Echarts)</Text>
            </div>
          </Card>
        </Col>
        <Col span={8}>
          <Card 
            title="待处理审核" 
            variant="borderless"
            extra={<Button type="link" onClick={() => navigate('/audit/merchants')}>全部审核</Button>}
            style={{ height: '400px' }}
          >
            <List
              itemLayout="horizontal"
              dataSource={pendingTasks}
              renderItem={(item) => (
                <List.Item
                  actions={[<Button type="link" icon={<RightOutlined />} />]}
                >
                  <List.Item.Meta
                    title={<Text strong>{item.name}</Text>}
                    description={
                      <Space>
                        <Tag color="orange">{item.type}</Tag>
                        <Text type="secondary" style={{ fontSize: 12 }}>{item.time}</Text>
                      </Space>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>

      {/* 第三行：快捷功能 */}
      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col span={24}>
          <Card title="常用功能快捷入口" variant="borderless">
            <Space size="middle">
              <Button onClick={() => navigate('/audit/merchants')}>商户入驻审批</Button>
              <Button onClick={() => navigate('/hotels')}>酒店下线管理</Button>
              <Button onClick={() => navigate('/settings/commission')}>调整佣金比例</Button>
              <Button onClick={() => navigate('/finance')}>查看财务日报</Button>
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;