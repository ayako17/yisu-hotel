import { useState, useCallback, useEffect } from 'react'
import { View, Text, Input, ScrollView, Swiper, SwiperItem } from '@tarojs/components'
import Taro from '@tarojs/taro'
import './index.scss'
import { 
  FACILITY_TAGS, 
  SPECIAL_TAGS,
  PRICE_RANGES,
  STAR_OPTIONS,
  HOLIDAYS_2026,
  LUNAR_2026,
  WDS,
  DOMESTIC_CITIES,
  INTL_CITIES ,
  Tag,
  PriceRange
} from '../../constants'

// 在 import 之后添加
interface AdBanner {
  ad_id: number
  hotel_id: number
  ad_order_id: number | null
  image_url: string
  start_date: string
  end_date: string
  is_active: number
}
type AreaType = 'domestic' | 'international'
type CalPhase = 'in' | 'out' | 'done'

const AD_BANNERS = [{ id:1,bg:'#cfe0ff' },{ id:2,bg:'#cff0e8' },{ id:3,bg:'#fde5cc' }]

// ─── 日历相关函数 ──────────────────────────────────────────────────────────────────

//将Date对象格式化为"YYYY-MM-DD"格式的字符串
function fmtDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

//将"YYYY-MM-DD"格式的字符串解析为Date对象
function parseD(s: string): Date {
  const [y,m,d]=s.split('-').map(Number); return new Date(y,m-1,d)
}

//将"YYYY-MM-DD"格式的日期字符串转换为"M月D日"的中文短格式
function fmtShort(s: string): string {
  const d=parseD(s); return `${d.getMonth()+1}月${d.getDate()}日`
}

//计算入住和离店日期之间的夜晚数量，至少为1晚
function calcNights(ci: string,co: string): number {
  return Math.max(1,Math.round((parseD(co).getTime()-parseD(ci).getTime())/86400000))//毫秒数转天数
}

//根据月份和日期获取对应的节日名称，如果没有则返回null
function getHoliday(m: number,d: number): string|null {
  return HOLIDAYS_2026[`${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`]||null
}

//根据年份、月份和日期获取对应的农历日期名称，如果没有则返回null
function getLunar(y: number,m: number,d: number): string|null {
  return LUNAR_2026[`${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`]||null
}

//date.getDay()：JS原生的星期方法，周日=0，周一=1，周六=6
//将星期几的数字表示（0-6）转换为周一为0，周二为1，...，周日为6的格式，方便后续计算
function dowMon(date: Date): number { return (date.getDay()+6)%7 }

// ─── BottomSheet，从屏幕底部滑出的面板 ──────────────────────────────────────────────────────────────
interface BSProps { 
  visible: boolean; 
  onClose: () => void; 
  height?: string; 
  children: React.ReactNode //弹窗内部显示的内容
}

const BottomSheet: React.FC<BSProps> = ({ 
   visible,
   onClose,//关闭弹窗的回调函数
   height='40vh',// 默认高度为视口高度的40%
   children 
  }) => {
  if (!visible) return null
  return (
    //点击非BottomSheet区域时触发onClose，关闭弹窗
    <View className='bs-mask' onClick={onClose}>
      {/* 底部内容面板，阻止点击事件冒泡到遮罩层 */}
      <View className='bs-sheet' style={{ height }} onClick={(e)=>e.stopPropagation()}>
        {/* 顶部的拖动条（UI装饰），通常是一个小横条提示用户可拖动 */}
        <View className='bs-handle' />
        {/* 渲染传入的子内容，如选项列表、表单等 */}
        {children}
      </View>
    </View>
  )
}

// ─── MonthBlock ───────────────────────────────────────────────────────────────
interface MBProps { year:number; month:number; checkIn:string; checkOut:string; phase:CalPhase; onDayTap:(s:string)=>void }
const MonthBlock: React.FC<MBProps> = ({ year,month,checkIn,checkOut,phase,onDayTap }) => {
  const now=new Date(); now.setHours(0,0,0,0)
  const ci=parseD(checkIn), co=parseD(checkOut)
  const dim=new Date(year,month+1,0).getDate()
  const firstDow=dowMon(new Date(year,month,1))
  const cells:(number|null)[]=[...Array(firstDow).fill(null),...Array.from({length:dim},(_,i)=>i+1)]

  return (
    <View className='cal-month'>
      <Text className='cal-month-title'>{year}年{month+1}月</Text>
      <View className='cal-wk-row'>
        {WDS.map((w,i)=>(<Text key={w} className={`cal-wk${i>=5?' cal-wk-end':''}`}>{w}</Text>))}
      </View>
      <View className='cal-grid'>
        {cells.map((day,idx)=>{
          if(!day) return <View key={idx} className='cal-cell' />
          const d=new Date(year,month,day)
          const past=d<now
          const isCi=d.getTime()===ci.getTime()
          const isCo=d.getTime()===co.getTime()
          const inRange=d>ci&&d<co
          const isEP=isCi||isCo
          const isHol=!!getHoliday(month,day)
          const sub=getLunar(year,month,day)||''
          const isWkend=dowMon(d)>=5
          let wcls='cal-cell'
          if(inRange) wcls+=' inrange'
          if(isCi) wcls+=' rng-start'
          if(isCo) wcls+=' rng-end'
          return (
            <View key={idx} className={wcls}>
              <View className={`cal-day${isEP?' ep':''}${past?' dim':''}`} onClick={()=>!past&&onDayTap(fmtDate(d))}>
                <Text className={`dn${past?' p':isEP?' s':isWkend?' w':''}`}>{day}</Text>
                {sub?<Text className={`ds${isEP?' se':isHol?' sh':''}`}>{sub}</Text>:null}
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
const CalendarSheet: React.FC<CSProps> = ({ visible,checkIn,checkOut,onSelect,onClose }) => {
  const [phase,setPhase]=useState<CalPhase>('done')
  const [tmpCi,setTmpCi]=useState(checkIn)
  const [tmpCo,setTmpCo]=useState(checkOut)
  useEffect(()=>{ if(visible){setTmpCi(checkIn);setTmpCo(checkOut);setPhase('done')} },[visible])

  function handleTap(ds: string) {
    const d=parseD(ds),now=new Date();now.setHours(0,0,0,0)
    if(d<now)return
    if(phase==='done'||phase==='in'){
      const nx=new Date(d);nx.setDate(nx.getDate()+1)
      setTmpCi(ds);setTmpCo(fmtDate(nx));setPhase('out')
    } else {
      if(d>parseD(tmpCi)){setTmpCo(ds);setPhase('done')}
      else{const nx=new Date(d);nx.setDate(nx.getDate()+1);setTmpCi(ds);setTmpCo(fmtDate(nx));setPhase('out')}
    }
  }
  function confirm(){onSelect(tmpCi,tmpCo);onClose()}

  const now=new Date()
  const months=Array.from({length:14},(_,i)=>{
    const d=new Date(now.getFullYear(),now.getMonth()+i,1)
    return {year:d.getFullYear(),month:d.getMonth()}
  })
  const nights=calcNights(tmpCi,tmpCo)
  const tip=phase==='in'?'请选择入住日期':phase==='out'?'请选择退房日期':`${fmtShort(tmpCi)} — ${fmtShort(tmpCo)}`

  if(!visible)return null
  return (
    <View className='bs-mask' onClick={confirm} >
      <View className='bs-sheet bs-sheet-cal' onClick={(e)=>e.stopPropagation()}>
        <View className='bs-handle' />
        <Text className='cal-tip'>{tip}</Text>
        <ScrollView className='cal-scroll' scrollY>
          {months.map(({year,month})=>(
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
interface CPProps { areaType:AreaType; onSelect:(c:string)=>void; onClose:()=>void }
const CityPanel: React.FC<CPProps> = ({ areaType,onSelect,onClose }) => {
  const [search,setSearch]=useState('')
  const [scrollIntoView, setScrollIntoView] = useState('') 
  const cities=areaType==='domestic'?DOMESTIC_CITIES:INTL_CITIES
  const all:string[]=[]; const seen=new Set<string>()
  Object.values(cities).forEach(l=>l.forEach(c=>{if(!seen.has(c)){seen.add(c);all.push(c)}}))
  const filtered=search?all.filter(c=>c.includes(search)):null
  const handleLetterClick = (letter: string) => {
    setScrollIntoView(`cs-${letter}`)
    // 可选：加一点点延时后清除，避免影响后续滚动
    setTimeout(() => setScrollIntoView(''), 200)
  }
  
  return (
     <BottomSheet visible onClose={onClose} height='80vh'>
      <View className='city-hdr'>
        <Text className='city-title'>{areaType==='domestic'?'选择城市':'国际/港澳台'}</Text>
        <View style={{width:'44px'}} />
      </View>
      <View className='city-search'>
        <Text className='city-si'>⌕</Text>
        <Input className='city-inp' placeholder='搜索城市…' value={search} onInput={e=>setSearch(e.detail.value)} />
        {search?<Text className='city-clr' onClick={()=>setSearch('')}>✕</Text>:null}
      </View>
      <View className='city-body'>
        <ScrollView className='city-list' scrollY scrollIntoView={scrollIntoView}>
          {filtered?(
            filtered.length===0?<Text className='city-empty'>未找到城市</Text>
            :filtered.map(c=>(
              <View key={c} className='city-row' onClick={()=>{onSelect(c);onClose()}}>
                <Text className='city-row-name'>{c}</Text>
                <Text className='city-row-arr'>›</Text>
              </View>
            ))
          ):(
            Object.entries(cities).map(([letter,list])=>(
              <View key={letter} id={`cs-${letter}`}>
                <View className='city-sec-hd'><Text>{letter}</Text></View>
                {list.map(c=>(
                  <View key={c} className='city-row' onClick={()=>{onSelect(c);onClose()}}>
                    <Text className='city-row-name'>{c}</Text>
                    <Text className='city-row-arr'>›</Text>
                  </View>
                ))}
              </View>
            ))
          )}
        </ScrollView>
        {!filtered&&(
          <View className='city-idx'>
            {Object.keys(cities).map(l=>(
              <Text key={l} className='city-idx-item' onClick={()=>handleLetterClick(l)}>{l}</Text>
            ))}
          </View>
        )}
      </View>
    </BottomSheet>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
const nowD=new Date();nowD.setHours(0,0,0,0)
const tmrD=new Date(nowD);tmrD.setDate(tmrD.getDate()+1)

const Home: React.FC = () => {
    // ── 从缓存读取数据的辅助函数 ──
  const getCachedState = (key: string, defaultValue: any) => {
    try {
      const cached = Taro.getStorageSync(`home_${key}`)
      return cached !== '' ? cached : defaultValue
    } catch {
      return defaultValue
    }
  }
  
  // ── 从缓存初始化状态，如果缓存有值就用缓存，否则用默认值 ──
  const [areaType, setAreaType] = useState<AreaType>(getCachedState('areaType', 'domestic'))
  const [cityVal, setCityVal] = useState(getCachedState('cityVal', '上海'))
  const [keyword, setKeyword] = useState(getCachedState('keyword', ''))
  const [checkIn, setCheckIn] = useState(getCachedState('checkIn', fmtDate(nowD)))
  const [checkOut, setCheckOut] = useState(getCachedState('checkOut', fmtDate(tmrD)))
  const [rooms, setRooms] = useState(getCachedState('rooms', 1))
  const [adults, setAdults] = useState(getCachedState('adults', 2))
  const [children, setChildren] = useState(getCachedState('children', 0))
  
  // 筛选条件 - 需要特殊处理的对象
  const [selTags, setSelTags] = useState<number[]>(() => {
    const cached = getCachedState('selTags', [])
    return Array.isArray(cached) ? cached : []
  })
  
  const [selStars, setSelStars] = useState<number[]>(() => {
    const cached = getCachedState('selStars', [])
    return Array.isArray(cached) ? cached : []
  })
  
  const [selPrice, setSelPrice] = useState<PriceRange|null>(() => {
    const cached = getCachedState('selPrice', null)
    if (cached && typeof cached === 'string') {
      try {
        return JSON.parse(cached)
      } catch {
        return null
      }
    }
    return null
  })

  // 添加广告数据状态
  const [ads, setAds] = useState<AdBanner[]>([])
  const [loadingAds, setLoadingAds] = useState(true)

  // 获取广告数据
  const fetchAds = async () => {
    try {
      setLoadingAds(true)
      const today = fmtDate(new Date())
      // 调用接口获取当前有效的广告
      const response = await Taro.request({
        url: 'http://localhost:3001/api/ads/active', 
        method: 'GET',
        data: {
          current_date: today
        }
      })
      
      if (response.data && response.data.code === 200) {
        setAds(response.data.data || [])
      } else {
        console.error('获取广告失败', response.data)
      }
    } catch (error) {
      console.error('获取广告失败', error)
    } finally {
      setLoadingAds(false)
    }
  }

  // 页面加载时获取广告
  useEffect(() => {
    fetchAds()
  }, [])

  // 处理广告点击
  const handleAdClick = (ad: AdBanner) => {
    if (ad.hotel_id && ad.hotel_id > 0) {
      // 如果有酒店ID，跳转到酒店详情页
      Taro.navigateTo({
        url: `/pages/hotel/index?hotelId=${ad.hotel_id}&checkIn=${checkIn}&checkOut=${checkOut}&rooms=${rooms}&adults=${adults}&children=${children}`
      })
    } else {
      // 如果没有酒店ID（比如是品牌广告），可以跳转到其他页面或提示
      Taro.showToast({
        title: '广告位，暂无详情',
        icon: 'none'
      })
    }
  }

  // 弹层临时状态（不需要缓存）
  const [tmpStars, setTmpStars] = useState<number[]>([])
  const [tmpPrice, setTmpPrice] = useState<PriceRange|null>(null)

  const [showCity, setShowCity] = useState(false)
  const [showCal, setShowCal] = useState(false)
  const [showGuest, setShowGuest] = useState(false)
  const [showFilter, setShowFilter] = useState(false)
  const [showTagModal, setShowTagModal] = useState(false)

  // ── 缓存所有状态（当状态变化时自动保存） ──
  useEffect(() => {
    // 基础信息
    Taro.setStorageSync('home_areaType', areaType)
    Taro.setStorageSync('home_cityVal', cityVal)
    Taro.setStorageSync('home_keyword', keyword)
    Taro.setStorageSync('home_checkIn', checkIn)
    Taro.setStorageSync('home_checkOut', checkOut)
    Taro.setStorageSync('home_rooms', rooms)
    Taro.setStorageSync('home_adults', adults)
    Taro.setStorageSync('home_children', children)
    
    // 筛选条件
    Taro.setStorageSync('home_selTags', selTags)
    Taro.setStorageSync('home_selStars', selStars)
    Taro.setStorageSync('home_selPrice', selPrice ? JSON.stringify(selPrice) : '')
    
    console.log('状态已缓存', {
      cityVal, checkIn, checkOut, rooms, adults, children,
      selTags, selStars, selPrice
    })
  }, [
    areaType, cityVal, keyword, checkIn, checkOut, 
    rooms, adults, children, selTags, selStars, selPrice
  ])
  function openFilter(){setTmpStars([...selStars]);setTmpPrice(selPrice);setShowFilter(true)}
  function confirmFilter(){setSelStars(tmpStars);setSelPrice(tmpPrice);setShowFilter(false)}

  const nights=calcNights(checkIn,checkOut)
  const toggleTag=useCallback((id:number)=>setSelTags(p=>p.includes(id)?p.filter(x=>x!==id):[...p,id]),[])
  const toggleTmpStar=(v:number)=>setTmpStars(p=>p.includes(v)?p.filter(x=>x!==v):[...p,v])

  const reverseGeocode = async (latitude, longitude) => {
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
        cityName = cityName.slice(0, -1)  // 去掉最后一个字符
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

// 2. 然后再定义定位函数
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

    // 使用Promise包装getCurrentPosition
    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      })
    })

    Taro.hideLoading()
    
    // 获取经纬度
    const { latitude, longitude } = position.coords
    console.log('定位成功：', latitude, longitude)
    
    // 调用逆地理编码API获取城市信息
    const cityName = await reverseGeocode(latitude, longitude)
    
    setCityVal(cityName)
    Taro.showToast({ 
      title: '定位成功', 
      icon: 'success',
      duration: 1500
    })

  } catch (error) {
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
  const filterLabel=(()=>{const p: string[]=[];if(selPrice)p.push(selPrice.label);if(selStars.length)p.push(selStars.map(s=>`${s}★`).join('/'));return p.join(' · ')||'价格/星级'})()
  const filterActive=!!(selPrice||selStars.length)
  const previewTags=[FACILITY_TAGS[0],FACILITY_TAGS[2],FACILITY_TAGS[3],SPECIAL_TAGS[0],SPECIAL_TAGS[2]]

  return (
    <View className='home-root'>

      {/* 广告轮播 */}
      <Swiper className='ad-swiper' autoplay circular interval={3500}indicatorDots indicatorActiveColor='#1a6cf5' indicatorColor='rgba(255,255,255,0.4)'>
      {ads.length > 0 ? (
        ads.map(ad => (
          <SwiperItem key={ad.ad_id}>
            <View 
              className='ad-item' 
              style={{ 
                background: ad.image_url ? `url(${ad.image_url}) center/cover` : '#cfe0ff',
                cursor: ad.hotel_id ? 'pointer' : 'default'
              }}
              onClick={() => handleAdClick(ad)}
            >
              {!ad.image_url && (
                <Text className='ad-txt'>广告位 {ad.ad_id}</Text>
              )}
            </View>
          </SwiperItem>
        ))
      ) : (
        // 加载中或没有广告时显示默认广告
        [1, 2, 3].map(i => (
          <SwiperItem key={i}>
            <View className='ad-item' style={{background: '#cfe0ff'}}>
              <Text className='ad-txt'>广告位 {i}</Text>
            </View>
          </SwiperItem>
        ))
      )}
    </Swiper>

      {/* 搜索卡片 */}
      <View className='card'>

        {/* 区域 tabs */}
        <View className='area-tabs'>
          {(['domestic','international'] as AreaType[]).map(v=>(
            <View key={v} className={`area-tab${areaType===v?' area-tab-on':''}`} onClick={()=>setAreaType(v)}>
              <Text className='area-tab-txt'>{v==='domestic'?'国内':'国际/港澳台'}</Text>
            </View>
          ))}
        </View>

        {/* 城市 + 关键词 + 定位 */}
        <View className='loc-row'>
          <View className='city-btn' onClick={()=>setShowCity(true)}>
            <Text className='city-val'>{cityVal}</Text>
            <Text className='chev'>▾</Text>
          </View>
          <View className='loc-sep' />
          <View className='kw-area'>
            <Text className='kw-ic'>⌕</Text>
            <Input className='kw-inp' placeholder='搜索酒店、商圈、地标…' value={keyword} onInput={e=>setKeyword(e.detail.value)} />
          </View>
          <View className='locate-btn' onClick={handleLocate}>
            <Text className='locate-ic'>◎</Text>
          </View>
        </View>

        {/* 日期行 */}
        <View className='date-row' onClick={()=>setShowCal(true)}>
          <Text className='date-val'>{fmtShort(checkIn)}</Text>
          <View className='date-mid'>
            <Text className='date-nights'>{nights}晚</Text>
          </View>
          <Text className='date-val'>{fmtShort(checkOut)}</Text>
        </View>

        {/* 筛选行 */}
        <View className='filter-row'>
          <View className='fchip' onClick={()=>setShowGuest(true)}>
            <Text className='fchip-txt'>{rooms}间 · {adults}成人 · {children}儿童</Text>
            <Text className='fchip-arr'>▾</Text>
          </View>
          <View className={`fchip${filterActive?' fchip-on':''}`} onClick={openFilter}>
            <Text className={`fchip-txt${filterActive?' fchip-txt-on':''}`}>{filterLabel}</Text>
            <Text className='fchip-arr'>▾</Text>
          </View>
        </View>

        {/* 标签横滑 */}
        <ScrollView className='tag-scroll' scrollX enableFlex>
          <View className='tag-row'>
            {previewTags.map(tag=>(
              <View key={tag.id} className={`tag-chip${selTags.includes(tag.id)?' tag-on':''}`} onClick={()=>toggleTag(tag.id)}>
                <Text className='tag-txt'>{tag.name}</Text>
              </View>
            ))}
            <View className='tag-more' onClick={()=>setShowTagModal(true)}>
              <Text className='tag-more-txt'>全部 ›</Text>
            </View>
          </View>
        </ScrollView>

        {/* 搜索按钮 */}
        <View className='search-btn' onClick={() => {
            const query = [
              `city=${encodeURIComponent(cityVal)}`,
              `keyword=${encodeURIComponent(keyword)}`,
              `checkIn=${checkIn}`,
              `checkOut=${checkOut}`,
              `rooms=${rooms}`,
              `adults=${adults}`,
              `children=${children}`,
              // 价格区间：传 min 和 max
              selPrice ? `minPrice=${selPrice.min}&maxPrice=${selPrice.max}` : '',
              // 星级：逗号分隔，如 "4,5"
              selStars.length ? `starRating=${selStars.join(',')}` : '',
              // 标签：逗号分隔，如 "1,3,10"
              selTags.length  ? `tagIds=${selTags.join(',')}` : '',
            ].filter(Boolean).join('&')

            Taro.navigateTo({ url: `/pages/list/index?${query}` })
          }}
        >
          <Text className='search-btn-txt'>查 询</Text>
        </View>
      </View>

      {/* ── 底部弹层 ── */}

      {/* 日历 */}
      <CalendarSheet visible={showCal} checkIn={checkIn} checkOut={checkOut}
        onSelect={(ci,co)=>{setCheckIn(ci);setCheckOut(co)}} onClose={()=>setShowCal(false)} 
      />

      {/* 入住人数 */}
      <BottomSheet visible={showGuest} onClose={()=>setShowGuest(false)} height='28vh'>
        <Text className='bs-title'>入住信息</Text>
        <View className='guest-list'>
          {([['房间数',rooms,setRooms,1],['成人',adults,setAdults,1],['儿童',children,setChildren,0]] as [string,number,React.Dispatch<React.SetStateAction<number>>,number][]).map(([lbl,val,set,min])=>(
            <View key={lbl} className='guest-row'>
              <View className='guest-lbl-col'>
                <Text className='guest-lbl'>{lbl}</Text>
                {lbl==='儿童'?<Text className='guest-sub'>17岁及以下</Text>:null}
              </View>
              <View className='guest-ctrl'>
                <View className={`step-btn${val<=min?' step-dis':''}`} onClick={()=>set(Math.max(min,val-1))}>
                  <Text className='step-ic'>−</Text>
                </View>
                <Text className='step-val'>{val}</Text>
                <View className='step-btn' onClick={()=>set(val+1)}>
                  <Text className='step-ic'>＋</Text>
                </View>
              </View>
            </View>
          ))}
        </View>
        <View className='bs-done-single' onClick={()=>setShowGuest(false)}>
          <Text className='bs-done-txt'>完成</Text>
        </View>
      </BottomSheet>

      {/* 价格 + 星级 */}
      <BottomSheet visible={showFilter} onClose={confirmFilter} height='45vh'>
        <Text className='bs-title'>价格 · 星级</Text>
        <ScrollView className='filter-scroll' scrollY>
          <Text className='filter-sec-title'>价格区间</Text>
          <View className='price-grid'>
            {PRICE_RANGES.map(r=>(
              <View key={r.label} className={`price-btn${tmpPrice?.label===r.label?' price-on':''}`}
                onClick={()=>setTmpPrice(tmpPrice?.label===r.label?null:r)}
              >
                <Text className='price-txt'>{r.label}</Text>
              </View>
            ))}
          </View>
          <Text className='filter-sec-title filter-sec-gap'>星级</Text>
          <View className='star-grid'>
            {STAR_OPTIONS.map(opt=>(
              <View key={opt.value} className={`star-chip${tmpStars.includes(opt.value)?' star-on':''}`}
                onClick={()=>toggleTmpStar(opt.value)}
              >
                <Text className='star-stars'>{'★'.repeat(opt.value)}</Text>
                <Text className='star-lbl'>{opt.label}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
        <View className='bs-footer'>
          <View className='bs-clear' onClick={()=>{setTmpStars([]);setTmpPrice(null)}}>
            <Text className='bs-clear-txt'>清空</Text>
          </View>
          <View className='bs-done-flex' onClick={confirmFilter}>
            <Text className='bs-done-txt'>完成</Text>
          </View>
        </View>
      </BottomSheet>

      {/* 标签 */}
      <BottomSheet visible={showTagModal} onClose={()=>setShowTagModal(false)} height='35vh'>
        <Text className='bs-title'>筛选标签</Text>
        <ScrollView className='filter-scroll' scrollY>
          {([['设施',FACILITY_TAGS],['特色',SPECIAL_TAGS]] as [string,Tag[]][]).map(([lbl,list])=>(
            <View key={lbl} className='tag-sec'>
              <Text className='filter-sec-title'>{lbl}</Text>
              <View className='tag-chip-grid'>
                {list.map(tag=>(
                  <View key={tag.id} className={`modal-chip${selTags.includes(tag.id)?' modal-chip-on':''}`} onClick={()=>toggleTag(tag.id)}>
                    <Text className='modal-chip-txt'>{tag.name}</Text>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </ScrollView>
        <View className='bs-footer'>
          <View className='bs-clear' onClick={()=>setSelTags([])}>
            <Text className='bs-clear-txt'>清空</Text>
          </View>
          <View className='bs-done-flex' onClick={()=>setShowTagModal(false)}>
            <Text className='bs-done-txt'>完成{selTags.length>0?`（${selTags.length}）`:''}</Text>
          </View>
        </View>
      </BottomSheet>

      {/* 城市全屏 */}
      {showCity&&<CityPanel areaType={areaType} onSelect={setCityVal} onClose={()=>setShowCity(false)} />}
    </View>
  )
}
export default Home
export type { AreaType }