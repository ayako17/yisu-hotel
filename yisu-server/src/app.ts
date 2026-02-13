import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { testConnection } from "./config/db";
import routes from "./routes/index";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 静态文件服务（用于访问上传的头像）
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// 使用路由
app.use("/api", routes);

// 健康检查
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date() });
});

// 测试数据库连接并启动服务器
testConnection().then((isConnected) => {
  if (isConnected) {
    app.listen(PORT, () => {
      console.log(`后端运行在 http://localhost:${PORT}`);
      console.log(`静态文件目录: ${path.join(__dirname, "../uploads")}`);
      console.log(`数据库主机: ${process.env.DB_HOST}`);
      console.log(`数据库名称: ${process.env.DB_NAME}`);
    });
  } else {
    console.error("数据库连接失败，服务器未启动");
    console.log("请检查:");
    console.log("1. 网络连接是否正常");
    console.log("2. 数据库配置是否正确");
    console.log("3. 数据库服务是否可用");
  }
});