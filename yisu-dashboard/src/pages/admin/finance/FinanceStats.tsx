// src/pages/admin/finance/FinanceStats.tsx
import React, { useEffect, useState } from 'react';
import {
  Card, Row, Col, Statistic, Table, DatePicker, Space,
  Typography, Tag, message, Tabs, Button
} from 'antd';
import {
  CalendarOutlined,
  BankOutlined,
  PercentageOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import axios from '../../../services/axios';
import dayjs from 'dayjs';

const { Text } = Typography;
const { RangePicker } = DatePicker;
const { TabPane } = Tabs;

interface FinanceStat {
  stat_date: string;
  order_count: number;
  order_amount: number;
  commission_income: number;
  ad_count: number;
  ad_income: number;
  total_income: number;
}

interface SummaryStats {
  totalOrderAmount: number;
  totalCommission: number;
  totalAdIncome: number;
  totalIncome: number;
  orderCount: number;
  adCount: number;
  avgCommissionRate: number;
}

const FinanceStats: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<FinanceStat[]>([]);
  const [summary, setSummary] = useState<SummaryStats>({
    totalOrderAmount: 0,
    totalCommission: 0,
    totalAdIncome: 0,
    totalIncome: 0,
    orderCount: 0,
    adCount: 0,
    avgCommissionRate: 0
  });
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().subtract(30, 'day'),
    dayjs()
  ]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const [start, end] = dateRange;
      const days = end.diff(start, 'day') + 1;

      const res = await axios.get('/admin/commission/stats', {
        params: { days }
      });

      if (res.data.code === 200) {
        const data = res.data.data || [];
        setStats(data);
        calculateSummary(data);
      }
    } catch (error) {
      message.error('获取统计数据失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const calculateSummary = (data: FinanceStat[]) => {
    const summary = data.reduce((acc, curr) => ({
      totalOrderAmount: acc.totalOrderAmount + curr.order_amount,
      totalCommission: acc.totalCommission + curr.commission_income,
      totalAdIncome: acc.totalAdIncome + curr.ad_income,
      totalIncome: acc.totalIncome + curr.total_income,
      orderCount: acc.orderCount + curr.order_count,
      adCount: acc.adCount + curr.ad_count,
      avgCommissionRate: 0
    }), {
      totalOrderAmount: 0,
      totalCommission: 0,
      totalAdIncome: 0,
      totalIncome: 0,
      orderCount: 0,
      adCount: 0,
      avgCommissionRate: 0
    });

    summary.avgCommissionRate = summary.totalOrderAmount > 0 
      ? (summary.totalCommission / summary.totalOrderAmount) * 100 
      : 0;

    setSummary(summary);
  };

  const handleDateChange = (dates: any) => {
    if (dates) {
      setDateRange([dates[0], dates[1]]);
    }
  };

  const formatDate = (date: string) => {
    try {
      // 如果是 "Wed Feb 25 2026 00:00:00 GMT+0800" 格式
      if (date.includes('GMT')) {
        return dayjs(date).format('YYYY-MM-DD');
      }
      // 如果是 "2026-02-25" 格式
      return dayjs(date).format('YYYY-MM-DD');
    } catch (error) {
      return date;
    }
  };

  const columns = [
    {
      title: '统计日期',
      dataIndex: 'stat_date',
      key: 'stat_date',
      render: (date: string) => formatDate(date)
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

  return (
    <div style={{ padding: '24px' }}>
      <Card
        title={
          <Space>
            <BankOutlined style={{ color: '#667eea' }} />
            <span>平台财务统计</span>
          </Space>
        }
        extra={
          <Space>
            <RangePicker
              value={dateRange}
              onChange={handleDateChange}
              style={{ width: 240 }}
            />
            <Button
              type="primary"
              icon={<ReloadOutlined />}
              onClick={fetchStats}
              loading={loading}
            >
              查询
            </Button>
          </Space>
        }
        style={{ borderRadius: 12 }}
      >
        {/* 统计卡片 */}
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={6}>
            <Card variant="borderless" style={{ background: '#f0f5ff' }}>
              <Statistic
                title="总收入"
                value={summary.totalIncome}
                precision={2}
                prefix="¥"
                valueStyle={{ color: '#722ed1', fontWeight: 'bold' }}
              />
              <Text type="secondary">统计周期内平台总收入</Text>
            </Card>
          </Col>
          <Col span={6}>
            <Card variant="borderless" style={{ background: '#f6ffed' }}>
              <Statistic
                title="订单总额"
                value={summary.totalOrderAmount}
                precision={2}
                prefix="¥"
                valueStyle={{ color: '#52c41a', fontWeight: 'bold' }}
              />
              <Text type="secondary">共 {summary.orderCount} 笔订单</Text>
            </Card>
          </Col>
          <Col span={6}>
            <Card variant="borderless" style={{ background: '#fff7e6' }}>
              <Statistic
                title="佣金收入"
                value={summary.totalCommission}
                precision={2}
                prefix="¥"
                valueStyle={{ color: '#fa8c16', fontWeight: 'bold' }}
              />
              <Space>
                <PercentageOutlined />
                <Text type="secondary">平均佣金率 {summary.avgCommissionRate.toFixed(2)}%</Text>
              </Space>
            </Card>
          </Col>
          <Col span={6}>
            <Card variant="borderless" style={{ background: '#fff0f6' }}>
              <Statistic
                title="广告收入"
                value={summary.totalAdIncome}
                precision={2}
                prefix="¥"
                valueStyle={{ color: '#eb2f96', fontWeight: 'bold' }}
              />
              <Text type="secondary">共 {summary.adCount} 个广告</Text>
            </Card>
          </Col>
        </Row>

        {/* 数据表格 */}
        <Tabs defaultActiveKey="daily">
          <TabPane 
            tab={
              <Space>
                <CalendarOutlined />
                <span>每日明细</span>
              </Space>
            } 
            key="daily"
          >
            <Table
              columns={columns}
              dataSource={stats}
              rowKey="stat_date"
              loading={loading}
              pagination={{ pageSize: 10 }}
              scroll={{ x: 1000 }}
            />
          </TabPane>
        </Tabs>
      </Card>
    </div>
  );
};

export default FinanceStats;