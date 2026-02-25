// pages/admin/MerchantAudit.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Table, 
  Tag, 
  Space, 
  Button, 
  Card, 
  Form, 
  Input, 
  Select, 
  Image, 
  Modal, 
  Typography, 
  message,
  Row,
  Col,
  Empty,
  Badge,
  Tooltip,
  Divider,
  Avatar,
  Statistic
} from 'antd';
import { 
  SearchOutlined, 
  ReloadOutlined, 
  CheckCircleOutlined, 
  CloseCircleOutlined, 
  EyeOutlined,
  FileImageOutlined,
  ClockCircleOutlined,
  UserOutlined,
  PhoneOutlined,
  ShopOutlined,
  FileTextOutlined} from '@ant-design/icons';
import axios from '../../../services/axios';
import debounce from 'lodash/debounce';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

// 定义数据类型
interface MerchantAuditRecord {
  apply_id: number;
  user_id: number;
  merchant_name: string;
  phone: string;
  license_image_url: string;
  apply_reason: string;
  audit_status: 'pending' | 'approved' | 'rejected';
  apply_created_at: string;
  created_at?: string; 
  registered_at?: string;
  rejection_reason?: string;
  key?: string;
}

const MerchantAudit: React.FC = () => {
  const navigate = useNavigate(); 
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<MerchantAuditRecord | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const [auditData, setAuditData] = useState<MerchantAuditRecord[]>([]);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  });
  const [filters, setFilters] = useState({
    status: 'pending',
    keyword: ''
  });
    // 状态和获取统计的方法
    const [statistics, setStatistics] = useState({
    today_pending: 0,
    merchant: {
        pending: 0,
        approved: 0,
        rejected: 0,
        total: 0
    }
    });

    // 获取统计信息
    const fetchStatistics = async () => {
    try {
        const res = await axios.get('/audit/statistics');
        if (res.data.code === 200) {
        setStatistics(res.data.data);
        }
    } catch (error) {
        console.error('获取统计信息失败:', error);
    }
    };

    // 初始加载时获取统计信息
    useEffect(() => {
    fetchAuditList(pagination.current, pagination.pageSize);
    fetchStatistics(); // 单独获取统计信息
    }, []);

// 获取审核列表数据（支持分页和搜索）- 接收可选的 queryParams 参数
const fetchAuditList = async (page = 1, pageSize = 10, queryParams?: any) => {
  setTableLoading(true);
  try {
    // 1. 合并状态：优先使用传入的 queryParams，否则使用当前 state 中的 filters
    const currentFilters = { ...filters, ...queryParams };
    
    const params: any = {
      page,
      limit: pageSize,
      status: currentFilters.status || 'all' 
    };
   
    // 如果有搜索关键词
    if (currentFilters.keyword && currentFilters.keyword.trim()) {
      params.keyword = currentFilters.keyword.trim();
    }
 // 发送请求
    console.log('前端发送参数:', params); 
    const res = await axios.get('/audit/merchant-applies', { params });

    if (res.data.code === 200) {
      let list = [];
      if (Array.isArray(res.data.data)) {
        list = res.data.data.map((item: any, index: number) => ({
          ...item,
          key: item.apply_id?.toString() || `row-${Date.now()}-${index}`,
          merchant_name: item.merchant_name || '待完善',
          phone: item.phone || '未填写',
          license_image_url: item.license_image_url,
          apply_reason: item.apply_reason || '申请成为商户',
          audit_status: item.merchant_status || 'pending',
          rejection_reason: item.rejection_reason || null,
          apply_created_at: item.apply_time || item.created_at,
          created_at: item.created_at,
          registered_at: item.registered_at
        }));
      }
      
      setAuditData(list);
      
      // 设置分页信息
      if (res.data.pagination) {
        setPagination({
          current: res.data.pagination.page || page,
          pageSize: res.data.pagination.limit || pageSize,
          total: res.data.pagination.total || 0
        });
      }
    } else {
      message.error(res.data.msg || '获取列表失败');
    }
  } catch (error: any) {
    console.error('获取审核列表错误:', error);
    message.error(error.response?.data?.msg || '网络连接失败，请重试');
  } finally {
    setTableLoading(false);
  }
};

  // 初始加载
  useEffect(() => {
    fetchAuditList(pagination.current, pagination.pageSize);
  }, []);

  // 防抖搜索 - 接收keyword参数
const debouncedSearch = useMemo(
  () => debounce((keyword: string) => {
    setPagination(prev => ({ ...prev, current: 1 }));
    // 传递最新的keyword
    fetchAuditList(1, pagination.pageSize, { 
      ...filters, 
      keyword 
    });
  }, 500),
  [filters, pagination.pageSize] // 依赖项
);

// 处理搜索
const handleSearch = () => {
  setPagination(prev => ({ ...prev, current: 1 }));
  // 显式传递当前filters状态，确保准确
  fetchAuditList(1, pagination.pageSize, filters);
};

// 处理重置
const handleReset = () => {
  const resetFilters = {
    status: 'pending',
    keyword: ''
  };
  // 1. 更新UI状态
  setFilters(resetFilters);
  setPagination(prev => ({ ...prev, current: 1 }));
  // 2. 直接传递重置后的值
  setTimeout(() => {
    fetchAuditList(1, pagination.pageSize, resetFilters);
  }, 0);
};

  // 处理表格分页变化
  const handleTableChange = (pagination: any) => {
    setPagination({
      current: pagination.current,
      pageSize: pagination.pageSize,
      total: pagination.total
    });
    fetchAuditList(pagination.current, pagination.pageSize);
  };

  // 处理审核
  const handleAudit = async (status: 'approved' | 'rejected') => {
    if (!selectedRecord) return;
    
    // 如果 apply_id 不存在，提示错误，不要发请求
    if (!selectedRecord.apply_id) {
        message.error('数据异常：找不到审核单ID，请联系管理员检查数据库 audits_apply 表');
        return;
    }
  
    if (status === 'rejected' && !rejectReason.trim()) {
      return message.warning('请填写驳回理由！');
    }

    setLoading(true);
    try {
      let res;
      if (status === 'approved') {
        res = await axios.put(`/audit/applies/${selectedRecord.apply_id}/approve`);
      } else {
        res = await axios.put(`/audit/applies/${selectedRecord.apply_id}/reject`, {
          reason: rejectReason
        });
      }

      if (res.data.code === 200) {
        message.success(`已成功${status === 'approved' ? '通过' : '驳回'}该申请`);
        
        // 更新列表中的状态
        setAuditData(prev => 
          prev.map(item => 
            item.apply_id === selectedRecord.apply_id 
              ? { 
                  ...item, 
                  audit_status: status, 
                  rejection_reason: status === 'rejected' ? rejectReason : item.rejection_reason 
                }
              : item
          )
        );

        setIsModalOpen(false);
        setRejectReason('');
        setSelectedRecord(null);
        
        // 刷新当前页
        fetchAuditList(pagination.current, pagination.pageSize);
        fetchStatistics(); // 刷新统计信息
      } else {
        message.error(res.data.msg || '操作失败');
      }
    } catch (error: any) {
      console.error('审核操作错误:', error);
      message.error(error.response?.data?.msg || '网络连接失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 状态标签渲染
  const renderStatusTag = (status: string) => {
    const statusMap = {
      pending: { color: 'processing', text: '待审核', icon: <ClockCircleOutlined /> },
      approved: { color: 'success', text: '已通过', icon: <CheckCircleOutlined /> },
      rejected: { color: 'error', text: '已驳回', icon: <CloseCircleOutlined /> }
    };
    const { color, text, icon } = statusMap[status as keyof typeof statusMap] || statusMap.pending;
    
    return (
      <Badge 
        status={color as any} 
        text={<span><span style={{ marginRight: 4 }}>{icon}</span>{text}</span>}
      />
    );
  };

  // 表格列定义
  const columns = [
    {
      title: '商户信息',
      key: 'merchant_info',
      width: 260,
      fixed: 'left' as const,
      render: (_: any, record: MerchantAuditRecord) => (
        <Space direction="vertical" size={2} style={{ gap: 4 }}>
          <Space align="center">
            <Avatar 
              size={36} 
              icon={<ShopOutlined />} 
              style={{ 
                backgroundColor: record.audit_status === 'pending' ? '#1890ff' : 
                                record.audit_status === 'approved' ? '#52c41a' : '#ff4d4f'
              }}
            />
            <div>
              <div style={{ fontWeight: 600, fontSize: 15 }}>{record.merchant_name}</div>
              <div style={{ fontSize: 12, color: '#8c8c8c' }}>ID: {record.user_id}</div>
            </div>
          </Space>
          <div style={{ marginLeft: 44, fontSize: 13, color: '#595959' }}>
            <PhoneOutlined style={{ marginRight: 6 }} />
            {record.phone}
          </div>
        </Space>
      ),
    },
    {
      title: '申请理由',
      dataIndex: 'apply_reason',
      key: 'apply_reason',
      width: 220,
      ellipsis: {
        showTitle: false,
      },
      render: (text: string) => (
        <Tooltip placement="topLeft" title={text}>
          <span style={{ color: '#262626' }}>{text}</span>
        </Tooltip>
      ),
    },
    {
    title: '营业执照',
    dataIndex: 'license_image_url',
    key: 'license_image_url',
    width: 100,
    render: (url: string) => (
        url ? (
        <div style={{ position: 'relative' }}>
            <Image 
            src={url.startsWith('http') ? url : `http://localhost:3000${url}`} 
            width={50} 
            height={50}
            style={{ 
                borderRadius: 6, 
                objectFit: 'cover',
                border: '1px solid #f0f0f0'
            }}
            fallback="/images/fallback.png"
            preview={{
                mask: <EyeOutlined />,
                src: url.startsWith('http') ? url : `http://localhost:3000${url}`
            }}
            />
        </div>
        ) : (
        <Tag color="default">未上传</Tag>
        )
    ),
    },
    {
    title: '申请时间',
    dataIndex: 'apply_created_at', 
    key: 'apply_created_at',
    width: 160,
    render: (text: string, record: MerchantAuditRecord) => {
      // 使用 apply_created_at，如果不存在则回退到 created_at
      const dateStr = text || record.created_at;
      return (
        <span style={{ color: '#8c8c8c', fontSize: 13 }}>
          {dateStr ? new Date(dateStr).toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
          }) : '-'}
        </span>
      );
    },
     sorter: (a: MerchantAuditRecord, b: MerchantAuditRecord) => {
      const aDate = a.apply_created_at || a.created_at || '0';
      const bDate = b.apply_created_at || b.created_at || '0';
      return new Date(aDate).getTime() - new Date(bDate).getTime();
    },
  },
    {
      title: '审核状态',
      dataIndex: 'audit_status',
      key: 'audit_status',
      width: 120,
      render: (status: string) => renderStatusTag(status),
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      fixed: 'right' as const,
      render: (_: any, record: MerchantAuditRecord) => (
        <Button 
          type="primary" 
          ghost
          icon={<EyeOutlined />} 
          size="middle"
          onClick={() => {
            setSelectedRecord(record);
            setRejectReason(record.rejection_reason || '');
            setIsModalOpen(true);
          }}
          style={{ 
            borderRadius: 20,
            borderColor: '#1890ff',
            color: '#1890ff'
          }}
          disabled={record.audit_status !== 'pending'}
        >
          审核
        </Button>
      ),
    },
  ];

const todayPending = statistics.today_pending;

const pendingCount = statistics.merchant.pending;

  return (
    <div style={{ 
      padding: '24px',
      minHeight: '100vh',
      background: '#f0f2f5'
    }}>
      <Card 
        bordered={false}
        style={{
          borderRadius: 16,
          boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03), 0 1px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px 0 rgba(0, 0, 0, 0.02)'
        }}
      >
        {/* 页面标题 */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          marginBottom: 24,
          flexWrap: 'wrap',
          gap: 16
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 6,
              height: 28,
              background: 'linear-gradient(180deg, #1890ff 0%, #096dd9 100%)',
              borderRadius: 3
            }} />
            <Title level={3} style={{ margin: 0, fontWeight: 600, color: '#1e293b' }}>
              商户入驻审核
            </Title>
            <Tag color="blue" style={{ marginLeft: 8, borderRadius: 20, padding: '0 12px' }}>
              待审核: {pendingCount}
            </Tag>
          </div>
          <Statistic 
            title="今日待办" 
            value={todayPending} 
            suffix="项"
            valueStyle={{ color: '#1890ff', fontSize: 24 }}
          />
        </div>

        {/* 筛选表单 */}
        <Card 
          size="small" 
          style={{ 
            marginBottom: 24, 
            background: '#fafbfc',
            borderRadius: 12,
            border: '1px solid #f0f0f0'
          }}
          bodyStyle={{ padding: '20px 24px' }}
        >
          <Form layout="inline" style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
            <Form.Item label="商户名称" style={{ marginBottom: 0 }}>
              <Input 
                placeholder="请输入商户名" 
                allowClear 
                style={{ width: 200, borderRadius: 8 }}
                prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
                value={filters.keyword}
                onChange={(e) => {
                    const value = e.target.value;
                    // 更新UI状态
                    setFilters(prev => ({ ...prev, keyword: value }));
                    // 防抖搜索，传递最新的keyword
                    debouncedSearch(value);
                }}
                onPressEnter={() => {
                    setPagination(prev => ({ ...prev, current: 1 }));
                    // 直接使用当前的filters状态
                    fetchAuditList(1, pagination.pageSize, filters);
                }}
                />
            </Form.Item>
            <Form.Item label="审核状态" style={{ marginBottom: 0 }}>
              <Select 
                value={filters.status} 
                style={{ width: 140, borderRadius: 8 }}
                onChange={(value) => {
                    setFilters(prev => ({ ...prev, status: value }));
                     fetchAuditList(1, pagination.pageSize, { status: value });
                }}
                >
                <Option value="all">全部</Option>
                <Option value="pending">待审核</Option>
                <Option value="approved">已通过</Option>
                <Option value="rejected">已驳回</Option>
               </Select>
            </Form.Item>
            <Form.Item style={{ marginBottom: 0 }}>
              <Space>
                <Button 
                  type="primary" 
                  icon={<SearchOutlined />} 
                  onClick={handleSearch}
                  style={{ 
                    borderRadius: 8,
                    background: 'linear-gradient(145deg, #1890ff, #096dd9)',
                    border: 'none'
                  }}
                >
                  搜索
                </Button>
                <Button 
                  icon={<ReloadOutlined />} 
                  onClick={handleReset}
                  style={{ borderRadius: 8 }}
                >
                  重置
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Card>

        {/* 数据表格 */}
        <Table 
          columns={columns}
          dataSource={auditData}
          loading={tableLoading}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`,
            pageSizeOptions: ['10', '20', '50', '100'],
            onChange: (page, pageSize) => {
              setPagination({ ...pagination, current: page, pageSize });
              fetchAuditList(page, pageSize);
            }
          }}
          onChange={handleTableChange}
          scroll={{ x: 1200 }}
          rowKey="key"
          rowClassName={(record) => 
            record.audit_status === 'pending' ? 'row-pending' : ''
          }
          style={{ marginTop: 8 }}
          locale={{
            emptyText: (
              <Empty 
                image={Empty.PRESENTED_IMAGE_SIMPLE} 
                description={
                  <span style={{ color: '#8c8c8c' }}>
                    {filters.status === 'pending' ? '暂无待审核申请' : '暂无相关数据'}
                  </span>
                }
              />
            )
          }}
        />
      </Card>

      {/* 详情及审核弹窗 */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              width: 4,
              height: 20,
              background: '#1890ff',
              borderRadius: 2,
              display: 'inline-block'
            }} />
            <span style={{ fontSize: 18, fontWeight: 600 }}>商户入驻详情审批</span>
            {selectedRecord && (
              <Tag color={selectedRecord.audit_status === 'pending' ? 'processing' : 
                           selectedRecord.audit_status === 'approved' ? 'success' : 'error'}
                   style={{ marginLeft: 8 }}>
                {selectedRecord.audit_status === 'pending' ? '待审核' : 
                 selectedRecord.audit_status === 'approved' ? '已通过' : '已驳回'}
              </Tag>
            )}
          </div>
        }
        open={isModalOpen}
        onCancel={() => {
          setIsModalOpen(false);
          setRejectReason('');
          setSelectedRecord(null);
        }}
        width={700}
        footer={selectedRecord?.audit_status === 'pending' ? [
          <Button 
            key="close" 
            onClick={() => {
              setIsModalOpen(false);
              setRejectReason('');
              setSelectedRecord(null);
            }}
            style={{ borderRadius: 8 }}
          >
            取消
          </Button>,
          <Button 
            key="reject" 
            danger 
            icon={<CloseCircleOutlined />} 
            onClick={() => handleAudit('rejected')}
            loading={loading}
            style={{ borderRadius: 8 }}
          >
            驳回申请
          </Button>,
          <Button 
            key="approve" 
            type="primary" 
            icon={<CheckCircleOutlined />} 
            onClick={() => handleAudit('approved')}
            loading={loading}
            style={{ 
              borderRadius: 8,
              background: 'linear-gradient(145deg, #52c41a, #389e0d)',
              border: 'none'
            }}
          >
            通过申请
          </Button>,
        ] : [
          <Button 
            key="close" 
            type="primary" 
            onClick={() => {
              setIsModalOpen(false);
              setRejectReason('');
              setSelectedRecord(null);
            }}
            style={{ borderRadius: 8 }}
          >
            关 闭
          </Button>
        ]}
      >
        {selectedRecord && (
          <div style={{ padding: '16px 4px' }}>
            {/* 基本信息卡片 */}
            <Card 
              size="small" 
              style={{ 
                marginBottom: 24, 
                borderRadius: 12,
                background: '#fafafa',
                border: '1px solid #f0f0f0'
              }}
              bodyStyle={{ padding: '20px' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
                <Avatar 
                  size={48} 
                  icon={<ShopOutlined />} 
                  style={{ 
                    backgroundColor: '#1890ff',
                    marginRight: 16
                  }}
                />
                <div>
                  <div style={{ fontSize: 18, fontWeight: 600, color: '#1e293b' }}>
                    {selectedRecord.merchant_name}
                  </div>
                  <div style={{ display: 'flex', gap: 24, marginTop: 4, flexWrap: 'wrap' }}>
                    <Text type="secondary">
                      <UserOutlined style={{ marginRight: 6 }} />
                      ID: {selectedRecord.user_id}
                    </Text>
                    <Text type="secondary">
                      <PhoneOutlined style={{ marginRight: 6 }} />
                      {selectedRecord.phone}
                    </Text>
                  </div>
                </div>
              </div>
              
              <Divider style={{ margin: '16px 0' }} />
              
              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <div style={{ fontSize: 13, color: '#8c8c8c', marginBottom: 4 }}>申请时间</div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>
                    {selectedRecord.created_at ? new Date(selectedRecord.created_at).toLocaleString('zh-CN') : '-'}
                  </div>
                </Col>
                <Col span={12}>
                  <div style={{ fontSize: 13, color: '#8c8c8c', marginBottom: 4 }}>注册时间</div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>
                    {selectedRecord.registered_at 
                      ? new Date(selectedRecord.registered_at).toLocaleString('zh-CN')
                      : '-'}
                  </div>
                </Col>
              </Row>
            </Card>

            {/* 申请理由 */}
            <Card 
              size="small" 
              title={
                <Space>
                  <FileTextOutlined style={{ color: '#1890ff' }} />
                  <span style={{ fontSize: 15, fontWeight: 600 }}>申请理由</span>
                </Space>
              }
              style={{ marginBottom: 24, borderRadius: 12 }}
              headStyle={{ borderBottom: '1px solid #f0f0f0', padding: '12px 20px' }}
              bodyStyle={{ padding: '16px 20px', background: '#fafafa' }}
            >
              <div style={{ 
                background: '#fff', 
                padding: '16px 20px', 
                borderRadius: 8,
                border: '1px solid #f0f0f0',
                fontSize: 15,
                lineHeight: 1.6,
                color: '#262626'
              }}>
                {selectedRecord.apply_reason}
              </div>
            </Card>

            {/* 营业执照 */}
            <Card 
              size="small" 
              title={
                <Space>
                  <FileImageOutlined style={{ color: '#1890ff' }} />
                  <span style={{ fontSize: 15, fontWeight: 600 }}>营业执照</span>
                </Space>
              }
              style={{ marginBottom: 24, borderRadius: 12 }}
              headStyle={{ borderBottom: '1px solid #f0f0f0', padding: '12px 20px' }}
              bodyStyle={{ padding: '16px 20px', background: '#fafafa' }}
            >
              <div style={{ textAlign: 'center' }}>
                {selectedRecord.license_image_url ? (
                    <Image 
                    src={selectedRecord.license_image_url?.startsWith('http') 
                        ? selectedRecord.license_image_url 
                        : `http://localhost:3000${selectedRecord.license_image_url}`
                    } 
                    width={280}
                    style={{ 
                        borderRadius: 12,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
                    }}
                    fallback="/images/fallback.png"
                    />
                ) : (
                  <Empty 
                    image={Empty.PRESENTED_IMAGE_SIMPLE} 
                    description="商户未上传营业执照"
                  />
                )}
                <div style={{ marginTop: 8, color: '#8c8c8c', fontSize: 13 }}>
                  点击图片可查看原图
                </div>
              </div>
            </Card>

            {/* 驳回理由 */}
            {selectedRecord.audit_status === 'pending' ? (
              <Card 
                size="small" 
                title={
                  <Space>
                    <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
                    <span style={{ fontSize: 15, fontWeight: 600 }}>驳回理由</span>
                    <Text type="secondary" style={{ fontSize: 13, marginLeft: 8 }}>
                      （仅在驳回时必填）
                    </Text>
                  </Space>
                }
                style={{ borderRadius: 12, borderColor: '#ffccc7' }}
                headStyle={{ borderBottom: '1px solid #ffccc7', padding: '12px 20px' }}
                bodyStyle={{ padding: '16px 20px' }}
              >
                <TextArea 
                  rows={4} 
                  placeholder="请输入驳回具体原因，如：照片不清晰、资质已过期、信息不完整等" 
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  style={{ 
                    borderRadius: 8,
                    borderColor: '#d9d9d9',
                    resize: 'vertical'
                  }}
                  showCount
                  maxLength={200}
                />
                <div style={{ marginTop: 8, color: '#8c8c8c', fontSize: 13 }}>
                  驳回理由将在商户端展示，请清晰说明问题
                </div>
              </Card>
            ) : selectedRecord.audit_status === 'rejected' && selectedRecord.rejection_reason && (
              <Card 
                size="small" 
                title={
                  <Space>
                    <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
                    <span style={{ fontSize: 15, fontWeight: 600 }}>驳回原因</span>
                  </Space>
                }
                style={{ borderRadius: 12, background: '#fff2f0', borderColor: '#ffccc7' }}
                headStyle={{ borderBottom: '1px solid #ffccc7', padding: '12px 20px' }}
                bodyStyle={{ padding: '16px 20px' }}
              >
                <div style={{ 
                  color: '#ff4d4f',
                  background: '#fff',
                  padding: '12px 16px',
                  borderRadius: 8,
                  border: '1px solid #ffccc7'
                }}>
                  {selectedRecord.rejection_reason}
                </div>
              </Card>
            )}
          </div>
        )}
      </Modal>

      <style>{`
        .row-pending {
          background: #fff7e6;
          transition: all 0.3s;
        }
        .row-pending:hover {
          background: #ffe7ba !important;
        }
        .ant-table-row {
          cursor: pointer;
        }
        .ant-table-row:hover > td {
          background: #f5f5f5 !important;
        }
        .row-pending.ant-table-row:hover > td {
          background: #ffe7ba !important;
        }
      `}</style>
    </div>
  );
};

export default MerchantAudit;