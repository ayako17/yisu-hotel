import React, { useEffect, useState } from 'react';
import {
  Form, Input, Button, Card, Tabs, Select, DatePicker,
  Space, message, Row, Col, Spin, Upload, Tag, Modal
} from 'antd';
import {
  SaveOutlined, ArrowLeftOutlined, PlusOutlined, WarningOutlined,
  DeleteOutlined, EnvironmentOutlined, UploadOutlined
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import axios from '../../services/axios';
import { pickAndUploadImage } from '../../utils/merchant';
import dayjs from 'dayjs';

const { TabPane } = Tabs;
const { Option } = Select;
const { TextArea } = Input;
const { confirm } = Modal;

// 星级选项
const STAR_OPTIONS = [
  { value: 5, label: '五星级/豪华型' },
  { value: 4, label: '四星级' },
  { value: 3, label: '三星级' },
  { value: 2, label: '二星级' },
  { value: 1, label: '一星级' },
];

interface HotelDetail {
  hotel_id: number;
  name_zh: string;
  name_en?: string;
  star_rating: number;
  opening_date?: string;
  address: string;
  latitude?: number;
  longitude?: number;
  description?: string;
  phone?: string;
  email?: string;
  website?: string;
  status: string;
  reject_reason?: string;
  media?: Array<{ media_url: string; is_cover: boolean }>;
  tag_ids?: number[];
}

interface Tag {
  tag_id: number;
  name: string;
  tag_type: 'facility' | 'special';
}

const HotelEdit: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const isNew = id === 'new';
  const [form] = Form.useForm();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [hotel, setHotel] = useState<HotelDetail | null>(null);
  const [mediaList, setMediaList] = useState<string[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [activeTab, setActiveTab] = useState('basic');

  useEffect(() => {
    fetchTags();
    if (!isNew) {
      fetchHotelDetail();
    }
  }, [id]);

// 在 fetchHotelDetail 函数中添加 province 和 city
const fetchHotelDetail = async () => {
  setLoading(true);
  try {
    const res = await axios.get(`/merchant/hotels/${id}/detail`);
    if (res.data.code === 200) {
      const data = res.data.data;
      setHotel(data);

      // 设置表单值 - 添加 province 和 city
      form.setFieldsValue({
        name_zh: data.name_zh,
        name_en: data.name_en,
        star_rating: data.star_rating,
        opening_date: data.opening_date ? dayjs(data.opening_date) : null,
        province: data.province,  // 添加省份
        city: data.city,          // 添加城市
        address: data.address,
        description: data.description,
        phone: data.phone,
        email: data.email,
        website: data.website,
        latitude: data.latitude,
        longitude: data.longitude
      });

      setMediaList(data.media?.map((m: any) => m.media_url) || []);
      setSelectedTagIds(data.tag_ids || []);
    }
  } catch (error) {
    message.error('加载酒店信息失败');
  } finally {
    setLoading(false);
  }
};

  const handleSubmitAudit = async () => {
    if (!id || id === 'new') return;

    Modal.confirm({
      title: '提交审核',
      content: '提交后酒店将进入审核流程，审核期间无法编辑。确定提交吗？',
      onOk: async () => {
        try {
          const res = await axios.post(`/merchant/hotels/${id}/submit-audit`);
          if (res.data.code === 200) {
            message.success('提交成功，请等待管理员审核');
            // 刷新酒店详情
            fetchHotelDetail();
          }
        } catch (error: any) {
          message.error(error.response?.data?.msg || '提交失败');
        }
      }
    });
  };

  const fetchTags = async () => {
    try {
      const res = await axios.get('/tags');
      if (res.data.code === 200) {
        setTags(res.data.data || []);
      } else if (Array.isArray(res.data)) {
        setTags(res.data);
      }
    } catch (error) {
      console.error('加载标签失败:', error);
      message.error('加载标签失败');
    }
  };

// 修改 handleSave 函数，确保保存 province 和 city
const handleSave = async (values: any) => {
  setSaving(true);
  try {
    const url = isNew ? '/merchant/hotels' : `/merchant/hotels/${id}`;
    const method = isNew ? 'post' : 'put';

    // 确保省/市字段被正确传递
    const submitData = {
      ...values,
      opening_date: values.opening_date?.format('YYYY-MM-DD'),
      province: values.province || null,
      city: values.city || null
    };

    const res = await axios[method](url, submitData);

    if (res.data.code === 200) {
      message.success(isNew ? '创建成功' : '保存成功');
      if (isNew) {
        navigate(`/merchant/hotel-edit/${res.data.data.hotel_id}`);
      } else {
        fetchHotelDetail();
      }
    }
  } catch (error: any) {
    message.error(error.response?.data?.msg || '保存失败');
  } finally {
    setSaving(false);
  }
};

  const handleAddImage = async () => {
    try {
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = 'image/*';
      fileInput.onchange = async (e: any) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = async () => {
          try {
            const base64 = reader.result as string;

            const uploadRes = await axios.post('/merchant/upload', {
              base64: base64,
              filename: file.name,
              type: 'media'
            });

            if (uploadRes.data.code === 200) {
              const imageUrl = uploadRes.data.relativeUrl || uploadRes.data.url;
              console.log('图片URL:', imageUrl);

              const newMediaList = [...mediaList, imageUrl];
              setMediaList(newMediaList);

              if (!isNew && id) {
                const mediaData = newMediaList.map((url, index) => ({
                  media_url: url,
                  is_cover: index === 0 ? 1 : 0,
                  sort_order: index
                }));

                const saveRes = await axios.put(`/merchant/hotels/${id}/media`, {
                  media: mediaData
                });

                if (saveRes.data.code === 200) {
                  message.success('图片上传成功');
                }
              } else {
                message.success('图片已添加，请保存酒店基本信息');
              }
            }
          } catch (error: any) {
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

  const handleRemoveImage = async (index: number) => {
    confirm({
      title: '确定删除这张图片吗？',
      onOk: async () => {
        const newMediaList = mediaList.filter((_, i) => i !== index);
        setMediaList(newMediaList);

        if (!isNew && id) {
          try {
            const mediaData = newMediaList.map((url, i) => ({
              media_url: url,
              is_cover: i === 0 ? 1 : 0,
              sort_order: i
            }));

            await axios.put(`/merchant/hotels/${id}/media`, {
              media: mediaData
            });
            message.success('删除成功');
          } catch (error) {
            message.error('删除失败');
          }
        }
      }
    });
  };

  // 统一的 handleSetCover 函数（只保留一个）
  const handleSetCover = async (index: number) => {
    const newMediaList = [...mediaList];
    const [removed] = newMediaList.splice(index, 1);
    newMediaList.unshift(removed);
    setMediaList(newMediaList);

    if (!isNew && id) {
      try {
        const mediaData = newMediaList.map((url, i) => ({
          media_url: url,
          is_cover: i === 0 ? 1 : 0,
          sort_order: i
        }));

        const res = await axios.put(`/merchant/hotels/${id}/media`, {
          media: mediaData
        });

        if (res.data.code === 200) {
          message.success('封面设置成功');
        }
      } catch (error) {
        message.error('封面设置失败');
      }
    }
  };

  const handleSaveTags = async () => {
    if (isNew || !id) {
      message.warning('请先保存酒店基本信息');
      return;
    }
    try {
      const res = await axios.put(`/merchant/hotels/${id}/tags`, {
        tag_ids: selectedTagIds
      });

      if (res.data.code === 200) {
        message.success('标签保存成功');
      } else {
        message.error(res.data.msg || '保存失败');
      }
    } catch (error: any) {
      console.error('保存标签失败:', error);
      message.error(error.response?.data?.msg || '保存失败');
    }
  };

const handleLocationCalibrate = () => {
  if (!navigator.geolocation) {
    message.error('浏览器不支持定位');
    return;
  }

  message.loading('定位中...', 0);
  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      message.destroy();
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;

      form.setFieldsValue({
        latitude: lat.toFixed(6),
        longitude: lng.toFixed(6)
      });

      const amapKey = '7a93a06d3d7f67723261689d91b770be';

      try {
        message.loading('正在获取详细地址...', 0);

        const response = await fetch(
          `https://restapi.amap.com/v3/geocode/regeo?output=json&location=${lng},${lat}&key=${amapKey}&extensions=all`
        );

        const data = await response.json();
        message.destroy();

        if (data.status === '1' && data.regeocode) {
          const component = data.regeocode.addressComponent;
          const address = data.regeocode.formatted_address;

          // 提取省、市信息
          const province = component.province || '';
          const city = component.city || component.province || ''; // 如果city为空，使用province
          const district = component.district || '';
          const street = component.streetNumber?.street || '';
          const streetNumber = component.streetNumber?.number || '';

          // 构建详细地址（不含省和市，避免重复）
          const detailedAddress = [district, street, streetNumber].filter(Boolean).join('');

          // 设置表单字段 - 分开设置省、市和详细地址
          form.setFieldsValue({
            province: province,
            city: city,
            address: detailedAddress || address.replace(province, '').replace(city, '').trim() || address
          });

          message.success('定位成功，省份/城市已自动填写');
        } else {
          message.success('定位成功，请手动填写地址信息');
        }
      } catch (error) {
        message.destroy();
        console.error('获取地址失败:', error);
        message.success('定位成功，请手动填写地址信息');
      }
    },
    (error) => {
      message.destroy();
      let errorMsg = '定位失败：';
      if (error.code === 1) {
        errorMsg += '请允许位置权限';
      } else if (error.code === 2) {
        errorMsg += '位置信息不可用';
      } else if (error.code === 3) {
        errorMsg += '定位超时';
      } else {
        errorMsg += error.message;
      }
      message.error(errorMsg);
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    }
  );
};

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 50 }}>
        <Spin size="large" />
      </div>
    );
  }

  const facilityTags = tags.filter(t => t.tag_type === 'facility');
  const specialTags = tags.filter(t => t.tag_type === 'special');

  return (
    <div>
      <Card
        title={
          <Space>
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate('/merchant/hotels')}
            >
              返回列表
            </Button>
            <span style={{ fontSize: 18, fontWeight: 500 }}>
              {isNew ? '新建酒店' : `编辑酒店：${hotel?.name_zh}`}
            </span>
          </Space>
        }
        extra={
          <Space>
            {hotel?.status === 'draft' && (
              <Button
                type="primary"
                onClick={handleSubmitAudit}
                style={{ background: '#fa8c16', borderColor: '#fa8c16' }}
              >
                提交审核
              </Button>
            )}
            {hotel?.status && (
              <Tag color={
                hotel.status === 'published' ? 'green' :
                  hotel.status === 'pending' ? 'orange' :
                    hotel.status === 'rejected' ? 'red' : 'default'
              }>
                {hotel.status === 'published' ? '已上线' :
                  hotel.status === 'pending' ? '审核中' :
                    hotel.status === 'rejected' ? '已驳回' : '草稿'}
              </Tag>
            )}
          </Space>
        }
      >
        {/* 驳回原因提示 */}
        {hotel?.status === 'rejected' && hotel.reject_reason && (
          <Card
            size="small"
            style={{
              marginBottom: 16,
              backgroundColor: '#fff2f0',
              borderColor: '#ffccc7',
              borderRadius: 6
            }}
          >
            <Space>
              <WarningOutlined style={{ color: '#ff4d4f' }} />
              <span style={{ color: '#ff4d4f', fontWeight: 500 }}>驳回原因：</span>
              <span style={{ color: '#666' }}>{hotel.reject_reason}</span>
            </Space>
          </Card>
        )}
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          {/* 基本信息 Tab */}
          <TabPane tab="基本信息" key="basic">
            <Form
              form={form}
              layout="vertical"
              onFinish={handleSave}
              initialValues={{
                star_rating: 5
              }}
              style={{ maxWidth: 800 }}
            >
              <Row gutter={24}>
                <Col span={12}>
                  <Form.Item
                    name="name_zh"
                    label="酒店中文名称"
                    rules={[{ required: true, message: '请输入酒店中文名称' }]}
                  >
                    <Input placeholder="与营业执照一致" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="name_en" label="酒店英文名称">
                    <Input placeholder="可选" />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={24}>
                <Col span={8}>
                  <Form.Item
                    name="star_rating"
                    label="酒店星级"
                    rules={[{ required: true }]}
                  >
                    <Select placeholder="请选择星级">
                      {STAR_OPTIONS.map(opt => (
                        <Option key={opt.value} value={opt.value}>
                          {opt.label}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="opening_date" label="开业日期">
                    <DatePicker style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="phone" label="联系电话">
                    <Input placeholder="前台电话" />
                  </Form.Item>
                </Col>
              </Row>

              {/* 省份和城市字段 */}
              <Row gutter={24}>
                <Col span={12}>
                  <Form.Item name="province" label="省份">
                    <Input 
                      placeholder="自动获取或手动填写" 
                      allowClear
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="city" label="城市">
                    <Input 
                      placeholder="自动获取或手动填写" 
                      allowClear
                    />
                  </Form.Item>
                </Col>
              </Row>

              {/* 详细地址 */}
              <Form.Item
                name="address"
                label="详细地址"
                rules={[{ required: true }]}
              >
                <Input placeholder="区/街道/门牌号" />
              </Form.Item>

              {/* 经纬度 */}
              <Row gutter={24}>
                <Col span={12}>
                  <Form.Item name="latitude" label="纬度">
                    <Input placeholder="如：31.2304" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="longitude" label="经度">
                    <Input placeholder="如：121.4737" />
                  </Form.Item>
                </Col>
              </Row>

              {/* 定位和地址生成按钮 */}
              <Form.Item>
                <Space wrap>
                  <Button
                    icon={<EnvironmentOutlined />}
                    onClick={handleLocationCalibrate}
                  >
                    使用当前位置定位
                  </Button>
                  <Button
                    icon={<EnvironmentOutlined />}
                    onClick={() => {
                      const province = form.getFieldValue('province');
                      const city = form.getFieldValue('city');
                      const currentAddress = form.getFieldValue('address') || '';
                      
                      if (province && city) {
                        // 如果地址已经包含省/市，就不重复添加
                        if (!currentAddress.includes(province) && !currentAddress.includes(city)) {
                          const fullAddress = `${province}${city}${currentAddress}`;
                          form.setFieldValue('address', fullAddress);
                          message.success('地址已组合完成');
                        } else {
                          message.info('地址已包含省/市信息');
                        }
                      } else {
                        message.warning('请先填写省份和城市');
                      }
                    }}
                  >
                    组合完整地址
                  </Button>
                </Space>
              </Form.Item>

              <Form.Item name="description" label="酒店简介">
                <TextArea rows={4} placeholder="酒店特色、服务介绍等" />
              </Form.Item>

              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  icon={<SaveOutlined />}
                  loading={saving}
                >
                  保存基本信息
                </Button>
              </Form.Item>
            </Form>
          </TabPane>

          {/* 图片管理 Tab */}
          <TabPane tab="图片管理" key="images">
            <Card>
              <div style={{ marginBottom: 16 }}>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={handleAddImage}
                >
                  上传图片
                </Button>
                <span style={{ marginLeft: 16, color: '#999' }}>
                  建议尺寸 16:9，JPG/PNG，单张不超过5MB
                </span>
              </div>

              <Row gutter={[16, 16]}>
                {mediaList.map((url, index) => (
                  <Col key={index} xs={12} sm={8} md={6} lg={4}>
                    <Card
                      cover={
                        <div>
                          <img
                            src={url}
                            alt={`酒店图片${index + 1}`}
                            style={{ height: 120, objectFit: 'cover' }}
                            onLoad={() => console.log('图片加载成功:', url)}
                            onError={(e) => {
                              console.error('图片加载失败:', url);
                              console.error('完整URL:', window.location.origin + url);
                              e.currentTarget.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMIAAADDCAYAAADQvc6UAAABRWlDQ1BJQ0MgUHJvZmlsZQAAKJFjYGASSSwoyGFhYGDIzSspCnJ3UoiIjFJgf8LAwSDCIMogwMCcmFxc4BgQ4ANUwgCjUcG3awyMIPqyLsis7PPOq3QdDFcvjV3jOD1boQVTPQrgSkktTgbSf4A4LbmgqISBgTEFyFYuLykAsTuAbJEioKOA7DkgdjqEvQHEToKwj4DVhAQ5A9k3gGyB5IxEoBmML4BsnSQk8XQkNtReEOBxcfXxUQg1Mjc0dyHgXNJBSWpFCYh2zi+oLMpMzyhRcASGUqqCZ16yno6CkYGRAQMDKMwhqj/fAIcloxgHQqxAjIHBEugw5sUIsSQpBobtQPdLciLEVJYzMPBHMDBsayhILEqEO4DxG0txmrERhM29nYGBddr//5/DGRjYNRkY/l7////39v///y4Dmn+LgeHgA+Q3kwWuaTFhcAAAAHiczVJbS8JAEH6NpZKlYAmeriIRRBVEERVIvRfdRVEK0oItRJEEQQUVU9N/q7O5uRvPiLgR9mZ2d+XZmvm9GVpIldDwSqSoVjapulEiqXFEjHhuI5+e3yfnUsh28hEmsEkhggF4q44aG2JQI2bLtGxTnuLDP5wJuXE2YZZdoJzG2Iczm4Ey5+PADLrV51UZqYhIAc+rEUXGpmSp5C7qe3PlskA+TN1VRN8lK1mM/9xXmQrivKGYRl0gOswxpgk6uKmt4Lbqy0Em+CxRsDajjWCWv4Do8Y5ePiuoovUdxsfADdXckJ6jWgIgNxEG1565DntVULddsXU/fojRBlEfvcPo6bIu138GuY1HgwyOX36JqOCQO3A9aLBogMRphRP4X2i3GQ/Yr8IPv8IEHAAJdk5BkqL5x3mFJ/9BpJh+O4Qexu9kC8R1WlR2V2Zt0QkHyixIqoJQJKiVnLKVRdEoSzW+4qUp6v2e6ZE1q5V/hhQFSfB8Bf4XhpodYA+RT7bMOZQOaPq0p/0qkJJyYcp0j2EVZ9FKunW8Q0jQAAAABJRU5ErkJggg==';
                            }}
                          />
                        </div>
                      }
                      size="small"
                      actions={[
                        <Button
                          type="link"
                          size="small"
                          disabled={index === 0}
                          onClick={() => handleSetCover(index)}
                        >
                          设封面
                        </Button>,
                        <Button
                          type="link"
                          danger
                          size="small"
                          onClick={() => handleRemoveImage(index)}
                        >
                          删除
                        </Button>
                      ]}
                    >
                      {index === 0 && <Tag color="green">封面</Tag>}
                    </Card>
                  </Col>
                ))}
              </Row>
            </Card>
          </TabPane>

          {/* 设施标签 Tab */}
          <TabPane tab="设施标签" key="tags">
            <Card
              title="通用设施"
              style={{ marginBottom: 16 }}
              extra={
                <Button
                  type="primary"
                  onClick={handleSaveTags}
                  disabled={isNew}
                >
                  保存标签
                </Button>
              }
            >
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {facilityTags.map(tag => (
                  <Tag.CheckableTag
                    key={tag.tag_id}
                    checked={selectedTagIds.includes(tag.tag_id)}
                    onChange={(checked) => {
                      setSelectedTagIds(prev =>
                        checked
                          ? [...prev, tag.tag_id]
                          : prev.filter(id => id !== tag.tag_id)
                      );
                    }}
                  >
                    {tag.name}
                  </Tag.CheckableTag>
                ))}
              </div>
            </Card>

            <Card title="特色标签">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {specialTags.map(tag => (
                  <Tag.CheckableTag
                    key={tag.tag_id}
                    checked={selectedTagIds.includes(tag.tag_id)}
                    onChange={(checked) => {
                      setSelectedTagIds(prev =>
                        checked
                          ? [...prev, tag.tag_id]
                          : prev.filter(id => id !== tag.tag_id)
                      );
                    }}
                  >
                    {tag.name}
                  </Tag.CheckableTag>
                ))}
              </div>
            </Card>
          </TabPane>
        </Tabs>
      </Card>
    </div>
  );
};

export default HotelEdit;