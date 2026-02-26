import { Component } from 'react'
import { View, Text, Input, Button } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { LoginResponse} from '../../../types/user'
import request from '../../utils/request'
import './index.scss'

interface LoginState {
  isLogin: boolean      // true:登录页 false:注册页
  phone: string
  password: string
  confirmPassword: string
  username: string      // 对应表里的 username
  loading: boolean
}

//定义一个组件，继承自 Component，泛型参数为 props 和 state，这里 props 为空对象，state 类型为 LoginState
export default class Login extends Component<{}, LoginState> {
  state: LoginState = {
    isLogin: true,
    phone: '',
    password: '',
    confirmPassword: '',
    username: '',
    loading: false
  }

  // 切换登录/注册，清空表单
  toggleMode = () => {
    this.setState({
      isLogin: !this.state.isLogin,
      phone: '',
      password: '',
      confirmPassword: '',
      username: ''
    })
  }

  // 处理登录
  handleLogin = async () => {
    const { phone, password } = this.state

    if (!phone || !password) {
      Taro.showToast({ title: '请填写手机号和密码', icon: 'none' })
      return
    }

    if (!/^1[3-9]\d{9}$/.test(phone)) {
      Taro.showToast({ title: '手机号格式不正确', icon: 'none' })
      return
    }

    this.setState({ loading: true })

    try {
      const res = await request<LoginResponse>('/auth/login', {
        method: 'POST',
        data: { phone, password }
      })

      if (res.success) {
        // 保存 token 和用户信息
        //setStorageSync是 Taro 提供的一个方法用于在本地存储数据。
        // 它接受两个参数：第一个是键（key），第二个是值（value）。
        // 在这里，我们将登录成功后返回的 token 和用户信息存储在本地，以便后续请求时使用。
        Taro.setStorageSync('token', res.data.token)
        Taro.setStorageSync('user', res.data.user)
        
        Taro.showToast({ title: '登录成功', icon: 'success' })
        
        // 返回上一页或跳转到首页
        setTimeout(() => {
          Taro.switchTab({
            url: '/pages/home/index'
    })
        }, 1500)
      }
    } catch (error: any) {
      Taro.showToast({ 
        title: error?.error || '登录失败', 
        icon: 'none' 
      })
    } finally {
      this.setState({ loading: false })
    }
  }

  // 处理注册
  handleRegister = async () => {
    //这个语法是解构赋值，从 this.state 中提取 phone、password、confirmPassword 和 username 这几个属性，并将它们赋值给同名的变量。
    const { phone, password, confirmPassword, username } = this.state

    if (!phone || !password) {
      Taro.showToast({ title: '请填写手机号和密码', icon: 'none' })
      return
    }

    if (!/^1[3-9]\d{9}$/.test(phone)) {
      Taro.showToast({ title: '手机号格式不正确', icon: 'none' })
      return
    }

    if (password.length < 6) {
      Taro.showToast({ title: '密码至少6位', icon: 'none' })
      return
    }

    if (password !== confirmPassword) {
      Taro.showToast({ title: '两次密码不一致', icon: 'none' })
      return
    }

    this.setState({ loading: true })

    try {
      const res = await request<{success: boolean, message: string}>('/auth/register', {
        method: 'POST',
        data: { 
          phone, 
          password, 
          username: username || undefined // 没填就传 undefined，后端会用手机号
        }
      })

      if (res.success) {
        Taro.showToast({ title: '注册成功，请登录', icon: 'success' })
        // 切换到登录页
        this.setState({ 
          isLogin: true, 
          password: '', 
          confirmPassword: '',
          username: ''
        })
      }
    } catch (error: any) {
      Taro.showToast({ 
        title: error?.error || '注册失败', 
        icon: 'none' 
      })
    } finally {
      this.setState({ loading: false })
    }
  }

  //render 方法是 React 组件中必须实现的方法，用于描述组件的 UI 结构。
  // 它返回一个 JSX 元素，表示组件应该渲染什么内容。
  // 在这个方法中，我们根据组件的状态（如是否登录）来决定显示登录表单、注册表单或已登录状态。
  render() {
    const { isLogin, phone, password, confirmPassword, username, loading } = this.state

    return (
      <View className='login-page'>
        <View className='header'>
          <Text className='title'>{isLogin ? '欢迎登录' : '注册账号'}</Text>
          <Text className='subtitle'>易宿酒店预订</Text>
        </View>

        <View className='form'>
          <View className='input-group'>
            <Text className='label'>手机号</Text>
            <Input
              className='input'
              type='number'
              placeholder='请输入手机号'
              value={phone}
              onInput={e => this.setState({ phone: e.detail.value })}
              maxlength={11}
            />
          </View>

          <View className='input-group'>
            <Text className='label'>密码</Text>
            <Input
              className='input'
              type='text'
              placeholder='请输入密码'
              value={password}
              onInput={e => this.setState({ password: e.detail.value })}
            />
          </View>

          {!isLogin && (
            <>
              <View className='input-group'>
                <Text className='label'>确认密码</Text>
                <Input
                  className='input'
                  type='text'
                  placeholder='请再次输入密码'
                  value={confirmPassword}
                  onInput={e => this.setState({ confirmPassword: e.detail.value })}
                />
              </View>

              <View className='input-group'>
                <Text className='label'>昵称</Text>
                <Input
                  className='input'
                  placeholder='请输入昵称（选填）'
                  value={username}
                  onInput={e => this.setState({ username: e.detail.value })}
                />
                <Text className='tip'>不填则默认使用手机号</Text>
              </View>
            </>
          )}

          <Button 
            className='submit-btn' 
            type='primary' 
            onClick={isLogin ? this.handleLogin : this.handleRegister}
            loading={loading}
            disabled={loading}
          >
            {isLogin ? '登录' : '注册'}
          </Button>

          <View className='switch' onClick={this.toggleMode}>
            <Text>{isLogin ? '还没有账号？立即注册' : '已有账号？去登录'}</Text>
          </View>
        </View>
      </View>
    )
  }
}