import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import pool from '../../config/db';
import { authenticate } from '../../middleware/auth';

const router = express.Router();

// 确保上传目录存在
const uploadDir = 'uploads/licenses';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 配置文件上传
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `license-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('仅支持 JPG/PNG 格式图片'));
    }
  }
});
// 资质上传接口
router.post('/qualification', 
  authenticate,
  upload.single('license_images'),
  async (req: any, res: any) => {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const { user_id, apply_reason } = req.body;
      
      if (!user_id) {
        await connection.rollback();
        return res.status(400).json({
          code: 400,
          msg: '用户ID不能为空'
        });
      }
       
      const license_image_url = req.file 
        ? `/uploads/licenses/${req.file.filename}` 
        : null;

      // 检查商户资料是否存在
      const [merchant]: any = await connection.execute(
        'SELECT * FROM merchant_profiles WHERE user_id = ?',
        [user_id]
      );

      if (merchant.length === 0) {
        // 创建新商户资料 - 同时设置 created_at 和 updated_at
        await connection.execute(
          `INSERT INTO merchant_profiles 
           (user_id, license_image_url, apply_reason, status, created_at, updated_at) 
           VALUES (?, ?, ?, 'pending', NOW(), NOW())`,
          [user_id, license_image_url, apply_reason || null]
        );
        console.log('创建商户资料成功:', user_id);
      } else {
        // 更新商户资料 - 不修改 created_at
        await connection.execute(
          `UPDATE merchant_profiles 
           SET license_image_url = ?, 
               apply_reason = ?,
               status = 'pending',
               updated_at = NOW()
           WHERE user_id = ?`,
          [license_image_url, apply_reason || null, user_id]
        );
        console.log('更新商户资料成功:', user_id);
      }

      // 检查是否已有待审核申请
      const [existingApplies]: any = await connection.execute(
        `SELECT apply_id, audit_status 
         FROM audits_apply 
         WHERE merchant_id = ? 
         AND target_type = 'hotel_apply'
         AND audit_status = 'pending'
         ORDER BY created_at DESC 
         LIMIT 1`,
        [user_id]
      );

      // 创建审核申请
      if (existingApplies.length === 0) {
        const change_data = JSON.stringify({
          license_image_url,
          apply_reason: apply_reason || '申请成为商户',
          apply_time: new Date().toISOString()
        });

        const [applyResult]: any = await connection.execute(`
          INSERT INTO audits_apply (
            target_type,
            target_id,
            merchant_id,
            change_data,
            apply_reason,
            audit_status,
            created_at
          ) VALUES (?, ?, ?, ?, ?, 'pending', NOW())
        `, [
          'hotel_apply',
          user_id,
          user_id,
          change_data,
          apply_reason || '申请成为商户'
        ]);

        console.log('创建审核申请成功，apply_id:', applyResult.insertId);
      }

      await connection.commit();

      res.json({
        code: 200,
        msg: '资质上传成功，等待审核',
        data: {
          user_id,
          license_image_url,
          status: 'pending',
          apply_id: existingApplies[0]?.apply_id || null,
          created_at: new Date()  // 返回创建时间
        }
      });

    } catch (error: any) {
      await connection.rollback();
      console.error('资质上传失败:', error);
      res.status(500).json({
        code: 500,
        msg: '资质上传失败: ' + error.message
      });
    } finally {
      connection.release();
    }
  }
);
// 获取商户资质信息
router.get('/qualification/:userId',
  authenticate,
  async (req: any, res: any) => {
    try {
      const { userId } = req.params;

      const [merchant]: any = await pool.execute(
        `SELECT mp.*, u.username, u.phone, u.status as account_status
         FROM merchant_profiles mp
         JOIN users u ON mp.user_id = u.user_id
         WHERE mp.user_id = ?`,
        [userId]
      );

      if (merchant.length === 0) {
        return res.status(404).json({
          code: 404,
          msg: '商户资料不存在'
        });
      }

      // 同时获取该商户的审核申请记录（按时间倒序）
      const [applies]: any = await pool.execute(
        `SELECT apply_id, audit_status, created_at as apply_created_at
         FROM audits_apply 
         WHERE merchant_id = ? AND target_type = 'hotel_apply'
         ORDER BY created_at DESC
         LIMIT 5`,
        [userId]
      );

      res.json({
        code: 200,
        msg: '获取成功',
        data: {
          ...merchant[0],
          apply_history: applies  // 返回最近的申请记录
        }
      });

    } catch (error: any) {
      console.error('获取商户资质失败:', error);
      res.status(500).json({
        code: 500,
        msg: '获取失败: ' + error.message
      });
    }
  }
);

export default router;