import React, { useState } from 'react';
import { Form, Input, Button, Card, Checkbox, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate, Link } from 'react-router-dom';
import axios from '../../services/axios';

const Login: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const onFinish = async (values: any) => {
    setLoading(true);
    
    try {
      const res = await axios.post('/auth/login', {
        phone: values.phone,
        password: values.password
      });
      
      console.log('登录响应:', res.data);
      
      if (res.data.code === 200) {
        const userData = res.data.data;
        const role = userData?.role;
        
        // 只允许商户和管理员登录
        if (role === 'super_admin' || role === 'admin' || role === 'merchant') {
          message.success('登录成功，欢迎回来！');
          
          if (userData?.token) {
            localStorage.setItem('token', userData.token);
            localStorage.setItem('userInfo', JSON.stringify({
              username: userData.username,
              role: userData.role,
              phone: values.phone,
              userId: userData.userId
            }));
          }
          
          if (role === 'super_admin' || role === 'admin') {
            navigate('/dashboard');
          } else if (role === 'merchant') {
            navigate('/merchant/dashboard');
          }
        } else {
          message.error('该账号无权限访问管理后台');
        }
      } else {
        message.error(res.data.msg || '登录失败');
      }
    } catch (error: any) {
      console.error('登录错误:', error);
      
      if (error.response?.data?.msg) {
        message.error(error.response.data.msg);
      } else if (error.code === 'ERR_NETWORK') {
        message.error('网络连接失败，请检查后端服务');
        // 保留商户和管理员的演示账号
        if (values.phone === '13888888888' && values.password === 'SuperAdmin@123') {
          message.success('演示模式：超级管理员登录成功！');
          localStorage.setItem('token', 'demo-token-super-admin');
          localStorage.setItem('userInfo', JSON.stringify({
            username: '系统超级管理员',
            role: 'super_admin',
            phone: '13888888888'
          }));
          navigate('/dashboard');
        } else if (values.phone === 'admin' && values.password === '123456') {
          message.success('演示模式：管理员登录成功！');
          localStorage.setItem('token', 'demo-token-admin');
          localStorage.setItem('userInfo', JSON.stringify({
            username: '演示管理员',
            role: 'admin',
            phone: 'admin'
          }));
          navigate('/dashboard');
        } else if (values.phone === '13800138000' && values.password === 'Merchant@123') {
          message.success('演示模式：商户登录成功！');
          localStorage.setItem('token', 'demo-token-merchant');
          localStorage.setItem('userInfo', JSON.stringify({
            username: '演示商户',
            role: 'merchant',
            phone: '13800138000'
          }));
          navigate('/merchant/dashboard');
        } else {
          message.error('演示账号：超级管理员 13888888888 / SuperAdmin@123, 管理员 admin / 123456, 商户 13800138000 / Merchant@123');
        }
      } else {
        message.error('网络连接失败或服务器错误');
      }
    } finally {
      setLoading(false);
    }
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
        style={{ width: 400, boxShadow: '0 8px 24px rgba(0,0,0,0.1)', borderRadius: 8 }}
        bordered={false}
      >
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h2 style={{ color: '#0066FF', margin: 0 }}>易宿管理平台</h2>
          <p style={{ color: '#999', marginTop: 8 }}>商户/管理员登录入口</p>
        </div>

        <Form
          name="login_form"
          initialValues={{ remember: true }}
          onFinish={onFinish}
          size="large"
        >
          <Form.Item
            name="phone"
            rules={[{ 
              required: true, 
              message: '请输入手机号！' 
            }]}
          >
            <Input 
              prefix={<UserOutlined style={{ color: '#bfbfbf' }} />} 
              placeholder="手机号" 
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: '请输入登录密码！' }]}
          >
            <Input.Password 
              prefix={<LockOutlined style={{ color: '#bfbfbf' }} />} 
              placeholder="密码" 
            />
          </Form.Item>

          <Form.Item>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Form.Item name="remember" valuePropName="checked" noStyle>
                <Checkbox>记住我</Checkbox>
              </Form.Item>
              <a href="" style={{ color: '#0066FF', fontSize: '14px' }}>忘记密码？</a>
            </div>
          </Form.Item>

          <Form.Item>
            <Button 
              type="primary" 
              htmlType="submit" 
              style={{ width: '100%', height: 45, fontSize: 16 }} 
              loading={loading}
            >
              立即登录
            </Button>
            
            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <span style={{ color: '#999', fontSize: 14 }}>还没有账号？</span>
              <Link 
                to="/register" 
                style={{ 
                  color: '#0066FF', 
                  fontSize: 14, 
                  marginLeft: 8,
                  fontWeight: 500 
                }}
              >
                立即注册
              </Link>
            </div>
          </Form.Item>

          {/* 演示账号提示 - 只保留商户和管理员 */}
          <div style={{ 
            padding: '12px', 
            backgroundColor: '#f6ffed', 
            border: '1px solid #b7eb8f',
            borderRadius: '4px',
            fontSize: '12px',
            color: '#666',
            marginTop: '8px'
          }}>
            <div style={{ fontWeight: 'bold', marginBottom: '4px', color: '#52c41a' }}>
              💡 演示账号（后端服务不可用时使用）
            </div>
            <div>超级管理员：13888888888 / SuperAdmin@123</div>
            <div>管理员：admin / 123456</div>
            <div>商户：13800138000 / Merchant@123</div>
          </div>
        </Form>
        
        <div style={{ textAlign: 'center', color: '#ccc', fontSize: 12, marginTop: 16 }}>
          携程技术训练营 - 易宿项目组
        </div>
      </Card>
    </div>
  );
};

export default Login;