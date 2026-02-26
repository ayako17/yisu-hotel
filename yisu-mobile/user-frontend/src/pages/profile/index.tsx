import { useState, useEffect } from 'react'
import { View, Text, Image, ScrollView, Input } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import './index.scss'
import request from '../../utils/request'

// ─── 类型定义 ──────────────────────────────────────────────────────────────────

interface UserInfo {
  user_id: number
  phone: string
  username: string
  avatar_url: string | null
  role: 'user' | 'merchant' | string
  status: 'active' | 'suspended' | string
  created_at: string
  updated_at: string
}

interface FavoriteHotel {
  favorite_id: number
  hotel_id: number
  name_zh: string
  hotel_name?: string
  star_rating: number
  city: string
  address: string
  hotel_image: string
  estimatedPrice?: number
  created_at: string
}

// ─── 日期工具 ──────────────────────────────────────────────────────────────────

function fmtDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// ─── 主页面 ────────────────────────────────────────────────────────────────────

const Profile: React.FC = () => {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null)
  const [favorites, setFavorites] = useState<FavoriteHotel[]>([])
  const [loading, setLoading] = useState(true)
  const [favLoading, setFavLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'favorites' | 'info'>('favorites')

  // 编辑状态
  const [editing, setEditing] = useState(false)
  const [editUsername, setEditUsername] = useState('')
  const [saving, setSaving] = useState(false)
  const [avatarUploading, setAvatarUploading] = useState(false)

  // 收藏页日期
  const [checkIn] = useState(() => fmtDate(new Date()))
  const [checkOut] = useState(() => fmtDate(new Date(Date.now() + 86400000)))

  // ── 获取用户信息 ──
  const fetchUserInfo = async () => {
    setLoading(true)
    try {
      const res = await request<any>('/user/profile', { method: 'GET' })
      if (res?.code === 200) {
        setUserInfo(res.data)
        setEditUsername(res.data.username || '')
      }
    } catch (e) {
      console.error('获取用户信息失败', e)
    } finally {
      setLoading(false)
    }
  }

  // ── 获取收藏列表 ──
  const fetchFavorites = async () => {
    setFavLoading(true)
    try {
      const res = await request<any>(`/favorites?checkIn=${checkIn}&checkOut=${checkOut}`, { method: 'GET' })
      if (res?.code === 200) setFavorites(res.data || [])
    } catch (e) {
      console.error('获取收藏失败', e)
    } finally {
      setFavLoading(false)
    }
  }

  useDidShow(() => {
    fetchUserInfo()
    fetchFavorites()
  })

  useEffect(() => {
    fetchUserInfo()
    fetchFavorites()
  }, [])

  // ── 保存用户名 ──
  const handleSave = async () => {
    if (!editUsername.trim()) {
      Taro.showToast({ title: '用户名不能为空', icon: 'none' })
      return
    }
    setSaving(true)
    try {
      const res = await request<any>('/user/profile', {
        method: 'PUT',
        data: { username: editUsername.trim() }
      })
      if (res?.code === 200) {
        setUserInfo(prev => prev ? { ...prev, username: editUsername.trim() } : prev)
        setEditing(false)
        Taro.showToast({ title: '保存成功', icon: 'success' })
      } else {
        Taro.showToast({ title: res?.message || '保存失败', icon: 'none' })
      }
    } catch {
      Taro.showToast({ title: '网络错误', icon: 'none' })
    } finally {
      setSaving(false)
    }
  }

// ── 上传头像 ──
const handleAvatarUpload = async () => {
  // try {
  //   // 1. 选择图片
  //   const chooseRes = await Taro.chooseImage({
  //     count: 1,
  //     sizeType: ['compressed'],
  //     sourceType: ['album', 'camera']
  //   })

  //   const filePath = chooseRes.tempFilePaths[0]
  //   setAvatarUploading(true)

  //   // 2. 向后端获取 OSS 上传凭证
  //   const signRes = await request<any>('/user/avatar/sign', { method: 'GET' })
  //   if (signRes?.code !== 200) {
  //     Taro.showToast({ title: '获取上传凭证失败', icon: 'none' })
  //     return
  //   }

  //   const { uploadUrl, finalUrl } = signRes.data

  //   // 3. ✅ 修复：使用 Taro.downloadFile 或 Taro.request 而不是 fetch
  //   // 方案 A：使用 Taro 的下载+上传 API（推荐）
  //   const uploadTask = Taro.uploadFile({
  //     url: uploadUrl,
  //     filePath: filePath,
  //     name: 'file',
  //     method: 'PUT',  // 明确指定 PUT 方法
  //     success: (uploadRes) => {
  //       if (uploadRes.statusCode === 200) {
  //         // 4. 通知后端更新 avatar_url
  //         request('/user/avatar', {
  //           method: 'PUT',
  //           data: { avatar_url: finalUrl }
  //         }).then(updateRes => {
  //           if (updateRes?.code === 200) {
  //             setUserInfo(prev => prev ? { ...prev, avatar_url: finalUrl } : prev)
  //             Taro.showToast({ title: '头像更新成功', icon: 'success' })
  //           }
  //         })
  //       } else {
  //         throw new Error(`上传失败: ${uploadRes.statusCode}`)
  //       }
  //     },
  //     fail: (err) => {
  //       console.error('上传失败', err)
  //       Taro.showToast({ title: '上传失败', icon: 'none' })
  //     },
  //     complete: () => {
  //       setAvatarUploading(false)
  //     }
  //   })

  //   // 可选：添加上传进度监听
  //   uploadTask.progress((res) => {
  //     console.log('上传进度', res.progress)
  //   })

  // } catch (e: any) {
  //   if (e?.errMsg?.includes('cancel')) return
  //   console.error('头像上传失败', e)
  //   Taro.showToast({ title: '上传失败，请重试', icon: 'none' })
  //   setAvatarUploading(false)
  // }
}

  // ── 取消收藏 ──
  const handleUnfavorite = async (hotelId: number, e: any) => {
    e.stopPropagation()
    try {
      await request<any>(`/favorites/${hotelId}`, { method: 'DELETE' })
      setFavorites(prev => prev.filter(f => f.hotel_id !== hotelId))
      Taro.showToast({ title: '已取消收藏', icon: 'success' })
    } catch {
      Taro.showToast({ title: '操作失败', icon: 'none' })
    }
  }

  // ── 跳转酒店详情 ──
  const goToHotel = (item: FavoriteHotel) => {
    Taro.navigateTo({
      url: `/pages/hotel/index?hotelId=${item.hotel_id}&checkIn=${checkIn}&checkOut=${checkOut}`
    })
  }

  // ── 退出登录 ──
  const handleLogout = () => {
    Taro.showModal({
      title: '提示',
      content: '确定要退出登录吗？',
      success: res => {
        if (res.confirm) {
          Taro.removeStorageSync('token')
          Taro.reLaunch({ url: '/pages/login/index' })
        }
      }
    })
  }

  // ── 角色显示文案 ──
  const roleLabel = (role: string) => {
    if (role === 'merchant') return '商家'
    return '普通用户'
  }

  // ── 手机号脱敏 ──
  const maskPhone = (phone: string) => {
    if (!phone || phone.length < 7) return phone
    return phone.slice(0, 3) + '****' + phone.slice(-4)
  }

  // ── 渲染星级 ──
  const renderStars = (rating: number) => (
    <Text className='hotel-stars'>{'★'.repeat(Math.min(5, rating || 0))}</Text>
  )

  return (
    <View className='profile'>

      {/* ── 顶部头像区 ── */}
      <View className='profile-header'>
        <View className='header-bg' />
        <View className='user-info-row'>
          {/* 头像 */}
          <View className='avatar-wrap' onClick={handleAvatarUpload}>
            <Image 
              className='avatar-img' 
              src='https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&h=200&fit=crop' 
              mode='aspectFill' 
            />
            {avatarUploading
              ? <View className='avatar-uploading'><Text className='avatar-uploading-txt'>上传中</Text></View>
              : <View className='avatar-edit-badge'><Text className='avatar-edit-ic'>✎</Text></View>
            }
          </View>

          {/* 名字 + 手机 */}
          <View className='user-meta'>
            {loading
              ? <View className='sk-name' />
              : <Text className='user-name'>{userInfo?.username || '未设置昵称'}</Text>
            }
            <Text className='user-phone'>
              {userInfo ? maskPhone(userInfo.phone) : '加载中…'}
            </Text>
            {userInfo && (
              <View className={`user-role-badge${userInfo.role === 'merchant' ? ' merchant' : ''}`}>
                <Text className='user-role-txt'>{roleLabel(userInfo.role)}</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* ── 统计卡片 ── */}
      <View className='stats-row'>
        <View className='stat-card'>
          <Text className='stat-num'>{favorites.length}</Text>
          <Text className='stat-lbl'>收藏</Text>
        </View>
        <View className='stat-divider' />
        <View className='stat-card' onClick={() => setActiveTab('info')}>
          <Text className='stat-num'>
            {userInfo ? new Date(userInfo.created_at).getFullYear() : '—'}
          </Text>
          <Text className='stat-lbl'>加入年份</Text>
        </View>
        <View className='stat-divider' />
        <View className='stat-card'>
          <Text className='stat-num'>
            {userInfo?.status === 'active' ? '✓' : '⚠'}
          </Text>
          <Text className='stat-lbl'>账号状态</Text>
        </View>
      </View>

      {/* ── 标签切换 ── */}
      <View className='profile-tabs'>
        <View
          className={`tab-item${activeTab === 'favorites' ? ' active' : ''}`}
          onClick={() => setActiveTab('favorites')}
        >
          <Text className='tab-text'>我的收藏</Text>
          {favorites.length > 0 && <Text className='tab-badge'>{favorites.length}</Text>}
        </View>
        <View
          className={`tab-item${activeTab === 'info' ? ' active' : ''}`}
          onClick={() => setActiveTab('info')}
        >
          <Text className='tab-text'>个人信息</Text>
        </View>
      </View>

      {/* ── 内容区 ── */}
      <ScrollView className='profile-content' scrollY>

        {/* 收藏列表 */}
        {activeTab === 'favorites' && (
          <View className='favorites-wrap'>
            {favLoading ? (
              [1, 2, 3].map(i => (
                <View key={i} className='sk-card'>
                  <View className='sk-img' />
                  <View className='sk-body'>
                    <View className='sk-line lg' />
                    <View className='sk-line md' />
                    <View className='sk-line sm' />
                  </View>
                </View>
              ))
            ) : favorites.length === 0 ? (
              <View className='empty-wrap'>
                <Text className='empty-ic'>🏨</Text>
                <Text className='empty-title'>暂无收藏酒店</Text>
                <Text className='empty-sub'>去发现心仪的酒店吧～</Text>
                <View className='empty-btn' onClick={() => Taro.switchTab({ url: '/pages/home/index' })}>
                  <Text className='empty-btn-txt'>去首页</Text>
                </View>
              </View>
            ) : (
              favorites.map(item => (
                <View key={item.favorite_id} className='fav-card' onClick={() => goToHotel(item)}>
                  <View className='fav-img-wrap'>
                    <Image className='fav-img' src={item.hotel_image || ''} mode='aspectFill' lazyLoad />
                    {item.star_rating >= 4 && (
                      <View className='fav-star-badge'>
                        <Text className='fav-star-badge-txt'>{item.star_rating}星</Text>
                      </View>
                    )}
                    <View className='fav-heart-btn' onClick={e => handleUnfavorite(item.hotel_id, e)}>
                      <Text className='fav-heart-ic'>❤️</Text>
                    </View>
                  </View>
                  <View className='fav-info'>
                    <Text className='fav-name'>{item.hotel_name || item.name_zh}</Text>
                    <View className='fav-star-row'>
                      {renderStars(item.star_rating)}
                      <Text className='fav-city'>· {item.city}</Text>
                    </View>
                    <Text className='fav-addr' numberOfLines={1}>{item.address}</Text>
                    <View className='fav-footer'>
                      <View className='fav-price'>
                        <Text className='fav-price-sym'>¥</Text>
                        <Text className='fav-price-val'>{item.estimatedPrice || 0}</Text>
                        <Text className='fav-price-unit'>/晚起</Text>
                      </View>
                      <View className='fav-book-btn'>
                        <Text className='fav-book-txt'>立即预订</Text>
                      </View>
                    </View>
                    <Text className='fav-time'>收藏于 {new Date(item.created_at).toLocaleDateString()}</Text>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* 个人信息 */}
        {activeTab === 'info' && (
          <View className='info-wrap'>
            {/* 编辑/保存 按钮 */}
            <View className='info-card'>
              <View className='info-card-header'>
                <Text className='info-card-title'>基本信息</Text>
                {!editing
                  ? (
                    <View className='edit-btn' onClick={() => { setEditing(true); setEditUsername(userInfo?.username || '') }}>
                      <Text className='edit-btn-txt'>编辑</Text>
                    </View>
                  ) : (
                    <View className='edit-actions'>
                      <View className='cancel-btn' onClick={() => setEditing(false)}>
                        <Text className='cancel-btn-txt'>取消</Text>
                      </View>
                      <View className={`save-btn${saving ? ' saving' : ''}`} onClick={!saving ? handleSave : undefined}>
                        <Text className='save-btn-txt'>{saving ? '保存中…' : '保存'}</Text>
                      </View>
                    </View>
                  )
                }
              </View>

              {/* 用户名 */}
              <View className='info-row'>
                <Text className='info-label'>昵称</Text>
                {editing
                  ? (
                    <Input
                      className='info-input'
                      value={editUsername}
                      onInput={e => setEditUsername(e.detail.value)}
                      placeholder='请输入昵称'
                      maxlength={50}
                    />
                  ) : (
                    <Text className='info-value'>{userInfo?.username || '未设置'}</Text>
                  )
                }
              </View>

              {/* 手机号（只读，脱敏展示） */}
              <View className='info-row'>
                <Text className='info-label'>手机号</Text>
                <Text className='info-value'>{userInfo ? maskPhone(userInfo.phone) : '—'}</Text>
              </View>

              {/* 角色 */}
              <View className='info-row'>
                <Text className='info-label'>账号类型</Text>
                <Text className='info-value'>{userInfo ? roleLabel(userInfo.role) : '—'}</Text>
              </View>

              {/* 状态 */}
              <View className='info-row'>
                <Text className='info-label'>账号状态</Text>
                <View className={`status-dot${userInfo?.status === 'active' ? ' active' : ' suspended'}`} />
                <Text className={`info-value status-val${userInfo?.status === 'active' ? '' : ' bad'}`}>
                  {userInfo?.status === 'active' ? '正常' : '已封禁'}
                </Text>
              </View>

              {/* 注册时间 */}
              <View className='info-row'>
                <Text className='info-label'>注册时间</Text>
                <Text className='info-value'>
                  {userInfo ? new Date(userInfo.created_at).toLocaleDateString() : '—'}
                </Text>
              </View>

              {/* 收藏数量 */}
              <View className='info-row'>
                <Text className='info-label'>收藏酒店</Text>
                <Text className='info-value'>{favorites.length} 家</Text>
              </View>
            </View>

            {/* 退出登录 */}
            <View className='logout-btn' onClick={handleLogout}>
              <Text className='logout-txt'>退出登录</Text>
            </View>
          </View>
        )}

      </ScrollView>
    </View>
  )
}

export default Profile