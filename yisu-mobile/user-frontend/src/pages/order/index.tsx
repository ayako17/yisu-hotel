import { useState, useEffect, useCallback } from 'react'
import { View, Text, Image, ScrollView } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import './index.scss'
import request from '../../utils/request'

interface Order {
  order_id: number
  order_no: string
  hotel_id: number
  hotel_name: string
  hotel_image?: string
  room_type_id: number
  room_type_name: string
  room_image?: string
  check_in_date: string
  check_out_date: string
  rooms: number
  adults: number
  children: number
  total_amount: number
  status: 'unpaid' | 'paid' | 'checked_in' | 'completed' | 'cancelled'
  created_at: string
}

// 订单状态配置
const STATUS_CONFIG = {
  unpaid:     { label: '待付款', color: '#ff6b35', bg: '#fff0e8' },
  paid:       { label: '已付款', color: '#1a6cf5', bg: '#e8f0ff' },
  checked_in: { label: '已入住', color: '#00b578', bg: '#e3f7ec' },
  completed:  { label: '已完成', color: '#888',    bg: '#f5f5f5' },
  cancelled:  { label: '已取消', color: '#999',    bg: '#f5f5f5' },
}

function fmtDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
function parseD(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}
function fmtShort(s: string): string {
  if (!s) return ''
  const d = parseD(s)
  return `${d.getMonth()+1}月${d.getDate()}日`
}
function calcNights(ci: string, co: string): number {
  return Math.max(1, Math.round((parseD(co).getTime() - parseD(ci).getTime()) / 86400000))
}

const OrderPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'all' | 'unpaid' | 'upcoming' | 'completed'>('all')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [orderToDelete, setOrderToDelete] = useState<number | null>(null)

// 在 fetchOrders 里，拿到 list 后统一处理日期格式
const normalizeDate = (val: any): string => {
  if (!val) return ''
  const s = typeof val === 'string' ? val : String(val)
  // 统一取前10位 "YYYY-MM-DD"
  return s.slice(0, 10)
}

const fetchOrders = useCallback(async () => {
  setLoading(true)
  try {
    const res = await request<any>('/orders', { method: 'GET' })
    const list = res?.data?.list || res?.data || res || []
    
    // ✅ 统一格式化日期字段
    const normalized = (Array.isArray(list) ? list : []).map((o: Order) => ({
      ...o,
      check_in_date: normalizeDate(o.check_in_date),
      check_out_date: normalizeDate(o.check_out_date),
    }))
    
    setOrders(normalized)
  } catch (error) {
    console.error('获取订单失败', error)
    Taro.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    setLoading(false)
  }
}, [])

  // 每次页面显示时重新拉取订单（从酒店详情页预订后跳转回来）
  useDidShow(() => { fetchOrders() })
  useEffect(() => { fetchOrders() }, [])

  // ─── 订单筛选 ─────────────────────────────────────────────────────────────
  const filteredOrders = orders.filter(order => {
    const today = fmtDate(new Date())
    switch (activeTab) {
      case 'unpaid':
        return order.status === 'unpaid'
        
      case 'upcoming':
        // 未出行/进行中：paid 或 checked_in，不管日期（或者退房日期未到）
        return (order.status === 'paid' || order.status === 'checked_in')
              && order.check_out_date >= today   // ← 改为用退房日期判断，只要还没退房就算进行中
        
      case 'completed':
        return order.status === 'completed'
            || order.status === 'cancelled'
            || ((order.status === 'paid' || order.status === 'checked_in') 
                && order.check_out_date < today)  // ← 已过期的 paid/checked_in 也归入已完成
            
      default:
        return true
    }
  })

  // ─── 再次预订 ─────────────────────────────────────────────────────────────
  const handleBookAgain = (order: Order) => {
    Taro.navigateTo({
      url: `/pages/hotel/index?hotelId=${order.hotel_id}&checkIn=${order.check_in_date}&checkOut=${order.check_out_date}&rooms=${order.rooms}&adults=${order.adults}&children=${order.children}`
    })
  }

  // ─── 删除订单 ─────────────────────────────────────────────────────────────
  const handleDelete = (orderId: number) => {
    setOrderToDelete(orderId); setShowDeleteConfirm(true)
  }

  const confirmDelete = async () => {
    if (!orderToDelete) return
    try {
      await request<any>(`/orders/${orderToDelete}`, { method: 'DELETE' })
      setOrders(prev => prev.filter(o => o.order_id !== orderToDelete))
      Taro.showToast({ title: '删除成功', icon: 'success' })
    } catch {
      Taro.showToast({ title: '删除失败', icon: 'none' })
    } finally {
      setShowDeleteConfirm(false); setOrderToDelete(null)
    }
  }

  // ─── 支付 ─────────────────────────────────────────────────────────────────
  const handlePay = async (order: Order) => {
    try {
      await request<any>(`/orders/${order.order_id}/pay`, { method: 'PUT' })
      setOrders(prev => prev.map(o => o.order_id === order.order_id ? { ...o, status: 'paid' } : o))
      Taro.showToast({ title: '支付成功', icon: 'success' })
    } catch {
      Taro.showToast({ title: '支付失败', icon: 'none' })
    }
  }

  // ─── 取消 ─────────────────────────────────────────────────────────────────
  const handleCancel = async (order: Order) => {
    try {
      await request<any>(`/orders/${order.order_id}/cancel`, { method: 'PUT' })
      setOrders(prev => prev.map(o => o.order_id === order.order_id ? { ...o, status: 'cancelled' } : o))
      Taro.showToast({ title: '已取消', icon: 'success' })
    } catch {
      Taro.showToast({ title: '取消失败', icon: 'none' })
    }
  }

// ─── 渲染订单卡片 ─────────────────────────────────────────────────────────
const renderOrderCard = (order: Order) => {
  const nights = calcNights(order.check_in_date, order.check_out_date)
  const statusCfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.cancelled
  const today = fmtDate(new Date())
  const isUpcoming = order.check_in_date >= today
                  && (order.status === 'paid' || order.status === 'checked_in')
  const isPastOrDone = order.status === 'completed'
                    || order.status === 'cancelled'
                    || (order.status === 'paid' && order.check_out_date < today)

  return (
    <View key={order.order_id} className='order-card'>
      {/* 头部：酒店名 + 状态 */}
      <View className='order-header'>
        <View className='order-hotel-info'>
          <Text className='order-hotel-name'>{order.hotel_name}</Text>
          <Text className='order-no'>订单号：{order.order_no}</Text>
        </View>
        <View className='order-status' style={{ background: statusCfg.bg }}>
          <Text className='order-status-txt' style={{ color: statusCfg.color }}>{statusCfg.label}</Text>
        </View>
      </View>

      {/* 内容：图片 + 信息 */}
      <View className='order-content'>
        <Image
          className='order-room-img'
          src={order.room_image || order.hotel_image || 'https://via.placeholder.com/120x120'}
          mode='aspectFill'
        />
        <View className='order-room-info'>
          <Text className='order-room-name'>{order.room_type_name}</Text>
          <Text className='order-room-detail'>
            {order.rooms}间 · {order.adults}成人{order.children > 0 ? ` · ${order.children}儿童` : ''}
          </Text>
          <Text className='order-date'>
            {fmtShort(order.check_in_date)} - {fmtShort(order.check_out_date)} · {nights}晚
          </Text>
          <View className='order-price-row'>
            <Text className='order-price-label'>总价</Text>
            <Text className='order-price-value'>¥{order.total_amount}</Text>
          </View>
        </View>
      </View>

      {/* 操作按钮 - 根据不同状态显示 */}
      <View className='order-actions'>
        {/* 待付款订单 */}
        {order.status === 'unpaid' && (
          <>
            <View className='action-btn' onClick={() => handleCancel(order)}>
              <Text className='action-txt'>取消订单</Text>
            </View>
            <View className='action-btn action-btn-primary' onClick={() => handlePay(order)}>
              <Text className='action-txt action-txt-primary'>立即支付</Text>
            </View>
          </>
        )}

        {/* 未出行/进行中订单（已付款或已入住） */}
        {isUpcoming && (
          <>
            {/* 不显示删除按钮 */}
            <View className='action-btn' onClick={() => handleBookAgain(order)}>
              <Text className='action-txt'>再次预订</Text>
            </View>
          </>
        )}

        {/* 已完成或已取消订单 */}
        {isPastOrDone && (
          <>
            {/* 已取消和已完成的订单显示删除按钮 */}
            {(order.status === 'cancelled' || order.status === 'completed') && (
              <View className='action-btn' onClick={() => handleDelete(order.order_id)}>
                <Text className='action-txt'>删除订单</Text>
              </View>
            )}
            <View className='action-btn' onClick={() => handleBookAgain(order)}>
              <Text className='action-txt'>再次预订</Text>
            </View>
          </>
        )}
      </View>
    </View>
  )
}

  // ─── 渲染 ─────────────────────────────────────────────────────────────────
  return (
    <View className='order-page'>

      {/* 顶部标签栏 */}
      <View className='order-tabs'>
        {(['all', 'unpaid', 'upcoming', 'completed'] as const).map(tab => {
          const labels = { all: '全部', unpaid: '待付款', upcoming: '未出行/进行中', completed: '已完成' }
          return (
            <View key={tab} className={`tab-item${activeTab === tab ? ' tab-active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              <Text className='tab-txt'>{labels[tab]}</Text>
            </View>
          )
        })}
      </View>

      {/* 订单列表 */}
      <ScrollView className='order-list' scrollY>
        {loading ? (
          <View className='skeleton-list'>
            {[1, 2, 3].map(i => (
              <View key={i} className='skeleton-card'>
                <View className='skeleton-header' />
                <View className='skeleton-content-row'>
                  <View className='skeleton-img' />
                  <View className='skeleton-info'>
                    <View className='skeleton-line' />
                    <View className='skeleton-line' />
                    <View className='skeleton-line' />
                  </View>
                </View>
              </View>
            ))}
          </View>
        ) : filteredOrders.length === 0 ? (
          <View className='empty-state'>
            <Text className='empty-ic'>📦</Text>
            <Text className='empty-title'>暂无订单</Text>
            <Text className='empty-sub'>去挑选一家心仪的酒店吧</Text>
            <View className='empty-btn' onClick={() => Taro.switchTab({ url: '/pages/home/index' })}>
              <Text className='empty-btn-txt'>去首页</Text>
            </View>
          </View>
        ) : (
          filteredOrders.map(renderOrderCard)
        )}
      </ScrollView>

      {/* 删除确认弹窗 */}
      {showDeleteConfirm && (
        <View className='modal-mask' onClick={() => setShowDeleteConfirm(false)}>
          <View className='modal-content confirm-modal' onClick={e => e.stopPropagation()}>
            <Text className='confirm-title'>确认删除</Text>
            <Text className='confirm-desc'>删除后无法恢复，确定要删除这个订单吗？</Text>
            <View className='confirm-actions'>
              <View className='confirm-btn' onClick={() => setShowDeleteConfirm(false)}>
                <Text className='confirm-btn-txt'>取消</Text>
              </View>
              <View className='confirm-btn confirm-btn-primary' onClick={confirmDelete}>
                <Text className='confirm-btn-txt confirm-btn-txt-primary'>确认删除</Text>
              </View>
            </View>
          </View>
        </View>
      )}
    </View>
  )
}

export default OrderPage