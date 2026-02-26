// utils/db.js - 数据库连接池（类似 Spring 的 DataSource）
const mysql = require('mysql2');
require('dotenv').config();

// 创建连接池
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER ,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// 转为 Promise 方便使用
const db = pool.promise();

module.exports = db;