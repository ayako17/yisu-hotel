import React, { useEffect, useState } from 'react';
import {
  Card, Select, Button, Space, message, Row, Col,
  DatePicker, InputNumber, Modal, Table, Tag, Tooltip,
  Statistic, Radio, Switch, Divider
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  RiseOutlined,
  FallOutlined,
  CalendarOutlined,
  WarningOutlined,
  CopyOutlined,
  SyncOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  DollarOutlined,
  HomeOutlined
} from '@ant-design/icons';
import axios from '../../services/axios';
import dayjs, { Dayjs } from 'dayjs';

const { Option } = Select;
const { RangePicker } = DatePicker;
const { confirm } = Modal;

interface Hotel {
  hotel_id: number;
  name_zh: string;
}

interface RoomType {
  room_type_id: number;
  name: string;
  base_price: number;
  total_rooms: number; // 房间总数
}

// 日历数据结构 - 匹配数据库 room_calendar 表
interface CalendarItem {
  calendar_id: number;
  room_type_id: number;
  date: string;
  final_price: number;
  available_rooms: number;
  status: 'open' | 'closed';
}

interface RoomPriceData {
  room_type_id: number;
  name: string;
  base_price: number;
  calendar: CalendarItem[];
}

// 批量修改弹窗的状态类型
interface BatchModalState {
  visible: boolean;
  type: 'fixed' | 'plus' | 'minus' | 'percent'; // 匹配后端的 adjust_type
  value: number;
  dates: [Dayjs, Dayjs] | null;
  applyToAll: boolean;
  applyToWeekend?: boolean; // 是否只应用到周末
  applyToWeekday?: boolean; // 是否只应用到工作日
}

// 单日修改弹窗的状态类型
interface EditModalState {
  visible: boolean;
  roomTypeId: number;
  roomName: string;
  date: string;
  final_price: number;
  available_rooms: number;
  status: 'open' | 'closed';
}

// 复制价格弹窗状态
interface CopyModalState {
  visible: boolean;
  roomTypeId: number;
  roomName: string;
  sourceDate: string | null;
  targetDates: string[];
}

const MerchantRoomPrice: React.FC = () => {
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [selectedHotelId, setSelectedHotelId] = useState<number | null>(null);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [selectedRoomIds, setSelectedRoomIds] = useState<number[]>([]);
  const [priceData, setPriceData] = useState<RoomPriceData[]>([]);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([
    dayjs(),
    dayjs().add(30, 'day') // 默认显示30天
  ]);

  // 批量修改弹窗状态
  const [batchModal, setBatchModal] = useState<BatchModalState>({
    visible: false,
    type: 'fixed',
    value: 0,
    dates: null,
    applyToAll: true,
    applyToWeekend: false,
    applyToWeekday: false
  });

  // 单日修改弹窗状态
  const [editModal, setEditModal] = useState<EditModalState | null>(null);

  // 复制价格弹窗状态
  const [copyModal, setCopyModal] = useState<CopyModalState>({
    visible: false,
    roomTypeId: 0,
    roomName: '',
    sourceDate: null,
    targetDates: []
  });

  useEffect(() => {
    fetchHotels();
  }, []);

useEffect(() => {
  if (selectedHotelId) {
    fetchRoomTypes(selectedHotelId);
    fetchPriceData(selectedHotelId);
  }
}, [selectedHotelId]); // 只依赖 selectedHotelId

// 单独监听 dateRange 的变化
useEffect(() => {
  if (selectedHotelId && dateRange) {
    fetchPriceData(selectedHotelId);
  }
}, [dateRange]); // 当日期范围变化时重新获取数据

  const fetchHotels = async () => {
    try {
      const res = await axios.get('/merchant/hotels');
      if (res.data.code === 200) {
        const list = res.data.data || [];
        setHotels(list);
        if (list.length > 0) {
          setSelectedHotelId(list[0].hotel_id);
        }
      }
    } catch (error) {
      message.error('获取酒店列表失败');
    }
  };

  const fetchRoomTypes = async (hotelId: number) => {
    try {
      const res = await axios.get(`/merchant/room-types?hotel_id=${hotelId}`);
      if (res.data.code === 200) {
        setRoomTypes(res.data.data || []);
      }
    } catch (error) {
      message.error('获取房型列表失败');
    }
  };

const fetchPriceData = async (hotelId: number) => {
  setLoading(true);
  try {
    const [start, end] = dateRange;
    const startDate = start.format('YYYY-MM-DD');
    const endDate = end.format('YYYY-MM-DD');
    
    console.log('请求参数:', { start_date: startDate, end_date: endDate });

    const res = await axios.get(
      `/merchant/calendar/hotels/${hotelId}`,
      {
        params: {
          start_date: startDate,
          end_date: endDate
        }
      }
    );
    
    console.log('API响应:', res.data);
    
    // 处理后端返回的数据
    let responseData: RoomPriceData[] = [];
    if (Array.isArray(res.data)) {
      responseData = res.data;
    } else if (res.data.code === 200) {
      responseData = res.data.data || [];
    } else {
      responseData = res.data.data || [];
    }
    
    console.log('处理后的数据:', responseData);
    
    // 处理每个日历项的日期格式，确保统一
    const formattedData = responseData.map(item => ({
      ...item,
      base_price: typeof item.base_price === 'string' 
        ? parseFloat(item.base_price) 
        : item.base_price,
      calendar: (item.calendar || []).map(calItem => ({
        ...calItem,
        // 确保 final_price 是数字
        final_price: typeof calItem.final_price === 'string' 
          ? parseFloat(calItem.final_price) 
          : calItem.final_price,
        // 确保日期格式统一
        date: calItem.date.includes('T') 
          ? calItem.date.split('T')[0] 
          : calItem.date
      }))
    }));
    
    setPriceData(formattedData);
    
    if (formattedData.length === 0) {
      message.warning('暂无日历数据，请先生成日历');
    }
  } catch (error: any) {
    console.error('获取房价数据失败:', error);
    console.error('错误详情:', error.response?.data);
    message.error(error.response?.data?.msg || '获取房价数据失败');
  } finally {
    setLoading(false);
  }
};

  // 批量更新
const handleBatchUpdate = async () => {
  if (!selectedHotelId) {
    message.warning('请先选择酒店');
    return;
  }

  if (!batchModal.dates || !batchModal.dates[0] || !batchModal.dates[1]) {
    message.warning('请选择日期范围');
    return;
  }

  if (batchModal.value === 0 && batchModal.type !== 'fixed') {
    message.warning('请输入调整数值');
    return;
  }

  confirm({
    title: '确认批量修改',
    content: `确定要批量修改 ${
      batchModal.applyToAll ? '所有房型' : `${selectedRoomIds.length}个房型`
    } 在 ${batchModal.dates[0].format('YYYY-MM-DD')} 至 ${batchModal.dates[1].format('YYYY-MM-DD')} 的价格吗？`,
    onOk: async () => {
      try {
        // 再次检查 dates 是否存在（虽然上面已经检查，但为了类型安全）
        if (!batchModal.dates) {
          message.error('日期范围无效');
          return;
        }
        
        const [start, end] = batchModal.dates;
        
        // 构建请求数据
        const requestData: any = {
          start_date: start.format('YYYY-MM-DD'),
          end_date: end.format('YYYY-MM-DD'),
          adjust_type: batchModal.type,
          adjust_value: batchModal.value
        };

        if (!batchModal.applyToAll && selectedRoomIds.length > 0) {
          requestData.room_type_ids = selectedRoomIds;
        }

        console.log('批量更新请求:', requestData);

        const res = await axios.post(
          `/merchant/calendar/hotels/${selectedHotelId}/batch-price`,
          requestData
        );

        if (res.data.code === 200 || res.data.msg) {
          message.success('批量更新成功');
          setBatchModal(prev => ({ ...prev, visible: false }));
          // 刷新数据
          fetchPriceData(selectedHotelId);
        } else {
          message.error(res.data.msg || '更新失败');
        }
      } catch (error: any) {
        console.error('批量更新失败:', error);
        message.error(error.response?.data?.msg || '更新失败');
      }
    }
  });
};

  // 更新单日价格
  const handleUpdateDaily = async () => {
    if (!editModal) return;

    try {
      const res = await axios.patch(
        `/merchant/calendar/${editModal.roomTypeId}/date/${editModal.date}`,
        {
          final_price: editModal.final_price,
          available_rooms: editModal.available_rooms,
          status: editModal.status
        }
      );

      if (res.data.code === 200 || res.data.msg) {
        message.success('更新成功');
        setEditModal(null);
        if (selectedHotelId) {
          fetchPriceData(selectedHotelId);
        }
      }
    } catch (error: any) {
      console.error('更新失败:', error);
      message.error(error.response?.data?.msg || '更新失败');
    }
  };

  // 复制价格
  const handleCopyPrice = async () => {
    if (!copyModal.sourceDate || copyModal.targetDates.length === 0) {
      message.warning('请选择源日期和目标日期');
      return;
    }

    try {
      const res = await axios.post(
        `/merchant/calendar/${copyModal.roomTypeId}/copy-price`,
        {
          source_date: copyModal.sourceDate,
          target_dates: copyModal.targetDates
        }
      );

      if (res.data.code === 200 || res.data.msg) {
        message.success('价格复制成功');
        setCopyModal({ visible: false, roomTypeId: 0, roomName: '', sourceDate: null, targetDates: [] });
        if (selectedHotelId) {
          fetchPriceData(selectedHotelId);
        }
      }
    } catch (error: any) {
      console.error('复制失败:', error);
      message.error(error.response?.data?.msg || '复制失败');
    }
  };

  // 生成日历（如果某个月份没有数据）
  const handleGenerateCalendar = async (roomTypeId: number) => {
    const roomType = roomTypes.find(rt => rt.room_type_id === roomTypeId);
    if (!roomType) return;

    Modal.confirm({
      title: '生成日历数据',
      content: `将为 ${roomType.name} 生成未来60天的日历数据，基于基础价 ¥${roomType.base_price} 自动生成，周末价格上浮20%。`,
      onOk: async () => {
        try {
          const res = await axios.post('/merchant/calendar/generate', {
            room_type_id: roomTypeId,
            start_date: dayjs().format('YYYY-MM-DD'),
            days: 60,
            base_price: roomType.base_price
          });

          if (res.data.code === 200 || res.data.msg) {
            message.success('日历生成成功');
            if (selectedHotelId) {
              fetchPriceData(selectedHotelId);
            }
          }
        } catch (error: any) {
          console.error('生成失败:', error);
          message.error(error.response?.data?.msg || '生成失败');
        }
      }
    });
  };

  // 获取状态颜色
  const getStatusColor = (status: string, available: number) => {
    if (status === 'closed') return '#ff4d4f';
    if (available === 0) return '#faad14';
    return '#52c41a';
  };

  // 获取状态文本
  const getStatusText = (status: string, available: number) => {
    if (status === 'closed') return '已关房';
    if (available === 0) return '已满房';
    return `${available}间可售`;
  };

  // 生成日历表格列
const generateColumns = (): ColumnsType<RoomPriceData> => {
  const [start, end] = dateRange;
  const days = end.diff(start, 'day') + 1;
  
  const columns: ColumnsType<RoomPriceData> = [
    {
      title: '房型信息',
      key: 'room_info',
      fixed: 'left',
      width: 220,
      render: (_, record: RoomPriceData) => {
        const roomType = roomTypes.find(rt => rt.room_type_id === record.room_type_id);
        return (
          <Space direction="vertical" size={2} style={{ width: '100%' }}>
            <Space>
              <HomeOutlined />
              <span style={{ fontWeight: 500 }}>{record.name}</span>
            </Space>
            <div style={{ fontSize: 12, color: '#666' }}>
              <div>基础价: ¥{record.base_price}</div>
              <div>总房量: {roomType?.total_rooms || 0}间</div>
            </div>
            <Button 
              size="small" 
              type="link" 
              icon={<SyncOutlined />}
              onClick={() => handleGenerateCalendar(record.room_type_id)}
            >
              生成日历
            </Button>
          </Space>
        );
      }
    }
  ];

  for (let i = 0; i < days; i++) {
    const date = start.add(i, 'day');
    // 生成用于显示的日期字符串
    const displayDateStr = date.format('YYYY-MM-DD');
    // 生成用于比较的日期字符串（需要考虑时区）
    const compareDateStr = date.format('YYYY-MM-DD');
    
    const isWeekend = date.day() === 0 || date.day() === 6;
    
    columns.push({
      title: (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: 500 }}>{date.format('MM-DD')}</div>
          <div style={{ fontSize: 12, color: isWeekend ? '#ff4d4f' : '#999' }}>
            {['日', '一', '二', '三', '四', '五', '六'][date.day()]}
          </div>
        </div>
      ),
      key: displayDateStr,
      width: 100,
      render: (_, record: RoomPriceData) => {
        // 从 API 返回的日期中提取 YYYY-MM-DD 部分进行比较
        const daily = record.calendar?.find(item => {
          // 处理不同格式的日期
          const itemDate = item.date;
          // 如果是带 T 的 ISO 格式，取前10个字符
          const itemDateStr = itemDate.includes('T') 
            ? itemDate.split('T')[0] 
            : itemDate;
          
          return itemDateStr === compareDateStr;
        });
        
        if (!daily) {
          return (
            <div 
              style={{ 
                textAlign: 'center', 
                padding: '12px 4px',
                background: '#f5f5f5',
                borderRadius: 4,
                color: '#999',
                cursor: 'pointer'
              }}
              onClick={() => handleGenerateCalendar(record.room_type_id)}
            >
              未生成
            </div>
          );
        }
        
        return (
          <Tooltip 
            title={
              <div>
                <div>点击修改价格/库存</div>
                <div>当前状态: {daily.status === 'closed' ? '关房' : '开房'}</div>
                <div>可售: {daily.available_rooms}间</div>
              </div>
            }
          >
            <div
              style={{
                padding: '8px 4px',
                background: getStatusColor(daily.status, daily.available_rooms),
                color: '#fff',
                borderRadius: 4,
                cursor: 'pointer',
                textAlign: 'center'
              }}
              onClick={() => setEditModal({
                visible: true,
                roomTypeId: record.room_type_id,
                roomName: record.name,
                date: displayDateStr, // 使用显示的日期字符串
                final_price: typeof daily.final_price === 'string' 
                  ? parseFloat(daily.final_price) 
                  : daily.final_price,
                available_rooms: daily.available_rooms,
                status: daily.status
              })}
            >
              <div style={{ fontWeight: 500 }}>
                ¥{typeof daily.final_price === 'string' 
                  ? parseFloat(daily.final_price).toFixed(2) 
                  : daily.final_price.toFixed(2)}
              </div>
              <div style={{ fontSize: 11, opacity: 0.9 }}>
                {getStatusText(daily.status, daily.available_rooms)}
              </div>
            </div>
          </Tooltip>
        );
      }
    });
  }

    // 添加操作列
    columns.push({
      title: '操作',
      key: 'action',
      fixed: 'right',
      width: 80,
      render: (_, record: RoomPriceData) => (
        <Button
          type="link"
          size="small"
          icon={<CopyOutlined />}
          onClick={() => setCopyModal({
            visible: true,
            roomTypeId: record.room_type_id,
            roomName: record.name,
            sourceDate: null,
            targetDates: []
          })}
        >
          复制
        </Button>
      )
    });

    return columns;
  };

  // 计算统计数据
  const getStats = () => {
    let totalRooms = 0;
    let totalAvailable = 0;
    let closedCount = 0;
    let fullCount = 0;

    priceData.forEach(room => {
      const roomType = roomTypes.find(rt => rt.room_type_id === room.room_type_id);
      totalRooms += roomType?.total_rooms || 0;
      
      room.calendar?.forEach(day => {
        if (day.status === 'closed') closedCount++;
        if (day.available_rooms === 0) fullCount++;
        totalAvailable += day.available_rooms;
      });
    });

    return { totalRooms, totalAvailable, closedCount, fullCount };
  };

  const stats = getStats();

  return (
    <div>
      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card>
            <Statistic 
              title="总房量" 
              value={stats.totalRooms} 
              suffix="间"
              prefix={<HomeOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic 
              title="平均可售" 
              value={priceData.length > 0 ? Math.round(stats.totalAvailable / (priceData.length * (dateRange[1].diff(dateRange[0], 'day') + 1))) : 0}
              suffix="间/天"
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic 
              title="关房天数" 
              value={stats.closedCount} 
              suffix="天"
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic 
              title="满房天数" 
              value={stats.fullCount} 
              suffix="天"
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
      </Row>

      <Card
        title={
          <Space>
            <CalendarOutlined />
            <span>房态日历管理</span>
          </Space>
        }
      >
        {/* 筛选栏 */}
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={5}>
            <Select
              placeholder="选择酒店"
              value={selectedHotelId}
              onChange={setSelectedHotelId}
              style={{ width: '100%' }}
            >
              {hotels.map(hotel => (
                <Option key={hotel.hotel_id} value={hotel.hotel_id}>
                  {hotel.name_zh}
                </Option>
              ))}
            </Select>
          </Col>
          <Col span={7}>
            <RangePicker
              value={dateRange}
              onChange={(dates) => {
                if (dates) {
                  setDateRange([dates[0] as Dayjs, dates[1] as Dayjs]);
                }
              }}
              style={{ width: '100%' }}
            />
          </Col>
          <Col span={4}>
            <Button 
              type="primary" 
              onClick={() => selectedHotelId && fetchPriceData(selectedHotelId)}
              loading={loading}
              icon={<SyncOutlined />}
            >
              查询
            </Button>
          </Col>
          <Col span={4}>
            <Button 
              icon={<RiseOutlined />}
              onClick={() => {
                // 确保 dates 是有效的
                if (dateRange && dateRange[0] && dateRange[1]) {
                  setBatchModal(prev => ({ 
                    ...prev, 
                    visible: true, 
                    dates: [dateRange[0], dateRange[1]] 
                  }));
                } else {
                  message.warning('请先选择日期范围');
                }
              }}
              disabled={!selectedHotelId}
              type="primary"
              ghost
            >
              批量修改
            </Button>
          </Col>
          <Col span={4}>
            <Button 
              icon={<DollarOutlined />}
              onClick={() => {
                if (selectedHotelId) {
                  roomTypes.forEach(rt => handleGenerateCalendar(rt.room_type_id));
                }
              }}
              disabled={!selectedHotelId || roomTypes.length === 0}
            >
              生成全部日历
            </Button>
          </Col>
        </Row>

        {/* 房型筛选 */}
        <div style={{ marginBottom: 16 }}>
          <Space wrap align="center">
            <span style={{ fontWeight: 500 }}>房型筛选:</span>
            <Tag.CheckableTag
              checked={selectedRoomIds.length === 0}
              onChange={() => setSelectedRoomIds([])}
              style={{ padding: '4px 12px' }}
            >
              全部房型
            </Tag.CheckableTag>
            {roomTypes.map(rt => (
              <Tag.CheckableTag
                key={rt.room_type_id}
                checked={selectedRoomIds.includes(rt.room_type_id)}
                onChange={(checked) => {
                  setSelectedRoomIds(prev =>
                    checked
                      ? [...prev, rt.room_type_id]
                      : prev.filter(id => id !== rt.room_type_id)
                  );
                }}
                style={{ padding: '4px 12px' }}
              >
                {rt.name}
              </Tag.CheckableTag>
            ))}
          </Space>
        </div>

        {/* 状态图例 */}
        <div style={{ marginBottom: 16, display: 'flex', gap: 24 }}>
          <Space>
            <div style={{ width: 20, height: 20, background: '#52c41a', borderRadius: 4 }} />
            <span>正常可售</span>
          </Space>
          <Space>
            <div style={{ width: 20, height: 20, background: '#faad14', borderRadius: 4 }} />
            <span>满房</span>
          </Space>
          <Space>
            <div style={{ width: 20, height: 20, background: '#ff4d4f', borderRadius: 4 }} />
            <span>关房</span>
          </Space>
        </div>

        {/* 日历表格 */}
        <Table
          columns={generateColumns()}
          dataSource={priceData.filter(
            rt => selectedRoomIds.length === 0 || selectedRoomIds.includes(rt.room_type_id)
          )}
          rowKey="room_type_id"
          loading={loading}
          scroll={{ x: 'max-content' }}
          pagination={false}
          bordered
          size="small"
        />
      </Card>

      {/* 批量修改弹窗 */}
      <Modal
        title="批量修改房价"
        open={batchModal.visible}
        onOk={handleBatchUpdate}
        onCancel={() => setBatchModal(prev => ({ ...prev, visible: false }))}
        width={550}
        okText="确认修改"
        cancelText="取消"
      >
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <div>
            <div style={{ marginBottom: 8, fontWeight: 500 }}>选择日期范围</div>
            <RangePicker
              style={{ width: '100%' }}
              value={batchModal.dates}
              onChange={(dates) => {
                if (dates) {
                  setBatchModal(prev => ({ 
                    ...prev, 
                    dates: [dates[0] as Dayjs, dates[1] as Dayjs] 
                  }));
                }
              }}
            />
          </div>

          <div>
            <div style={{ marginBottom: 8, fontWeight: 500 }}>修改方式</div>
            <Radio.Group 
              value={batchModal.type} 
              onChange={(e) => setBatchModal(prev => ({ ...prev, type: e.target.value }))}
              optionType="button"
              buttonStyle="solid"
            >
              <Radio.Button value="fixed">固定价格</Radio.Button>
              <Radio.Button value="plus">加价</Radio.Button>
              <Radio.Button value="minus">减价</Radio.Button>
              <Radio.Button value="percent">百分比</Radio.Button>
            </Radio.Group>
          </div>

          <div>
            <div style={{ marginBottom: 8, fontWeight: 500 }}>调整数值</div>
            <InputNumber
              style={{ width: '100%' }}
              value={batchModal.value}
              onChange={(val) => setBatchModal(prev => ({ ...prev, value: val || 0 }))}
              prefix={batchModal.type === 'percent' ? '%' : '¥'}
              min={batchModal.type === 'percent' ? -100 : 0}
              max={batchModal.type === 'percent' ? 500 : undefined}
              step={batchModal.type === 'percent' ? 5 : 10}
            />
            {batchModal.type === 'percent' && (
              <div style={{ marginTop: 4, color: '#999', fontSize: 12 }}>
                正数为涨价，负数为降价
              </div>
            )}
          </div>

          <Divider style={{ margin: '12px 0' }} />

          <div>
            <div style={{ marginBottom: 8, fontWeight: 500 }}>应用范围</div>
            <Radio.Group 
              value={batchModal.applyToAll} 
              onChange={(e) => setBatchModal(prev => ({ ...prev, applyToAll: e.target.value }))}
            >
              <Radio value={true}>所有房型</Radio>
              <Radio value={false}>仅筛选的房型</Radio>
            </Radio.Group>
            {!batchModal.applyToAll && selectedRoomIds.length === 0 && (
              <div style={{ marginTop: 8, color: '#faad14' }}>
                <WarningOutlined /> 当前没有选择任何房型，将不会生效
              </div>
            )}
            {!batchModal.applyToAll && selectedRoomIds.length > 0 && (
              <div style={{ marginTop: 8, color: '#52c41a' }}>
                <CheckCircleOutlined /> 将应用到 {selectedRoomIds.length} 个房型
              </div>
            )}
          </div>
        </Space>
      </Modal>

      {/* 单日修改弹窗 */}
      <Modal
        title={`修改房价 - ${editModal?.roomName} ${editModal?.date}`}
        open={editModal?.visible}
        onOk={handleUpdateDaily}
        onCancel={() => setEditModal(null)}
        okText="确认修改"
        cancelText="取消"
      >
        <div style={{ padding: '12px 0' }}>
          <div style={{ marginBottom: 16 }}>
            <div style={{ marginBottom: 8, fontWeight: 500 }}>价格(元)</div>
            <InputNumber
              style={{ width: '100%' }}
              value={editModal?.final_price}
              onChange={(val) => setEditModal(prev => 
                prev ? { ...prev, final_price: val || 0 } : null
              )}
              min={0}
              step={10}
              formatter={(value) => `¥ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={(value) => value?.replace(/¥\s?|(,*)/g, '') as unknown as number}
            />
          </div>
          <div style={{ marginBottom: 16 }}>
            <div style={{ marginBottom: 8, fontWeight: 500 }}>可售数量</div>
            <InputNumber
              style={{ width: '100%' }}
              value={editModal?.available_rooms}
              onChange={(val) => setEditModal(prev => 
                prev ? { ...prev, available_rooms: val || 0 } : null
              )}
              min={0}
            />
          </div>
          <div>
            <div style={{ marginBottom: 8, fontWeight: 500 }}>状态</div>
            <Radio.Group 
              value={editModal?.status} 
              onChange={(e) => setEditModal(prev => 
                prev ? { ...prev, status: e.target.value } : null
              )}
              optionType="button"
              buttonStyle="solid"
            >
              <Radio.Button value="open">开房</Radio.Button>
              <Radio.Button value="closed">关房</Radio.Button>
            </Radio.Group>
          </div>
        </div>
      </Modal>

      {/* 复制价格弹窗 */}
      <Modal
        title={`复制价格 - ${copyModal.roomName}`}
        open={copyModal.visible}
        onOk={handleCopyPrice}
        onCancel={() => setCopyModal({ visible: false, roomTypeId: 0, roomName: '', sourceDate: null, targetDates: [] })}
        width={600}
        okText="确认复制"
        cancelText="取消"
      >
        <div style={{ padding: '12px 0' }}>
          <div style={{ marginBottom: 16 }}>
            <div style={{ marginBottom: 8, fontWeight: 500 }}>选择源日期</div>
            <DatePicker
              style={{ width: '100%' }}
              value={copyModal.sourceDate ? dayjs(copyModal.sourceDate) : null}
              onChange={(date) => setCopyModal(prev => ({ 
                ...prev, 
                sourceDate: date?.format('YYYY-MM-DD') || null 
              }))}
              disabledDate={(current) => {
                return current && current < dayjs().subtract(1, 'day');
              }}
            />
          </div>
          <div style={{ marginBottom: 16 }}>
            <div style={{ marginBottom: 8, fontWeight: 500 }}>选择目标日期</div>
            <RangePicker
              style={{ width: '100%' }}
              onChange={(dates) => {
                if (dates && dates[0] && dates[1]) {
                  const datesArray: string[] = [];
                  let current = dates[0];
                  while (current <= dates[1]) {
                    datesArray.push(current.format('YYYY-MM-DD'));
                    current = current.add(1, 'day');
                  }
                  setCopyModal(prev => ({ ...prev, targetDates: datesArray }));
                } else {
                  setCopyModal(prev => ({ ...prev, targetDates: [] }));
                }
              }}
              disabledDate={(current) => {
                return current && current < dayjs().subtract(1, 'day');
              }}
            />
          </div>
          {copyModal.targetDates.length > 0 && (
            <div style={{ color: '#52c41a' }}>
              <CheckCircleOutlined /> 已选择 {copyModal.targetDates.length} 个目标日期
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default MerchantRoomPrice;