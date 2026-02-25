import React, { useState, useEffect } from 'react';
import {
  Modal, Descriptions, Image, Tag, Spin, Button,
  message, Popconfirm, Tabs, Table, Empty, Rate
} from 'antd';
import { 
  EnvironmentOutlined, PhoneOutlined,
  StopOutlined, CheckCircleOutlined, CalendarOutlined
} from '@ant-design/icons';
import axios from 'axios';

const { TabPane } = Tabs;

interface HotelDetailModalProps {
  visible: boolean;
  hotelId: number | null;
  onClose: () => void;
  onStatusChange?: () => void;
  fetchHotelDetail: (hotelId: number) => Promise<any>;
}

const HotelDetailModal: React.FC<HotelDetailModalProps> = ({
  visible,
  hotelId,
  onClose,
  onStatusChange,
  fetchHotelDetail
}) => {
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState<any>(null);

  // 加载详情
  useEffect(() => {
    if (visible && hotelId) {
      loadDetail(hotelId);
    }
  }, [visible, hotelId]);

  const loadDetail = async (id: number) => {
    setLoading(true);
    try {
      console.log('开始加载详情, id:', id);
      const data = await fetchHotelDetail(id);
      console.log('加载到的详情数据:', data);
      setDetail(data);
    } catch (error) {
      console.error('加载详情失败:', error);
      message.error('获取酒店详情失败');
    } finally {
      setLoading(false);
    }
  };

  // 处理状态变更
  const handleStatusChange = async (action: 'offline' | 'online') => {
    if (!hotelId) return;
    
    setLoading(true);
    try {
      const url = action === 'offline' 
        ? `http://localhost:3000/api/admin/hotels/${hotelId}/offline`
        : `http://localhost:3000/api/admin/hotels/${hotelId}/online`;
      
      const response = await axios.post(url, {}, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.data.code === 200) {
        message.success(response.data.msg);
        await loadDetail(hotelId);
        onStatusChange?.();
      } else {
        message.error(response.data.msg || '操作失败');
      }
    } catch (error: any) {
      console.error('状态变更错误:', error);
      message.error(error.response?.data?.msg || '操作失败');
    } finally {
      setLoading(false);
    }
  };

  // 媒体表格列
  const mediaColumns = [
    {
      title: '预览',
      dataIndex: 'media_url',
      key: 'media_url',
      render: (url: string) => (
        <Image 
          src={url} 
          width={100} 
          height={70} 
          style={{ objectFit: 'cover' }}
          fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMIAAADDCAYAAADQvc6UAAABRWlDQ1BJQ0MgUHJvZmlsZQAAKJFjYGASSSwoyGFhYGDIzSspCnJ3UoiIjFJgf8LAwSDCIMogwMCcmFxc4BgQ4ANUwgCjUcG3awyMIPqyLsis7PPOq3QdDFcvjV3jOD1boQVTPQrgSkktTgbSf4A4LbmgqISBgTEFyFYuLykAsTuAbJEioKOA7DkgdjqEvQHEToKwj4DVhAQ5A9k3gGyB5IxEoBmML4BsnSQk8XQkNtReEOBxcfXxUQg1Mjc0dyHgXNJBSWpFCYh2zi+oLMpMzyhRcASGUqqCZ16yno6CkYGRAQMDKMwhqj/fAIcloxgHQqxAjIHBEugw5sUIsSQpBobtQPdLciLEVJYzMPBHMDBsayhILEqEO4DxG0txmrERhM29nYGBddr//5/DGRjYNRkY/l7////39v///y4Dmn+LgeHgA+Q3kwWuaTFhcAAAAHiczVJbS8JAEH6NpZKlYアメリIRRBVEERVIvRfdRVEK0oItRJEEQQUVU9N/q7O5uRvPiLgR9mZ2d+XZmvm9GVpIldDwSqSoVjapulEiqXFEjHhuI5+e3yfnUsh28hEmsEkhggF4q44aG2JQI2bLtGxTnuLDP5wJuXE2YZZdoJzG2Iczm4Ey5+PADLrV51UZqYhIAc+rEUXGpmSp5C7qe3PlskA+TN1VRN8lK1mM/9xXmQrivKGYRl0gOswxpgk6uKmt4Lbqy0Em+CxRsDajjWCWv4Do8Y5ePiuoovUdxsfADdXckJ6jWgIgNxEG1565DntVULddsXU/fojRBlEfvcPo6bIu138GuY1HgwyOX36JqOCQO3A9aLBogMRphRP4X2i3GQ/Yr8IPv8IEHAAJdk5BkqL5x3mFJ/9BpJh+O4Qexu9kC8R1WlR2V2Zt0QkHyixIqoJQJKiVnLKVRdEoSzW+4qUp6v2e6ZE1q5V/hhQFSfB8Bf4XhpodYA+RT7bMOZQOaPq0p/0qkJJyYcp0j2EVZ9FKunW8Q0jQAAAABJRU5ErkJggg=="
        />
      ),
    },
    {
      title: '是否封面',
      dataIndex: 'is_cover',
      key: 'is_cover',
      render: (isCover: number) => isCover ? <Tag color="green">主封面</Tag> : '-',
    },
    {
      title: '上传时间',
      dataIndex: 'created_at',
      key: 'created_at',
    },
  ];

  if (!detail && !loading) {
    return (
      <Modal 
        title="酒店详情" 
        open={visible} 
        onCancel={onClose} 
        footer={[
          <Button key="close" onClick={onClose}>关闭</Button>
        ]}
      >
        <Empty description="暂无数据" />
      </Modal>
    );
  }

  return (
    <Modal
      title="酒店详情"
      open={visible}
      onCancel={onClose}
      width={800}
      footer={[
        <Button key="close" onClick={onClose}>
          关闭
        </Button>,
        detail?.status === 'approved' && (
          <Popconfirm
            key="offline"
            title="确定要下线该酒店吗？"
            onConfirm={() => handleStatusChange('offline')}
          >
            <Button danger icon={<StopOutlined />}>
              下线酒店
            </Button>
          </Popconfirm>
        ),
        detail?.status === 'offline' && (
          <Popconfirm
            key="online"
            title="确定要恢复上线该酒店吗？"
            onConfirm={() => handleStatusChange('online')}
          >
            <Button type="primary" icon={<CheckCircleOutlined />}>
              恢复上线
            </Button>
          </Popconfirm>
        ),
      ]}
    >
      <Spin spinning={loading}>
        {detail && (
          <Tabs defaultActiveKey="1">
            <TabPane tab="基本信息" key="1">
              <Descriptions bordered column={2}>
                <Descriptions.Item label="酒店ID" span={2}>
                  {detail.hotel_id}
                </Descriptions.Item>
                
                <Descriptions.Item label="中文名">
                  {detail.name_zh}
                </Descriptions.Item>
                
                <Descriptions.Item label="英文名">
                  {detail.name_en || '-'}
                </Descriptions.Item>
                
                <Descriptions.Item label="星级" span={2}>
                  <Rate disabled defaultValue={detail.star_rating} />
                </Descriptions.Item>
                
                <Descriptions.Item label="联系电话">
                  <PhoneOutlined /> {detail.phone}
                </Descriptions.Item>
                
                <Descriptions.Item label="所属商户">
                  {detail.merchant_name} (ID: {detail.merchant_id})
                </Descriptions.Item>
                
                <Descriptions.Item label="地理位置" span={2}>
                  <EnvironmentOutlined /> {detail.province} {detail.city} {detail.address}
                  {detail.latitude && detail.longitude && (
                    <div style={{ fontSize: 12, color: '#999' }}>
                      坐标: {detail.latitude}, {detail.longitude}
                    </div>
                  )}
                </Descriptions.Item>
                
                <Descriptions.Item label="开业时间">
                  <CalendarOutlined /> {detail.opening_date || '-'}
                </Descriptions.Item>
                
                <Descriptions.Item label="状态">
                  {detail.status === 'approved' && <Tag color="green">运营中</Tag>}
                  {detail.status === 'offline' && <Tag color="default">已下线</Tag>}
                  {detail.status === 'pending' && <Tag color="orange">审核中</Tag>}
                  {detail.status === 'rejected' && <Tag color="red">已驳回</Tag>}
                  {detail.status === 'draft' && <Tag color="blue">草稿</Tag>}
                </Descriptions.Item>
                
                <Descriptions.Item label="创建时间" span={2}>
                  {detail.created_at}
                </Descriptions.Item>
                
                <Descriptions.Item label="更新时间" span={2}>
                  {detail.updated_at}
                </Descriptions.Item>
                
                <Descriptions.Item label="酒店简介" span={2}>
                  {detail.description || '-'}
                </Descriptions.Item>
              </Descriptions>
            </TabPane>

            <TabPane tab="酒店媒体" key="2">
              <Table
                dataSource={detail.media || []}
                columns={mediaColumns}
                rowKey="media_id"
                pagination={false}
              />
            </TabPane>

            <TabPane tab="酒店标签" key="3">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {detail.tags?.map((tag: any) => (
                  <Tag key={tag.tag_id} color="blue">
                    {tag.name} ({tag.tag_type})
                  </Tag>
                ))}
                {(!detail.tags || detail.tags.length === 0) && (
                  <span>暂无标签</span>
                )}
              </div>
            </TabPane>
          </Tabs>
        )}
      </Spin>
    </Modal>
  );
};

export default HotelDetailModal;