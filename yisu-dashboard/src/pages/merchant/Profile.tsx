import React, { useEffect, useState } from 'react';
import {
  Card, Form, Input, Button, Steps, Divider, Upload, message, Tabs,
  Descriptions, Tag, Space, Modal, Row, Col, Statistic,
  InputNumber, Timeline
} from 'antd';
import type { UploadProps } from 'antd';
import {
  UploadOutlined,
  SaveOutlined,
  BankOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  EditOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined  
} from '@ant-design/icons';
import axios from '../../services/axios';
import { pickAndUploadImage } from '../../utils/merchant';

const { TabPane } = Tabs;
const { TextArea } = Input;

interface MerchantProfile {
  merchant_id: number;
  username: string;
  phone: string;
  email?: string;
  company_name: string;
  company_address?: string;
  contact_person: string;
  contact_phone: string;
  
  // 资质信息
  license_no: string;
  license_image_url?: string;
  business_scope?: string;
  legal_representative?: string;
  registered_capital?: number;
  establish_date?: string;
  valid_until?: string;
  
  // 银行信息
  bank_name?: string;
  bank_account?: string;
  bank_account_name?: string;
  
  // 状态
  status: 'pending' | 'approved' | 'rejected';
  reject_reason?: string;
  created_at: string;
  
  // 统计数据
  stats?: {
    hotel_count: number;
    order_count: number;
    total_revenue: number;
    pending_audit: number;
  };
}

// 审核记录接口
interface AuditRecord {
  id: number;
  status: string;        // 'pending' | 'approved' | 'rejected'
  remark?: string;       // 审核说明
  reject_reason?: string; // 驳回原因（如果有）
  created_at: string;    // 申请时间
  operator?: string;     // 操作人
}

const MerchantProfile: React.FC = () => {
  const [form] = Form.useForm();
  const [profile, setProfile] = useState<MerchantProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [licenseImage, setLicenseImage] = useState<string>('');
  const [auditRecords, setAuditRecords] = useState<AuditRecord[]>([]);

  useEffect(() => {
    fetchProfile();
    fetchAuditRecords();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/merchant/profile');
      if (res.data.code === 200) {
        const data = res.data.data;
        setProfile(data);
        form.setFieldsValue(data);
        setLicenseImage(data.license_image_url || '');
        
        // 获取统计数据
        const statsRes = await axios.get('/merchant/dashboard/stats');
        if (statsRes.data.code === 200) {
          setProfile(prev => prev ? { ...prev, stats: statsRes.data.data } : null);
        }
      }
    } catch (error) {
      message.error('获取商户资料失败');
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

  const handleSave = async (values: any) => {
    setSaving(true);
    try {
      const res = await axios.put('/merchant/profile', values);
      if (res.data.code === 200) {
        message.success('保存成功');
        setEditMode(false);
        fetchProfile();
      }
    } catch (error) {
      message.error('保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleUploadLicense = async () => {
    try {
      const url = await pickAndUploadImage();
      setLicenseImage(url);
      form.setFieldValue('license_image_url', url);
      message.success('上传成功');
    } catch (error) {
      // 错误已在 pickAndUploadImage 中处理
    }
  };

  const getStatusTag = () => {
    if (!profile) return null;
    
    const statusMap = {
      'pending': { color: 'orange', icon: <WarningOutlined />, text: '审核中' },
      'approved': { color: 'green', icon: <CheckCircleOutlined />, text: '已认证' },
      'rejected': { color: 'red', icon: <WarningOutlined />, text: '已驳回' }
    };
    
    const status = statusMap[profile.status];
    return (
      <Tag color={status.color} icon={status.icon} style={{ padding: '4px 8px' }}>
        {status.text}
      </Tag>
    );
  };

  if (loading && !profile) {
    return (
      <Card loading={true}>
        <div style={{ textAlign: 'center', padding: 50 }}>加载中...</div>
      </Card>
    );
  }

  return (
    <div>
      {/* 统计卡片 */}
      {profile?.stats && (
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Card hoverable>
              <Statistic 
                title="我的酒店" 
                value={profile.stats.hotel_count} 
                prefix={<BankOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card hoverable>
              <Statistic 
                title="累计订单" 
                value={profile.stats.order_count} 
                prefix={<FileTextOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card hoverable>
              <Statistic 
                title="总收入" 
                value={profile.stats.total_revenue} 
                prefix="¥"
                precision={2}
                valueStyle={{ color: '#fa8c16' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card hoverable>
              <Statistic 
                title="待审核" 
                value={profile.stats.pending_audit} 
                valueStyle={{ color: '#fa8c16' }}
              />
            </Card>
          </Col>
        </Row>
      )}

      <Card
        title={
          <Space>
            <span>商户资料</span>
            {getStatusTag()}
          </Space>
        }
        extra={
          !editMode ? (
            <Button 
              type="primary" 
              icon={<EditOutlined />}
              onClick={() => setEditMode(true)}
            >
              编辑资料
            </Button>
          ) : (
            <Space>
              <Button onClick={() => setEditMode(false)}>取消</Button>
              <Button 
                type="primary" 
                icon={<SaveOutlined />}
                onClick={() => form.submit()}
                loading={saving}
              >
                保存
              </Button>
            </Space>
          )
        }
      >
        {profile?.status === 'rejected' && profile.reject_reason && (
          <Card 
            size="small" 
            style={{ 
              marginBottom: 16, 
              backgroundColor: '#fff2f0', 
              borderColor: '#ffccc7' 
            }}
          >
            <Space>
              <WarningOutlined style={{ color: '#ff4d4f' }} />
              <span style={{ color: '#ff4d4f', fontWeight: 500 }}>驳回原因：</span>
              <span>{profile.reject_reason}</span>
            </Space>
          </Card>
        )}

        <Tabs defaultActiveKey="basic">
          <TabPane tab="基本信息" key="basic">
            {editMode ? (
              <Form
                form={form}
                layout="vertical"
                onFinish={handleSave}
                initialValues={profile || {}}
              >
                <Row gutter={24}>
                  <Col span={12}>
                    <Form.Item
                      name="company_name"
                      label="公司/商户名称"
                      rules={[{ required: true, message: '请输入公司名称' }]}
                    >
                      <Input placeholder="与营业执照一致" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="company_address" label="公司地址">
                      <Input placeholder="公司注册地址" />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={24}>
                  <Col span={12}>
                    <Form.Item
                      name="contact_person"
                      label="联系人"
                      rules={[{ required: true }]}
                    >
                      <Input />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      name="contact_phone"
                      label="联系电话"
                      rules={[{ required: true }]}
                    >
                      <Input />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={24}>
                  <Col span={12}>
                    <Form.Item name="email" label="电子邮箱">
                      <Input type="email" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="phone" label="登录手机号">
                      <Input disabled />
                    </Form.Item>
                  </Col>
                </Row>
              </Form>
            ) : (
              <Descriptions bordered column={2}>
                <Descriptions.Item label="公司名称" span={2}>
                  {profile?.company_name}
                </Descriptions.Item>
                <Descriptions.Item label="公司地址" span={2}>
                  {profile?.company_address || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="联系人">{profile?.contact_person}</Descriptions.Item>
                <Descriptions.Item label="联系电话">{profile?.contact_phone}</Descriptions.Item>
                <Descriptions.Item label="电子邮箱">{profile?.email || '-'}</Descriptions.Item>
                <Descriptions.Item label="登录手机号">{profile?.phone}</Descriptions.Item>
              </Descriptions>
            )}
          </TabPane>

          <TabPane tab="资质认证" key="license">
            {editMode ? (
              <Form
                form={form}
                layout="vertical"
                onFinish={handleSave}
              >
                <Form.Item name="license_image_url" label="营业执照">
                  <div>
                    {licenseImage ? (
                      <div style={{ marginBottom: 16 }}>
                        <img 
                          src={licenseImage} 
                          alt="营业执照" 
                          style={{ maxWidth: '100%', maxHeight: 200 }} 
                        />
                      </div>
                    ) : null}
                    <Button 
                      icon={<UploadOutlined />} 
                      onClick={handleUploadLicense}
                    >
                      {licenseImage ? '重新上传' : '上传营业执照'}
                    </Button>
                    <span style={{ marginLeft: 16, color: '#999' }}>
                      支持 JPG/PNG，不超过5MB
                    </span>
                  </div>
                </Form.Item>

                <Row gutter={24}>
                  <Col span={12}>
                    <Form.Item
                      name="license_no"
                      label="统一社会信用代码"
                      rules={[{ required: true }]}
                    >
                      <Input placeholder="18位信用代码" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="legal_representative" label="法定代表人">
                      <Input />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={24}>
                  <Col span={12}>
                    <Form.Item name="registered_capital" label="注册资本(万元)">
                      <InputNumber style={{ width: '100%' }} min={0} />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="business_scope" label="经营范围">
                      <TextArea rows={3} />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={24}>
                  <Col span={12}>
                    <Form.Item name="establish_date" label="成立日期">
                      <Input type="date" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="valid_until" label="有效期限">
                      <Input type="date" />
                    </Form.Item>
                  </Col>
                </Row>
              </Form>
            ) : (
              <Descriptions bordered column={2}>
                <Descriptions.Item label="营业执照" span={2}>
                  {profile?.license_image_url ? (
                    <img 
                      src={profile.license_image_url} 
                      alt="营业执照" 
                      style={{ maxWidth: 200, maxHeight: 150 }} 
                    />
                  ) : (
                    '未上传'
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="统一社会信用代码" span={2}>
                  {profile?.license_no || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="法定代表人">{profile?.legal_representative || '-'}</Descriptions.Item>
                <Descriptions.Item label="注册资本">{profile?.registered_capital ? `${profile.registered_capital}万元` : '-'}</Descriptions.Item>
                <Descriptions.Item label="经营范围" span={2}>
                  {profile?.business_scope || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="成立日期">{profile?.establish_date || '-'}</Descriptions.Item>
                <Descriptions.Item label="有效期限">{profile?.valid_until || '永久'}</Descriptions.Item>
              </Descriptions>
            )}
          </TabPane>

          <TabPane tab="银行信息" key="bank">
            {editMode ? (
              <Form
                form={form}
                layout="vertical"
                onFinish={handleSave}
              >
                <Row gutter={24}>
                  <Col span={8}>
                    <Form.Item name="bank_name" label="开户银行">
                      <Input placeholder="如：中国建设银行" />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item name="bank_account_name" label="开户名称">
                      <Input placeholder="账户名称" />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item name="bank_account" label="银行账号">
                      <Input placeholder="银行账号" />
                    </Form.Item>
                  </Col>
                </Row>
              </Form>
            ) : (
              <Descriptions bordered column={3}>
                <Descriptions.Item label="开户银行">{profile?.bank_name || '-'}</Descriptions.Item>
                <Descriptions.Item label="开户名称">{profile?.bank_account_name || '-'}</Descriptions.Item>
                <Descriptions.Item label="银行账号">{profile?.bank_account || '-'}</Descriptions.Item>
              </Descriptions>
            )}
          </TabPane>

          <TabPane tab="审核记录" key="audit">
            <Card>
              {/* 审核状态步骤条 */}
              {profile && (
                <Steps
                  current={
                    profile.status === 'pending' ? 1 :
                    profile.status === 'approved' ? 2 :
                    profile.status === 'rejected' ? 2 : 0
                  }
                  status={profile.status === 'rejected' ? 'error' : 'process'}
                  items={[
                    {
                      title: '提交申请',
                      description: profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : '-',
                      icon: <FileTextOutlined />,
                    },
                    {
                      title: '资质审核',
                      description: profile?.status === 'pending' ? '进行中' : 
                                  profile?.status === 'approved' ? '已完成' :
                                  profile?.status === 'rejected' ? '已驳回' : '-',
                      icon: profile?.status === 'approved' ? <CheckCircleOutlined /> :
                            profile?.status === 'rejected' ? <WarningOutlined /> :
                            <ClockCircleOutlined />,
                    },
                    {
                      title: '审核完成',
                      description: profile?.status === 'approved' ? '认证通过' :
                                  profile?.status === 'rejected' ? '认证失败' : '-',
                      icon: profile?.status === 'approved' ? <CheckCircleOutlined /> :
                            profile?.status === 'rejected' ? <CloseCircleOutlined /> :
                            <ClockCircleOutlined />,
                    },
                  ]}
                  style={{ marginBottom: 24 }}
                />
              )}
              
              {/* 审核记录时间线 */}
              <Divider style={{ textAlign: 'left' }}>审核历史</Divider>
              
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
                              {new Date(record.created_at).toLocaleString('zh-CN', {
                                year: 'numeric',
                                month: '2-digit',
                                day: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
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
                              lineHeight: 1.6
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