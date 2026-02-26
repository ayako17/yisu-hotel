// config/dev.ts
import type { UserConfigExport } from '@tarojs/cli'

export default {
  env: {
    NODE_ENV: '"development"'
  },
  defineConstants: {
  },
  mini: {},
  h5: {
    devServer: {
      https: {
        key: './172.20.10.5+2-key.pem',  // 私钥文件路径
        cert: './172.20.10.5+2.pem'       // 证书文件路径
      },
      host: '0.0.0.0',     // 监听所有网络接口
      port: 10086,          // 保持你原来的端口
      open: true,          // 自动打开浏览器
      hot: true,            // 热更新
      allowedHosts: 'all'   // 允许所有host访问
    }
  }
} as UserConfigExport