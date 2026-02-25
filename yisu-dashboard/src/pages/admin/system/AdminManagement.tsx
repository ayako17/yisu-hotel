import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Modal, Form, Input, Select, Tag, Space, message, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import axios from '../../../services/axios';

const { Option } = Select;

interface Admin {
  user_id: number;
  username: string;
  phone: string;
  role: 'admin' | 'super_admin';
  status: string;
  created_at: string;
  last_login?: string;
  updated_at?: string;
}

const AdminManagement: React.FC = () => {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<Admin | null>(null);
  const [form] = Form.useForm();

  // 监听 admins 状态变化
  useEffect(() => {
    console.log('admins 状态已更新:', admins);
  }, [admins]);

  const columns = [
    // ... 保持之前的 columns 配置
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
      title: '最后登录',
      key: 'last_login',
      render: (_: any, record: Admin) => {
        const date = record.last_login || record.updated_at;
        return date ? new Date(date).toLocaleString('zh-CN') : '-';
      },
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: Admin) => (
        <Space size="middle">
          {record.role !== 'super_admin' ? (
            <>
              <Button
                type="link"
                icon={<EditOutlined />}
                onClick={() => handleEditClick(record)}
              >
                编辑
              </Button>
              <Popconfirm
                title="确认删除"
                description={`确定要删除管理员 ${record.username} 吗？`}
                onConfirm={() => handleDelete(record.user_id)}
                okText="确认"
                cancelText="取消"
              >
                <Button type="link" danger icon={<DeleteOutlined />}>
                  删除
                </Button>
              </Popconfirm>
            </>
          ) : (
            <Tag color="red">不可操作</Tag>
          )}
        </Space>
      ),
    },
  ];

  const fetchAdmins = async () => {
    setLoading(true);
    try {
      console.log('开始请求管理员列表...');
      const res = await axios.get('/admins/users');
      
      console.log('API 响应状态:', res.status);
      console.log('API 响应头:', res.headers);
      console.log('API 响应数据:', res.data);
      console.log('响应数据类型:', typeof res.data);
      console.log('响应数据是否是对象:', res.data !== null && typeof res.data === 'object');
      
      if (res.data && typeof res.data === 'object') {
        console.log('响应数据结构:', Object.keys(res.data));
        console.log('code 字段:', res.data.code);
        console.log('msg 字段:', res.data.msg);
        console.log('data 字段:', res.data.data);
        console.log('data 是否是数组:', Array.isArray(res.data.data));
      }
      
      if (res.data && res.data.code === 200) {
        let adminData = res.data.data;
        
        // 确保是数组
        if (!Array.isArray(adminData)) {
          console.warn('data 字段不是数组，尝试转换');
          if (adminData && typeof adminData === 'object') {
            adminData = adminData.list || adminData.items || adminData.records || adminData.users || [];
            console.log('转换后的数据:', adminData);
          } else {
            adminData = [];
          }
        }
        
        console.log('最终设置到 state 的数据:', adminData);
        setAdmins(adminData);
        
        // 强制更新视图
        setTimeout(() => {
          console.log('设置后的 admins state:', admins);
        }, 100);
      } else {
        console.error('API 返回错误:', res.data?.msg);
        message.error(res.data?.msg || '获取数据失败');
      }
    } catch (error: any) {
      console.error('请求异常:', error);
      console.error('错误详情:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        config: error.config
      });
      message.error(error.response?.data?.msg || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  const handleEditClick = (admin: Admin) => {
    setEditingAdmin(admin);
    form.setFieldsValue({
      username: admin.username,
      phone: admin.phone,
      role: admin.role,
    });
    setModalVisible(true);
  };

  const handleAdd = async (values: any) => {
    try {
      const res = await axios.post('/admins/users', values);
      if (res.data.code === 200) {
        message.success('添加成功');
        setModalVisible(false);
        form.resetFields();
        fetchAdmins(); 
      }
    } catch (error: any) {
      console.error('添加管理员失败:', error);
      message.error(error.response?.data?.msg || '添加失败');
    }
  };

  const handleEdit = async (values: any) => {
    if (!editingAdmin) return;
    try {
      const res = await axios.put(`/admins/users/${editingAdmin.user_id}`, values);
      if (res.data.code === 200) {
        message.success('编辑成功');
        setModalVisible(false);
        setEditingAdmin(null);
        form.resetFields();
        fetchAdmins(); 
      }
    } catch (error: any) {
      console.error('编辑管理员失败:', error);
      message.error(error.response?.data?.msg || '编辑失败');
    }
  };

  const handleDelete = async (userId: number) => {
    try {
      const res = await axios.delete(`/admins/users/${userId}`);
      if (res.data.code === 200) {
        message.success('删除成功');
        fetchAdmins(); 
      }
    } catch (error: any) {
      console.error('删除管理员失败:', error);
      message.error(error.response?.data?.msg || '删除失败');
    }
  };

  return (
    <Card title="管理员管理" variant="borderless">
      <Button
        type="primary"
        icon={<PlusOutlined />}
        onClick={() => {
          setEditingAdmin(null);
          form.resetFields();
          setModalVisible(true);
        }}
        style={{ marginBottom: 16 }}
      >
        添加管理员
      </Button>
      
      {/* 调试信息 */}
      <div style={{ display: 'none' }}>
        当前数据条数: {admins.length}
      </div>
      
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
      
      <Modal
        title={editingAdmin ? '编辑管理员' : '添加管理员'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
          setEditingAdmin(null);
        }}
        onOk={() => form.submit()}
        destroyOnClose={false} 
      >
        <Form
          form={form}
          onFinish={editingAdmin ? handleEdit : handleAdd}
          layout="vertical"
        >
          <Form.Item
            name="username"
            label="用户名"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input disabled={!!editingAdmin} placeholder="请输入用户名" />
          </Form.Item>
          {!editingAdmin && (
            <Form.Item
              name="password"
              label="密码"
              rules={[{ required: true, message: '请输入密码' }]}
            >
              <Input.Password placeholder="请输入密码" />
            </Form.Item>
          )}
          <Form.Item
            name="phone"
            label="手机号"
            rules={[
              { required: true, message: '请输入手机号' },
              { pattern: /^1[3-9]\d{9}$/, message: '请输入有效的手机号' }
            ]}
          >
            <Input placeholder="请输入手机号" />
          </Form.Item>
          <Form.Item
            name="role"
            label="角色"
            rules={[{ required: true, message: '请选择角色' }]}
          >
            <Select placeholder="请选择角色">
              <Option value="admin">管理员</Option>
              <Option value="super_admin">超级管理员</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default AdminManagement;