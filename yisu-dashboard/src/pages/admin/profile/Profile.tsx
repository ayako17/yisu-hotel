import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Form, 
  Input, 
  Button, 
  Descriptions, 
  message, 
  Avatar, 
  Tag, 
  Divider, 
  Space,
  Upload,
  Modal,
  Tabs,
  Row,
  Col,
  Statistic
} from 'antd';
import { 
  UserOutlined, 
  PhoneOutlined, 
  SafetyOutlined, 
  EditOutlined, 
  SaveOutlined,
  LockOutlined,
  CameraOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import type { UploadFile, UploadProps } from 'antd';
import ImgCrop from 'antd-img-crop';
import axios from '../../../services/axios'; 

const { TabPane } = Tabs;
const { Password } = Input;

const Profile: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [form] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const [activeTab, setActiveTab] = useState('info');
  const [avatarFileList, setAvatarFileList] = useState<UploadFile[]>([]);

  // 加载用户信息
  useEffect(() => {
    // 先从 localStorage 获取
    const userStr = localStorage.getItem('userInfo');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        console.log('localStorage 中的用户信息:', user);
        setUserInfo(user);
        form.setFieldsValue({
          username: user.username,
          phone: user.phone,
        });
        
        // 如果有头像地址，设置预览
        if (user.avatar_url) {
          setAvatarFileList([
            {
              uid: '-1',
              name: 'avatar.png',
              status: 'done',
              url: user.avatar_url,
            }
          ]);
        }
      } catch (error) {
        console.error('解析用户信息失败:', error);
      }
    }

    // 从后端获取最新的用户信息
    fetchUserProfile();
  }, [form]);

 // 获取最新的用户信息
  const fetchUserProfile = async () => {
    try {
      const res = await axios.get('/profile');
      if (res.data.code === 200) {
        const userData = res.data.data;
        console.log('后端返回的用户信息:', userData);
        
        // 从 localStorage 获取登录时保存的 last_login
        const storedUser = localStorage.getItem('userInfo');
        let lastLogin = userData.updatedAt; // 默认使用 updatedAt
        
        if (storedUser) {
          try {
            const parsedStoredUser = JSON.parse(storedUser);
            // 如果 localStorage 中有 last_login，优先使用
            lastLogin = parsedStoredUser.last_login || parsedStoredUser.lastLogin || userData.updatedAt;
          } catch (e) {
            console.error('解析 localStorage 用户信息失败:', e);
          }
        }
        
        // 合并数据
        const enhancedUserData = {
          ...userData,
          last_login: lastLogin,
          lastLogin: lastLogin
        };
        
        setUserInfo(enhancedUserData);
        localStorage.setItem('userInfo', JSON.stringify(enhancedUserData));
        
        form.setFieldsValue({
          username: userData.username,
          phone: userData.phone,
        });
        
        // 如果有头像地址，设置预览
        if (userData.avatar_url) {
          setAvatarFileList([
            {
              uid: '-1',
              name: 'avatar.png',
              status: 'done',
              url: userData.avatar_url,
            }
          ]);
        }
      }
    } catch (error) {
      console.error('获取用户信息失败:', error);
    }
  };

// 保存个人信息
const handleSave = async (values: any) => {
  setLoading(true);
  try {
    // 如果有上传头像
    let avatarUrl = userInfo?.avatar_url;
    if (avatarFileList.length > 0 && avatarFileList[0].originFileObj) {
      const formData = new FormData();
      formData.append('avatar', avatarFileList[0].originFileObj);
      
      const uploadRes = await axios.post('/profile/avatar', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      if (uploadRes.data.code === 200) {
        avatarUrl = uploadRes.data.data.url;
      }
    }

    const res = await axios.put('/profile', {
      username: values.username,
      phone: values.phone,
      avatar_url: avatarUrl
    });

    if (res.data.code === 200) {
      message.success('个人信息更新成功');
      setEditing(false);

      const updatedUserInfo = { 
        ...userInfo, 
        username: values.username,
        phone: values.phone,
        avatar_url: avatarUrl
      };
      setUserInfo(updatedUserInfo);
      localStorage.setItem('userInfo', JSON.stringify(updatedUserInfo));
      
      if (avatarUrl) {
        setAvatarFileList([
          {
            uid: '-1',
            name: 'avatar.png',
            status: 'done',
            url: avatarUrl,
          }
        ]);
      }

      // 重新获取最新信息
      fetchUserProfile();
    } else {
      message.error(res.data.msg || '更新失败');
    }
  } catch (error: any) {
    console.error('更新个人信息失败:', error);
    message.error(error.response?.data?.msg || '更新失败');
  } finally {
    setLoading(false);
  }
};

  // 修改密码
  const handlePasswordChange = async (values: any) => {
    setLoading(true);
    try {
      const res = await axios.put('/profile/password', {
        oldPassword: values.oldPassword,
        newPassword: values.newPassword
      });

      if (res.data.code === 200) {
        message.success('密码修改成功');
        passwordForm.resetFields();
        Modal.success({
          title: '密码修改成功',
          content: '请使用新密码重新登录',
          onOk: () => {
            localStorage.removeItem('token');
            localStorage.removeItem('userInfo');
            window.location.href = '/login';
          }
        });
      } else {
        message.error(res.data.msg || '密码修改失败');
      }
    } catch (error: any) {
      console.error('修改密码失败:', error);
      message.error(error.response?.data?.msg || '密码修改失败');
    } finally {
      setLoading(false);
    }
  };

  // 头像上传处理
  const handleAvatarChange: UploadProps['onChange'] = ({ fileList: newFileList }) => {
    setAvatarFileList(newFileList);
  };

  const getRoleTag = (role: string) => {
    const roleConfig: Record<string, { color: string; text: string }> = {
      'super_admin': { color: 'red', text: '超级管理员' },
      'admin': { color: 'blue', text: '管理员' },
      'merchant': { color: 'orange', text: '商户' },
      'user': { color: 'green', text: '用户' },
    };
    
    const config = roleConfig[role] || { color: 'default', text: role };
    return <Tag color={config.color} style={{ fontSize: '14px' }}>{config.text}</Tag>;
  };

  const getStatusTag = (status: string) => {
    return status === 'active' ? (
      <Tag icon={<CheckCircleOutlined />} color="success">正常</Tag>
    ) : (
      <Tag icon={<ClockCircleOutlined />} color="error">封禁</Tag>
    );
  };

 // 格式化日期
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return '未知';
    try {
      const date = new Date(dateString);
      // 检查日期是否有效
      if (isNaN(date.getTime())) return '未知';
      
      return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

 const formatDateShort = (dateString: string | undefined) => {
    if (!dateString) return '未知';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '未知';
      
      return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div>
      <Card title="个人中心" bordered={false} style={{ marginBottom: 24 }}>
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <TabPane tab="个人信息" key="info">
            <div style={{ display: 'flex', marginBottom: 32, alignItems: 'flex-start' }}>
              <div style={{ marginRight: 32, textAlign: 'center' }}>
              {editing ? (
                <div>
                  <ImgCrop rotationSlider aspect={1}>
                    <Upload
                      listType="picture-circle"
                      fileList={avatarFileList}
                      onChange={handleAvatarChange}
                      maxCount={1}
                      beforeUpload={() => false}
                    >
                      {avatarFileList.length < 1 && (
                        <div>
                          <CameraOutlined style={{ fontSize: 24 }} />
                          <div style={{ marginTop: 8 }}>上传头像</div>
                        </div>
                      )}
                    </Upload>
                  </ImgCrop>
                  <div style={{ marginTop: 8, fontSize: 12, color: '#999' }}>
                    支持 JPG/PNG 格式，建议 200x200 像素
                  </div>
                </div>
              ) : (
                <Avatar 
                  size={100} 
                  src={userInfo?.avatar_url}
                  icon={!userInfo?.avatar_url && <UserOutlined />}
                  style={{ 
                    // 有头像时背景透明，无头像时根据角色显示颜色
                    backgroundColor: userInfo?.avatar_url 
                      ? 'transparent' 
                      : (userInfo?.role === 'super_admin' ? '#f5222d' : 
                        userInfo?.role === 'admin' ? '#1890ff' : '#52c41a'),
                    fontSize: 48,
                    border: '4px solid #f0f0f0',
                    // 添加 objectFit 确保头像图片显示正确
                    objectFit: 'cover'
                  }}
                />
              )}
              </div>
              
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
                  {editing ? (
                    <Form
                      form={form}
                      layout="vertical"
                      onFinish={handleSave}
                      style={{ width: '100%' }}
                    >
                      <Row gutter={16}>
                        <Col span={12}>
                          <Form.Item
                            name="username"
                            label="昵称"
                            rules={[
                              { required: true, message: '请输入昵称' },
                              { min: 2, max: 20, message: '昵称长度2-20个字符' }
                            ]}
                          >
                            <Input placeholder="请输入昵称" />
                          </Form.Item>
                        </Col>
                        <Col span={12}>
                          <Form.Item
                            name="phone"
                            label="手机号"
                            rules={[
                              { required: true, message: '请输入手机号' },
                              { pattern: /^1[3-9]\d{9}$/, message: '手机号格式不正确' }
                            ]}
                          >
                            <Input placeholder="请输入手机号" disabled />
                          </Form.Item>
                        </Col>
                      </Row>
                      
                      <Form.Item>
                        <Space>
                          <Button 
                            type="primary" 
                            htmlType="submit" 
                            loading={loading} 
                            icon={<SaveOutlined />}
                          >
                            保存修改
                          </Button>
                          <Button onClick={() => setEditing(false)}>
                            取消
                          </Button>
                        </Space>
                      </Form.Item>
                    </Form>
                  ) : (
                    <>
                      <h2 style={{ margin: 0, fontSize: 24, fontWeight: 600 }}>
                        {userInfo?.username}
                      </h2>
                      <div style={{ marginLeft: 16 }}>
                        {getRoleTag(userInfo?.role)}
                      </div>
                      <div style={{ marginLeft: 8 }}>
                        {getStatusTag(userInfo?.status || 'active')}
                      </div>
                    </>
                  )}
                </div>
                
                {!editing && (
                  <div>
                    <Space size={24}>
                      <div style={{ display: 'flex', alignItems: 'center', color: '#666' }}>
                        <PhoneOutlined style={{ marginRight: 8, color: '#1890ff' }} />
                        <span>{userInfo?.phone}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', color: '#666' }}>
                        <SafetyOutlined style={{ marginRight: 8, color: '#52c41a' }} />
                        <span>ID: {userInfo?.user_id || userInfo?.userId || 'N/A'}</span>
                      </div>
                    </Space>
                    
                    <div style={{ marginTop: 16, textAlign: 'left' }}>
                      <Button 
                        type="primary" 
                        icon={<EditOutlined />}
                        onClick={() => setEditing(true)}
                      >
                        编辑个人信息
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <Divider />

            {!editing && (
              <div>
                <h3 style={{ marginBottom: 16 }}>详细信息</h3>
                <Row gutter={24}>
                  <Col span={8}>
                    <Statistic 
                      title="注册时间" 
                      value={formatDateShort(userInfo?.createdAt)}
                    />
                  </Col>
                  <Col span={8}>
                    <Statistic 
                      title="最后登录" 
                      value={formatDateShort(userInfo?.last_login || userInfo?.lastLogin || userInfo?.updatedAt)}
                    />
                  </Col>
                  <Col span={8}>
                    <Statistic 
                      title="账号状态" 
                      valueRender={() => getStatusTag(userInfo?.status || 'active')}
                    />
                  </Col>
                </Row>
                
                <Descriptions 
                  column={2} 
                  bordered 
                  size="small" 
                  style={{ marginTop: 24 }}
                  labelStyle={{ width: '120px', fontWeight: 500 }}
                >
                  <Descriptions.Item label="用户ID">
                    <span style={{ fontFamily: 'monospace' }}>
                      {userInfo?.user_id || userInfo?.userId || 'N/A'}
                    </span>
                  </Descriptions.Item>
                  <Descriptions.Item label="手机号">{userInfo?.phone}</Descriptions.Item>
                  <Descriptions.Item label="用户角色">{getRoleTag(userInfo?.role)}</Descriptions.Item>
                  <Descriptions.Item label="注册时间">
                    {formatDate(userInfo?.created_at || userInfo?.createdAt)}
                  </Descriptions.Item>
                  <Descriptions.Item label="最后登录">
                    {formatDate(userInfo?.last_login || userInfo?.lastLogin || userInfo?.updatedAt)}
                  </Descriptions.Item>
                </Descriptions>
              </div>
            )}
          </TabPane>

          <TabPane tab="安全设置" key="security">
            <div style={{ maxWidth: 500, margin: '0 auto' }}>
              <Card 
                title="修改密码" 
                bordered={false}
                style={{ marginBottom: 24 }}
              >
                <Form
                  form={passwordForm}
                  layout="vertical"
                  onFinish={handlePasswordChange}
                >
                  <Form.Item
                    name="oldPassword"
                    label="当前密码"
                    rules={[{ required: true, message: '请输入当前密码' }]}
                  >
                    <Password 
                      prefix={<LockOutlined />} 
                      placeholder="请输入当前密码" 
                    />
                  </Form.Item>

                  <Form.Item
                    name="newPassword"
                    label="新密码"
                    rules={[
                      { required: true, message: '请输入新密码' },
                      { min: 6, message: '密码至少6位' },
                      ({ getFieldValue }) => ({
                        validator(_, value) {
                          if (!value || getFieldValue('oldPassword') !== value) {
                            return Promise.resolve();
                          }
                          return Promise.reject(new Error('新密码不能与旧密码相同'));
                        },
                      }),
                    ]}
                  >
                    <Password 
                      prefix={<LockOutlined />} 
                      placeholder="请输入新密码，至少6位" 
                    />
                  </Form.Item>

                  <Form.Item
                    name="confirmPassword"
                    label="确认新密码"
                    dependencies={['newPassword']}
                    rules={[
                      { required: true, message: '请确认新密码' },
                      ({ getFieldValue }) => ({
                        validator(_, value) {
                          if (!value || getFieldValue('newPassword') === value) {
                            return Promise.resolve();
                          }
                          return Promise.reject(new Error('两次输入的密码不一致'));
                        },
                      }),
                    ]}
                  >
                    <Password 
                      prefix={<LockOutlined />} 
                      placeholder="请再次输入新密码" 
                    />
                  </Form.Item>

                  <Form.Item>
                    <Button 
                      type="primary" 
                      htmlType="submit" 
                      loading={loading}
                      block
                      style={{ height: 40 }}
                    >
                      确认修改密码
                    </Button>
                  </Form.Item>
                </Form>
              </Card>

              <div style={{ 
                padding: '16px', 
                backgroundColor: '#fff2e8', 
                border: '1px solid #ffbb96',
                borderRadius: '4px',
                fontSize: '12px',
                color: '#666'
              }}>
                <div style={{ fontWeight: 'bold', marginBottom: '4px', color: '#fa541c' }}>
                  ⚠️ 密码安全提示
                </div>
                <div>1. 密码长度至少6位，建议包含字母、数字和特殊字符</div>
                <div>2. 定期更换密码可以提高账号安全性</div>
                <div>3. 修改密码后需要重新登录</div>
                <div>4. 请勿使用过于简单的密码（如123456）</div>
              </div>
            </div>
          </TabPane>
        </Tabs>
      </Card>
    </div>
  );
};

export default Profile;