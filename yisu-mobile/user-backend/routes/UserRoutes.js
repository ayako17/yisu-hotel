// routes/user.routes.js
// 依赖：npm install ali-oss uuid
const express   = require('express')
const router    = express.Router()
const OSS       = require('ali-oss')
const { v4: uuidv4 } = require('uuid')
const { verifyToken: auth } = require('../middlewares/AuthMiddleware')
const UserModel = require('../models/UserModel')   // ← 用 Model，不直接操作 db

// ─── OSS 客户端（懒加载，避免模块加载时 .env 尚未就绪）──────────────────────────
let _ossClient = null
function getOssClient() {
    if (_ossClient) return _ossClient

    _ossClient = new OSS({
        region: process.env.OSS_REGION,
        bucket: process.env.OSS_BUCKET,
        accessKeyId: process.env.OSS_ACCESS_KEY_ID,
        accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET,
        secure: true,   // 👈 关键！！
    })

    return _ossClient
}

// ── GET /api/user/profile —— 获取当前登录用户信息 ─────────────────────────────
router.get('/profile', auth, async (req, res) => {
    try {
        const user = await UserModel.findById(req.user.user_id)
        if (!user) return res.json({ code: 404, message: '用户不存在' })
        return res.json({ code: 200, data: user })
    } catch (err) {
        console.error('[GET /user/profile]', err)
        return res.status(500).json({ code: 500, message: '服务器错误' })
    }
})

// ── PUT /api/user/profile —— 修改用户名 ───────────────────────────────────────
// Body: { username: string }
router.put('/profile', auth, async (req, res) => {
    try {
        const { username } = req.body
        if (!username || !username.trim()) {
            return res.json({ code: 400, message: '用户名不能为空' })
        }
        if (username.trim().length > 50) {
            return res.json({ code: 400, message: '用户名不能超过50个字符' })
        }

        const ok = await UserModel.updateUsername(req.user.user_id, username.trim())
        if (!ok) return res.json({ code: 404, message: '用户不存在' })
        return res.json({ code: 200, message: '更新成功' })
    } catch (err) {
        console.error('[PUT /user/profile]', err)
        return res.status(500).json({ code: 500, message: '服务器错误' })
    }
})

// ── GET /api/user/avatar/sign —— 生成 OSS 预签名上传 URL（前端直传）────────────
router.get('/avatar/sign', auth, async (req, res) => {
    try {
        const ossKey = `avatars/${req.user.user_id}/${uuidv4()}.jpg`

        const uploadUrl = getOssClient().signatureUrl(ossKey, {
            method: 'PUT',
            expires: 900,
        })

        console.log('REGION:', process.env.OSS_REGION)
console.log('BUCKET:', process.env.OSS_BUCKET)
        const finalUrl =
            `https://${process.env.OSS_BUCKET}.${process.env.OSS_REGION}.aliyuncs.com/${ossKey}`

        return res.json({
            code: 200,
            data: { uploadUrl, ossKey, finalUrl }
        })

    } catch (err) {
        console.error(err)
        return res.status(500).json({ code: 500, message: '获取签名失败' })
    }
})

// ── PUT /api/user/avatar —— 前端上传完成后更新 DB ─────────────────────────────
// Body: { avatar_url: string }
router.put('/avatar', auth, async (req, res) => {
    try {
        const { avatar_url } = req.body
        if (!avatar_url || !avatar_url.startsWith('https://')) {
            return res.json({ code: 400, message: 'avatar_url 格式不合法' })
        }

        const ok = await UserModel.updateAvatar(req.user.user_id, avatar_url)
        if (!ok) return res.json({ code: 404, message: '用户不存在' })
        return res.json({ code: 200, message: '头像更新成功', data: { avatar_url } })
    } catch (err) {
        console.error('[PUT /user/avatar]', err)
        return res.status(500).json({ code: 500, message: '服务器错误' })
    }
})

module.exports = router