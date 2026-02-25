import React, { useEffect, useState } from 'react';
import {
  Table, Button, Row, Col, Space, Tag, message, Card, Modal,
  Form, Input, InputNumber, Select, Popconfirm, Upload, Image
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CopyOutlined,
  UploadOutlined
} from '@ant-design/icons';
import axios from '../../services/axios';

const { Option } = Select;
const { TextArea } = Input;

// RoomTypes.tsx - 完整的接口定义
interface RoomType {
  room_type_id: number;
  hotel_id: number;
  name: string;
  name_en?: string;           // 英文名
  bed_info: string;            // 床型信息 (对应数据库 bed_info)
  area?: number;               // 面积
  max_guests: number;          // 最大入住人数 (对应数据库 max_guests)
  base_price: number;          // 基础价格
  breakfast: string;           // 早餐：none/single/double/multiple
  window: boolean;             // 是否有窗 (数据库用 1/0)
  total_rooms: number;         // 房间总数 (对应数据库 total_rooms)
  cover_url?: string;          // 封面图
  description?: string;        // 描述
  status: 'active' | 'inactive'; // 状态
}

interface Hotel {
  hotel_id: number;
  name_zh: string;
}

// 床型选项
const BED_TYPES = [
  { value: '1张1.8米大床', label: '1.8m大床' },
  { value: '1张2米大床', label: '2.0m大床' },
  { value: '1张2.2米特大床', label: '2.2m特大床' },
  { value: '2张1.2米单人床', label: '1.2m双床' },
  { value: '2张1.3米单人床', label: '1.3m双床' },
  { value: '2张1.5米双人床', label: '1.5m双床' },
  { value: '多床', label: '多床' },
  { value: '其他', label: '其他' },
];

// 早餐选项
const BREAKFAST_OPTIONS = [
  { value: 'none', label: '无早' },
  { value: 'single', label: '单早' },
  { value: 'double', label: '双早' },
  { value: 'multiple', label: '多早' },
];

// 状态选项
const STATUS_OPTIONS = [
  { value: 'active', label: '启用' },
  { value: 'inactive', label: '停用' },
];

// 窗户选项
const WINDOW_OPTIONS = [
  { value: true, label: '有窗' },
  { value: false, label: '无窗' },
];

const MerchantRoomTypes: React.FC = () => {
  const [form] = Form.useForm();
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [selectedHotelId, setSelectedHotelId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRoom, setEditingRoom] = useState<RoomType | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [coverImage, setCoverImage] = useState<string>('');

  useEffect(() => {
    fetchHotels();
  }, []);

  useEffect(() => {
    if (selectedHotelId) {
      fetchRoomTypes(selectedHotelId);
    }
  }, [selectedHotelId]);

  const fetchHotels = async () => {
    try {
      const res = await axios.get('/merchant/hotels');
      if (res.data.code === 200) {
        const hotelList = res.data.data || [];
        setHotels(hotelList);
        if (hotelList.length > 0) {
          setSelectedHotelId(hotelList[0].hotel_id);
        }
      }
    } catch (error) {
      message.error('获取酒店列表失败');
    }
  };

  const fetchRoomTypes = async (hotelId: number) => {
    setLoading(true);
    try {
      const res = await axios.get(`/merchant/room-types?hotel_id=${hotelId}`);
      if (res.data.code === 200) {
        // 确保数据类型正确
        const roomTypeList = (res.data.data || []).map((item: any) => ({
          ...item,
          base_price: parseFloat(item.base_price) || 0,
          max_guests: parseInt(item.max_guests) || 0,
          total_rooms: parseInt(item.total_rooms) || 0,
          area: item.area ? parseFloat(item.area) : undefined,
          window: item.window === true || item.window === 1,
        }));
        setRoomTypes(roomTypeList);
      }
    } catch (error) {
      message.error('获取房型列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingRoom(null);
    setCoverImage('');
    form.resetFields();
    // 设置默认值
    form.setFieldsValue({
      max_guests: 2,
      base_price: 0,
      total_rooms: 1,
      breakfast: 'none',
      window: true,
      status: 'active'
    });
    setModalVisible(true);
  };

  const handleEdit = (record: RoomType) => {
    setEditingRoom(record);
    setCoverImage(record.cover_url || '');
    // 设置所有字段
    form.setFieldsValue({
      name: record.name,
      name_en: record.name_en,
      bed_info: record.bed_info,
      area: record.area,
      max_guests: record.max_guests,
      base_price: record.base_price,
      breakfast: record.breakfast,
      window: record.window,
      total_rooms: record.total_rooms,
      description: record.description,
      status: record.status,
      cover_url: record.cover_url,
    });
    setModalVisible(true);
  };

  const handleDelete = async (roomTypeId: number) => {
    try {
      const res = await axios.delete(`/merchant/room-types/${roomTypeId}`);
      if (res.data.code === 200) {
        message.success('删除成功');
        if (selectedHotelId) {
          fetchRoomTypes(selectedHotelId);
        }
      }
    } catch (error) {
      message.error('删除失败');
    }
  };

  const handleCopy = (record: RoomType) => {
    setCoverImage('');
    form.resetFields();
    form.setFieldsValue({
      ...record,
      name: `${record.name} (复制)`,
      total_rooms: record.total_rooms,
    });
    setEditingRoom(null);
    setModalVisible(true);
  };

  // 上传图片
  const handleUploadImage = async () => {
    try {
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = 'image/*';
      fileInput.onchange = async (e: any) => {
        const file = e.target.files[0];
        if (!file) return;

        // 检查文件大小（限制5MB）
        if (file.size > 5 * 1024 * 1024) {
          message.error('图片不能超过5MB');
          return;
        }

        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = async () => {
          try {
            const base64 = reader.result as string;
            
            // 显示上传中提示
            message.loading('上传中...', 0);
            
            // 上传图片
            const uploadRes = await axios.post('/merchant/upload', {
              base64: base64,
              filename: file.name,
              type: 'media'
            });

            message.destroy();

            if (uploadRes.data.code === 200) {
              const imageUrl = uploadRes.data.relativeUrl || uploadRes.data.url;
              setCoverImage(imageUrl);
              form.setFieldValue('cover_url', imageUrl);
              message.success('图片上传成功');
            }
          } catch (error: any) {
            message.destroy();
            console.error('上传失败:', error);
            message.error(error.response?.data?.msg || '上传失败');
          }
        };
      };
      fileInput.click();
    } catch (error: any) {
      console.error('上传失败:', error);
      message.error(error.response?.data?.msg || '上传失败');
    }
  };

  // 移除图片
  const handleRemoveImage = () => {
    setCoverImage('');
    form.setFieldValue('cover_url', '');
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      
      // 构建提交数据
      const submitData = {
        hotel_id: selectedHotelId,
        name: values.name,
        name_en: values.name_en || '',
        bed_info: values.bed_info,
        area: values.area || null,
        max_guests: values.max_guests,
        base_price: values.base_price,
        breakfast: values.breakfast,
        window: values.window ? 1 : 0, // 转换为数字
        total_rooms: values.total_rooms,
        description: values.description || '',
        status: values.status,
        cover_url: coverImage || values.cover_url || null, // 使用coverImage状态或表单值
      };
      
      console.log('提交数据:', submitData);
      
      const url = editingRoom 
        ? `/merchant/room-types/${editingRoom.room_type_id}`
        : '/merchant/room-types';
      const method = editingRoom ? 'put' : 'post';
      
      const res = await axios[method](url, submitData);

      if (res.data.code === 200) {
        message.success(editingRoom ? '更新成功' : '创建成功');
        setModalVisible(false);
        if (selectedHotelId) {
          fetchRoomTypes(selectedHotelId);
        }
      }
    } catch (error: any) {
      console.error('提交失败:', error);
      message.error(error.response?.data?.msg || '操作失败');
    } finally {
      setSubmitting(false);
    }
  };

  // 表格列定义
  const columns = [
    {
      title: '房型图片',
      key: 'cover',
      width: 100,
      render: (_: any, record: RoomType) => (
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
      title: '房型名称',
      key: 'name',
      render: (_: any, record: RoomType) => (
        <Space direction="vertical" size={0}>
          <span>{record.name}</span>
          {record.name_en && <span style={{ fontSize: 12, color: '#999' }}>{record.name_en}</span>}
        </Space>
      )
    },
    {
      title: '床型',
      dataIndex: 'bed_info',
      key: 'bed_info',
    },
    {
      title: '面积',
      dataIndex: 'area',
      key: 'area',
      render: (area: number) => area ? `${area}㎡` : '-'
    },
    {
      title: '可住人数',
      dataIndex: 'max_guests',
      key: 'max_guests',
      render: (num: number) => `${num}人`
    },
    {
      title: '基础价格',
      dataIndex: 'base_price',
      key: 'base_price',
      render: (price: number) => {
        const numPrice = typeof price === 'string' ? parseFloat(price) : price;
        return !isNaN(numPrice) ? `¥${numPrice.toFixed(2)}` : '¥0.00';
      }
    },
    {
      title: '早餐',
      dataIndex: 'breakfast',
      key: 'breakfast',
      render: (value: string) => {
        const map: Record<string, string> = {
          'none': '无早',
          'single': '单早',
          'double': '双早',
          'multiple': '多早'
        };
        return map[value] || value;
      }
    },
    {
      title: '窗户',
      dataIndex: 'window',
      key: 'window',
      render: (has: boolean) => has ? '有窗' : '无窗'
    },
    {
      title: '数量',
      dataIndex: 'total_rooms',
      key: 'total_rooms',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'active' ? 'green' : 'default'}>
          {status === 'active' ? '启用' : '停用'}
        </Tag>
      )
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_: any, record: RoomType) => (
        <Space>
          <Button type="link" size="small" onClick={() => handleEdit(record)}>
            编辑
          </Button>
          <Button type="link" size="small" icon={<CopyOutlined />} onClick={() => handleCopy(record)}>
            复制
          </Button>
          <Popconfirm
            title="确定删除吗？"
            description="删除后不可恢复"
            onConfirm={() => handleDelete(record.room_type_id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" size="small" danger>
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
          <span>房型管理</span>
          {selectedHotelId && (
            <Tag color="blue">
              {hotels.find(h => h.hotel_id === selectedHotelId)?.name_zh}
            </Tag>
          )}
        </Space>
      }
      extra={
        <Space>
          <Select
            placeholder="选择酒店"
            value={selectedHotelId}
            onChange={setSelectedHotelId}
            style={{ width: 200 }}
          >
            {hotels.map(hotel => (
              <Option key={hotel.hotel_id} value={hotel.hotel_id}>
                {hotel.name_zh}
              </Option>
            ))}
          </Select>
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={handleAdd}
            disabled={!selectedHotelId}
          >
            新增房型
          </Button>
        </Space>
      }
    >
      {!selectedHotelId ? (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <p>请先选择酒店</p>
        </div>
      ) : (
        <Table
          columns={columns}
          dataSource={roomTypes}
          rowKey="room_type_id"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      )}

      {/* 新增/编辑弹窗 - 添加图片上传功能 */}
      <Modal
        title={editingRoom ? '编辑房型' : '新增房型'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => {
          setModalVisible(false);
          setCoverImage('');
        }}
        confirmLoading={submitting}
        width={700}
      >
        <Form
          form={form}
          layout="vertical"
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="name"
                label="房型名称"
                rules={[{ required: true, message: '请输入房型名称' }]}
              >
                <Input placeholder="如：豪华大床房" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="name_en" label="英文名称">
                <Input placeholder="Deluxe King Room" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="bed_info"
                label="床型"
                rules={[{ required: true, message: '请选择床型' }]}
              >
                <Select placeholder="请选择床型">
                  {BED_TYPES.map(type => (
                    <Option key={type.value} value={type.value}>
                      {type.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="area" label="面积(㎡)">
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="max_guests"
                label="最大入住人数"
                rules={[{ required: true, message: '请输入入住人数' }]}
              >
                <InputNumber min={1} max={10} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="base_price"
                label="基础价格"
                rules={[{ required: true, message: '请输入基础价格' }]}
              >
                <InputNumber 
                  min={0} 
                  step={0.01}
                  precision={2}
                  prefix="¥" 
                  style={{ width: '100%' }} 
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="total_rooms"
                label="房间数量"
                rules={[{ required: true, message: '请输入房间数量' }]}
              >
                <InputNumber min={1} max={999} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="breakfast" label="早餐" initialValue="none">
                <Select>
                  {BREAKFAST_OPTIONS.map(opt => (
                    <Option key={opt.value} value={opt.value}>
                      {opt.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="window" label="窗户" initialValue={true}>
                <Select>
                  {WINDOW_OPTIONS.map(opt => (
                    <Option key={String(opt.value)} value={opt.value}>
                      {opt.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="status" label="状态" initialValue="active">
                <Select>
                  {STATUS_OPTIONS.map(opt => (
                    <Option key={opt.value} value={opt.value}>
                      {opt.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          {/* 图片上传区域 */}
          <Form.Item label="房型图片">
            <Space direction="vertical" style={{ width: '100%' }}>
              {coverImage ? (
                <div style={{ position: 'relative', display: 'inline-block' }}>
                  <Image 
                    src={coverImage} 
                    width={200} 
                    height={150} 
                    style={{ objectFit: 'cover', borderRadius: 4 }} 
                  />
                  <Button 
                    danger 
                    size="small" 
                    style={{ position: 'absolute', top: 5, right: 5 }}
                    onClick={handleRemoveImage}
                  >
                    删除
                  </Button>
                </div>
              ) : (
                <div>
                  <Button icon={<UploadOutlined />} onClick={handleUploadImage}>
                    上传图片
                  </Button>
                  <span style={{ marginLeft: 16, color: '#999', fontSize: 13 }}>
                    建议尺寸 16:9，JPG/PNG，不超过5MB
                  </span>
                </div>
              )}
            </Space>
          </Form.Item>

          {/* 隐藏的cover_url字段 */}
          <Form.Item name="cover_url" hidden>
            <Input />
          </Form.Item>

          <Form.Item name="description" label="房型描述">
            <TextArea rows={3} placeholder="房型特色、设施等" />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default MerchantRoomTypes;