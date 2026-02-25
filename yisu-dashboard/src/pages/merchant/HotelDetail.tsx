// src/pages/merchant/HotelDetail.tsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Descriptions, Image, Tag, Spin, Space, Button,
  Rate, Tabs, Carousel, Row, Col, Typography, Divider,
  message, Breadcrumb, Empty, BackTop
} from 'antd';
import {
  EnvironmentOutlined, PhoneOutlined, StarOutlined,
  CalendarOutlined, HomeOutlined, SafetyOutlined,
  WifiOutlined, CarOutlined, CoffeeOutlined,
  ArrowLeftOutlined, EditOutlined, ShareAltOutlined,
  PrinterOutlined, DownloadOutlined, HeartOutlined,
  HeartFilled, RollbackOutlined
} from '@ant-design/icons';
import axios from '../../services/axios';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

interface HotelDetail {
  hotel_id: number;
  merchant_id: number;
  name_zh: string;
  name_en?: string;
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
  status: string;
  created_at: string;
  updated_at: string;
  media?: Array<{
    media_id: number;
    media_url: string;
    is_cover: number;
    sort_order: number;
  }>;
  tags?: Array<{
    tag_id: number;
    name: string;
    tag_type: string;
  }>;
}

const HotelDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [hotel, setHotel] = useState<HotelDetail | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    fetchHotelDetail();
    // 检查是否收藏（可以从localStorage或后端获取）
    const favorites = JSON.parse(localStorage.getItem('favoriteHotels') || '[]');
    setIsFavorite(favorites.includes(Number(id)));
  }, [id]);

  const fetchHotelDetail = async () => {
    setLoading(true);
    try {
      console.log('请求详情, hotel_id:', id);
      const res = await axios.get(`/merchant/hotel-detail/${id}`);
      console.log('响应数据:', res.data);
      
      if (res.data.code === 200) {
        setHotel(res.data.data);
        // 更新页面标题
        document.title = `${res.data.data.name_zh} - 酒店详情`;
      } else {
        message.error(res.data.msg || '获取酒店详情失败');
      }
    } catch (error: any) {
      console.error('获取酒店详情失败:', error);
      if (error.response?.status === 401) {
        message.error('登录已过期，请重新登录');
        navigate('/login');
      } else if (error.response?.status === 404) {
        message.error('酒店不存在');
      } else {
        message.error('获取酒店详情失败');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoBack = () => {
    navigate(-1); // 返回上一页
  };

  const handleGoToList = () => {
    navigate('/merchant/hotels'); // 返回列表页
  };

  const handleEdit = () => {
    navigate(`/merchant/hotel-edit/${id}`); // 跳转到编辑页
  };

  const handleToggleFavorite = () => {
    const favorites = JSON.parse(localStorage.getItem('favoriteHotels') || '[]');
    const hotelId = Number(id);
    
    if (isFavorite) {
      // 取消收藏
      const newFavorites = favorites.filter((favId: number) => favId !== hotelId);
      localStorage.setItem('favoriteHotels', JSON.stringify(newFavorites));
      message.success('已取消收藏');
    } else {
      // 添加收藏
      favorites.push(hotelId);
      localStorage.setItem('favoriteHotels', JSON.stringify(favorites));
      message.success('已添加到收藏');
    }
    
    setIsFavorite(!isFavorite);
  };

  const handleShare = () => {
    // 复制当前链接到剪贴板
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      message.success('链接已复制到剪贴板');
    }).catch(() => {
      message.error('复制失败');
    });
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 50, minHeight: '60vh' }}>
        <Spin size="large" tip="加载中..." />
      </div>
    );
  }

  if (!hotel) {
    return (
      <div style={{ textAlign: 'center', padding: 50, minHeight: '60vh' }}>
        <Empty
          description="酒店不存在"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        >
          <Button type="primary" onClick={handleGoToList}>
            返回酒店列表
          </Button>
        </Empty>
      </div>
    );
  }

  // 获取所有图片（包括封面）
  const allImages = hotel.media?.map(m => m.media_url) || [];
  if (hotel.cover_url && !allImages.includes(hotel.cover_url)) {
    allImages.unshift(hotel.cover_url);
  }

  // 根据标签类型分组
  const facilityTags = hotel.tags?.filter(t => t.tag_type === 'facility') || [];
  const specialTags = hotel.tags?.filter(t => t.tag_type === 'special') || [];

  // 获取状态标签颜色
  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'approved': 'green',
      'pending': 'orange',
      'offline': 'default',
      'rejected': 'red',
      'draft': 'blue'
    };
    return colors[status] || 'default';
  };

  // 获取状态文本
  const getStatusText = (status: string) => {
    const texts: Record<string, string> = {
      'approved': '营业中',
      'pending': '审核中',
      'offline': '已下线',
      'rejected': '已驳回',
      'draft': '草稿'
    };
    return texts[status] || status;
  };

  return (
    <div style={{ 
      padding: 24, 
      maxWidth: 1400, 
      margin: '0 auto',
      position: 'relative'
    }}>
      {/* 返回顶部按钮 */}
      <BackTop />
      
      {/* 面包屑导航 */}
      <Breadcrumb style={{ marginBottom: 16 }}>
        <Breadcrumb.Item>
          <a onClick={handleGoToList}>酒店管理</a>
        </Breadcrumb.Item>
        <Breadcrumb.Item>酒店详情</Breadcrumb.Item>
      </Breadcrumb>

      {/* 顶部操作栏 */}
      <Card style={{ marginBottom: 24 }}>
        <Row align="middle" justify="space-between">
          <Col>
            <Space size="middle">
              <Button 
                icon={<ArrowLeftOutlined />} 
                onClick={handleGoBack}
              >
                返回
              </Button>
              <Button 
                icon={<RollbackOutlined />} 
                onClick={handleGoToList}
              >
                返回列表
              </Button>
              <Divider type="vertical" style={{ height: 30 }} />
              <Title level={4} style={{ margin: 0 }}>
                酒店详情
              </Title>
            </Space>
          </Col>
          <Col>
            <Space>
              <Button 
                icon={isFavorite ? <HeartFilled style={{ color: '#ff4d4f' }} /> : <HeartOutlined />}
                onClick={handleToggleFavorite}
              >
                {isFavorite ? '已收藏' : '收藏'}
              </Button>
              <Button icon={<ShareAltOutlined />} onClick={handleShare}>
                分享
              </Button>
              <Button icon={<PrinterOutlined />} onClick={handlePrint}>
                打印
              </Button>
              <Button 
                type="primary" 
                icon={<EditOutlined />}
                onClick={handleEdit}
              >
                编辑酒店
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 酒店名称和星级 */}
      <Card style={{ marginBottom: 24 }}>
        <Row align="middle" justify="space-between">
          <Col>
            <Title level={2} style={{ marginBottom: 8 }}>
              {hotel.name_zh}
              {hotel.name_en && (
                <Text type="secondary" style={{ marginLeft: 16, fontSize: 16 }}>
                  {hotel.name_en}
                </Text>
              )}
            </Title>
            <Space size="large" wrap>
              <Space>
                <StarOutlined style={{ color: '#faad14' }} />
                <Rate disabled defaultValue={hotel.star_rating} />
              </Space>
              <Text type="secondary">酒店ID: {hotel.hotel_id}</Text>
              <Text type="secondary">商户ID: {hotel.merchant_id}</Text>
            </Space>
          </Col>
          <Col>
            <Tag 
              color={getStatusColor(hotel.status)} 
              style={{ padding: '6px 16px', fontSize: 14, fontWeight: 500 }}
            >
              {getStatusText(hotel.status)}
            </Tag>
          </Col>
        </Row>
      </Card>

      {/* 图片轮播 */}
      {allImages.length > 0 ? (
        <Card 
          style={{ marginBottom: 24 }}
          title="酒店相册"
          extra={<Text type="secondary">共 {allImages.length} 张图片</Text>}
        >
          <Carousel autoplay arrows dotPosition="bottom">
            {allImages.map((url, index) => (
              <div key={index}>
                <div style={{ position: 'relative' }}>
                  <img
                    src={url}
                    alt={`酒店图片${index + 1}`}
                    style={{
                      width: '100%',
                      height: 450,
                      objectFit: 'cover',
                      borderRadius: 8
                    }}
                  />
                  {index === 0 && (
                    <Tag 
                      color="green" 
                      style={{ 
                        position: 'absolute', 
                        top: 16, 
                        left: 16,
                        padding: '4px 12px',
                        fontSize: 14
                      }}
                    >
                      封面
                    </Tag>
                  )}
                </div>
              </div>
            ))}
          </Carousel>
        </Card>
      ) : (
        <Card style={{ marginBottom: 24, textAlign: 'center', padding: 60 }}>
          <Empty description="暂无图片" />
        </Card>
      )}

      {/* 详细信息 */}
      <Tabs defaultActiveKey="info" type="card" style={{ background: '#fff', padding: 16, borderRadius: 8 }}>
        <TabPane tab="酒店信息" key="info">
          <Card bordered={false}>
            <Descriptions bordered column={{ xs: 1, sm: 2, md: 2, lg: 2, xl: 2 }}>
              <Descriptions.Item label="联系电话" span={2}>
                <PhoneOutlined style={{ marginRight: 8, color: '#1890ff' }} />
                <a href={`tel:${hotel.phone}`}>{hotel.phone}</a>
              </Descriptions.Item>

              <Descriptions.Item label="详细地址" span={2}>
                <EnvironmentOutlined style={{ marginRight: 8, color: '#ff4d4f' }} />
                {[hotel.province, hotel.city, hotel.address].filter(Boolean).join('')}
              </Descriptions.Item>

              {hotel.latitude && hotel.longitude && (
                <Descriptions.Item label="经纬度" span={2}>
                  北纬 {hotel.latitude.toFixed(6)}°，东经 {hotel.longitude.toFixed(6)}°
                  <Button 
                    type="link" 
                    size="small" 
                    style={{ marginLeft: 16 }}
                    onClick={() => window.open(`https://maps.google.com/?q=${hotel.latitude},${hotel.longitude}`, '_blank')}
                  >
                    查看地图
                  </Button>
                </Descriptions.Item>
              )}

              {hotel.opening_date && (
                <Descriptions.Item label="开业时间">
                  <CalendarOutlined style={{ marginRight: 8, color: '#52c41a' }} />
                  {dayjs(hotel.opening_date).format('YYYY年MM月DD日')}
                </Descriptions.Item>
              )}

              <Descriptions.Item label="创建时间">
                {dayjs(hotel.created_at).format('YYYY-MM-DD HH:mm:ss')}
              </Descriptions.Item>

              <Descriptions.Item label="最后更新">
                {dayjs(hotel.updated_at).format('YYYY-MM-DD HH:mm:ss')}
              </Descriptions.Item>

              {hotel.description && (
                <Descriptions.Item label="酒店简介" span={2}>
                  <div style={{ 
                    background: '#f5f5f5', 
                    padding: 16, 
                    borderRadius: 4,
                    lineHeight: 1.8
                  }}>
                    {hotel.description}
                  </div>
                </Descriptions.Item>
              )}
            </Descriptions>
          </Card>
        </TabPane>

        <TabPane tab="设施标签" key="tags">
          <Card bordered={false}>
            {facilityTags.length > 0 && (
              <>
                <Title level={5}>
                  <HomeOutlined style={{ marginRight: 8, color: '#1890ff' }} />
                  通用设施
                </Title>
                <div style={{ 
                  display: 'flex', 
                  flexWrap: 'wrap', 
                  gap: 12, 
                  marginBottom: 32,
                  padding: 16,
                  background: '#f9f9f9',
                  borderRadius: 8
                }}>
                  {facilityTags.map(tag => (
                    <Tag 
                      key={tag.tag_id} 
                      color="blue" 
                      style={{ padding: '6px 12px', fontSize: 14 }}
                    >
                      {tag.name}
                    </Tag>
                  ))}
                </div>
              </>
            )}

            {specialTags.length > 0 && (
              <>
                <Title level={5}>
                  <SafetyOutlined style={{ marginRight: 8, color: '#fa8c16' }} />
                  特色标签
                </Title>
                <div style={{ 
                  display: 'flex', 
                  flexWrap: 'wrap', 
                  gap: 12,
                  padding: 16,
                  background: '#f9f9f9',
                  borderRadius: 8
                }}>
                  {specialTags.map(tag => (
                    <Tag 
                      key={tag.tag_id} 
                      color="orange" 
                      style={{ padding: '6px 12px', fontSize: 14 }}
                    >
                      {tag.name}
                    </Tag>
                  ))}
                </div>
              </>
            )}

            {facilityTags.length === 0 && specialTags.length === 0 && (
              <Empty description="暂无标签信息" />
            )}
          </Card>
        </TabPane>

        <TabPane tab={`所有图片 (${allImages.length})`} key="images">
          <Card bordered={false}>
            <Row gutter={[16, 16]}>
              {allImages.map((url, index) => (
                <Col key={index} xs={12} sm={8} md={6} lg={4}>
                  <Card
                    hoverable
                    cover={
                      <Image
                        src={url}
                        alt={`酒店图片${index + 1}`}
                        style={{
                          width: '100%',
                          height: 150,
                          objectFit: 'cover',
                          borderTopLeftRadius: 8,
                          borderTopRightRadius: 8
                        }}
                      />
                    }
                    size="small"
                  >
                    {index === 0 && <Tag color="green">封面</Tag>}
                    {index !== 0 && <Tag color="blue">图片 {index + 1}</Tag>}
                  </Card>
                </Col>
              ))}
            </Row>
          </Card>
        </TabPane>
      </Tabs>

      {/* 底部操作栏 */}
      <Card style={{ marginTop: 24, textAlign: 'center' }}>
        <Space size="large">
          <Button size="large" icon={<ArrowLeftOutlined />} onClick={handleGoBack}>
            返回上一页
          </Button>
          <Button size="large" icon={<RollbackOutlined />} onClick={handleGoToList}>
            返回列表
          </Button>
          <Button 
            type="primary" 
            size="large" 
            icon={<EditOutlined />}
            onClick={handleEdit}
          >
            编辑酒店
          </Button>
        </Space>
      </Card>
    </div>
  );
};

export default HotelDetail;