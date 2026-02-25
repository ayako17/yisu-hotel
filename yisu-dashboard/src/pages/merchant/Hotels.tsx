import React, { useEffect, useState } from 'react';
import { 
  Table, Button, Space, Tag, message, Card, 
  Input, Select, Row, Col, Tooltip, Popconfirm, Image 
} from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  EyeOutlined,
  SearchOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  StopOutlined,
  EnvironmentOutlined,
  StarOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import axios from '../../services/axios';
import dayjs from 'dayjs';

const { Option } = Select;

interface Hotel {
  hotel_id: number;
  merchant_id: number;
  name_zh: string;
  name_en?: string | null;
  phone: string;
  star_rating: number;
  province: string | null;
  city: string | null;
  address: string;
  latitude: number | null;
  longitude: number | null;
  description: string | null;
  cover_url: string | null;
  opening_date: string | null;
  status: 'draft' | 'pending' | 'approved' | 'rejected' | 'offline';
  created_at: string;
  updated_at: string;
}

const MerchantHotels: React.FC = () => {
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const navigate = useNavigate();

  useEffect(() => {
    fetchHotels();
  }, []);

  const fetchHotels = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/merchant/hotels');
      if (res.data.code === 200) {
        setHotels(res.data.data || []);
      }
    } catch (error) {
      message.error('获取酒店列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (hotelId: number) => {
    try {
      const res = await axios.delete(`/merchant/hotels/${hotelId}`);
      if (res.data.code === 200) {
        message.success('删除成功');
        fetchHotels();
      }
    } catch (error) {
      message.error('删除失败');
    }
  };

  const getStatusTag = (status: string, reason?: string | null) => {
    // 根据数据库中的状态值显示对应的标签
    const statusMap: Record<string, { color: string; text: string; icon?: React.ReactNode }> = {
      'approved': { color: 'green', text: '已上线' },
      'pending': { color: 'orange', text: '审核中' },
      'draft': { color: 'default', text: '草稿' },
      'rejected': { color: 'red', text: '已驳回' },
      'offline': { color: 'default', text: '已下线', icon: <StopOutlined /> }
    };
    
    const item = statusMap[status] || { color: 'default', text: status };
    
    if (status === 'rejected' && reason) {
      return (
        <Tooltip title={`驳回原因：${reason}`}>
          <Tag color={item.color} icon={item.icon}>{item.text}</Tag>
        </Tooltip>
      );
    }
    return <Tag color={item.color} icon={item.icon}>{item.text}</Tag>;
  };

  const filteredHotels = hotels.filter(hotel => {
    const matchesSearch = hotel.name_zh.toLowerCase().includes(searchText.toLowerCase()) ||
                         hotel.address?.toLowerCase().includes(searchText.toLowerCase()) ||
                         hotel.phone?.includes(searchText);
    const matchesStatus = statusFilter === 'all' || hotel.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleSubmitAudit = async (hotelId: number) => {
    try {
      const res = await axios.post(`/merchant/hotels/${hotelId}/submit-audit`);
      if (res.data.code === 200) {
        message.success('提交成功，等待审核');
        fetchHotels();
      }
    } catch (error: any) {
      message.error(error.response?.data?.msg || '提交失败');
    }
  };

  // 表格列定义 - 只显示数据库中的字段
  const columns = [
    {
      title: '酒店封面',
      key: 'cover',
      width: 100,
      render: (_: any, record: Hotel) => (
        record.cover_url ? (
          <Image 
            src={record.cover_url} 
            width={60} 
            height={60} 
            style={{ objectFit: 'cover', borderRadius: 4 }}
            fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMIAAADDCAYAAADQvc6UAAABRWlDQ1BJQ0MgUHJvZmlsZQAAKJFjYGASSSwoyGFhYGDIzSspCnJ3UoiIjFJgf8LAwSDCIMogwMCcmFxc4BgQ4ANUwgCjUcG3awyMIPqyLsis7PPOq3QdDFcvjV3jOD1boQVTPQrgSkktTgbSf4A4LbmgqISBgTEFyFYuLykAsTuAbJEioKOA7DkgdjqEvQHEToKwj4DVhAQ5A9k3gGyB5IxEoBmML4BsnSQk8XQkNtReEOBxcfXxUQg1Mjc0dyHgXNJBSWpFCYh2zi+oLMpMzyhRcASGUqqCZ16yno6CkYGRAQMDKMwhqj/fAIcloxgHQqxAjIHBEugw5sUIsSQpBobtQPdLciLEVJYzMPBHMDBsayhILEqEO4DxG0txmrERhM29nYGBddr//5/DGRjYNRkY/l7////39v///y4Dmn+LgeHgA+Q3kwWuaTFhcAAAAHiczVJbS8JAEH6NpZKlYAmeriIRRBVEERVIvRfdRVEK0oItRJEEQQUVU9N/q7O5uRvPiLgR9mZ2d+XZmvm9GVpIldDwSqSoVjapulEiqXFEjHhuI5+e3yfnUsh28hEmsEkhggF4q44aG2JQI2bLtGxTnuLDP5wJuXE2YZZdoJzG2Iczm4Ey5+PADLrV51UZqYhIAc+rEUXGpmSp5C7qe3PlskA+TN1VRN8lK1mM/9xXmQrivKGYRl0gOswxpgk6uKmt4Lbqy0Em+CxRsDajjWCWv4Do8Y5ePiuoovUdxsfADdXckJ6jWgIgNxEG1565DntVULddsXU/fojRBlEfvcPo6bIu138GuY1HgwyOX36JqOCQO3A9aLBogMRphRP4X2i3GQ/Yr8IPv8IEHAAJdk5BkqL5x3mFJ/9BpJh+O4Qexu9kC8R1WlR2V2Zt0QkHyixIqoJQJKiVnLKVRdEoSzW+4qUp6v2e6ZE1q5V/hhQFSfB8Bf4XhpodYA+RT7bMOZQOaPq0p/0qkJJyYcp0j2EVZ9FKunW8Q0jQAAAABJRU5ErkJggg=="
          />
        ) : (
          <div style={{ 
            width: 60, 
            height: 60, 
            backgroundColor: '#f5f5f5', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            borderRadius: 4,
            color: '#999',
            fontSize: 12
          }}>
            暂无图片
          </div>
        )
      )
    },
    {
      title: '酒店名称',
      key: 'name',
      width: 200,
      render: (_: any, record: Hotel) => (
        <Space direction="vertical" size={0}>
          <span style={{ fontWeight: 500 }}>{record.name_zh}</span>
          {record.name_en && <span style={{ fontSize: 12, color: '#999' }}>{record.name_en}</span>}
          <span style={{ fontSize: 12, color: '#999' }}>ID: {record.hotel_id}</span>
        </Space>
      )
    },
    {
      title: '星级',
      dataIndex: 'star_rating',
      key: 'star_rating',
      width: 100,
      render: (rating: number) => (
        <Space>
          <StarOutlined style={{ color: '#faad14' }} />
          <span>{rating}星</span>
        </Space>
      )
    },
    {
      title: '联系电话',
      dataIndex: 'phone',
      key: 'phone',
      width: 150,
      render: (phone: string) => phone || '-'
    },
    {
      title: '地址',
      key: 'address',
      width: 250,
      render: (_: any, record: Hotel) => {
        const fullAddress = [record.province, record.city, record.address].filter(Boolean).join('');
        return (
          <Tooltip title={fullAddress}>
            <Space>
              <EnvironmentOutlined style={{ color: '#1890ff' }} />
              <span className="ellipsis" style={{ maxWidth: 200 }}>{fullAddress || '-'}</span>
            </Space>
          </Tooltip>
        );
      }
    },
    {
      title: '开业日期',
      dataIndex: 'opening_date',
      key: 'opening_date',
      width: 120,
      render: (date: string | null) => date ? dayjs(date).format('YYYY-MM-DD') : '-'
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string, record: Hotel) => getStatusTag(status, record.description) // 如果有驳回原因字段需要添加
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 150,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm')
    },
    {
      title: '操作',
      key: 'action',
      width: 280,
      fixed: 'right' as const,
      render: (_: any, record: Hotel) => (
        <Space>
          <Button 
            type="link" 
            icon={<EditOutlined />}
            onClick={() => navigate(`/merchant/hotel-edit/${record.hotel_id}`)}
          >
            编辑
          </Button>
          {record.status === 'draft' && (
            <Button 
              type="link" 
              icon={<CheckCircleOutlined />}
              onClick={() => handleSubmitAudit(record.hotel_id)}
              style={{ color: '#fa8c16' }}
            >
              提交审核
            </Button>
          )}
          <Button 
            type="link" 
            icon={<EyeOutlined />}
            onClick={() => {
              console.log('预览酒店:', record.hotel_id);
              navigate(`/merchant/hotel-detail/${record.hotel_id}`);
            }}
          >
            预览
          </Button>
          <Popconfirm
            title="确定删除吗？"
            description="删除后不可恢复"
            onConfirm={() => handleDelete(record.hotel_id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <Card
      title={
        <Space>
          <span>酒店管理</span>
          <Tag color="blue">{hotels.length}</Tag>
        </Space>
      }
      extra={
        <Button 
          type="primary" 
          icon={<PlusOutlined />}
          onClick={() => navigate('/merchant/hotel-edit/new')}
        >
          新增酒店
        </Button>
      }
    >
      {/* 筛选栏 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={8}>
          <Input
            placeholder="搜索酒店名称/地址/电话"
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            allowClear
          />
        </Col>
        <Col span={6}>
          <Select 
            value={statusFilter} 
            onChange={setStatusFilter}
            style={{ width: '100%' }}
          >
            <Option value="all">全部状态</Option>
            <Option value="approved">已上线</Option>
            <Option value="pending">审核中</Option>
            <Option value="draft">草稿</Option>
            <Option value="rejected">已驳回</Option>
            <Option value="offline">已下线</Option>
          </Select>
        </Col>
        <Col span={10}>
          <Button icon={<ReloadOutlined />} onClick={fetchHotels}>
            刷新
          </Button>
        </Col>
      </Row>

      <Table
        columns={columns}
        dataSource={filteredHotels}
        rowKey="hotel_id"
        loading={loading}
        scroll={{ x: 1500 }}
        pagination={{ 
          pageSize: 10,
          showTotal: (total) => `共 ${total} 条记录`
        }}
      />
    </Card>
  );
};

export default MerchantHotels;