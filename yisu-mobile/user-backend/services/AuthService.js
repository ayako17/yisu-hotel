//这个是一个库，用于加密和验证密码，确保用户的密码安全存储在数据库中。
const bcrypt = require('bcryptjs');

//这是一个库，用于生成和验证 JSON Web Tokens (JWT)，用于用户认证和授权。
// 通过 JWT，服务器可以在用户登录后生成一个包含用户信息的 token，客户端在后续请求中携带这个 token，服务器可以验证 token 的有效性来识别用户身份。
const jwt = require('jsonwebtoken');
const UserModel = require('../models/UserModel');

/*
process.env 是 Node.js 中的一个全局对象，包含了当前进程的环境变量。
通过 process.env 可以访问和使用这些环境变量，
例如 process.env.JWT_SECRET 就可以获取 JWT 密钥的值。

dotenv 是一个零依赖的模块，用于加载环境变量。
config() 方法会读取 .env 文件中的环境变量，并将它们加载到 process.env 中
这对于管理敏感信息（如数据库连接字符串、API 密钥、JWT 密钥等）非常有用，
避免将这些信息硬编码在代码中。
*/
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET;

const AuthService = {
    // 注册
    async register(phone, password, username) {
        // 检查用户是否已存在
        const existingUser = await UserModel.findByPhone(phone);
        if (existingUser) {
            throw new Error('手机号已注册');
        }

        // 密码加密，10 是加密的强度（salt rounds），
        // 数值越大加密越安全，但也会增加计算时间。通常建议使用 10 或更高的值。
        const hashedPassword = bcrypt.hashSync(password, 10);

        // 创建用户
        const userId = await UserModel.create({
            phone,
            password: hashedPassword,
            username
        });

        return { user_id: userId };
    },

    // 登录
    async login(phone, password) {
        // 查询用户
        const user = await UserModel.findByPhone(phone);
        if (!user) {
            throw new Error('手机号或密码错误');
        }

        // 检查账号状态
        if (user.status === 'suspended') {
            throw new Error('账号已被禁用');
        }

        // 验证密码
        const isValidPassword = bcrypt.compareSync(password, user.password);
        if (!isValidPassword) {
            throw new Error('手机号或密码错误');
        }

        //jwt全称是 JSON Web Token，是一种基于 JSON 的开放标准（RFC 7519），用于在网络应用环境中安全地传输信息。
        // 生成 token，token 中包含用户的 user_id、phone 和 role 信息，
        // 这些信息可以在后续请求中使用来识别用户身份和权限。
        const token = jwt.sign(
            { 
                user_id: user.user_id, 
                phone: user.phone,
                role: user.role 
            },
            JWT_SECRET,
            { expiresIn: '7d' }// token 有效期为 7 天
        );

        // 返回用户信息（不包含密码）
        //先取出 password 放到 _ 变量
        //把剩下的所有属性（除了 password）放到 userInfo 对象
        const { password: _, ...userInfo } = user;
        
        return {
            token,
            user: userInfo
        };
    },

    // 验证 token 本身的合法性
    verifyToken(token) {
        try {
            return jwt.verify(token, JWT_SECRET);
        } catch (err) {
            throw new Error('token无效或已过期');
        }
    }
};

module.exports = AuthService;