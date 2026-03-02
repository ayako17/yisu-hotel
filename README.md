🏨 易宿酒店管理平台
📋 项目简介
易宿是一个完整的酒店管理平台，包含管理后台、商户端和用户移动端。平台支持酒店管理、房间管理、订单处理、广告投放、佣金结算等核心业务功能。
✨ 主要功能
      多角色权限系统：超级管理员、管理员、商户、用户
      酒店管理：酒店信息管理、房型管理、房价日历
      订单管理：预订、支付、入住、退房完整流程
      商户认证：资质上传、审核流程
      广告系统：广告位申请、审核、投放
      佣金结算：平台佣金比例配置、自动结算
      数据统计：平台运营数据可视化

🛠️ 技术栈
前端（管理+商户）
      框架：React 18 + TypeScript
      UI 组件库：Ant Design 5.x
      状态管理：React Hooks + Context
      路由：React Router v6
      HTTP 请求：Axios
      构建工具：Vite
      日期处理：Day.js

移动端（H5）
      框架：Taro 4.x + React
      多端适配：支持微信小程序、H5
      后端
      运行环境：Node.js
      框架：Express
      数据库：MySQL
      ORM：无（原生 SQL）
      认证：JWT

📁 项目结构
text
yisu-hotel/
├── yisu-dashboard/          # 管理后台前端（商户+管理员）
│   ├── src/
│   │   ├── pages/          # 页面组件
│   │   │   ├── admin/      # 管理员页面
│   │   │   ├── merchant/   # 商户页面
│   │   │   └── login/      # 登录注册
│   │   ├── layouts/        # 布局组件
│   │   ├── services/       # API 服务
│   │   └── utils/          # 工具函数
│   └── package.json
│
├── yisu-server/             # 主后端（商户+管理员API）
│   ├── src/
│   │   ├── controllers/    # 控制器
│   │   ├── routes/         # 路由
│   │   ├── middleware/     # 中间件
│   │   └── config/         # 配置
│   └── package.json
│
├── yisu-mobile/             # 移动端
│   ├── user-frontend/      # H5 前端
│   └── user-backend/       # 移动端后端
│
└── database/                # SQL 文件
🚀 快速开始
环境要求
      Node.js 18+
      MySQL 5.7+
      Nginx（生产环境）

# 主后端
      cd yisu-server
      cp .env.example .env
      # 修改 .env 中的数据库配置
      npm install
      npm run dev

# 移动端后端
      # 管理后台
      cd yisu-dashboard
      cp .env.example .env
      # 修改 .env 中的 API 地址
      npm install
      npm run dev

# 移动端 H5
      cd ../yisu-mobile/user-frontend
      cp .env.example .env
      npm install
      npm run dev:h5
🌐 部署指南
使用 PM2 管理进程
bash
# 安装 PM2
npm install -g pm2
# 启动服务
cd /var/www/yisu-hotel
# 启动主后端
cd yisu-server && pm2 start dist/app.js --name "hotel-server"
# 启动移动端后端
cd ../yisu-mobile/user-backend && pm2 start app.js --name "mobile-backend"
# 启动管理后台（使用 serve）
cd ../../yisu-dashboard && npm run build
pm2 start serve --name "dashboard" -- -s dist -l 3005
# 启动移动端 H5
cd ../yisu-mobile/user-frontend && npm run build:h5
pm2 start serve --name "mobile-frontend" -- -s dist -l 3004
# 保存 PM2 配置
pm2 save
pm2 startup
Nginx 配置示例
nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # 管理后台
    location / {
        proxy_pass http://localhost:3005;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 移动端
    location /mobile {
        alias /var/www/yisu-mobile/user-frontend/dist;
        index index.html;
        try_files $uri $uri/ /mobile/index.html;
    }

    # API
    location /api {
        proxy_pass http://localhost:3002;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
👥 角色权限
      角色	权限
      超级管理员	系统全权限，管理管理员、查看所有数据
      管理员	审核商户、管理酒店、广告审批、查看统计
      商户	管理自有酒店、房型、订单、广告投放
      用户	浏览酒店、下单预订
📸 功能预览
管理后台
      工作台：数据概览、待办任务
      商户审核：入驻资质审核
      酒店管理：酒店信息、房型管理
      广告管理：广告订单审核、投放管理
      订单中心：订单列表、详情
      财务统计：收入、佣金统计
      系统设置：佣金比例、广告定价、管理员管理

商户端
      酒店管理：增删改查酒店信息
      房型管理：房型 CRUD
      房价日历：批量调整房价、房态
      订单管理：订单处理、核销
      商户资料：资质信息、审核记录

🧪 测试账号（可联系作者获取）
🔧 常见问题
1. 定位功能无法使用
确保使用 HTTPS 访问
检查高德地图 Key 配置（需要 Web 服务类型 Key）
查看浏览器控制台错误信息

2. API 请求 403
检查 token 是否有效
确认用户权限
查看 Nginx 是否传递 Authorization 头

3. 构建内存不足
bash
export NODE_OPTIONS="--max-old-space-size=512"
npm run build
📝 环境变量
      后端 (.env)
            env
            DB_HOST=localhost
            DB_PORT=3306
            DB_USER=root
            DB_PASS=password
            DB_NAME=yisu_hotel
            JWT_SECRET=your_secret_key
            PORT=3002
      前端 (.env)
            env
            REACT_APP_API_URL=https://your-domain.com/api
