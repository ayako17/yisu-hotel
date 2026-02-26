import { useState, useEffect, useRef } from 'react'
import { View, Text, Image, Swiper, SwiperItem, ScrollView } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import './index.scss'
import request from '../../utils/request'
import {
  FACILITY_TAGS,
  SPECIAL_TAGS,
  HOLIDAYS_2026,
  WDS,
} from '../../constants'
import type { Tag } from '../../constants'

// ─── 接口类型 ────────────────────────────────────────────────────────────────

interface Hotel {
  hotel_id: number; name_zh: string; name_en?: string; star_rating: number
  phone: string; province?: string; city: string; address: string
  latitude?: number; longitude?: number; description?: string
  check_in_time?: string; check_out_time?: string
  built_year?: number; renovated_year?: number;opening_date?: string;
}

interface HotelImage {
  media_id: number; media_type: 'image'|'video'; media_url: string
  sort_order: number; is_cover: number
}

interface RoomType {
  room_type_id: number; hotel_id: number; name: string; bed_info: string
  max_guests: number; base_price: number; total_rooms: number; cover_url: string
  description?: string; area?: number; images?: RoomImage[]
  booked_rooms?: number; tags?: Tag[]
  displayPrice?: number   // 动态价（入住日当天）
}

interface RoomImage { media_id: number; media_url: string; is_cover: number; sort_order: number }

type CalPhase = 'in' | 'out' | 'done'

// ─── 日期工具 ────────────────────────────────────────────────────────────────

function fmtDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
function parseD(s: string): Date {
  const [y,m,d] = s.split('-').map(Number); return new Date(y,m-1,d)
}
function fmtShort(s: string): string {
  if (!s) return ''; const d = parseD(s); return `${d.getMonth()+1}月${d.getDate()}日`
}
function calcNights(ci: string, co: string): number {
  return Math.max(1, Math.round((parseD(co).getTime()-parseD(ci).getTime())/86400000))
}
function getHoliday(m: number, d: number): string|null {
  return HOLIDAYS_2026[`${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`]||null
}
function dowMon(date: Date): number { return (date.getDay()+6)%7 }

// ─── MonthBlock（详情页版，带价格，无农历）────────────────────────────────

interface MonthBlockProps {
  year: number; month: number
  checkIn: string; checkOut: string; phase: CalPhase
  onDayTap: (s: string) => void
  calPrices: Record<string, number | null>   // { 'YYYY-MM-DD': price }
}

const MonthBlock: React.FC<MonthBlockProps> = ({
  year, month, checkIn, checkOut, phase, onDayTap, calPrices
}) => {
  const now = new Date(); now.setHours(0,0,0,0)
  const ci = parseD(checkIn), co = parseD(checkOut)
  const dim = new Date(year,month+1,0).getDate()
  const firstDow = dowMon(new Date(year,month,1))
  const cells: (number|null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({length:dim},(_,i)=>i+1)
  ]

  return (
    <View className='cal-month'>
      <Text className='cal-month-title'>{year}年{month+1}月</Text>
      <View className='cal-wk-row'>
        {WDS.map((w,i) => <Text key={w} className={`cal-wk${i>=5?' cal-wk-end':''}`}>{w}</Text>)}
      </View>
      <View className='cal-grid'>
        {cells.map((day,idx) => {
          if (!day) return <View key={idx} className='cal-cell' />
          const d = new Date(year,month,day)
          const past = d < now
          const isCi = d.getTime()===ci.getTime()
          const isCo = d.getTime()===co.getTime()
          const inRange = d>ci && d<co
          const isEP = isCi||isCo
          const holiday = getHoliday(month,day)
          const isWkend = dowMon(d)>=5
          const ds = fmtDate(d)
          // 价格：只在入住日（不是退房日）显示，退房日无意义
          const price = !isCo ? calPrices[ds] : null

          let wcls = 'cal-cell'
          if (inRange) wcls += ' inrange'
          if (isCi)    wcls += ' rng-start'
          if (isCo)    wcls += ' rng-end'

          return (
            <View key={idx} className={wcls}>
              <View
                className={`cal-day cal-day-price${isEP?' ep':''}${past?' dim':''}`}
                onClick={() => !past && onDayTap(ds)}
              >
                {/* 节日标签（日期上方） */}
                {holiday
                  ? <Text className={`cal-hol${isEP?' cal-hol-ep':''}`}>{holiday}</Text>
                  : <View className='cal-hol-placeholder' />
                }
                {/* 日期数字 */}
                <Text className={`dn${past?' p':isEP?' s':isWkend?' w':''}`}>{day}</Text>
                {/* 价格（日期下方） */}
                {price !== null && price !== undefined && !past
                  ? <Text className={`cal-price${isEP?' cal-price-ep':''}`}>¥{price >= 1000 ? `${(price/1000).toFixed(1)}k` : Math.round(price)}</Text>
                  : <View className='cal-price-placeholder' />
                }
              </View>
            </View>
          )
        })}
      </View>
    </View>
  )
}

// ─── CalendarSheet（详情页版）────────────────────────────────────────────────

interface CalendarSheetProps {
  visible: boolean; checkIn: string; checkOut: string
  onSelect: (ci: string, co: string) => void; onClose: () => void
  hotelId: string | number
}

const CalendarSheet: React.FC<CalendarSheetProps> = ({
  visible, checkIn, checkOut, onSelect, onClose, hotelId
}) => {
  const [phase, setPhase] = useState<CalPhase>('done')
  const [tmpCi, setTmpCi] = useState(checkIn)
  const [tmpCo, setTmpCo] = useState(checkOut)
  const [calPrices, setCalPrices] = useState<Record<string, number|null>>({})
  const fetchedRef = useRef(false)

  // 打开时同步状态
  useEffect(() => {
    if (visible) { setTmpCi(checkIn); setTmpCo(checkOut); setPhase('done') }
  }, [visible])

  // 打开时一次性拉取未来 14 个月的价格
  useEffect(() => {
    if (!visible || !hotelId || fetchedRef.current) return
    fetchedRef.current = true
    const now = new Date()
    const startDate = fmtDate(now)
    const end = new Date(now.getFullYear(), now.getMonth()+14, 0)
    const endDate = fmtDate(end)
    request<any>(`/hotels/${hotelId}/calendar-prices?startDate=${startDate}&endDate=${endDate}`, { method: 'GET' })
      .then(res => { if (res?.code === 200) setCalPrices(res.data || {}) })
      .catch(e => console.warn('日历价格获取失败', e))
  }, [visible, hotelId])

  function handleTap(ds: string) {
    const d=parseD(ds), now=new Date(); now.setHours(0,0,0,0); if(d<now) return
    if (phase==='done'||phase==='in') {
      const nx=new Date(d); nx.setDate(nx.getDate()+1)
      setTmpCi(ds); setTmpCo(fmtDate(nx)); setPhase('out')
    } else {
      if (d>parseD(tmpCi)) { setTmpCo(ds); setPhase('done') }
      else {
        const nx=new Date(d); nx.setDate(nx.getDate()+1)
        setTmpCi(ds); setTmpCo(fmtDate(nx)); setPhase('out')
      }
    }
  }

  function confirm() { onSelect(tmpCi, tmpCo); onClose() }

  const now = new Date()
  const months = Array.from({length:14},(_,i) => {
    const d = new Date(now.getFullYear(), now.getMonth()+i, 1)
    return { year: d.getFullYear(), month: d.getMonth() }
  })
  const nights = calcNights(tmpCi, tmpCo)
  const tip = phase==='in' ? '请选择入住日期' : phase==='out' ? '请选择退房日期'
    : `${fmtShort(tmpCi)} — ${fmtShort(tmpCo)}`

  if (!visible) return null
  return (
    <View className='bs-mask' onClick={confirm}>
      <View className='bs-sheet bs-sheet-cal' onClick={e => e.stopPropagation()}>
        <View className='bs-handle' />
        <Text className='cal-tip'>{tip}</Text>
        <ScrollView className='cal-scroll' scrollY>
          {months.map(({year,month}) => (
            <MonthBlock key={`${year}-${month}`}
              year={year} month={month}
              checkIn={tmpCi} checkOut={tmpCo}
              phase={phase} onDayTap={handleTap}
              calPrices={calPrices}
            />
          ))}
        </ScrollView>
        <View className='cal-done' onClick={confirm}>
          <Text className='cal-done-txt'>完成（{nights}晚）</Text>
        </View>
      </View>
    </View>
  )
}

// ─── GuestSheet ───────────────────────────────────────────────────────────────

interface GuestSheetProps {
  visible: boolean; rooms: number; adults: number; children: number
  onConfirm: (rooms: number, adults: number, children: number) => void; onClose: () => void
}
const GuestSheet: React.FC<GuestSheetProps> = ({ visible, rooms, adults, children, onConfirm, onClose }) => {
  const [tmpRooms, setTmpRooms] = useState(rooms)
  const [tmpAdults, setTmpAdults] = useState(adults)
  const [tmpChildren, setTmpChildren] = useState(children)
  useEffect(() => { if (visible) { setTmpRooms(rooms); setTmpAdults(adults); setTmpChildren(children) } }, [visible])
  function handleConfirm() { onConfirm(tmpRooms, tmpAdults, tmpChildren); onClose() }
  if (!visible) return null
  return (
    <View className='bs-mask' onClick={onClose}>
      <View className='bs-sheet' style={{ height: '20vh' }} onClick={e => e.stopPropagation()}>
        <View className='bs-handle' />
        <Text className='bs-title'>入住信息</Text>
        <View className='guest-list'>
          {([
            ['房间数', tmpRooms, setTmpRooms, 1],
            ['成人',   tmpAdults, setTmpAdults, 1],
            ['儿童',   tmpChildren, setTmpChildren, 0],
          ] as [string, number, (v: number) => void, number][]).map(([lbl, val, set, min]) => (
            <View key={lbl} className='guest-row'>
              <View className='guest-lbl-col'>
                <Text className='guest-lbl'>{lbl}</Text>
                {lbl === '儿童' && <Text className='guest-sub'>17岁及以下</Text>}
              </View>
              <View className='guest-ctrl'>
                <View className={`step-btn${val<=min?' step-dis':''}`} onClick={() => set(Math.max(min,val-1))}>
                  <Text className='step-ic'>−</Text>
                </View>
                <Text className='step-val'>{val}</Text>
                <View className='step-btn' onClick={() => set(val+1)}>
                  <Text className='step-ic'>＋</Text>
                </View>
              </View>
            </View>
          ))}
        </View>
        <View className='bs-done-single' onClick={handleConfirm}>
          <Text className='bs-done-txt'>完成</Text>
        </View>
      </View>
    </View>
  )
}

// ─── 主组件 ───────────────────────────────────────────────────────────────────

const HotelDetail: React.FC = () => {
  const router = useRouter()
  const { hotelId, checkIn: initCI, checkOut: initCO, rooms: initRooms, adults: initAdults, children: initChildren } = router.params

  const [hotel,      setHotel]      = useState<Hotel | null>(null)
  const [images,     setImages]     = useState<HotelImage[]>([])
  const [roomTypes,  setRoomTypes]  = useState<RoomType[]>([])
  const [hotelTags,  setHotelTags]  = useState<Tag[]>([])
  const [loading,    setLoading]    = useState(true)
  const [isFavorite, setIsFavorite] = useState(false)
  const [favLoading, setFavLoading] = useState(false)

  const [checkIn,  setCheckIn]  = useState(initCI  || fmtDate(new Date()))
  const [checkOut, setCheckOut] = useState(initCO  || fmtDate(new Date(Date.now()+86400000)))
  const [rooms,    setRooms]    = useState(parseInt(initRooms    || '1'))
  const [adults,   setAdults]   = useState(parseInt(initAdults   || '2'))
  const [childrenCount, setChildrenCount] = useState(parseInt(initChildren || '0'))

  const [showCalendar, setShowCalendar] = useState(false)
  const [showGuest,    setShowGuest]    = useState(false)

  const [selectedRoom,   setSelectedRoom]   = useState<RoomType | null>(null)
  const [showRoomDetail, setShowRoomDetail] = useState(false)
  const [showBooking,    setShowBooking]    = useState(false)
  const [bookingRooms,   setBookingRooms]   = useState(1)
  const [selectedTags,   setSelectedTags]   = useState<number[]>([])
  const [submitting,     setSubmitting]     = useState(false)

  // 房型当天动态价格 map { roomTypeId: price }
  const [roomPrices, setRoomPrices] = useState<Record<number, number>>({})

  const nights = calcNights(checkIn, checkOut)

  // ── 初始加载 ──
  useEffect(() => {
    if (hotelId) { fetchHotelData(); checkFavoriteStatus() }
  }, [hotelId])

  // ── 日期变化时重新拉取房型价格 ──
  useEffect(() => {
    if (hotelId && checkIn) fetchRoomPrices(checkIn)
  }, [hotelId, checkIn])

  const fetchHotelData = async () => {
    setLoading(true)
    try {
      const [hotelRes, imagesRes, roomsRes, tagsRes] = await Promise.all([
        request<any>(`/hotels/${hotelId}`,            { method: 'GET' }),
        request<any>(`/hotels/${hotelId}/media`,      { method: 'GET' }),
        request<any>(`/hotels/${hotelId}/room-types`, { method: 'GET' }),
        request<any>(`/hotels/${hotelId}/tags`,       { method: 'GET' }),
      ])
      setHotel(hotelRes.data || hotelRes)
      setImages(Array.isArray(imagesRes) ? imagesRes : imagesRes.data || [])
      const rawRooms = Array.isArray(roomsRes) ? roomsRes : roomsRes.data || []
      setRoomTypes(rawRooms)
    } catch (error) {
      console.error('获取酒店数据失败', error)
      Taro.showToast({ title: '加载失败', icon: 'none' })
    } finally {
      setLoading(false)
    }
  }

  // 拉取指定日期的所有房型价格
  const fetchRoomPrices = async (date: string) => {
    try {
      const res = await request<any>(`/hotels/${hotelId}/room-prices?date=${date}`, { method: 'GET' })
      if (res?.code === 200) setRoomPrices(res.data || {})
    } catch (e) {
      console.warn('房型价格获取失败', e)
    }
  }

  const checkFavoriteStatus = async () => {
    try {
      const res = await request<any>(`/favorites/check/${hotelId}`, { method: 'GET' })
      if (res?.code === 200) setIsFavorite(res.data.isFavorite)
    } catch (e) { console.error('检查收藏失败', e) }
  }

  const handleFavorite = async () => {
    if (favLoading) return
    setFavLoading(true)
    try {
      if (isFavorite) {
        await request<any>(`/favorites/${hotelId}`, { method: 'DELETE' })
        setIsFavorite(false)
        Taro.showToast({ title: '已取消收藏', icon: 'success' })
      } else {
        await request<any>('/favorites', { method: 'POST', data: { hotelId } })
        setIsFavorite(true)
        Taro.showToast({ title: '收藏成功', icon: 'success' })
      }
    } catch { Taro.showToast({ title: '操作失败', icon: 'none' }) }
    finally { setFavLoading(false) }
  }

  const handleCall = () => { if (hotel?.phone) Taro.makePhoneCall({ phoneNumber: hotel.phone }) }

  // 获取房型的展示价格（动态 > base）
  const getRoomDisplayPrice = (room: RoomType): number =>
    roomPrices[room.room_type_id] !== undefined
      ? roomPrices[room.room_type_id]
      : room.base_price

  // 计算总价（用展示价）
  const calcTotal = () => {
    if (!selectedRoom) return 0
    return getRoomDisplayPrice(selectedRoom) * nights * bookingRooms
  }

  const submitOrder = async (status: 'paid' | 'unpaid') => {
    if (!selectedRoom || !hotel || submitting) return
    setSubmitting(true)
    try {
      const orderData = {
        hotel_id:      hotel.hotel_id,
        room_type_id:  selectedRoom.room_type_id,
        check_in_date:  checkIn,
        check_out_date: checkOut,
        rooms:         bookingRooms,
        adults,
        children:      childrenCount,
        total_amount:  calcTotal(),
        status,
      }
      const res = await request<any>('/orders', { method: 'POST', data: orderData })
      if (res) {
        const msg = status === 'paid' ? '预订成功！' : '订单已创建，可在订单页-待付款查看'
        Taro.showToast({ title: msg, icon: 'success' })
        setShowBooking(false)
      }
    } catch { Taro.showToast({ title: '操作失败，请重试', icon: 'none' }) }
    finally { setSubmitting(false) }
  }

  const getAvailableRooms = (room: RoomType) => Math.max(0, room.total_rooms - (room.booked_rooms || 0))

  const filteredRooms = Array.isArray(roomTypes)
    ? (selectedTags.length === 0
        ? roomTypes
        : roomTypes.filter(room => room.tags?.some(t => selectedTags.includes(t.id))))
    : []

  const toggleTag = (tagId: number) =>
    setSelectedTags(prev => prev.includes(tagId) ? prev.filter(id => id!==tagId) : [...prev, tagId])

  if (loading) {
    return (
      <View className='hotel-detail loading'>
        <View className='skeleton-img' />
        <View className='skeleton-content'>
          <View className='skeleton-line' /><View className='skeleton-line' /><View className='skeleton-line' />
        </View>
      </View>
    )
  }
  if (!hotel) return <View className='hotel-detail error'><Text>酒店不存在</Text></View>

  return (
    <View className='hotel-detail-simple'>
      <View className='detail-header'>
        <View className='back-btn' onClick={() => Taro.navigateBack()}>
          <Text className='back-ic'>‹</Text>
        </View>
      </View>

      {/* 轮播图 */}
      <Swiper className='image-swiper' autoplay circular indicatorDots
        indicatorColor='rgba(255,255,255,0.4)' indicatorActiveColor='#1a6cf5'>
        {images.length > 0
          ? images.map(img => (
              <SwiperItem key={img.media_id}>
                <Image className='swiper-img' src={img.media_url} mode='aspectFill' />
              </SwiperItem>
            ))
          : <SwiperItem><View className='swiper-img placeholder'><Text>暂无图片</Text></View></SwiperItem>
        }
      </Swiper>
  {/* 右上角收藏按钮 - 浮在图片上方 */}
      <View className='favorite-float-btn' onClick={handleFavorite}>
        <Text className={`favorite-float-ic${isFavorite ? ' active' : ''}`}>
          {isFavorite ? '❤️' : '♡'}
        </Text>
      </View>
      <ScrollView className='content-scroll' scrollY>

        {/* 酒店基本信息 */}
        <View className='hotel-info'>
          <View className='title-row'>
            <Text className='hotel-name'>{hotel.name_zh}</Text>
            {hotel.name_en && <Text className='hotel-name-en'>{hotel.name_en}</Text>}
          </View>
          <View className='star-row'>
            <Text className='stars'>{'★'.repeat(hotel.star_rating||0)}</Text>
            <Text className='star-text'>{hotel.star_rating}星级</Text>
          </View>
          {hotel.opening_date && (
            <View className='opening-date-row'>
              <Text className='opening-date-text'>开业日期：{hotel.opening_date}</Text>
            </View>
          )}
          {hotelTags.length > 0 && (
            <View className='hotel-tags'>
              {hotelTags.map(tag => (
                <View key={tag.id} className={`htag htag-${tag.tag_type}`}>
                  <Text className='htag-txt'>{tag.name}</Text>
                </View>
              ))}
            </View>
          )}
          {(hotel.built_year || hotel.renovated_year) && (
            <View className='info-row'>
              {hotel.built_year     && <Text className='info-text'>开业：{hotel.built_year}年</Text>}
              {hotel.renovated_year && <Text className='info-text'>装修：{hotel.renovated_year}年</Text>}
            </View>
          )}
          <View className='filter-row' style={{ marginTop: '12px' }}>
            <View className='fchip' onClick={handleCall}>
              <Text className='fchip-txt'>📞 {hotel.phone}</Text>
            </View>
          </View>
          <Text className='address'>{hotel.address}</Text>
        </View>

        {/* 入住信息 */}
        <View className='booking-section'>
          <View className='filter-row'>
            <View className='fchip date-fchip' onClick={() => setShowCalendar(true)}>
              <View className='date-display'>
                <Text className='fchip-txt'>{fmtShort(checkIn)}</Text>
                <View className='date-mid'><Text className='date-nights'>{nights}晚</Text></View>
                <Text className='fchip-txt'>{fmtShort(checkOut)}</Text>
              </View>
              <Text className='fchip-arr'>▾</Text>
            </View>
          </View>
          <View className='filter-row' style={{ marginTop: '10px' }}>
            <View className='fchip guest-fchip' onClick={() => setShowGuest(true)}>
              <View className='guest-display'>
                <Text className='fchip-txt'>{rooms}间 · {adults}成人 · {childrenCount}儿童</Text>
              </View>
              <Text className='fchip-arr'>▾</Text>
            </View>
          </View>
        </View>

        {/* 标签筛选 */}
        <View className='tag-filter-section'>
          <ScrollView className='tag-scroll' scrollX enableFlex>
            <View className='tag-row'>
              {[...FACILITY_TAGS, ...SPECIAL_TAGS].map(tag => (
                <View key={tag.id}
                  className={`tag-chip${selectedTags.includes(tag.id)?' tag-on':''}`}
                  onClick={() => toggleTag(tag.id)}>
                  <Text className='tag-txt'>{tag.name}</Text>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* 房型列表 */}
        <View className='room-list'>
          <Text className='section-title'>房型选择</Text>
          {filteredRooms.length > 0
            ? filteredRooms.map(room => {
                const avail = getAvailableRooms(room)
                const displayPrice = getRoomDisplayPrice(room)
                const isDynamic = roomPrices[room.room_type_id] !== undefined
                  && roomPrices[room.room_type_id] !== room.base_price
                return (
                  <View key={room.room_type_id} className='hotel-card'>
                    <View className='hotel-img-wrap'>
                      <Image className='hotel-img'
                        src={room.cover_url || room.images?.[0]?.media_url || 'https://via.placeholder.com/200x150'}
                        mode='aspectFill' />
                      {avail <= 3 && avail > 0 && (
                        <View className='hotel-badge'><Text className='hotel-badge-txt'>仅剩{avail}间</Text></View>
                      )}
                    </View>
                    <View className='hotel-body'>
                      <Text className='hotel-name'>{room.name}</Text>
                      <Text className='hotel-addr'>{room.bed_info} · 最多{room.max_guests}人</Text>
                      {room.description && <Text className='hotel-addr' numberOfLines={2}>{room.description}</Text>}
                      {room.tags && room.tags.length > 0 && (
                        <View className='room-tags'>
                          {room.tags.slice(0,3).map(t => (
                            <View key={t.id} className='room-tag'><Text className='room-tag-txt'>{t.name}</Text></View>
                          ))}
                        </View>
                      )}
                      <View className='hotel-price-row'>
                        <View className='hotel-price-left'>
                          <Text className='hotel-price-pre'>¥</Text>
                          <Text className={`hotel-price-val${isDynamic?' hotel-price-dynamic':''}`}>{displayPrice}</Text>
                          <Text className='hotel-price-unit'>/晚</Text>
                          {isDynamic && (
                            <Text className='hotel-price-base'>原¥{room.base_price}</Text>
                          )}
                        </View>
                        <View className='hotel-actions'>
                          <View className='hotel-book-btn hotel-detail-btn' onClick={() => { setSelectedRoom(room); setShowRoomDetail(true) }}>
                            <Text className='hotel-book-txt'>详情</Text>
                          </View>
                          {avail > 0
                            ? <View className='hotel-book-btn' onClick={() => { setSelectedRoom(room); setBookingRooms(1); setShowBooking(true) }}>
                                <Text className='hotel-book-txt'>预订</Text>
                              </View>
                            : <View className='hotel-book-btn hotel-book-disabled'>
                                <Text className='hotel-book-txt'>满房</Text>
                              </View>
                          }
                        </View>
                      </View>
                    </View>
                  </View>
                )
              })
            : (
              <View className='empty-wrap' style={{ padding: '40px 20px' }}>
                <Text className='empty-ic'>🏨</Text>
                <Text className='empty-title'>暂无可用房型</Text>
              </View>
            )
          }
        </View>
      </ScrollView>

      {/* 日历弹窗（详情页版，带价格） */}
      <CalendarSheet
        visible={showCalendar}
        checkIn={checkIn}
        checkOut={checkOut}
        hotelId={hotelId!}
        onSelect={(ci, co) => { setCheckIn(ci); setCheckOut(co) }}
        onClose={() => setShowCalendar(false)}
      />

      {/* 人数弹窗 */}
      <GuestSheet
        visible={showGuest}
        rooms={rooms} adults={adults} children={childrenCount}
        onConfirm={(r,a,c) => { setRooms(r); setAdults(a); setChildrenCount(c) }}
        onClose={() => setShowGuest(false)}
      />

      {/* 房型详情弹窗 */}
      {showRoomDetail && selectedRoom && (
        <View className='bs-mask' onClick={() => setShowRoomDetail(false)}>
          <View className='bs-sheet' style={{ height: '70vh' }} onClick={e => e.stopPropagation()}>
            <View className='bs-handle' />
            <Text className='bs-title'>{selectedRoom.name}</Text>
            <ScrollView className='filter-scroll' scrollY>
              <Swiper className='room-detail-swiper' indicatorDots>
                {selectedRoom.images && selectedRoom.images.length > 0
                  ? selectedRoom.images.map(img => (
                      <SwiperItem key={img.media_id}>
                        <Image src={img.media_url} mode='aspectFill' className='room-detail-img' />
                      </SwiperItem>
                    ))
                  : <SwiperItem>
                      <Image src={selectedRoom.cover_url || 'https://via.placeholder.com/300x200'}
                        mode='aspectFill' className='room-detail-img' />
                    </SwiperItem>
                }
              </Swiper>
              <View className='room-detail-info'>
                <Text className='room-detail-desc'>{selectedRoom.description || '暂无介绍'}</Text>
                <View className='room-detail-spec'>
                  <View className='spec-item'>
                    <Text className='spec-label'>床型</Text>
                    <Text className='spec-value'>{selectedRoom.bed_info}</Text>
                  </View>
                  <View className='spec-item'>
                    <Text className='spec-label'>最多入住</Text>
                    <Text className='spec-value'>{selectedRoom.max_guests}人</Text>
                  </View>
                  {selectedRoom.area && (
                    <View className='spec-item'>
                      <Text className='spec-label'>房间面积</Text>
                      <Text className='spec-value'>{selectedRoom.area}m²</Text>
                    </View>
                  )}
                  <View className='spec-item'>
                    <Text className='spec-label'>当前价格</Text>
                    <Text className='spec-value' style={{ color: '#e03030' }}>
                      ¥{getRoomDisplayPrice(selectedRoom)}/晚
                    </Text>
                  </View>
                </View>
              </View>
            </ScrollView>
            <View className='bs-done-single' onClick={() => setShowRoomDetail(false)}>
              <Text className='bs-done-txt'>关闭</Text>
            </View>
          </View>
        </View>
      )}

      {/* 预订弹窗 */}
      {showBooking && selectedRoom && (
        <View className='bs-mask' onClick={() => setShowBooking(false)}>
          <View className='bs-sheet' style={{ height: '52vh' }} onClick={e => e.stopPropagation()}>
            <View className='bs-handle' />
            <Text className='bs-title'>预订 {selectedRoom.name}</Text>
            <View className='booking-info'>
              <View className='guest-row'>
                <Text className='guest-lbl'>入住日期</Text>
                <Text className='step-val'>{fmtShort(checkIn)} - {fmtShort(checkOut)}（{nights}晚）</Text>
              </View>
              <View className='guest-row'>
                <Text className='guest-lbl'>房间数量</Text>
                <View className='guest-ctrl'>
                  <View className={`step-btn${bookingRooms<=1?' step-dis':''}`}
                    onClick={() => bookingRooms>1 && setBookingRooms(bookingRooms-1)}>
                    <Text className='step-ic'>−</Text>
                  </View>
                  <Text className='step-val'>{bookingRooms}</Text>
                  <View className='step-btn'
                    onClick={() => { const avail=getAvailableRooms(selectedRoom); if(bookingRooms<avail) setBookingRooms(bookingRooms+1) }}>
                    <Text className='step-ic'>＋</Text>
                  </View>
                </View>
              </View>
              <View className='guest-row'>
                <Text className='guest-lbl'>单价</Text>
                <Text className='step-val'>¥{getRoomDisplayPrice(selectedRoom)} × {nights}晚</Text>
              </View>
              <View className='guest-row' style={{ borderBottom: 'none' }}>
                <Text className='guest-lbl'>总价</Text>
                <Text className='step-val' style={{ color: '#e03030', fontSize: '20px' }}>¥{calcTotal()}</Text>
              </View>
            </View>
            <View className='bs-footer'>
              <View className={`bs-clear${submitting?' bs-disabled':''}`}
                onClick={() => !submitting && submitOrder('unpaid')}>
                <Text className='bs-clear-txt'>稍后付款</Text>
              </View>
              <View className={`bs-done-flex${submitting?' bs-disabled':''}`}
                onClick={() => !submitting && submitOrder('paid')}>
                <Text className='bs-done-txt'>{submitting ? '提交中...' : '确认支付'}</Text>
              </View>
            </View>
          </View>
        </View>
      )}

    </View>
  )
}

export default HotelDetail