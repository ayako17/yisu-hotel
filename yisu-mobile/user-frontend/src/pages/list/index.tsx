import { useState, useEffect, useCallback } from 'react'
import { View, Text, Image, ScrollView, Input } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import './index.scss'
import type { Hotel, SearchParams, PriceRange, StarOption, Tag } from '../../../types/hotel'
import request from '../../utils/request'
import { 
  FACILITY_TAGS, 
  SPECIAL_TAGS,
  PRICE_RANGES,
  STAR_OPTIONS,
  HOLIDAYS_2026,
  LUNAR_2026,
  WDS,
  DOMESTIC_CITIES,
  INTL_CITIES 
} from '../../constants'

import type { AreaType } from '../home/index'

// ─── 辅助函数 ──────────────────────────────────────────────────────────────────

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
function getLunar(y: number, m: number, d: number): string|null {
  return LUNAR_2026[`${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`]||null
}
function dowMon(date: Date): number { return (date.getDay()+6)%7 }

// ─── 类型 ─────────────────────────────────────────────────────────────────────

type CalPhase = 'in' | 'out' | 'done'
type SortType = 'default' | 'price_asc' | 'price_desc' | 'score_desc' | 'distance'

// ─── BottomSheet ──────────────────────────────────────────────────────────────

interface BSProps { visible:boolean; onClose:()=>void; height?:string; children?:React.ReactNode }
const BottomSheet: React.FC<BSProps> = ({ visible, onClose, height='50vh', children }) => {
  if (!visible) return null
  return (
    <View className='bs-mask' onClick={onClose}>
      <View className='bs-sheet' style={{ height }} onClick={e => e.stopPropagation()}>
        <View className='bs-handle' />
        {children}
      </View>
    </View>
  )
}

// ─── MonthBlock ───────────────────────────────────────────────────────────────

interface MBProps { year:number; month:number; checkIn:string; checkOut:string; phase:CalPhase; onDayTap:(s:string)=>void }
const MonthBlock: React.FC<MBProps> = ({ year, month, checkIn, checkOut, onDayTap }) => {
  const now = new Date(); now.setHours(0,0,0,0)
  const ci = parseD(checkIn), co = parseD(checkOut)
  const dim = new Date(year,month+1,0).getDate()
  const firstDow = dowMon(new Date(year,month,1))
  const cells:(number|null)[] = [...Array(firstDow).fill(null), ...Array.from({length:dim},(_,i)=>i+1)]

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
          const isCi = d.getTime()===ci.getTime(), isCo = d.getTime()===co.getTime()
          const inRange = d>ci && d<co
          const isEP = isCi||isCo
          const isHol = !!getHoliday(month,day)
          const sub = getLunar(year,month,day)||''
          const isWkend = dowMon(d)>=5
          let wcls = 'cal-cell'
          if (inRange) wcls += ' inrange'
          if (isCi)    wcls += ' rng-start'
          if (isCo)    wcls += ' rng-end'
          return (
            <View key={idx} className={wcls}>
              <View className={`cal-day${isEP?' ep':''}${past?' dim':''}`} onClick={() => !past && onDayTap(fmtDate(d))}>
                <Text className={`dn${past?' p':isEP?' s':isWkend?' w':''}`}>{day}</Text>
                {sub ? <Text className={`ds${isEP?' se':isHol?' sh':''}`}>{sub}</Text> : null}
              </View>
            </View>
          )
        })}
      </View>
    </View>
  )
}

// ─── CalendarSheet ────────────────────────────────────────────────────────────

interface CSProps { visible:boolean; checkIn:string; checkOut:string; onSelect:(ci:string,co:string)=>void; onClose:()=>void }
const CalendarSheet: React.FC<CSProps> = ({ visible, checkIn, checkOut, onSelect, onClose }) => {
  const [phase, setPhase] = useState<CalPhase>('done')
  const [tmpCi, setTmpCi] = useState(checkIn)
  const [tmpCo, setTmpCo] = useState(checkOut)
  useEffect(() => { if (visible) { setTmpCi(checkIn); setTmpCo(checkOut); setPhase('done') } }, [visible])

  function handleTap(ds: string) {
    const d=parseD(ds), now=new Date(); now.setHours(0,0,0,0); if(d<now) return
    if (phase==='done'||phase==='in') {
      const nx=new Date(d); nx.setDate(nx.getDate()+1); setTmpCi(ds); setTmpCo(fmtDate(nx)); setPhase('out')
    } else {
      if (d>parseD(tmpCi)) { setTmpCo(ds); setPhase('done') }
      else { const nx=new Date(d); nx.setDate(nx.getDate()+1); setTmpCi(ds); setTmpCo(fmtDate(nx)); setPhase('out') }
    }
  }
  function confirm() { onSelect(tmpCi, tmpCo); onClose() }

  const now = new Date()
  const months = Array.from({length:14},(_,i) => {
    const d = new Date(now.getFullYear(), now.getMonth()+i, 1)
    return { year: d.getFullYear(), month: d.getMonth() }
  })
  const nights = calcNights(tmpCi, tmpCo)
  const tip = phase==='in' ? '请选择入住日期' : phase==='out' ? '请选择退房日期' : `${fmtShort(tmpCi)} — ${fmtShort(tmpCo)}`

  if (!visible) return null
  return (
    <View className='bs-mask' onClick={confirm}>
      <View className='bs-sheet bs-sheet-cal' onClick={e => e.stopPropagation()}>
        <View className='bs-handle' />
        <Text className='cal-tip'>{tip}</Text>
        <ScrollView className='cal-scroll' scrollY>
          {months.map(({year,month}) => (
            <MonthBlock key={`${year}-${month}`} year={year} month={month}
              checkIn={tmpCi} checkOut={tmpCo} phase={phase} onDayTap={handleTap} 
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

// ─── CityPanel ────────────────────────────────────────────────────────────────

interface CPProps { visible:boolean; areaType:AreaType; onSelect:(c:string)=>void; onClose:()=>void }
const CityPanel: React.FC<CPProps> = ({ visible, areaType, onSelect, onClose }) => {
  const [search, setSearch] = useState('')
  const [scrollIntoView, setScrollIntoView] = useState('')
  
  const cities=areaType==='domestic'?DOMESTIC_CITIES:INTL_CITIES
  
  const all:string[] = []
  const seen = new Set<string>()
  Object.values(cities).forEach(l => l.forEach(c => { if(!seen.has(c)) { seen.add(c); all.push(c) } }))
  const filtered = search ? all.filter(c => c.includes(search)) : null
  
  const handleLetterClick = (letter: string) => {
    setScrollIntoView(`cs-${letter}`)
    setTimeout(() => setScrollIntoView(''), 200)
  }
  
  return (
    <BottomSheet visible={visible} onClose={onClose} height='80vh'>
      <View className='city-hdr'>
        <Text className='city-title'>选择城市</Text>
        <View style={{ width: '44px' }} />
      </View>
      <View className='city-search'>
        <Text className='city-si'>⌕</Text>
        <Input className='city-inp' placeholder='搜索城市…' value={search} onInput={e => setSearch(e.detail.value)} />
        {search && <Text className='city-clr' onClick={() => setSearch('')}>✕</Text>}
      </View>
      <View className='city-body'>
        <ScrollView className='city-list' scrollY scrollIntoView={scrollIntoView}>
          {filtered ? (
            filtered.length === 0 ? (
              <Text className='city-empty'>未找到城市</Text>
            ) : (
              filtered.map(c => (
                <View key={c} className='city-row' onClick={() => { onSelect(c); onClose() }}>
                  <Text className='city-row-name'>{c}</Text>
                  <Text className='city-row-arr'>›</Text>
                </View>
              ))
            )
          ) : (
            Object.entries(cities).map(([letter, list]) => (
              <View key={letter} id={`cs-${letter}`}>
                <View className='city-sec-hd'><Text>{letter}</Text></View>
                {list.map(c => (
                  <View key={c} className='city-row' onClick={() => { onSelect(c); onClose() }}>
                    <Text className='city-row-name'>{c}</Text>
                    <Text className='city-row-arr'>›</Text>
                  </View>
                ))}
              </View>
            ))
          )}
        </ScrollView>
        {!filtered && (
          <View className='city-idx'>
            {Object.keys(cities).map(l => (
              <Text key={l} className='city-idx-item' onClick={() => handleLetterClick(l)}>{l}</Text>
            ))}
          </View>
        )}
      </View>
    </BottomSheet>
  )
}

// ─── GuestSheet ───────────────────────────────────────────────────────────────

interface GSProps { 
  visible: boolean
  rooms: number
  adults: number
  children: number
  onConfirm: (rooms: number, adults: number, children: number) => void
  onClose: () => void
}
const GuestSheet: React.FC<GSProps> = ({ visible, rooms, adults, children, onConfirm, onClose }) => {
  const [tmpRooms, setTmpRooms] = useState(rooms)
  const [tmpAdults, setTmpAdults] = useState(adults)
  const [tmpChildren, setTmpChildren] = useState(children)
  
  useEffect(() => {
    if (visible) {
      setTmpRooms(rooms)
      setTmpAdults(adults)
      setTmpChildren(children)
    }
  }, [visible])
  
  function handleConfirm() {
    onConfirm(tmpRooms, tmpAdults, tmpChildren)
    onClose()
  }
  
  return (
    <BottomSheet visible={visible} onClose={onClose} height='28vh'>
      <Text className='bs-title'>入住信息</Text>
      <View className='guest-list'>
        {[
          ['房间数', tmpRooms, setTmpRooms, 1],
          ['成人', tmpAdults, setTmpAdults, 1],
          ['儿童', tmpChildren, setTmpChildren, 0]
        ].map(([lbl, val, set, min]) => (
          <View key={lbl as string} className='guest-row'>
            <View className='guest-lbl-col'>
              <Text className='guest-lbl'>{lbl as string}</Text>
              {lbl === '儿童' && <Text className='guest-sub'>17岁及以下</Text>}
            </View>
            <View className='guest-ctrl'>
              <View className={`step-btn${val <= min ? ' step-dis' : ''}`} onClick={() => (set as any)(Math.max(min as number, (val as number) - 1))}>
                <Text className='step-ic'>−</Text>
              </View>
              <Text className='step-val'>{val as number}</Text>
              <View className='step-btn' onClick={() => (set as any)((val as number) + 1)}>
                <Text className='step-ic'>＋</Text>
              </View>
            </View>
          </View>
        ))}
      </View>
      <View className='bs-done-single' onClick={handleConfirm}>
        <Text className='bs-done-txt'>完成</Text>
      </View>
    </BottomSheet>
  )
}

// ─── 价格筛选弹层 ─────────────────────────────────────────────────────────────

interface PriceSheetProps {
  visible: boolean
  selectedPrice: PriceRange | null
  onConfirm: (price: PriceRange | null) => void
  onClose: () => void
}

const PriceSheet: React.FC<PriceSheetProps> = ({ visible, selectedPrice, onConfirm, onClose }) => {
  const [tmpPrice, setTmpPrice] = useState<PriceRange | null>(selectedPrice)
  
  useEffect(() => {
    if (visible) {
      setTmpPrice(selectedPrice)
    }
  }, [visible])
  
  function handleConfirm() {
    onConfirm(tmpPrice)
    onClose()
  }
  
  return (
    <BottomSheet visible={visible} onClose={onClose} height='40vh'>
      <Text className='bs-title'>价格区间</Text>
      <ScrollView className='filter-scroll' scrollY>
        <View className='price-grid-sheet'>
          <View 
            className={`price-card${!tmpPrice ? ' price-card-on' : ''}`}
            onClick={() => setTmpPrice(null)}
          >
            <Text className='price-card-txt'>不限价格</Text>
          </View>
          {PRICE_RANGES.map(range => (
            <View 
              key={range.label}
              className={`price-card${tmpPrice?.label === range.label ? ' price-card-on' : ''}`}
              onClick={() => setTmpPrice(range)}
            >
              <Text className='price-card-txt'>{range.label}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
      <View className='bs-footer'>
        <View className='bs-clear' onClick={() => setTmpPrice(null)}>
          <Text className='bs-clear-txt'>清空</Text>
        </View>
        <View className='bs-done-flex' onClick={handleConfirm}>
          <Text className='bs-done-txt'>完成</Text>
        </View>
      </View>
    </BottomSheet>
  )
}

// ─── 组合信息面板 ──────────────────────────────────────────────────────────────

interface InfoPanelProps {
  visible: boolean
  city: string
  checkIn: string
  checkOut: string
  rooms: number
  adults: number
  children: number
  onCityClick: () => void
  onDateClick: () => void
  onGuestClick: () => void
  onLocate: () => void
  onClose: () => void
  children?: React.ReactNode
}

const InfoPanel: React.FC<InfoPanelProps> = ({
  visible, city, checkIn, checkOut, rooms, adults, children,
  onCityClick, onDateClick, onGuestClick, onLocate, onClose
}) => {
  const nights = calcNights(checkIn, checkOut)
  
  if (!visible) return null
  
  return (
    <View className='info-mask' onClick={onClose}>
      <View className='info-panel' onClick={e => e.stopPropagation()}>
        {/* 地点 */}
        <View className='info-row' onClick={onCityClick}>
          <View className='info-content'>
            <Text className='info-label'>地点</Text>
            <Text className='info-value'>{city}</Text>
          </View>
          <View className='info-locate' onClick={(e) => { e.stopPropagation(); onLocate(); }}>
            <Text className='info-locate-ic'>◎</Text>
          </View>
        </View>
        
        {/* 日期 */}
        <View className='info-row' onClick={onDateClick}>
          <View className='info-content'>
            <Text className='info-label'>入住 · 退房</Text>
            <Text className='info-value'>{fmtShort(checkIn)} - {fmtShort(checkOut)} · {nights}晚</Text>
          </View>
        </View>
        
        {/* 人数 */}
        <View className='info-row' onClick={onGuestClick}>
          <View className='info-content'>
            <Text className='info-label'>房间 · 人数</Text>
            <Text className='info-value'>{rooms}间 · {adults}成人 · {children}儿童</Text>
          </View>
        </View>
      </View>
    </View>
  )
}

// ─── 骨架屏 ───────────────────────────────────────────────────────────────────

const SkeletonCard: React.FC = () => (
  <View className='hotel-card hotel-card-skeleton'>
    <View className='sk-img' />
    <View className='sk-body'>
      <View className='sk-line sk-line-lg' />
      <View className='sk-line sk-line-md' />
      <View className='sk-line sk-line-sm' />
      <View className='sk-footer'><View className='sk-line sk-line-price' /></View>
    </View>
  </View>
)

// ─── 酒店卡片 ─────────────────────────────────────────────────────────────────

interface HotelCardProps { hotel:Hotel; nights:number; rooms:number; onTap:(id:number)=>void }
const HotelCard: React.FC<HotelCardProps> = ({ hotel, nights, rooms, onTap }) => {
  const coverImg = hotel.images?.find(i => i.is_cover===true) || hotel.images?.[0]
  const stars = '★'.repeat(Math.min(5, hotel.star_rating||0))
  const facilityTags = hotel.tags?.filter(t => t.tag_type==='facility').slice(0,2)||[]
  const specialTags  = hotel.tags?.filter(t => t.tag_type==='special').slice(0,2)||[]
  const showTags = [...specialTags,...facilityTags].slice(0,3)

  return (
    <View className='hotel-card' onClick={() => onTap(hotel.hotel_id)}>
      <View className='hotel-img-wrap'>
        {coverImg
          ? <Image className='hotel-img' src={coverImg.media_url} mode='aspectFill' lazyLoad />
          : <View className='hotel-img hotel-img-fallback'><Text className='hotel-img-fallback-ic'>🏨</Text></View>
        }
        {hotel.star_rating >= 4 && (
          <View className='hotel-badge'><Text className='hotel-badge-txt'>{hotel.star_rating}星</Text></View>
        )}
      </View>

      <View className='hotel-body'>
        <View className='hotel-title-row'>
          <Text className='hotel-name'>{hotel.name_zh}</Text>
        </View>

        <View className='hotel-star-row'>
          {hotel.star_rating > 0 && <Text className='hotel-stars'>{stars}</Text>}
          {hotel.distance && <Text className='hotel-dist'>直线距离 {hotel.distance}</Text>}
        </View>

        <Text className='hotel-addr'>{hotel.address}</Text>

        {showTags.length > 0 && (
          <View className='hotel-tags'>
            {showTags.map(tag => (
              <View key={tag.id} className={`htag htag-${tag.tag_type}`}>
                <Text className='htag-txt'>{tag.name}</Text>
              </View>
            ))}
          </View>
        )}

        <View className='hotel-price-row'>
          <View className='hotel-price-left'>
            <Text className='hotel-price-pre'>¥</Text>
            <Text className='hotel-price-val'>{hotel.estimatedPrice}</Text>
            <Text className='hotel-price-unit'>/晚起</Text>
          </View>
          <View className='hotel-book-btn'>
            <Text className='hotel-book-txt'>立即预订</Text>
          </View>
        </View>

        {nights > 1 && (
          <Text className='hotel-total'>共{nights}晚 {rooms}间 合计约¥{hotel.totalPrice}</Text>
        )}
      </View>
    </View>
  )
}

// ─── 空状态 ───────────────────────────────────────────────────────────────────

const EmptyState: React.FC<{ onReset:()=>void }> = ({ onReset }) => (
  <View className='empty-wrap'>
    <Text className='empty-ic'>🏨</Text>
    <Text className='empty-title'>暂无符合条件的酒店</Text>
    <Text className='empty-sub'>换个条件试试吧</Text>
    <View className='empty-btn' onClick={onReset}><Text className='empty-btn-txt'>清空筛选</Text></View>
  </View>
)

// ─── 主页面 ───────────────────────────────────────────────────────────────────

const HotelList: React.FC = () => {
  const router = useRouter()
  const params = router.params as Record<string,string>

  // ── 路由参数初始化 ──
  const initCI = params.checkIn  || fmtDate(new Date())
  const initCO = params.checkOut || fmtDate(new Date(Date.now()+86400000))

  const [city,     setCity]     = useState(params.city ? decodeURIComponent(params.city) : '上海')
  const [checkIn,  setCheckIn]  = useState(initCI)
  const [checkOut, setCheckOut] = useState(initCO)
  const [rooms,    setRooms]    = useState(parseInt(params.rooms    ||'1'))
  const [adults,   setAdults]   = useState(parseInt(params.adults   ||'2'))
  const [children, setChildren] = useState(parseInt(params.children ||'0'))
  const [keyword,  setKeyword]  = useState(params.keyword ? decodeURIComponent(params.keyword) : '')

  // 筛选条件
  const [selPrice,  setSelPrice]  = useState<PriceRange|null>(() =>
    params.minPrice ? PRICE_RANGES.find(r => r.min===parseInt(params.minPrice))||null : null
  )
  const [selStars,  setSelStars]  = useState<number[]>(() =>
    params.starRating ? params.starRating.split(',').map(Number) : []
  )
  const [selTags,   setSelTags]   = useState<number[]>(() =>
    params.tagIds ? params.tagIds.split(',').map(Number) : []
  )
  const [sort, setSort] = useState<SortType>('default')
  const [distance, setDistance] = useState<boolean>(false)

  // 价格排序独立控制
  const [priceSort, setPriceSort] = useState<'none' | 'asc' | 'desc'>('none')
  
  // 组合排序逻辑
  useEffect(() => {
    if (priceSort === 'asc') setSort('price_asc')
    else if (priceSort === 'desc') setSort('price_desc')
    else if (distance) setSort('distance')
    else setSort('default')
  }, [priceSort, distance])

  // 弹层显隐
  const [showInfoPanel, setShowInfoPanel] = useState(false)
  const [showCity,      setShowCity]      = useState(false)
  const [showCal,       setShowCal]       = useState(false)
  const [showGuest,     setShowGuest]     = useState(false)
  const [showPriceFilter, setShowPriceFilter] = useState(false)
  const [showStarFilter, setShowStarFilter] = useState(false)
  const [showTagModal,  setShowTagModal]  = useState(false)

  // 弹层临时状态
  const [tmpStars, setTmpStars] = useState<number[]>([])
  const [tmpPrice, setTmpPrice] = useState<PriceRange | null>(null)

  // 列表
  const [hotels,     setHotels]     = useState<Hotel[]>([])
  const [loading,    setLoading]    = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [page,       setPage]       = useState(1)
  const [hasMore,    setHasMore]    = useState(true)
  const [total,      setTotal]      = useState(0)

  const nights = calcNights(checkIn, checkOut)

    const reverseGeocode = async (latitude: number, longitude: number) => {
    // 高德地图API
    const amapKey = '5e7c65146a8af300a7280c7bb58bf3a1' 
    
    try {
      const response = await Taro.request({
        url: 'https://restapi.amap.com/v3/geocode/regeo',
        data: {
          key: amapKey,
          location: `${longitude},${latitude}`,
          output: 'JSON'
        }
      })
      
      console.log('逆地理编码结果：', response.data)
      
      if (response.data.status === '1') {
        const addressComponent = response.data.regeocode.addressComponent
        // 获取城市名
        let cityName = addressComponent.city || addressComponent.province || '未知位置'
        
        // 去掉结尾的"市"字
        if (cityName.endsWith('市')) {
          cityName = cityName.slice(0, -1)
        }
        
        return cityName
      } else {
        return `当前位置(${latitude.toFixed(2)}, ${longitude.toFixed(2)})`
      }
    } catch (error) {
      console.error('逆地理编码失败', error)
      return `当前位置(${latitude.toFixed(2)}, ${longitude.toFixed(2)})`
    }
  }

// 定位函数
const handleLocate = async () => {
  if (!navigator.geolocation) {
    Taro.showToast({ 
      title: '浏览器不支持定位', 
      icon: 'none',
      duration: 2000
    })
    return
  }

  try {
    Taro.showLoading({ 
      title: '定位中...',
      mask: true
    })

    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      })
    })

    Taro.hideLoading()
    
    const { latitude, longitude } = position.coords
    console.log('定位成功：', latitude, longitude)
    
    // 保存用户位置
    setUserLocation({ latitude, longitude })
    
    // 调用逆地理编码API获取城市信息
    const cityName = await reverseGeocode(latitude, longitude)
    
    setCity(cityName)
    setShowInfoPanel(false)
    
    Taro.showToast({ 
      title: `定位到${cityName}`, 
      icon: 'success',
      duration: 1500
    })

  } catch (error: any) {
    Taro.hideLoading()
    
    let errorMsg = '定位失败，请重试'
    if (error.code === 1) {
      errorMsg = '请允许定位权限'
    } else if (error.code === 2) {
      errorMsg = '位置信息不可用'
    } else if (error.code === 3) {
      errorMsg = '定位超时，请重试'
    }
    
    Taro.showToast({ 
      title: errorMsg, 
      icon: 'none',
      duration: 2000
    })
  }
}
  
  // 添加用户位置状态
const [userLocation, setUserLocation] = useState<{latitude: number; longitude: number} | null>(null)

// 计算两点之间的直线距离（Haversine公式）
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number | null => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null
  
  const R = 6371 // 地球半径（公里）
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2)
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  return R * c
}

// 格式化距离显示
const formatDistance = (dist: number | null): string => {
  if (dist === null) return ''
  if (dist < 1) {
    return `${Math.round(dist * 1000)}m`
  } else {
    return `${dist.toFixed(1)}km`
  }
}

  // ── 排序 ──
  function sortHotels(list: Hotel[], s: SortType): Hotel[] {
    const arr = [...list]
    if (s==='price_asc')  return arr.sort((a,b)=>(a.estimatedPrice??0)-(b.estimatedPrice??0))
    if (s==='price_desc') return arr.sort((a,b)=>(b.estimatedPrice??0)-(a.estimatedPrice??0))
    if (s === 'distance') {
    // 如果没有用户位置，无法按距离排序
    if (!userLocation) {
      Taro.showToast({ 
        title: '请先点击定位获取您的位置', 
        icon: 'none',
        duration: 2000
      })
      return arr
    }
    
    // 为每个酒店计算距离并添加显示字段
    const hotelsWithDistance = arr.map(hotel => {
      if (hotel.latitude && hotel.longitude) {
        const dist = calculateDistance(
          userLocation.latitude, userLocation.longitude,
          hotel.latitude, hotel.longitude
        )
        return {
          ...hotel,
          distance: dist ? formatDistance(dist) : undefined,
          _distanceValue: dist || 99999 // 用于排序的内部字段
        }
      }
      return {
        ...hotel,
        distance: undefined,
        _distanceValue: 99999 // 没有经纬度的酒店排在最后
      }
    })
    
    // 按距离排序
    return hotelsWithDistance.sort((a, b) => 
      (a._distanceValue || 99999) - (b._distanceValue || 99999)
    )
  }
  
  return arr
}
  // ── 请求 ──
  const fetchHotels = useCallback(async (pageNum=1, replace=false) => {
    if (pageNum===1) setLoading(true)
    try {
      const query: Record<string,string> = {
        city, keyword, checkIn, checkOut,
        rooms: String(rooms), adults: String(adults), children: String(children),
        page: String(pageNum), pageSize: '10',
        ...(selPrice ? { minPrice: String(selPrice.min), maxPrice: String(selPrice.max) } : {}),
        ...(selStars.length ? { starRating: selStars.join(',') } : {}),
        ...(selTags.length  ? { tagIds:     selTags.join(',')  } : {}),
      }
      const qs = Object.entries(query).filter(([,v])=>v!=='').map(([k,v])=>`${k}=${encodeURIComponent(v)}`).join('&')
      const data = await request<any>(`/hotels/search?${qs}`, { method:'GET' })
      if (data?.list) {
        setTotal(data.pagination?.total||data.list.length)
        setHasMore(data.list.length===10)
        const sorted = sortHotels(data.list, sort)
        if (replace||pageNum===1) setHotels(sorted)
        else setHotels(prev=>[...prev,...sorted])
        setPage(pageNum)
      } else { Taro.showToast({ title:'加载失败', icon:'none' }) }
    } catch(e) {
      console.error(e); Taro.showToast({ title:'网络错误', icon:'none' })
    } finally { setLoading(false); setRefreshing(false) }
  }, [city,keyword,checkIn,checkOut,rooms,adults,children,selPrice,selStars,selTags,sort])

  useEffect(() => { fetchHotels(1,true) }, [city,checkIn,checkOut,rooms,adults,children,selPrice,selStars,selTags])
  useEffect(() => { setHotels(prev=>sortHotels(prev,sort)) }, [sort])

  function handleRefresh()   { setRefreshing(true); fetchHotels(1,true) }
  function handleScrollEnd() { if(!hasMore||loading) return; fetchHotels(page+1,false) }
  function handleSearch()    { fetchHotels(1,true) }
  function handleReset()     { setSelPrice(null); setSelStars([]); setSelTags([]); setPriceSort('none'); setDistance(false) }

  function openPriceFilter() {
    setTmpPrice(selPrice)
    setShowPriceFilter(true)
  }

  function confirmPriceFilter() {
    setSelPrice(tmpPrice)
    setShowPriceFilter(false)
  }

  function openStarFilter() { 
    setTmpStars([...selStars]); 
    setShowStarFilter(true) 
  }
  
  function confirmStarFilter() { 
    setSelStars(tmpStars); 
    setShowStarFilter(false) 
  }

  function toggleTag(id: number) {
    setSelTags(prev => prev.includes(id) ? prev.filter(x=>x!==id) : [...prev,id])
  }

  function goDetail(id: number) {
    Taro.navigateTo({
      url: `/pages/hotel/index?hotelId=${id}&checkIn=${checkIn}&checkOut=${checkOut}&rooms=${rooms}&adults=${adults}&children=${children}`
    })
  }

  function handleGuestConfirm(r: number, a: number, c: number) {
    setRooms(r)
    setAdults(a)
    setChildren(c)
  }

  const tagCount    = selTags.length
  const starCount   = selStars.length

  return (
    <View className='list-root'>

      {/* 顶部搜索栏 */}
      <View className='list-header'>
        <View className='list-back' onClick={() => Taro.switchTab({ url:'/pages/home/index' })}>
          <Text className='list-back-ic'>‹</Text>
        </View>
        
        {/* 组合信息区域 - 点击弹出面板 */}
        <View className='list-info-combo' onClick={() => setShowInfoPanel(true)}>
          <View className='combo-row'>
            <Text className='combo-city'>{city}</Text>
            <Text className='combo-date'>{fmtShort(checkIn)} - {fmtShort(checkOut)}</Text>
          </View>
          <View className='combo-row'>
            <Text className='combo-guest'>{rooms}间 · {adults}成人 · {children}儿童</Text>
          </View>
        </View>

        <View className='list-search-box'>
          <Text className='list-search-ic'>⌕</Text>
          <Input className='list-search-inp' placeholder='搜索酒店、商圈、地标…'
            value={keyword} onInput={e=>setKeyword(e.detail.value)}
            onConfirm={handleSearch} confirmType='search' 
          />
          {keyword ? <Text className='list-search-clr' onClick={()=>{setKeyword('');fetchHotels(1,true)}}>✕</Text> : null}
        </View>
      </View>

      {/* 筛选栏（距离 · 价格 · 星级 · 标签） */}
      <ScrollView className='filter-scroll-x' scrollX enableFlex>
        <View className='filter-row-x'>
          
          {/* 距离筛选 */}
          <View 
            className={`filter-chip${distance ? ' filter-chip-on' : ''}`}
            onClick={() => {
              if (!userLocation && !distance) {
                Taro.showToast({ 
                  title: '请先点击定位获取您的位置', 
                  icon: 'none',
                  duration: 2000
                })
                return
              }
              setDistance(!distance)
            }}
          >
            <Text className={`filter-chip-txt${distance ? ' filter-chip-txt-on' : ''}`}>直线距离最近</Text>
          </View>

          {/* 价格筛选 - 区间选择 + 排序 */}
          <View className='filter-chip-group'>
            <View 
              className={`filter-chip${selPrice ? ' filter-chip-on' : ''}`}
              onClick={openPriceFilter}
            >
              <Text className={`filter-chip-txt${selPrice ? ' filter-chip-txt-on' : ''}`}>
                {selPrice ? selPrice.label : '价格'}
              </Text>
            </View>
            
            <View 
              className={`filter-chip-sub ${priceSort === 'asc' ? 'filter-chip-sub-on' : ''}`}
              onClick={() => setPriceSort(priceSort === 'asc' ? 'none' : 'asc')}
            >
              <Text className='filter-chip-sub-txt'>↑</Text>
            </View>
            <View 
              className={`filter-chip-sub ${priceSort === 'desc' ? 'filter-chip-sub-on' : ''}`}
              onClick={() => setPriceSort(priceSort === 'desc' ? 'none' : 'desc')}
            >
              <Text className='filter-chip-sub-txt'>↓</Text>
            </View>
          </View>

          {/* 星级筛选 */}
          <View 
            className={`filter-chip${starCount ? ' filter-chip-on' : ''}`}
            onClick={openStarFilter}
          >
            <Text className={`filter-chip-txt${starCount ? ' filter-chip-txt-on' : ''}`}>
              {starCount ? `${selStars.join('/')}星` : '星级'}
            </Text>
          </View>

          {/* 标签筛选 */}
          <View 
            className={`filter-chip${tagCount ? ' filter-chip-on' : ''}`}
            onClick={() => setShowTagModal(true)}
          >
            <Text className={`filter-chip-txt${tagCount ? ' filter-chip-txt-on' : ''}`}>
              {tagCount ? `标签(${tagCount})` : '标签'}
            </Text>
          </View>

        </View>
      </ScrollView>

      {/* 结果数 */}
      <View className='list-info-bar'>
        <Text className='list-info-txt'>{city} · {!loading?`共${total}家`:'搜索中…'}</Text>
      </View>

      {/* 列表 */}
      <ScrollView className='list-scroll' scrollY
        refresherEnabled refresherTriggered={refreshing}
        onRefresherRefresh={handleRefresh}
        onScrollToLower={handleScrollEnd} lowerThreshold={150}
      >
        {loading ? (
          <View>{[1,2,3].map(i => <SkeletonCard key={i} />)}</View>
        ) : hotels.length===0 ? (
          <EmptyState onReset={handleReset} />
        ) : (
          <View>
            {hotels.map(hotel => (
              <HotelCard key={hotel.hotel_id} hotel={hotel}
                nights={nights} rooms={rooms} onTap={goDetail} 
              />
            ))}
            <View className='list-footer'>
              {hasMore
                ? <Text className='list-footer-txt'>上拉加载更多…</Text>
                : <Text className='list-footer-txt'>已显示全部 {total} 家酒店</Text>
              }
            </View>
          </View>
        )}
      </ScrollView>

      {/* 弹层 */}

      {/* 组合信息面板 */}
      <InfoPanel
        visible={showInfoPanel}
        city={city}
        checkIn={checkIn}
        checkOut={checkOut}
        rooms={rooms}
        adults={adults}
        onCityClick={() => { setShowInfoPanel(false); setShowCity(true); }}
        onDateClick={() => { setShowInfoPanel(false); setShowCal(true); }}
        onGuestClick={() => { setShowInfoPanel(false); setShowGuest(true); }}
        onLocate={handleLocate}
        onClose={() => setShowInfoPanel(false)}
      />

      {/* 城市选择 */}
      <CityPanel 
        visible={showCity}
        areaType='domestic' 
        onSelect={(c) => { setCity(c); setShowCity(false); }} 
        onClose={() => setShowCity(false)} 
      />

      {/* 日历 - 与首页完全一致 */}
      <CalendarSheet 
        visible={showCal} 
        checkIn={checkIn} 
        checkOut={checkOut}
        onSelect={(ci,co) => { setCheckIn(ci); setCheckOut(co); }}
        onClose={() => setShowCal(false)} 
      />

      {/* 入住人数 */}
      <GuestSheet
        visible={showGuest}
        rooms={rooms}
        adults={adults}
        onConfirm={(r, a, c) => {
          setRooms(r)
          setAdults(a)
          setChildren(c)
        }}
        onClose={() => setShowGuest(false)}
      >
        {children}
      </GuestSheet>

      {/* 价格筛选弹层 */}
      <PriceSheet
        visible={showPriceFilter}
        selectedPrice={selPrice}
        onConfirm={(price) => setSelPrice(price)}
        onClose={() => setShowPriceFilter(false)}
      />

      {/* 星级弹层 */}
      <BottomSheet visible={showStarFilter} onClose={confirmStarFilter} height='20vh'>
        <Text className='bs-title'>星级筛选</Text>
        <View className='star-grid-sheet'>
          {STAR_OPTIONS.map(opt => (
            <View key={opt.value}
              className={`star-chip${tmpStars.includes(opt.value)?' star-on':''}`}
              onClick={() => setTmpStars(prev => prev.includes(opt.value)?prev.filter(x=>x!==opt.value):[...prev,opt.value])}
            >
              <Text className='star-stars'>{'★'.repeat(opt.value)}</Text>
              <Text className='star-lbl'>{opt.label}</Text>
            </View>
          ))}
        </View>
        <View className='bs-footer'>
          <View className='bs-clear' onClick={() => setTmpStars([])}>
            <Text className='bs-clear-txt'>清空</Text>
          </View>
          <View className='bs-done-flex' onClick={confirmStarFilter}>
            <Text className='bs-done-txt'>完成</Text>
          </View>
        </View>
      </BottomSheet>

      {/* 标签弹层 */}
      <BottomSheet visible={showTagModal} onClose={() => setShowTagModal(false)} height='40vh'>
        <Text className='bs-title'>筛选标签</Text>
        <ScrollView className='filter-scroll' scrollY>
          {([['特色',SPECIAL_TAGS],['设施',FACILITY_TAGS]] as [string,Tag[]][]).map(([lbl,list]) => (
            <View key={lbl} className='tag-sec'>
              <Text className='filter-sec-title'>{lbl}</Text>
              <View className='tag-chip-grid'>
                {list.map(tag => (
                  <View key={tag.id}
                    className={`modal-chip${selTags.includes(tag.id)?' modal-chip-on':''}`}
                    onClick={() => toggleTag(tag.id)}
                  >
                    <Text className='modal-chip-txt'>{tag.name}</Text>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </ScrollView>
        <View className='bs-footer'>
          <View className='bs-clear' onClick={() => setSelTags([])}>
            <Text className='bs-clear-txt'>清空</Text>
          </View>
          <View className='bs-done-flex' onClick={() => setShowTagModal(false)}>
            <Text className='bs-done-txt'>完成{selTags.length>0?`（${selTags.length}）`:''}</Text>
          </View>
        </View>
      </BottomSheet>

    </View>
  )
}

export default HotelList