import React, { useState } from 'react';
import { Form, Input, Button, Card, message, Select, Collapse, Alert } from 'antd';
import { UserOutlined, LockOutlined, MobileOutlined, KeyOutlined, CrownOutlined } from '@ant-design/icons';
import { useNavigate, Link } from 'react-router-dom';
import axios from '../../services/axios';

const { Option } = Select;
const { Panel } = Collapse;

const Register: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState('user');
  const [showInviteCode, setShowInviteCode] = useState(false);
  const navigate = useNavigate();

const onFinish = async (values: any) => {
  console.log('提交的表单数据:', values); 
  setLoading(true);
  try {
    const requestData: any = {
      username: values.username,
      phone: values.phone,
      password: values.password,
      role: values.role
    };

    // 根据角色调用不同的接口
    let url = '/auth/register';  // 普通用户和商户
    if (values.role === 'admin') {
      url = '/auth/register/admin';  // 管理员使用专用接口
      requestData.inviteCode = values.inviteCode;
    } else {
      // 普通用户和商户使用通用接口
      requestData.role = values.role;
    }

    const res = await axios.post(url, requestData);
    
    if (res.data.code === 200) {
      const role = values.role as 'user' | 'merchant' | 'admin';
      const roleMessages = {
        'user': '用户',
        'merchant': '商户',
        'admin': '管理员'
      };
      
      const successMsg = role === 'user' 
        ? `${roleMessages[role]}注册成功，请登录！`
        : `${roleMessages[role]}注册成功${role === 'merchant' ? '，请等待审核' : '，请登录'}！`;

      // 根据不同角色执行不同的跳转逻辑
      if (role === 'merchant') {
        // 商户：存储token，然后跳转到资质上传页面
        if (res.data.data?.token) {
          localStorage.setItem('token', res.data.data.token);
          localStorage.setItem('userInfo', JSON.stringify({
            user_id: res.data.data.user_id,
            username: values.username,
            phone: values.phone,
            role: 'merchant',
            status: res.data.data.status
          }));
        }
        
        message.success('商户基础信息注册成功，请继续上传资质材料');
        navigate('/merchant/qualification', {
          state: {
            userId: res.data.data?.user_id,
            phone: values.phone,
            username: values.username,
            fromRegister: true  // 标识来自注册流程
          }
        });
      } else if (role === 'admin') {
        // 管理员：注册成功后跳转到登录页
        message.success(successMsg);
        navigate('/login');
      } else {
        // 普通用户：直接跳转到登录页
        message.success(successMsg);
        navigate('/login');
      }
    } else {
      message.error(res.data.msg || '注册失败');
    }
  } catch (error: any) {
    console.error('注册错误:', error);
    message.error(error.response?.data?.msg || error.message || '网络连接失败');
  } finally {
    setLoading(false);
  }
};

  const handleRoleChange = (value: string) => {
    setRole(value);
    setShowInviteCode(value === 'admin'); // 只有管理员需要邀请码
  };

  return (
    <div style={{
      width: '100vw', 
      height: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      background: 'linear-gradient(180deg, #0066FF 0%, #F0F2F5 100%)',
    }}>
      <Card 
        title="用户注册" 
        style={{ 
          width: 500, 
          borderRadius: 8,
          boxShadow: '0 8px 24px rgba(0,0,0,0.1)'
        }}
        bordered={false}
      >
        <Form 
          onFinish={onFinish} 
          size="large" 
          layout="vertical"
          initialValues={{ role: 'user' }}
        >
          <Form.Item 
            name="role" 
            label="注册角色"
            rules={[{ required: true, message: '请选择注册角色' }]}
          >
            <Select 
              placeholder="请选择注册角色"
              onChange={handleRoleChange}
            >
              <Option value="user">
                <span style={{ display: 'flex', alignItems: 'center' }}>
                  👤 普通用户
                  <span style={{ marginLeft: 8, fontSize: 12, color: '#52c41a' }}>
                    （直接使用）
                  </span>
                </span>
              </Option>
              <Option value="merchant">
                <span style={{ display: 'flex', alignItems: 'center' }}>
                  🏪 商户
                  <span style={{ marginLeft: 8, fontSize: 12, color: '#fa8c16' }}>
                    （需资质审核）
                  </span>
                </span>
              </Option>
              <Option value="admin">
                <span style={{ display: 'flex', alignItems: 'center' }}>
                  <CrownOutlined style={{ color: '#1890ff' }} />
                  <span style={{ marginLeft: 6 }}>管理员</span>
                  <span style={{ marginLeft: 8, fontSize: 12, color: '#1890ff' }}>
                    （需邀请码）
                  </span>
                </span>
              </Option>
            </Select>
          </Form.Item>

          {/* 邀请码输入框（仅管理员注册时显示） */}
          {showInviteCode && (
            <Form.Item
              name="inviteCode"
              label="管理员邀请码"
              rules={[{ required: true, message: '请输入管理员邀请码' }]}
              extra="请联系超级管理员获取邀请码"
            >
              <Input
                prefix={<KeyOutlined />}
                placeholder="请输入管理员邀请码"
              />
            </Form.Item>
          )}

          <Form.Item 
            name="username" 
            label={role === 'merchant' ? '商户名称' : '用户名'} 
            rules={[{ required: true, message: role === 'merchant' ? '请输入商户名称！' : '请输入用户名！' }]}
          >
            <Input 
              prefix={<UserOutlined />} 
              placeholder={role === 'merchant' ? '请输入商户名称' : '请输入用户名'} 
            />
          </Form.Item>

          <Form.Item 
            name="phone" 
            label="手机号" 
            rules={[{ 
              required: true, 
              pattern: /^1[3-9]\d{9}$/, 
              message: '请输入正确的手机号格式！' 
            }]}
          >
            <Input 
              prefix={<MobileOutlined />} 
              placeholder="请输入手机号" 
              maxLength={11}
            />
          </Form.Item>

          <Form.Item 
            name="password" 
            label="设置密码" 
            rules={[{ 
              required: true, 
              min: 6, 
              message: '密码至少6位！' 
            }]}
          >
            <Input.Password 
              prefix={<LockOutlined />} 
              placeholder="至少6位密码" 
            />
          </Form.Item>

          <Form.Item 
            name="confirm" 
            label="确认密码" 
            dependencies={['password']}
            rules={[
              { required: true, message: '请再次输入密码！' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('两次密码输入不一致！'));
                },
              }),
            ]}
          >
            <Input.Password 
              prefix={<LockOutlined />} 
              placeholder="请再次输入密码" 
            />
          </Form.Item>

          {/* 角色说明折叠面板 */}
          <Collapse ghost style={{ marginBottom: 16 }}>
            <Panel header="各角色权限说明" key="1">
              <div style={{ fontSize: 12, lineHeight: 1.8 }}>
                <p><strong>👤 普通用户</strong>: 浏览、预订酒店</p>
                <p><strong>🏪 商户</strong>: 发布、管理酒店（需提交资质审核）</p>
                <p><strong>👑 管理员</strong>: 审核商户、管理平台内容（需超级管理员的邀请码）</p>
                <p><strong>👑 超级管理员</strong>: 系统最高权限，由系统初始化创建，负责生成管理邀请码</p>
              </div>
            </Panel>
          </Collapse>

          {role === 'merchant' && (
            <Alert
              message="商户注册说明"
              description="注册后请准备好营业执照等资质材料，等待管理员审核。"
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />
          )}

          {showInviteCode && (
            <Alert
              message="管理员注册说明"
              description="管理员账号必须使用有效的邀请码注册。请联系超级管理员获取邀请码。"
              type="warning"
              showIcon
              style={{ marginBottom: 16 }}
            />
          )}

          <Form.Item>
            <Button 
              type="primary" 
              htmlType="submit" 
              block 
              loading={loading}
              style={{ height: 45, fontSize: 16 }}
            >
              立即注册
            </Button>
            <div style={{ 
              marginTop: 16, 
              textAlign: 'center',
              fontSize: 14,
              color: '#666'
            }}>
              已有账号？ <Link to="/login" style={{ color: '#0066FF' }}>立即登录</Link>
            </div>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default Register;