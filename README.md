# 易宿酒店管理系统 (Yisu Hotel)
## 📋 项目简介
易宿酒店管理系统是一个全栈酒店预订管理平台，包含用户端、商户端和管理员端。
## 🏗️ 项目结构
      yisu-hotel/
      ├── yisu-admin/ # 管理后台 (React + Ant Design)
      ├── yisu-mobile/ # 移动端 (React)
      └── yisu-server/ # 后端服务 (Express + TypeScript)
后端端口：3000   前端端口：5173  数据库：公网数据库（地址+密钥配置见.env文件）
## ✨ 功能特性
### 👤 普通用户
- 浏览酒店
- 预订房间
- 个人中心
### 🏪 商户
- 商户注册
- 资质上传（营业执照）
- 酒店管理
- 订单管理
### 👑 管理员
- 商户资质审核
- 邀请码管理
- 平台运营管理
## 🛠️ 技术栈
### 后端 (yisu-server)
- Node.js + Express
- TypeScript
- MySQL
- JWT 认证
- Bcrypt 加密
### 管理后台 (yisu-admin)
- React 18
- Ant Design 5
- TypeScript
- Vite
### 移动端 (yisu-mobile)
- React 18
- TypeScript
- Vite
## 🚀 快速开始
  管理后台启动
    cd yisu-admin
    npm install
    npm run dev
  移动端启动
    cd yisu-mobile
    npm install
    npm run dev
⭐ 项目状态
 ✅ 已完成：
用户认证系统（用户/商户/管理员的登录+注册）；商户注册与资质上传；新商户入住的管理员审核
邀请码系统；数据库设计
🚧 进行中：
酒店管理功能；预订系统；审核管理后台
📅 规划中：
支付接口；数据分析；财务报表等
