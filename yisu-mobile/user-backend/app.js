// app.js - 入口文件（类似 SpringBoot 的 main 类）
const express = require('express');
const cors = require('cors');// 作用是解决跨域问题，允许前端应用访问后端 API
require('dotenv').config();
const scheduleOrderUpdate = require('./config/cron')

const app = express();// 创建 Express 应用。express() 函数返回一个 Express 应用实例，赋值给 app 变量，后续通过 app 来定义路由和中间件

// 中间件
app.use(cors());// 添加跨域头，允许前端访问
app.use(express.json());// 读取请求体，解析成 JSON，挂载到 req.body

// 路由注册
const authRoutes = require('./routes/AuthRoutes');//加载路由模块
const hotelRoutes = require('./routes/HotelRoutes');
const orderRoutes = require('./routes/OrderRoutes');
const favoriteRoutes = require('./routes/FavoriteRoutes');
const adRoutes = require('./routes/AdRoutes');
const userRouter = require('./routes/UserRoutes');

app.use('/api/auth', authRoutes);// 发现请求路径以 /api/auth 开头，交给 authRoutes 处理
app.use('/api/hotels', hotelRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/favorites', favoriteRoutes);
app.use('/api/ads', adRoutes);
app.use('/api/user', userRouter);

// 测试接口
app.get('/api/test', (req, res) => {
    res.json({ message: '后端服务运行正常' });
});

// 404处理，最后注册，只有前面的路由都没匹配到才执行
app.use((req, res) => {
    res.status(404).json({ error: '接口不存在' });
});

scheduleOrderUpdate()

const PORT = process.env.PORT;
app.listen(PORT, () => {
    console.log(`🚀 后端服务运行在 http://localhost:${PORT}`);
});