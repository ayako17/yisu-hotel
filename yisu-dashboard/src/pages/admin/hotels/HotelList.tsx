import React, { useState, useEffect } from 'react';
import { 
  Table, Tag, Space, Button, Card, Form, Input, Select, 
  Image, Rate, Popconfirm, message, Typography, Tooltip,
  Modal, Spin
} from 'antd';
import { 
  SearchOutlined, ReloadOutlined, StopOutlined, 
  CheckCircleOutlined, InfoCircleOutlined, EnvironmentOutlined,
  ExclamationCircleOutlined, LoadingOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import axios from 'axios';
import HotelDetailModal from './HotelDetailModal';

const { Title, Text } = Typography;
const { Option } = Select;

interface HotelRecord {
  key: string;
  hotel_id: number;
  name_zh: string;
  name_en?: string;
  city: string;
  star_rating: number;
  cover_url: string;
  status: 'approved' | 'offline' | 'pending' | 'rejected' | 'draft';
  merchant_name: string;
  merchant_id: number;
  created_at?: string;
  address?: string;
}

interface CityOption {
  city: string;
  hotel_count?: number;
  online_count?: number;
}

const HotelList: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [citiesLoading, setCitiesLoading] = useState(false);
  const [data, setData] = useState<HotelRecord[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [cityOptions] = useState<CityOption[]>([]);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [searchForm] = Form.useForm();
  const [detailVisible, setDetailVisible] = useState(false);
  const [currentHotelId, setCurrentHotelId] = useState<number | null>(null);
  const [batchSelected, setBatchSelected] = useState<React.Key[]>([]);

  // 获取城市列表
  const fetchCities = async () => {
    setCitiesLoading(true);
    try {
      // 方式1：获取简单城市列表
      const response = await axios.get('http://localhost:3000/api/admin/hotels/cities', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.data.code === 200) {
        setCities(response.data.data);
      }

      // 方式2：获取带统计的城市列表（可选）
      // const response2 = await axios.get('http://localhost:3000/api/admin/hotels/cities/with-count', {
      //   headers: {
      //     'Authorization': `Bearer ${localStorage.getItem('token')}`
      //   }
      // });
      // if (response2.data.code === 200) {
      //   setCityOptions(response2.data.data);
      // }
      
    } catch (error: any) {
      console.error('获取城市列表失败:', error);
      // 静态数据作为后备
      setCities(['北京', '上海', '广州', '深圳', '杭州', '成都', '南京', '武汉', '西安', '重庆']);
    } finally {
      setCitiesLoading(false);
    }
  };

  // 获取酒店列表
  const fetchHotels = async (page = 1, pageSize = 10) => {
    setLoading(true);
    try {
      const values = await searchForm.validateFields().catch(() => ({}));
      
      const params: any = {
        page,
        pageSize,
      };
      
      if (values.city && values.city !== 'all') params.city = values.city;
      if (values.keyword) params.keyword = values.keyword;
      if (values.status && values.status !== 'all') params.status = values.status;
      
      console.log('发送请求参数:', params);
      
      const response = await axios.get('http://localhost:3000/api/admin/hotels', {
        params,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      console.log('获取酒店列表响应:', response.data);
      
      if (response.data.code === 200) {
        const responseData = response.data.data || [];
        const formattedData = responseData.map((item: any) => ({
          ...item,
          key: item.hotel_id.toString(),
        }));
        
        setData(formattedData);
        setPagination({
          current: response.data.page || page,
          pageSize: response.data.pageSize || pageSize,
          total: response.data.total || formattedData.length,
        });
      } else {
        message.error(response.data.msg || '获取酒店列表失败');
      }
    } catch (error: any) {
      console.error('获取酒店列表错误:', error);
      message.error(error.response?.data?.msg || '获取酒店列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHotels();
    fetchCities(); // 加载城市列表
  }, []);

  // 处理状态变更
  const handleStatusChange = async (record: HotelRecord, action: 'offline' | 'online') => {
    setLoading(true);
    try {
      const url = action === 'offline' 
        ? `http://localhost:3000/api/admin/hotels/${record.hotel_id}/offline`
        : `http://localhost:3000/api/admin/hotels/${record.hotel_id}/online`;
      
      const response = await axios.post(url, {}, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.data.code === 200) {
        message.success(response.data.msg || `酒店已成功${action === 'offline' ? '下线' : '上线'}`);
        fetchHotels(pagination.current, pagination.pageSize);
      } else {
        message.error(response.data.msg || '操作失败');
      }
    } catch (error: any) {
      message.error(error.response?.data?.msg || '操作失败');
    } finally {
      setLoading(false);
    }
  };

  // 批量下线
  const handleBatchOffline = async () => {
    if (batchSelected.length === 0) {
      message.warning('请至少选择一家酒店');
      return;
    }

    Modal.confirm({
      title: '批量下线确认',
      icon: <ExclamationCircleOutlined />,
      content: `确定要下线选中的 ${batchSelected.length} 家酒店吗？下线后用户将无法搜索到这些酒店。`,
      onOk: async () => {
        setLoading(true);
        try {
          const response = await axios.post('http://localhost:3000/api/admin/hotels/batch/offline', {
            hotel_ids: batchSelected
          }, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          });
          
          if (response.data.code === 200) {
            message.success(response.data.msg);
            setBatchSelected([]);
            fetchHotels(pagination.current, pagination.pageSize);
          } else {
            message.error(response.data.msg || '批量操作失败');
          }
        } catch (error: any) {
          message.error(error.response?.data?.msg || '批量操作失败');
        } finally {
          setLoading(false);
        }
      },
    });
  };

  // 获取酒店详情
  const fetchHotelDetail = async (hotelId: number) => {
    try {
      console.log('获取酒店详情, ID:', hotelId);
      const response = await axios.get(`http://localhost:3000/api/admin/hotels/${hotelId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      console.log('酒店详情响应:', response.data);
      
      if (response.data.code === 200) {
        return response.data.data;
      } else {
        message.error(response.data.msg || '获取详情失败');
        return null;
      }
    } catch (error: any) {
      console.error('获取酒店详情错误:', error);
      message.error(error.response?.data?.msg || '获取详情失败');
      return null;
    }
  };

  // 查看详情
  const handleViewDetail = (hotelId: number) => {
    console.log('查看详情, hotelId:', hotelId);
    setCurrentHotelId(hotelId);
    setDetailVisible(true);
  };

  // 表格列定义
  const columns: ColumnsType<HotelRecord> = [
    {
      title: '酒店详情',
      key: 'hotel_info',
      width: 300,
      render: (_, record) => (
        <Space size="middle">
          <Image 
            src={record.cover_url} 
            width={80} 
            height={60} 
            style={{ borderRadius: 4, objectFit: 'cover' }}
            fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMIAAADDCAYAAADQvc6UAAABRWlDQ1BJQ0MgUHJvZmlsZQAAKJFjYGASSSwoyGFhYGDIzSspCnJ3UoiIjFJgf8LAwSDCIMogwMCcmFxc4BgQ4ANUwgCjUcG3awyMIPqyLsis7PPOq3QdDFcvjV3jOD1boQVTPQrgSkktTgbSf4A4LbmgqISBgTEFyFYuLykAsTuAbJEioKOA7DkgdjqEvQHEToKwj4DVhAQ5A9k3gGyB5IxEoBmML4BsnSQk8XQkNtReEOBxcfXxUQg1Mjc0dyHgXNJBSWpFCYh2zi+oLMpMzyhRcASGUqqCZ16yno6CkYGRAQMDKMwhqj/fAIcloxgHQqxAjIHBEugw5sUIsSQpBobtQPdLciLEVJYzMPBHMDBsayhILEqEO4DxG0txmrERhM29nYGBddr//5/DGRjYNRkY/l7////39v///y4Dmn+LgeHgA+Q3kwWuaTFhcAAAAHiczVJbS8JAEH6NpZKlYアメリIRRBVEERVIvRfdRVEK0oItRJEEQQUVU9N/q7O5uRvPiLgR9mZ2d+XZmvm9GVpIldDwSqSoVjapulEiqXFEjHhuI5+e3yfnUsh28hEmsEkhggF4q44aG2JQI2bLtGxTnuLDP5wJuXE2YZZdoJzG2Iczm4Ey5+PADLrV51UZqYhIAc+rEUXGpmSp5C7qe3PlskA+TN1VRN8lK1mM/9xXmQrivKGYRl0gOswxpgk6uKmt4Lbqy0Em+CxRsDajjWCWv4Do8Y5ePiuoovUdxsfADdXckJ6jWgIgNxEG1565DntVULddsXU/fojRBlEfvcPo6bIu138GuY1HgwyOX36JqOCQO3A9aLBogMRphRP4X2i3GQ/Yr8IPv8IEHAAJdk5BkqL5x3mFJ/9BpJh+O4Qexu9kC8R1WlR2V2Zt0QkHyixIqoJQJKiVnLKVRdEoSzW+4qUp6v2e6ZE1q5V/hhQFSfB8Bf4XhpodYA+RT7bMOZQOaPq0p/0qkJJyYcp0j2EVZ9FKunW8Q0jQAAAABJRU5ErkJggg=="
          />
          <div>
            <div style={{ fontWeight: 'bold', fontSize: 14 }}>{record.name_zh}</div>
            <Text type="secondary" style={{ fontSize: 12 }}>ID: {record.hotel_id}</Text>
            {record.name_en && (
              <div style={{ fontSize: 12, color: '#999' }}>{record.name_en}</div>
            )}
          </div>
        </Space>
      ),
    },
    {
      title: '所在城市',
      dataIndex: 'city',
      width: 120,
      render: (city: string) => <Space><EnvironmentOutlined />{city || '未知'}</Space>,
      sorter: (a, b) => (a.city || '').localeCompare(b.city || ''), // 添加排序
    },
    {
      title: '星级',
      dataIndex: 'star_rating',
      width: 150,
      render: (rate: number) => <Rate disabled defaultValue={rate} style={{ fontSize: 12 }} />,
      sorter: (a, b) => a.star_rating - b.star_rating, // 添加排序
    },
    {
      title: '所属商户',
      dataIndex: 'merchant_name',
      width: 150,
      render: (name: string, record) => (
        <Tooltip title={`商户ID: ${record.merchant_id}`}>
          <span>{name}</span>
        </Tooltip>
      )
    },
    {
      title: '运营状态',
      dataIndex: 'status',
      width: 120,
      render: (status: string) => {
        const statusMap = {
          'approved': <Tag color="green">运营中</Tag>,
          'offline': <Tag color="default">已下线</Tag>,
          'pending': <Tag color="orange">审核中</Tag>,
          'rejected': <Tag color="red">已驳回</Tag>,
          'draft': <Tag color="blue">草稿</Tag>
        };
        return statusMap[status as keyof typeof statusMap] || <Tag>{status}</Tag>;
      },
      filters: [ // 添加状态筛选
        { text: '运营中', value: 'approved' },
        { text: '已下线', value: 'offline' },
        { text: '审核中', value: 'pending' },
        { text: '已驳回', value: 'rejected' },
        { text: '草稿', value: 'draft' },
      ],
      onFilter: (value, record) => record.status === value,
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_, record) => (
        <Space>
          <Button 
            type="link" 
            icon={<InfoCircleOutlined />}
            onClick={() => handleViewDetail(record.hotel_id)}
          >
            详情
          </Button>
          
          {record.status === 'approved' && (
            <Popconfirm
              title="确定要下线该酒店吗？"
              description="下线后用户将无法在客户端搜索并预订该酒店。"
              onConfirm={() => handleStatusChange(record, 'offline')}
              okText="确定"
              cancelText="取消"
            >
              <Button type="link" danger icon={<StopOutlined />}>
                下线
              </Button>
            </Popconfirm>
          )}
          
          {record.status === 'offline' && (
            <Popconfirm
              title="确定要恢复上线该酒店吗？"
              description="恢复后用户将可以在客户端搜索并预订该酒店。"
              onConfirm={() => handleStatusChange(record, 'online')}
              okText="确定"
              cancelText="取消"
            >
              <Button type="link" icon={<CheckCircleOutlined />}>
                上线
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  // 表格选择配置
  const rowSelection = {
    selectedRowKeys: batchSelected,
    onChange: (selectedRowKeys: React.Key[]) => {
      setBatchSelected(selectedRowKeys);
    },
    getCheckboxProps: (record: HotelRecord) => ({
      disabled: record.status !== 'approved',
    }),
  };

  return (
    <Card variant="borderless">
      <Title level={4} style={{ marginBottom: 24 }}>酒店资源监管</Title>
      
      {/* 搜索表单 */}
      <Form 
        form={searchForm}
        layout="inline" 
        style={{ marginBottom: 24 }}
        onFinish={() => fetchHotels(1, pagination.pageSize)}
      >
        <Form.Item name="keyword" label="酒店名称">
          <Input 
            placeholder="请输入酒店名称/ID" 
            allowClear 
            style={{ width: 200 }} 
            suffix={loading ? <LoadingOutlined /> : <SearchOutlined />}
          />
        </Form.Item>
        
        <Form.Item name="city" label="城市">
          <Select 
            placeholder="全部城市" 
            style={{ width: 150 }} 
            allowClear
            loading={citiesLoading}
            showSearch
            optionFilterProp="children"
            notFoundContent={citiesLoading ? <Spin size="small" /> : '暂无城市'}
          >
            {cities.map(city => (
              <Option key={city} value={city}>
                {city}
              </Option>
            ))}
          </Select>
        </Form.Item>
        
        <Form.Item name="status" label="状态">
          <Select placeholder="全部状态" style={{ width: 120 }} allowClear>
            <Option value="approved">运营中</Option>
            <Option value="offline">已下线</Option>
            <Option value="pending">审核中</Option>
            <Option value="rejected">已驳回</Option>
            <Option value="draft">草稿</Option>
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
              fetchHotels(1, pagination.pageSize);
            }}
          >
            重置
          </Button>
        </Form.Item>
      </Form>

      {/* 批量操作栏 */}
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Button 
            type="primary" 
            danger 
            icon={<StopOutlined />}
            onClick={handleBatchOffline}
            disabled={batchSelected.length === 0}
          >
            批量下线 ({batchSelected.length})
          </Button>
        </div>
        <div>
          <Text type="secondary">
            共 {pagination.total} 家酒店
            {cityOptions.length > 0 && (
              <span style={{ marginLeft: 8 }}>
                | 覆盖 {cityOptions.length} 个城市
              </span>
            )}
          </Text>
        </div>
      </div>

      {/* 数据表格 */}
      <Table
        rowSelection={rowSelection}
        columns={columns}
        dataSource={data}
        loading={loading}
        pagination={{
          ...pagination,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => `共 ${total} 条记录`,
          onChange: (page, pageSize) => fetchHotels(page, pageSize),
        }}
        scroll={{ x: 1200 }}
        size="middle"
      />

      {/* 详情弹窗 */}
      <HotelDetailModal
        visible={detailVisible}
        hotelId={currentHotelId}
        onClose={() => {
          setDetailVisible(false);
          setCurrentHotelId(null);
        }}
        onStatusChange={() => fetchHotels(pagination.current, pagination.pageSize)}
        fetchHotelDetail={fetchHotelDetail}
      />
    </Card>
  );
};

export default HotelList;