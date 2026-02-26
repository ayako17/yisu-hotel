// yisu-dashboard/src/pages/merchant/Profile.tsx
import React, { useEffect, useState } from 'react';
import {
  Card, Tabs, Descriptions, Tag, Space, Row, Col, Statistic,
  Timeline, Divider, Spin, Image,
  Steps
} from 'antd';
import {
  BankOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  IdcardOutlined,
  CalendarOutlined,
  PhoneOutlined,
  UserOutlined,
  EnvironmentOutlined
} from '@ant-design/icons';
import axios from '../../services/axios';
import dayjs from 'dayjs';

const { TabPane } = Tabs;

// 商户资料接口
interface MerchantProfile {
  user_id: number;
  username: string;
  phone: string;
  avatar_url?: string;
  account_status: string;
  
  // 资质信息
  license_image_url?: string;
  license_no?: string;        
  issuing_authority?: string; 
  establish_date?: string;    
  valid_until?: string;       
  status: 'pending' | 'approved' | 'rejected';
  apply_reason?: string;
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
}

// 审核记录接口
interface AuditRecord {
  id: number;
  status: string;
  remark?: string;
  reject_reason?: string;
  created_at: string;
  operator?: string;
}

const MerchantProfile: React.FC = () => {
  const [profile, setProfile] = useState<MerchantProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [auditRecords, setAuditRecords] = useState<AuditRecord[]>([]);

  useEffect(() => {
    fetchProfile();
    fetchAuditRecords();
  }, []);

const fetchProfile = async () => {
  setLoading(true);
  try {
    const res = await axios.get('/merchant/profile');
    console.log('API返回数据:', res.data);
    
    if (res.data.code === 200) {
      const data = res.data.data;
      console.log('商户状态值:', data.status); // 打印状态值
      console.log('完整数据:', data);
      setProfile(data);
    }
  } catch (error) {
    console.error('获取商户资料失败:', error);
  } finally {
    setLoading(false);
  }
};

  const fetchAuditRecords = async () => {
    try {
      const res = await axios.get('/merchant/audit-records');
      if (res.data.code === 200) {
        setAuditRecords(res.data.data || []);
      }
    } catch (error) {
      console.error('获取审核记录失败:', error);
    }
  };

  const getStatusTag = () => {
    if (!profile) return null;
    
    const statusMap = {
      'pending': { color: 'orange', icon: <ClockCircleOutlined />, text: '审核中' },
      'approved': { color: 'green', icon: <CheckCircleOutlined />, text: '已认证' },
      'rejected': { color: 'red', icon: <WarningOutlined />, text: '已驳回' }
    };
    
    const status = statusMap[profile.status];
    return (
      <Tag color={status.color} icon={status.icon} style={{ padding: '4px 12px', borderRadius: 20 }}>
        {status.text}
      </Tag>
    );
  };

  // 格式化日期显示
  const formatDate = (date?: string) => {
    if (!date) return '-';
    return dayjs(date).format('YYYY-MM-DD');
  };

  if (loading && !profile) {
    return (
      <div style={{ textAlign: 'center', padding: 100 }}>
        <Spin size="large" tip="加载中..." />
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <Card
        style={{ borderRadius: 16, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
        title={
          <Space size="middle">
            <div style={{ 
              width: 40, 
              height: 40, 
              borderRadius: 20, 
              background: 'linear-gradient(135deg, #1890ff 0%, #096dd9 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <IdcardOutlined style={{ color: 'white', fontSize: 20 }} />
            </div>
            <span style={{ fontSize: 20, fontWeight: 600 }}>商户资料</span>
            {getStatusTag()}
          </Space>
        }
      >
        {profile?.status === 'rejected' && profile.rejection_reason && (
          <Card 
            size="small" 
            style={{ 
              marginBottom: 24, 
              backgroundColor: '#fff2f0', 
              borderColor: '#ffccc7',
              borderRadius: 8
            }}
          >
            <Space>
              <WarningOutlined style={{ color: '#ff4d4f' }} />
              <span style={{ color: '#ff4d4f', fontWeight: 500 }}>驳回原因：</span>
              <span>{profile.rejection_reason}</span>
            </Space>
          </Card>
        )}

        <Tabs defaultActiveKey="basic" style={{ marginTop: 8 }}>
          {/* 基本信息 Tab */}
          <TabPane tab="基本信息" key="basic">
            <Descriptions bordered column={2} style={{ background: '#fff' }}>
              <Descriptions.Item label="商户名称" span={2}>
                <Space>
                  <UserOutlined />
                  {profile?.username || '-'}
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="手机号">
                <Space>
                  <PhoneOutlined />
                  {profile?.phone || '-'}
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="账号状态">
                <Tag color={profile?.account_status === 'active' ? 'green' : 'red'}>
                  {profile?.account_status === 'active' ? '正常' : '已封禁'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="注册时间" span={2}>
                {formatDate(profile?.created_at)}
              </Descriptions.Item>
              <Descriptions.Item label="最后更新" span={2}>
                {formatDate(profile?.updated_at)}
              </Descriptions.Item>
            </Descriptions>
          </TabPane>

          {/* 资质认证 Tab */}
          <TabPane tab="资质认证" key="license">
            <Descriptions bordered column={2}>
              <Descriptions.Item label="营业执照" span={2}>
                {profile?.license_image_url ? (
                  <div style={{ textAlign: 'center' }}>
                    <Image 
                      src={profile.license_image_url.startsWith('http') ? profile.license_image_url : `http://localhost:3000${profile.license_image_url}`} 
                      alt="营业执照" 
                      width={300}
                      style={{ borderRadius: 8 }} 
                    />
                  </div>
                ) : (
                  <Tag color="default">未上传</Tag>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="统一社会信用代码" span={2}>
                {profile?.license_no || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="发证机关" span={2}>
                {profile?.issuing_authority || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="成立日期">
                {formatDate(profile?.establish_date)}
              </Descriptions.Item>
              <Descriptions.Item label="有效期限">
                {formatDate(profile?.valid_until) || '永久'}
              </Descriptions.Item>
              <Descriptions.Item label="申请理由" span={2}>
                <div style={{ 
                  background: '#f5f5f5', 
                  padding: 12, 
                  borderRadius: 4,
                  whiteSpace: 'pre-wrap',
                  lineHeight: 1.6
                }}>
                  {profile?.apply_reason || '-'}
                </div>
              </Descriptions.Item>
            </Descriptions>
          </TabPane>

          <TabPane tab="审核记录" key="audit">
            <Card style={{ borderRadius: 12 }}>
              {/* 审核记录时间线 */}
              <Divider style={{ textAlign: 'left', marginTop: 0 }}>审核历史</Divider>
              
              {auditRecords.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
                  暂无审核历史记录
                </div>
              ) : (
                <Timeline
                  mode="left"
                  items={auditRecords.map((record) => {
                    // 根据状态设置颜色和图标
                    let color = 'gray';
                    let dot = null;
                    let statusText = '';
                    
                    if (record.status === 'approved') {
                      color = 'green';
                      dot = <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 16 }} />;
                      statusText = '审核通过';
                    } else if (record.status === 'rejected') {
                      color = 'red';
                      dot = <WarningOutlined style={{ color: '#ff4d4f', fontSize: 16 }} />;
                      statusText = '审核驳回';
                    } else if (record.status === 'pending') {
                      color = 'orange';
                      dot = <ClockCircleOutlined style={{ color: '#fa8c16', fontSize: 16 }} />;
                      statusText = '提交审核';
                    }
                    
                    return {
                      color,
                      dot,
                      children: (
                        <div style={{ padding: '4px 0 12px 0' }}>
                          {/* 头部：时间和状态 */}
                          <div style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center',
                            marginBottom: 8
                          }}>
                            <span style={{ 
                              fontSize: 14, 
                              fontWeight: 500,
                              color: color === 'green' ? '#52c41a' : 
                                    color === 'red' ? '#ff4d4f' : 
                                    color === 'orange' ? '#fa8c16' : '#666'
                            }}>
                              {statusText}
                            </span>
                            <span style={{ color: '#999', fontSize: 13 }}>
                              {dayjs(record.created_at).format('YYYY-MM-DD HH:mm')}
                            </span>
                          </div>
                          
                          {/* 审核内容/备注 */}
                          {record.remark && (
                            <div style={{ 
                              backgroundColor: '#fafafa', 
                              padding: 12, 
                              borderRadius: 6,
                              marginBottom: 8,
                              fontSize: 14,
                              color: '#333',
                              lineHeight: 1.6,
                              whiteSpace: 'pre-wrap'
                            }}>
                              {record.remark}
                            </div>
                          )}
                          
                          {/* 驳回原因（如果有） */}
                          {record.reject_reason && (
                            <div style={{ 
                              backgroundColor: '#fff2f0', 
                              padding: 12, 
                              borderRadius: 6,
                              marginBottom: 8,
                              border: '1px solid #ffccc7'
                            }}>
                              <span style={{ color: '#ff4d4f', fontWeight: 500 }}>驳回原因：</span>
                              <span style={{ color: '#666' }}>{record.reject_reason}</span>
                            </div>
                          )}
                          
                          {/* 操作人 */}
                          <div style={{ fontSize: 12, color: '#999' }}>
                            操作人：{record.operator || '系统'}
                          </div>
                        </div>
                      ),
                    };
                  })}
                />
              )}
            </Card>
          </TabPane>
        </Tabs>
      </Card>
    </div>
  );
};

export default MerchantProfile;