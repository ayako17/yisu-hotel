import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Modal, Form, Input, InputNumber, DatePicker, Tag, Space, message, Tooltip, Popconfirm } from 'antd';
import { PlusOutlined, CopyOutlined, DeleteOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import axios from '../../services/axios';
import dayjs from 'dayjs';

const { TextArea } = Input;

interface Invitation {
  invitation_id: number;
  invite_code: string;
  creator_id: number;
  creator_name: string;
  is_used: number;
  used_by_id: number | null;
  used_by_name: string | null;
  expire_at: string;
  note: string;
  created_at: string;
  status_text: string;
}

const InvitationManagement: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [generateLoading, setGenerateLoading] = useState(false);
  const [form] = Form.useForm();

  // 加载邀请码列表
  const fetchInvitations = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:3000/api/invitations', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.code === 200) {
        setInvitations(res.data.data.list || []);
      } else {
        message.error(res.data.msg || '加载失败');
      }
    } catch (error: any) {
      message.error(error.response?.data?.msg || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvitations();
  }, []);

// 生成邀请码
const handleGenerate = async (values: any) => {
  setGenerateLoading(true);
  try {
    const token = localStorage.getItem('token');
    const res = await axios.post('http://localhost:3000/api/invitations/generate', {
      expiresInDays: values.expiresInDays
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (res.data.code === 200) {
      message.success('邀请码生成成功');
      setModalVisible(false);
      form.resetFields();
      
      const inviteCode = res.data.data.invite_code;
      const expireAt = res.data.data.expire_at;
      
      // ✅ 优化：增加复制按钮，关闭按钮文字改为"关闭"
      Modal.info({
        title: '🎉 邀请码生成成功',
        width: 520,
        content: (
          <div>
            <p style={{ marginBottom: '12px', color: '#666' }}>
              请复制并妥善保存以下邀请码：
            </p>
            
            {/* 邀请码展示区域 */}
            <div style={{ 
              padding: '16px', 
              backgroundColor: '#f9f9f9', 
              border: '1px solid #d9d9d9',
              borderRadius: '8px',
              marginBottom: '16px'
            }}>
              <div style={{ 
                fontSize: '20px', 
                fontWeight: 'bold',
                fontFamily: 'monospace',
                textAlign: 'center',
                letterSpacing: '2px',
                marginBottom: '12px',
                color: '#1890ff'
              }}>
                {inviteCode}
              </div>
              
              {/* ✅ 新增：复制按钮组 */}
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <Button
                  type="primary"
                  icon={<CopyOutlined />}
                  onClick={() => {
                    navigator.clipboard.writeText(inviteCode);
                    message.success('✅ 邀请码已复制到剪贴板');
                  }}
                  size="middle"
                >
                  复制邀请码
                </Button>
                
                <Button
                  icon={<CopyOutlined />}
                  onClick={() => {
                    const text = `邀请码：${inviteCode}\n有效期至：${dayjs(expireAt).format('YYYY-MM-DD HH:mm:ss')}`;
                    navigator.clipboard.writeText(text);
                    message.success('✅ 完整信息已复制');
                  }}
                  size="middle"
                >
                  复制完整信息
                </Button>
              </div>
            </div>

            {/* 有效期信息 */}
            <div style={{ 
              padding: '12px', 
              backgroundColor: '#e6f7ff', 
              border: '1px solid #91d5ff',
              borderRadius: '6px',
              marginBottom: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#1890ff', fontWeight: 'bold' }}>📅 有效期至：</span>
                <span style={{ fontSize: '14px' }}>
                  {dayjs(expireAt).format('YYYY-MM-DD HH:mm:ss')}
                </span>
              </div>
            </div>

            {/* 温馨提示 */}
            <div style={{ 
              fontSize: '13px', 
              color: '#666',
              backgroundColor: '#fffbe6',
              padding: '10px 12px',
              borderRadius: '6px',
              border: '1px solid #ffe58f'
            }}>
              <span style={{ color: '#faad14', marginRight: '6px' }}>💡</span>
              邀请码仅限使用一次，请勿泄露给他人
            </div>
          </div>
        ),
        okText: '关 闭',  // 
        okButtonProps: {
          size: 'large'
        },
        centered: true,
        maskClosable: true,
        onOk: () => {
          fetchInvitations();  // 关闭时刷新列表
        }
      });
      
      fetchInvitations();
    } else {
      message.error(res.data.msg || '生成失败');
    }
  } catch (error: any) {
    console.error('生成邀请码失败:', error);
    message.error(error.response?.data?.msg || '生成失败');
  } finally {
    setGenerateLoading(false);
  }
};

  // 复制邀请码
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      message.success('已复制到剪贴板');
    }).catch(() => {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      message.success('已复制到剪贴板');
    });
  };

  // 删除邀请码
  const handleDelete = async (id: number) => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.delete(`http://localhost:3000/api/invitations/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.code === 200) {
        message.success('删除成功');
        fetchInvitations();
      } else {
        message.error(res.data.msg || '删除失败');
      }
    } catch (error: any) {
      message.error(error.response?.data?.msg || '删除失败');
    }
  };

  const columns = [
    {
      title: '邀请码',
      dataIndex: 'invite_code',
      key: 'invite_code',
      render: (text: string, record: Invitation) => (
        <Space>
          <span style={{ 
            fontFamily: 'monospace',
            backgroundColor: '#f5f5f5',
            padding: '2px 8px',
            borderRadius: '4px'
          }}>
            {text}
          </span>
          {record.is_used === 0 && (
            <Tooltip title="复制">
              <Button
                type="text"
                icon={<CopyOutlined />}
                size="small"
                onClick={() => copyToClipboard(text)}
              />
            </Tooltip>
          )}
        </Space>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status_text',
      key: 'status',
      render: (text: string, record: Invitation) => {
        let color = 'default';
        if (record.is_used === 1) {
          color = 'green';
        } else if (new Date(record.expire_at) < new Date()) {
          color = 'red';
        } else {
          color = 'blue';
        }
        return <Tag color={color}>{text}</Tag>;
      },
    },
    {
      title: '有效期至',
      dataIndex: 'expire_at',
      key: 'expire_at',
      render: (text: string) => dayjs(text).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '创建者',
      dataIndex: 'creator_name',
      key: 'creator_name',
    },
    {
      title: '使用人',
      dataIndex: 'used_by_name',
      key: 'used_by_name',
      render: (text: string | null) => text || '-',
    },
    {
      title: '备注',
      dataIndex: 'note',
      key: 'note',
      render: (text: string) => text || '-',
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (text: string) => dayjs(text).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: Invitation) => (
        <Space>
          {record.is_used === 0 && new Date(record.expire_at) >= new Date() && (
            <Tooltip title="复制邀请码">
              <Button
                type="text"
                icon={<CopyOutlined />}
                size="small"
                onClick={() => copyToClipboard(record.invite_code)}
              />
            </Tooltip>
          )}
          {record.is_used === 0 && (
            <Popconfirm
              title="确定要删除这个邀请码吗？"
              onConfirm={() => handleDelete(record.invitation_id)}
              okText="确定"
              cancelText="取消"
            >
              <Tooltip title="删除">
                <Button
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  size="small"
                />
              </Tooltip>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card 
        title="邀请码管理" 
        extra={
          <Space>
            <Button
              icon={<ReloadOutlined />}
              onClick={fetchInvitations}
              loading={loading}
            >
              刷新
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setModalVisible(true)}
            >
              生成邀请码
            </Button>
          </Space>
        }
        bordered={false}
      >
        <Table
          columns={columns}
          dataSource={invitations}
          loading={loading}
          rowKey="invitation_id"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`
          }}
        />
      </Card>

      {/* 生成邀请码模态框 */}
      <Modal
        title="生成管理员邀请码"
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        confirmLoading={generateLoading}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleGenerate}
          initialValues={{ expiresInDays: 7 }}
        >
          <Form.Item
            name="expiresInDays"
            label="有效期（天）"
            rules={[{ required: true, message: '请输入有效期' }]}
          >
            <InputNumber 
              min={1} 
              max={365} 
              style={{ width: '100%' }} 
              placeholder="请输入有效期天数"
            />
          </Form.Item>

          <div style={{ 
            padding: '12px', 
            backgroundColor: '#fff2e8', 
            border: '1px solid #ffbb96',
            borderRadius: '4px',
            fontSize: '12px',
            color: '#666',
            marginBottom: '16px'
          }}>
            <div style={{ fontWeight: 'bold', marginBottom: '4px', color: '#fa541c' }}>
              ⚠️ 重要提示
            </div>
            <div>1. 邀请码生成后请妥善保存，每个邀请码只能使用一次</div>
            <div>2. 邀请码用于管理员注册，请确保分发给可信人员</div>
            <div>3. 已使用的邀请码无法删除，未使用的邀请码可以随时删除</div>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default InvitationManagement;