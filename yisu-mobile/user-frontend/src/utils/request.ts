import Taro from '@tarojs/taro'

const BASE_URL = 'http://localhost:3001/api'

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  data?: any
  header?: any
}

// 获取存储的 token
const getToken = (): string | null => {
  return Taro.getStorageSync('token') || null
}

// 退出登录
const logout = () => {
  Taro.removeStorageSync('token')
  Taro.removeStorageSync('user')
  Taro.showToast({ title: '已退出登录', icon: 'none' })
}

const request = <T>(url: string, options: RequestOptions = {}): Promise<T> => {
  const token = getToken()
  
  //Promise 是 JavaScript 处理异步操作的方式，可以理解为：
  //resolve：成功了就调用这个（把数据传出去）
  //reject：失败了就调用这个（把错误传出去）
  return new Promise((resolve, reject) => {
    Taro.request({
      url: BASE_URL + url,
      method: options.method || 'GET',
      data: options.data,
      header: {
        'content-type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...options.header
      },
      success: (res) => {
        // 处理 token 过期
        if (res.statusCode === 401) {
          Taro.showToast({ title: '登录已过期', icon: 'none' })
          logout()
          // 跳转到登录页
          setTimeout(() => {
            Taro.navigateTo({ url: '/pages/login/index' })
          }, 1500)
          reject(res.data)
          return
        }
        //成功了，把数据传出去
        resolve(res.data as T)
      },
      fail: (err) => {
        console.error('请求失败:', err)
        Taro.showToast({
          title: '网络错误',
          icon: 'none'
        })
        reject(err)
      }
    })
  })
}

export default request
export { getToken, logout }