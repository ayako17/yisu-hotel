// HotelOperationLogs.tsx
import React, { useState, useEffect } from 'react';
import { Modal, Table, Tag, Typography, Space } from 'antd';
import { ClockCircleOutlined, UserOutlined } from '@ant-design/icons';
import axios from 'axios';

const { Text } = Typography;

interface OperationLog {
  log_id: number;
  apply_id: number;
  admin_id: number;
  admin_name: string;
  action: string;
  reason: string;
  created_at: string;
  target_type: string;
  change_data: any;
}

interface Props {
  visible: boolean;
  hotelId: number | null;
  onClose: () => void;
}

const HotelOperationLogs: React.FC<Props> = ({ visible, hotelId, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<OperationLog[]>([]);

  useEffect(() => {
    if (visible && hotelId) {
      fetchLogs(hotelId);
    }
  }, [visible, hotelId]);

  const fetchLogs = async (id: number) => {
    setLoading(true);
    try {
      const response = await axios.get(`http://localhost:3000/api/admin/hotels/${id}/logs`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.data.code === 200) {
        setLogs(response.data.data);
      }
    } catch (error) {
      console.error('获取操作日志失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      title: '操作时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: (time: string) => (
        <Space>
          <ClockCircleOutlined />
          {new Date(time).toLocaleString()}
        </Space>
      ),
    },
    {
      title: '操作类型',
      dataIndex: 'target_type',
      key: 'target_type',
      width: 120,
      render: (type: string) => {
        const typeMap = {
          'hotel_offline': <Tag color="orange">下线操作</Tag>,
          'hotel_recovery': <Tag color="green">恢复上线</Tag>,
        };
        return typeMap[type as keyof typeof typeMap] || <Tag>{type}</Tag>;
      },
    },
    {
      title: '操作人',
      dataIndex: 'admin_name',
      key: 'admin_name',
      width: 120,
      render: (name: string) => (
        <Space>
          <UserOutlined />
          {name || '未知'}
        </Space>
      ),
    },
    {
      title: '操作详情',
      key: 'detail',
      render: (_: any, record: OperationLog) => {
        const changeData = record.change_data ? JSON.parse(record.change_data) : {};
        return (
          <div>
            <Text>从 {changeData.previous_status || '未知'} 变为 {record.action === 'offline' ? '已下线' : '运营中'}</Text>
            <br />
            <Text type="secondary" style={{ fontSize: 12 }}>{record.reason}</Text>
          </div>
        );
      },
    },
  ];

  return (
    <Modal
      title="操作日志"
      open={visible}
      onCancel={onClose}
      width={800}
      footer={null}
    >
      <Table
        columns={columns}
        dataSource={logs}
        loading={loading}
        rowKey="log_id"
        pagination={false}
      />
    </Modal>
  );
};

export default HotelOperationLogs;