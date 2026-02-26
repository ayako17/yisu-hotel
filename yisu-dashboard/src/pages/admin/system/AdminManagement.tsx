import React, { useState, useEffect } from 'react';
import { Card, Table, Tag, Space, Typography, message, App } from 'antd';
import axios from '../../../services/axios';

const { Text } = Typography;

interface Admin {
  user_id: number;
  username: string;
  phone: string;
  role: 'admin' | 'super_admin';
  status: string;
  created_at: string;
}

const AdminManagement: React.FC = () => {
  // 使用 App 的 message
  const { message: antdMessage } = App.useApp();
  
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(false);
  // 获取当前登录用户信息
  const [currentUser, setCurrentUser] = useState<{ role: string; user_id: number } | null>(null);

  // 获取当前登录用户信息
  useEffect(() => {
    const userStr = localStorage.getItem('userInfo');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        setCurrentUser({
          role: user.role,
          user_id: user.user_id || user.userId
        });
      } catch (error) {
        console.error('解析用户信息失败:', error);
      }
    }
  }, []);

  const columns = [
    {
      title: 'ID',
      dataIndex: 'user_id',
      key: 'user_id',
      width: 80,
    },
    {
      title: '用户名',
      dataIndex: 'username',
      key: 'username',
    },
    {
      title: '手机号',
      dataIndex: 'phone',
      key: 'phone',
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      render: (role: string) => (
        <Tag color={role === 'super_admin' ? 'red' : 'blue'}>
          {role === 'super_admin' ? '超级管理员' : '管理员'}
        </Tag>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'active' ? 'green' : 'orange'}>
          {status === 'active' ? '正常' : '已禁用'}
        </Tag>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => date ? new Date(date).toLocaleString('zh-CN') : '-',
    },
    {
      title: '首次登录',
      key: 'first_login',
      render: (_: any, record: Admin) => {
        // 使用 created_at 作为首次登录时间
        return record.created_at ? new Date(record.created_at).toLocaleString('zh-CN') : '-';
      },
    },
  ];

  const fetchAdmins = async () => {
    setLoading(true);
    try {
      console.log('开始请求管理员列表...');
      const res = await axios.get('/admins/users');
      
      if (res.data && res.data.code === 200) {
        let adminData = res.data.data;
        
        // 确保是数组
        if (!Array.isArray(adminData)) {
          console.warn('data 字段不是数组，尝试转换');
          if (adminData && typeof adminData === 'object') {
            adminData = adminData.list || adminData.items || adminData.records || adminData.users || [];
          } else {
            adminData = [];
          }
        }
        
        setAdmins(adminData);
      } else {
        console.error('API 返回错误:', res.data?.msg);
        antdMessage.error(res.data?.msg || '获取数据失败');
      }
    } catch (error: any) {
      console.error('请求异常:', error);
      antdMessage.error(error.response?.data?.msg || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  return (
    <Card title="管理员管理" variant="borderless">
      {/* 如果是超级管理员，显示提示信息 */}
      {currentUser?.role === 'super_admin' && (
        <div style={{ marginBottom: 16, padding: '8px 16px', background: '#f0f5ff', borderRadius: 8 }}>
          <Text type="secondary">当前以超级管理员身份查看</Text>
        </div>
      )}
      
      <Table
        columns={columns}
        dataSource={admins}
        loading={loading}
        rowKey="user_id"
        pagination={{
          defaultPageSize: 10,
          showSizeChanger: true,
          showTotal: (total) => `共 ${total} 条记录`,
        }}
        locale={{
          emptyText: loading ? '加载中...' : '暂无数据'
        }}
      />
    </Card>
  );
};

export default AdminManagement;