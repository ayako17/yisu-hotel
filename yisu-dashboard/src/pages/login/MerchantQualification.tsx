// yisu-dashboard/src/pages/login/MerchantQualification.tsx
import React, { useState } from 'react';
import { Form, Input, Button, Card, Upload, message, Progress, DatePicker, Row, Col } from 'antd';
import { UploadOutlined, InboxOutlined } from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from '../../services/axios';
import dayjs from 'dayjs';

const { Dragger } = Upload;
const { TextArea } = Input;

interface QualificationFormValues {
  license_no?: string;
  issuing_authority?: string;
  establish_date?: any;
  valid_until?: any;
  apply_reason: string;
}

const MerchantQualification: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [fileList, setFileList] = useState<any[]>([]);
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const location = useLocation();
  
  // 从注册页面传递过来的数据
  const { userId, phone, username } = location.state || {};

  const onFinish = async (values: QualificationFormValues) => {
    if (!userId) {
      message.error('用户信息丢失，请重新注册');
      navigate('/register');
      return;
    }

    if (fileList.length === 0) {
      message.error('请上传营业执照');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      
      // 添加用户ID
      formData.append('user_id', userId);
      
      // 添加资质信息 - 匹配数据库字段
      formData.append('license_no', values.license_no || '');
      formData.append('issuing_authority', values.issuing_authority || '');
      formData.append('establish_date', values.establish_date?.format('YYYY-MM-DD') || '');
      formData.append('valid_until', values.valid_until?.format('YYYY-MM-DD') || '');
      formData.append('apply_reason', values.apply_reason || '');
      
      // 添加上传的营业执照图片
      if (fileList.length > 0) {
        fileList.forEach(file => {
          formData.append('license_images', file.originFileObj);
        });
      }

      const res = await axios.post('/merchant/qualification', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (res.data.code === 200) {
        message.success('资质上传成功，请等待管理员审核！');
        // 延迟跳转，让用户看到成功提示
        setTimeout(() => {
          navigate('/login');
        }, 1500);
      } else {
        message.error(res.data.msg || '资质上传失败');
      }
    } catch (error: any) {
      console.error('资质上传错误:', error);
      message.error(error.response?.data?.msg || '网络连接失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 上传文件配置
  const uploadProps = {
    name: 'file',
    multiple: false,
    maxCount: 1,
    fileList,
    accept: 'image/jpeg,image/png,image/jpg',
    beforeUpload: (file: File) => {
      // 验证文件类型
      const isImage = file.type === 'image/jpeg' || file.type === 'image/png' || file.type === 'image/jpg';
      if (!isImage) {
        message.error('只能上传 JPG/PNG 格式的图片！');
        return Upload.LIST_IGNORE;
      }
      
      // 验证文件大小（5MB）
      const isLt5M = file.size / 1024 / 1024 < 5;
      if (!isLt5M) {
        message.error('图片大小不能超过 5MB！');
        return Upload.LIST_IGNORE;
      }
      
      setFileList([file]);
      return false; // 阻止自动上传
    },
    onRemove: () => {
      setFileList([]);
    },
    onChange: ({ fileList }: any) => {
      setFileList(fileList);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      width: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
      background: 'radial-gradient(circle at 10% 30%, #e6f0ff 0%, #f5f7fa 90%)',
    }}>
      <Card 
        title={
          <span style={{ 
            fontSize: '1.6rem', 
            fontWeight: 600, 
            background: 'linear-gradient(145deg, #0066FF, #0050cc)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '1px'
          }}>
            🏢 商户资质认证
          </span>
        }
        style={{ 
          width: '100%',
          maxWidth: 800,
          borderRadius: 24,
          boxShadow: '0 20px 40px -12px rgba(0,102,255,0.25)',
          border: '1px solid rgba(255,255,255,0.3)',
          backdropFilter: 'blur(8px)',
          backgroundColor: 'rgba(255,255,255,0.95)',
        }}
        bordered={false}
        headStyle={{ 
          borderBottom: '1px solid #f0f0f0',
          padding: '20px 28px',
        }}
        bodyStyle={{ padding: '32px 28px' }}
      >
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          marginBottom: 32,
          flexWrap: 'wrap',
          gap: 16,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Progress 
              type="circle" 
              percent={50} 
              width={72} 
              format={() => '2/2'} 
              strokeColor="#0066FF"
              trailColor="#e6f0ff"
              strokeWidth={8}
            />
            <div>
              <div style={{ fontSize: 18, fontWeight: 600, color: '#1a1a1a' }}>最后一步</div>
              <div style={{ fontSize: 14, color: '#666', marginTop: 4 }}>上传资质材料，等待审核</div>
            </div>
          </div>
          <Card 
            size="small" 
            style={{ 
              backgroundColor: '#f9fcff',
              borderColor: '#cce4ff',
              borderRadius: 12,
              borderStyle: 'dashed',
              flex: '0 1 auto',
            }}
            bodyStyle={{ padding: '10px 18px' }}
          >
            <span style={{ color: '#0066FF', fontSize: 14 }}>
              ⏱️ 审核约1-3个工作日
            </span>
          </Card>
        </div>

        <Form
          form={form}
          onFinish={onFinish}
          layout="vertical"
          size="large"
          requiredMark="optional"
          initialValues={{
            license_no: '',
            issuing_authority: '',
          }}
        >
          {/* 商户信息卡片区域 */}
          <div style={{
            background: '#fafcff',
            borderRadius: 20,
            padding: 20,
            marginBottom: 24,
            border: '1px solid #eef4ff'
          }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#0050b3', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ display: 'inline-block', width: 4, height: 18, background: '#0066FF', borderRadius: 2 }}></span>
              商户基本信息
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
              <div style={{ flex: '1 1 200px' }}>
                <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 6 }}>商户名称</div>
                <Input 
                  value={username || '新商户'} 
                  disabled 
                  style={{ 
                    backgroundColor: '#ffffff',
                    borderColor: '#e2e8f0',
                    borderRadius: 12,
                    boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                    fontWeight: 500,
                    color: '#1e293b'
                  }}
                  bordered={true}
                />
              </div>
              <div style={{ flex: '1 1 200px' }}>
                <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 6 }}>联系电话</div>
                <Input 
                  value={phone || ''} 
                  disabled 
                  style={{ 
                    backgroundColor: '#ffffff',
                    borderColor: '#e2e8f0',
                    borderRadius: 12,
                    boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                    fontWeight: 500,
                    color: '#1e293b'
                  }}
                  bordered={true}
                />
              </div>
            </div>
          </div>

          {/* 营业执照信息 - 新增字段 */}
          <div style={{
            background: '#fafcff',
            borderRadius: 20,
            padding: 20,
            marginBottom: 24,
            border: '1px solid #eef4ff'
          }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#0050b3', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ display: 'inline-block', width: 4, height: 18, background: '#0066FF', borderRadius: 2 }}></span>
              营业执照信息
            </div>
            
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="license_no"
                  label="统一社会信用代码"
                  rules={[{ required: true, message: '请输入统一社会信用代码' }]}
                >
                  <Input placeholder="18位信用代码" style={{ borderRadius: 12 }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="issuing_authority"
                  label="发证机关"
                  rules={[{ required: true, message: '请输入发证机关' }]}
                >
                  <Input placeholder="如：市场监督管理局" style={{ borderRadius: 12 }} />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="establish_date"
                  label="成立日期"
                  rules={[{ required: true, message: '请选择成立日期' }]}
                >
                  <DatePicker style={{ width: '100%', borderRadius: 12 }} placeholder="选择成立日期" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="valid_until"
                  label="有效期限"
                  rules={[{ required: true, message: '请选择有效期限' }]}
                >
                  <DatePicker style={{ width: '100%', borderRadius: 12 }} placeholder="选择有效期限" />
                </Form.Item>
              </Col>
            </Row>
          </div>

          {/* 营业执照上传 */}
          <Form.Item
            label={<span style={{ fontWeight: 600, fontSize: 15, color: '#1e293b' }}>📄 营业执照图片</span>}
            required
            tooltip={{ title: '支持 JPG/PNG 格式，大小不超过 5MB', icon: <span style={{ color: '#0066FF' }}>ⓘ</span> }}
            help={<span style={{ color: '#6b7280' }}>请上传清晰可见的营业执照扫描件或照片</span>}
            style={{ marginBottom: 28 }}
          >
            <Dragger 
              {...uploadProps} 
              style={{ 
                background: '#fbfdff', 
                borderRadius: 20,
                border: '2px dashed #cce4ff',
                transition: 'all 0.3s',
                padding: '24px 12px'
              }}
              className="custom-dragger"
            >
              <p className="ant-upload-drag-icon">
                <InboxOutlined style={{ color: '#0066FF', fontSize: 48 }} />
              </p>
              <p className="ant-upload-text" style={{ fontSize: 16, color: '#1e293b', marginTop: 12 }}>
                点击或拖拽文件到此区域上传
              </p>
              <p className="ant-upload-hint" style={{ color: '#6b7280' }}>
                支持单个 JPG/PNG 图片，不超过 5MB
              </p>
            </Dragger>
          </Form.Item>

          {/* 入驻理由 */}
          <Form.Item
            name="apply_reason"
            label={<span style={{ fontWeight: 600, fontSize: 15, color: '#1e293b' }}>📋 入驻理由</span>}
            rules={[
              { required: true, message: '请输入入驻理由' },
              { min: 10, message: '请详细描述您的入驻理由，至少10个字' }
            ]}
            style={{ marginBottom: 28 }}
          >
            <TextArea
              rows={4}
              placeholder="请详细说明您的业务范围、经营规模以及入驻平台的目的"
              maxLength={200}
              showCount
              style={{ 
                borderRadius: 16,
                padding: '14px 16px',
                borderColor: '#e2e8f0',
                boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                fontSize: 15,
                resize: 'vertical'
              }}
            />
          </Form.Item>

          {/* 温馨提示 */}
          <Card 
            size="small" 
            style={{ 
              marginBottom: 28,
              backgroundColor: '#f3faff',
              borderColor: '#b8dbff',
              borderRadius: 16,
              borderLeftWidth: 6,
              borderLeftColor: '#0066FF',
              boxShadow: '0 4px 12px rgba(0,102,255,0.08)'
            }}
            bodyStyle={{ padding: '16px 20px' }}
          >
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 24 }}>📌</span>
              <div>
                <p style={{ fontWeight: 700, color: '#0050b3', marginBottom: 10, fontSize: 15 }}>审核说明</p>
                <ul style={{ 
                  paddingLeft: 20, 
                  marginBottom: 0, 
                  color: '#2c3e50', 
                  lineHeight: 1.8,
                  listStyleType: 'circle'
                }}>
                  <li style={{ fontSize: 14 }}>管理员将在1-3个工作日内完成审核</li>
                  <li style={{ fontSize: 14 }}>审核通过后您将收到短信通知</li>
                  <li style={{ fontSize: 14 }}>审核期间请保持电话畅通</li>
                  <li style={{ fontSize: 14 }}>请确保填写的信息与营业执照一致</li>
                </ul>
              </div>
            </div>
          </Card>

          <Form.Item style={{ marginBottom: 0 }}>
            <Button 
              type="primary" 
              htmlType="submit" 
              block 
              loading={loading}
              style={{ 
                height: 52, 
                fontSize: 17, 
                borderRadius: 16,
                background: 'linear-gradient(145deg, #0066FF, #0050cc)',
                border: 'none',
                boxShadow: '0 8px 16px rgba(0,102,255,0.3)',
                fontWeight: 600,
                letterSpacing: 2
              }}
              disabled={fileList.length === 0}
            >
              {fileList.length === 0 ? '⬆️ 请先上传营业执照' : '✅ 提交审核'}
            </Button>
            
            <div style={{ 
              marginTop: 24, 
              textAlign: 'center',
              fontSize: 14,
              color: '#6b7280',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6
            }}>
              <span>稍后上传？</span>
              <Button 
                type="link" 
                style={{ 
                  padding: '4px 12px', 
                  height: 'auto',
                  borderRadius: 30,
                  background: '#f0f7ff',
                  color: '#0066FF',
                  fontWeight: 500
                }}
                onClick={() => {
                  message.warning('您可以在"个人中心-商户认证"中继续提交资质');
                  navigate('/login');
                }}
              >
                暂不提交
              </Button>
            </div>
          </Form.Item>
        </Form>
      </Card>
      <style>{`
        .custom-dragger:hover {
          border-color: #0066FF !important;
          background: #f5fbff !important;
        }
        .ant-upload-text {
          color: #1e293b;
        }
        .ant-upload-hint {
          color: #6b7280;
        }
      `}</style>
    </div>
  );
};

export default MerchantQualification;