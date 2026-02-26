// models/user.model.js - 用户数据操作（类似 Spring 的 DAO/Repository）
const db = require('../utils/db');

const UserModel = {
    // 根据手机号查询用户
    async findByPhone(phone) {
        const [rows] = await db.execute('SELECT * FROM users WHERE phone = ?', [phone]);
        return rows[0];
    },

    // 根据ID查询用户（原有，补充 created_at / updated_at 字段供 Profile 页使用）
    async findById(userId) {
        const [rows] = await db.execute(
            `SELECT user_id, phone, username, avatar_url, role, status, created_at, updated_at
             FROM users WHERE user_id = ?`,
            [userId]
        );
        return rows[0];
    },

    // 创建用户
    async create(userData) {
        const { phone, password, username } = userData;
        const [result] = await db.execute(
            'INSERT INTO users (phone, password, username) VALUES (?, ?, ?)',
            [phone, password, username || phone]
        );
        return result.insertId;
    },

    // ── 新增：更新用户名 ────────────────────────────────────────────────────────
    async updateUsername(userId, username) {
        const [result] = await db.execute(
            'UPDATE users SET username = ?, updated_at = NOW() WHERE user_id = ?',
            [username, userId]
        );
        return result.affectedRows > 0;
    },

    // ── 新增：更新头像 URL ──────────────────────────────────────────────────────
    async updateAvatar(userId, avatarUrl) {
        console.log('更新头像 URL:', avatarUrl)
        const [result] = await db.execute(
            'UPDATE users SET avatar_url = ?, updated_at = NOW() WHERE user_id = ?',
            [avatarUrl, userId]
        );
        return result.affectedRows > 0;
    },
};

module.exports = UserModel;