// app.ts
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { testConnection } from "./config/db";
import routes from "./routes/index";
import './utils/cronJobs';
import profileRoutes from "./routes/admin/profileRoutes";
import authRoutes from "./routes/admin/authRoutes";
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// 只设置一次，放在最前面
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cors());

// 静态文件服务
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// 使用路由
app.use("/api", routes);
// 路由挂载
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
// 健康检查
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date() });
});

// 错误处理中间件
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ 
      code: 413, 
      msg: '上传文件过大，最大支持50MB' 
    });
  }
  console.error('服务器错误:', err);
  res.status(500).json({ code: 500, msg: '服务器内部错误' });
});

// 测试数据库连接并启动服务器
testConnection().then((isConnected) => {
  if (isConnected) {
    app.listen(PORT, () => {
      console.log(`后端运行在 http://localhost:${PORT}`);
      console.log(`静态文件目录: ${path.join(__dirname, "../uploads")}`);
      console.log(`JSON 解析限制: 50mb`);
    });
  } else {
    console.error("数据库连接失败，服务器未启动");
  }
});