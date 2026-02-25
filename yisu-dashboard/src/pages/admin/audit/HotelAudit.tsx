import React, { useState, useEffect } from 'react';
import { 
  Table, Tag, Button, Card, Form, Input, Select, 
  Modal, Typography, message, Descriptions, Divider, Badge 
} from 'antd';
import { 
  SearchOutlined, ReloadOutlined, 
  EyeOutlined, HomeOutlined, EditOutlined 
} from '@ant-design/icons';
import axios from '../../../services/axios';

const { Title, Text } = Typography;
const { TextArea } = Input;

interface HotelAuditRecord {
  apply_id: number;
  hotel_id?: number;
  merchant_name: string;
  target_type: 'hotel_apply' | 'hotel_update';
  hotel_name: string;
  change_data: any;
  apply_reason: string;
  audit_status: 'pending' | 'completed';
  created_at: string;
}

const HotelAudit: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<HotelAuditRecord | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const [data, setData] = useState<HotelAuditRecord[]>([]);
  const [filters, setFilters] = useState({
    type: 'all',
    keyword: ''
  });

  // 获取审核列表
  const fetchAuditList = async () => {
    setTableLoading(true);
    try {
      const params: any = {};
      if (filters.type !== 'all') params.type = filters.type;
      if (filters.keyword) params.keyword = filters.keyword;
      
      const res = await axios.get('/audit/hotels', { params });
      if (res.data.code === 200) {
        setData(res.data.data);
      }
    } catch (error) {
      message.error('获取审核列表失败');
    } finally {
      setTableLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditList();
  }, [filters]);

  // 审核操作
  const handleAudit = async (action: 'approve' | 'reject') => {
    if (!selectedRecord) return;
    
    if (action === 'reject' && !rejectReason) {
      return message.warning('请填写驳回理由！');
    }
    
    setLoading(true);
    try {
      const url = `/audit/hotels/${selectedRecord.apply_id}/${action}`;
      const data = action === 'reject' ? { reason: rejectReason } : {};
      
      const res = await axios.post(url, data);
      if (res.data.code === 200) {
        message.success(`审核已提交：${action === 'approve' ? '通过' : '驳回'}`);
        setIsModalOpen(false);
        setRejectReason('');
        fetchAuditList(); // 刷新列表
      }
    } catch (error) {
      message.error('操作失败');
    } finally {
      setLoading(false);
    }
  };

  // 表格列定义
  const columns = [
    {
      title: '申请类型',
      dataIndex: 'target_type',
      key: 'target_type',
      render: (type: string) => (
        type === 'hotel_apply' 
          ? <Tag color="blue" icon={<HomeOutlined />}>新店入驻</Tag>
          : <Tag color="purple" icon={<EditOutlined />}>信息修改</Tag>
      ),
    },
    { title: '酒店名称', dataIndex: 'hotel_name', key: 'hotel_name' },
    { title: '所属商户', dataIndex: 'merchant_name', key: 'merchant_name' },
    { 
      title: '申请时间', 
      dataIndex: 'created_at', 
      key: 'created_at',
      render: (time: string) => new Date(time).toLocaleString('zh-CN')
    },
    {
      title: '状态',
      dataIndex: 'audit_status',
      key: 'audit_status',
      render: (status: string) => (
        status === 'pending' 
          ? <Badge status="processing" text="待审批" />
          : <Badge status="success" text="已处理" />
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: HotelAuditRecord) => (
        record.audit_status === 'pending' ? (
          <Button 
            type="link" 
            icon={<EyeOutlined />} 
            onClick={() => { setSelectedRecord(record); setIsModalOpen(true); }}
          >
            详情审核
          </Button>
        ) : (
          <Tag color="default">已处理</Tag>
        )
      ),
    },
  ];

  return (
    <Card bordered={false}>
      <Title level={4} style={{ marginBottom: 24 }}>酒店业务审核</Title>

      <Form layout="inline" style={{ marginBottom: 24 }}>
        <Form.Item label="酒店名称">
          <Input 
            placeholder="搜索酒店" 
            value={filters.keyword}
            onChange={e => setFilters({ ...filters, keyword: e.target.value })}
          />
        </Form.Item>
        <Form.Item label="申请类型">
          <Select 
            value={filters.type} 
            onChange={value => setFilters({ ...filters, type: value })}
            style={{ width: 150 }}
          >
            <Select.Option value="all">全部类型</Select.Option>
            <Select.Option value="hotel_apply">新店入驻</Select.Option>
            <Select.Option value="hotel_update">信息修改</Select.Option>
          </Select>
        </Form.Item>
        <Form.Item>
          <Button type="primary" icon={<SearchOutlined />} onClick={fetchAuditList}>
            筛选
          </Button>
        </Form.Item>
        <Form.Item>
          <Button icon={<ReloadOutlined />} onClick={() => {
            setFilters({ type: 'all', keyword: '' });
            fetchAuditList();
          }}>
            重置
          </Button>
        </Form.Item>
      </Form>

      <Table 
        columns={columns} 
        dataSource={data} 
        rowKey="apply_id" 
        loading={tableLoading}
      />

      <Modal
        title={selectedRecord?.target_type === 'hotel_apply' ? "新酒店入驻审批" : "酒店信息修改审批"}
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        width={700}
        footer={[
          <Button key="back" onClick={() => setIsModalOpen(false)}>取消</Button>,
          <Button 
            key="re" 
            danger 
            onClick={() => handleAudit('reject')} 
            loading={loading}
          >
            驳回
          </Button>,
          <Button 
            key="ok" 
            type="primary" 
            onClick={() => handleAudit('approve')} 
            loading={loading}
          >
            通过并发布
          </Button>,
        ]}
      >
        {selectedRecord && (
          <div style={{ marginTop: 20 }}>
            <Descriptions title="基础信息" bordered size="small" column={2}>
              <Descriptions.Item label="酒店名称">{selectedRecord.hotel_name}</Descriptions.Item>
              <Descriptions.Item label="商户">{selectedRecord.merchant_name}</Descriptions.Item>
              <Descriptions.Item label="申请理由" span={2}>{selectedRecord.apply_reason}</Descriptions.Item>
            </Descriptions>

            <Divider style={{ textAlign: 'left' }}>变更内容详情</Divider>
            {selectedRecord.target_type === 'hotel_apply' ? (
              <Descriptions bordered size="small" column={1}>
                <Descriptions.Item label="中文名称">
                  {selectedRecord.change_data.name_zh}
                </Descriptions.Item>
                <Descriptions.Item label="详细地址">
                  {selectedRecord.change_data.address}
                </Descriptions.Item>
                <Descriptions.Item label="星级">
                  {selectedRecord.change_data.star_rating}星级
                </Descriptions.Item>
                <Descriptions.Item label="联系电话">
                  {selectedRecord.change_data.phone}
                </Descriptions.Item>
                {selectedRecord.change_data.opening_date && (
                  <Descriptions.Item label="开业日期">
                    {selectedRecord.change_data.opening_date}
                  </Descriptions.Item>
                )}
              </Descriptions>
            ) : (
              <Table 
                pagination={false}
                size="small"
                dataSource={Object.keys(selectedRecord.change_data.new || {}).map(key => ({
                  field: key,
                  old: selectedRecord.change_data.old?.[key] || '-',
                  new: selectedRecord.change_data.new[key]
                }))}
                columns={[
                  { title: '修改字段', dataIndex: 'field' },
                  { 
                    title: '修改前', 
                    dataIndex: 'old', 
                    render: (t) => <Text delete type="secondary">{t}</Text> 
                  },
                  { 
                    title: '修改后', 
                    dataIndex: 'new', 
                    render: (t) => <Text type="success" strong>{t}</Text> 
                  },
                ]}
              />
            )}

            <div style={{ marginTop: 20 }}>
              <Text type="secondary">审批意见（若驳回必填）：</Text>
              <TextArea 
                rows={3} 
                style={{ marginTop: 8 }} 
                value={rejectReason} 
                onChange={e => setRejectReason(e.target.value)} 
                placeholder="请输入驳回理由..."
              />
            </div>
          </div>
        )}
      </Modal>
    </Card>
  );
};

export default HotelAudit;