import express from 'express';
import { authenticate, authorize } from '../../middleware/auth';
import pool from '../../config/db';

const router = express.Router();

// 需要认证和权限
router.use(authenticate);
router.use(authorize(['super_admin', 'admin']));

/**
 * 1. 获取待办审核列表（管理员首页）
 */
router.get('/todos', async (req: any, res: any) => {
  try {
    // 统计各类待审核申请数量
    const [todos]: any = await pool.execute(`
      SELECT 
        target_type,
        COUNT(*) as count
      FROM audits_apply 
      WHERE audit_status = 'pending'
      GROUP BY target_type
    `);

    // 获取最新的待审核申请
    const [recent]: any = await pool.execute(`
      SELECT 
        aa.apply_id,
        aa.target_type,
        aa.target_id,
        aa.hotel_id,
        aa.apply_reason,
        aa.created_at,
        u.username as merchant_name,
        u.user_id as merchant_id,
        h.name as hotel_name
      FROM audits_apply aa
      JOIN users u ON aa.merchant_id = u.user_id
      LEFT JOIN hotels h ON aa.hotel_id = h.hotel_id
      WHERE aa.audit_status = 'pending'
      ORDER BY aa.created_at DESC
      LIMIT 10
    `);

    // 统计各状态数量
    const [stats]: any = await pool.execute(`
      SELECT 
        audit_status,
        COUNT(*) as count
      FROM audits_apply
      GROUP BY audit_status
    `);

    res.json({
      code: 200,
      msg: '获取成功',
      data: {
        todo_counts: todos,
        recent_applies: recent,
        statistics: stats
      }
    });

  } catch (error: any) {
    console.error('获取待办列表失败:', error);
    res.status(500).json({
      code: 500,
      msg: '获取待办列表失败: ' + error.message
    });
  }
});

// // 获取商户入驻审核列表（支持全部状态）
// router.get('/merchant-applies', async (req: any, res: any) => {
//   try {
//     const { page = 1, limit = 10, status = 'pending', keyword = '' } = req.query;
//     console.log('========== 收到审核列表请求 ==========');
//     console.log('请求参数:', { page, limit, status, keyword });
    
//     const offset = (Number(page) - 1) * Number(limit);

//     // --- 1. 构建基础 SQL ---
//     let baseSql = `
//       FROM merchant_profiles mp
//       LEFT JOIN users u ON mp.user_id = u.user_id
//       LEFT JOIN audits_apply aa 
//         ON mp.user_id = aa.merchant_id 
//         AND aa.apply_id = (
//           SELECT MAX(apply_id) 
//           FROM audits_apply 
//           WHERE merchant_id = mp.user_id 
//           AND target_type = 'merchant_apply'
//         )
//       WHERE 1=1 
//     `;

//     const params: any[] = [];
//     const countParams: any[] = [];
//     // --- 2. 动态添加条件 ---
//     // 如果不是查全部，则追加状态条件
//     if (status !== 'all') {
//       baseSql += ` AND mp.status = ? `;
//       params.push(status);
//       countParams.push(status);
//     }
//     // 关键词搜索
//     if (keyword && keyword.trim() !== '') {
//       baseSql += ` AND (u.username LIKE ? OR u.phone LIKE ?) `;
//       params.push(`%${keyword}%`, `%${keyword}%`);
//       countParams.push(`%${keyword}%`, `%${keyword}%`);
//     }
//       // --- 3. 数据查询 SQL
//     const dataSql = `
//       SELECT 
//         mp.user_id, mp.license_image_url, mp.apply_reason,
//         mp.status as merchant_status,
//         mp.created_at, mp.updated_at, mp.rejection_reason,
//         u.username as merchant_name, u.phone, u.created_at as registered_at,
//         aa.apply_id, aa.created_at as apply_time
//       ${baseSql}
//       ORDER BY 
//         CASE mp.status 
//           WHEN 'pending' THEN 1
//           WHEN 'approved' THEN 2
//           WHEN 'rejected' THEN 3
//           ELSE 4
//         END,
//         mp.updated_at DESC 
//       LIMIT ? OFFSET ?
//     `;
    
//     // 追加分页参数
//     const dataParams = [...params, Number(limit), Number(offset)];

//     // 总数查询 SQL (直接复用 baseSql 的条件部分)
//     const countSql = `SELECT COUNT(*) as count ${baseSql}`;

//     // 执行查询
//     console.log('Executing SQL:', dataSql); // 调试用
//     const [applies]: any = await pool.query(dataSql, dataParams);
//     const [countResult]: any = await pool.query(countSql, countParams);
    
//     // 统计各状态数量 (这个查询是独立的，不受筛选影响)
//     const [stats]: any = await pool.query(`
//       SELECT status, COUNT(*) as count
//       FROM merchant_profiles
//       WHERE status IN ('pending', 'approved', 'rejected')
//       GROUP BY status
//     `);
    
//     res.json({
//       code: 200,
//       msg: '获取成功',
//       data: applies,
//       statistics: stats,
//       pagination: {
//         page: Number(page),
//         limit: Number(limit),
//         total: countResult[0]?.count || 0
//       }
//     });

//   } catch (error: any) {
//     console.error('API Error:', error);
//     res.status(500).json({ code: 500, msg: error.message });
//   }
// });
// yisu-server/src/routes/auditRoutes.ts

// 获取商户入驻审核列表（支持全部状态）
router.get('/merchant-applies', async (req: any, res: any) => {
  try {
    const { page = 1, limit = 10, status = 'pending', keyword = '' } = req.query;
    console.log('========== 收到审核列表请求 ==========');
    console.log('请求参数:', { page, limit, status, keyword });
    
    const offset = (Number(page) - 1) * Number(limit);

    // --- 1. 构建基础 SQL ---
    let baseSql = `
      FROM merchant_profiles mp
      LEFT JOIN users u ON mp.user_id = u.user_id
      LEFT JOIN audits_apply aa 
        ON mp.user_id = aa.merchant_id 
        AND aa.apply_id = (
          SELECT MAX(apply_id) 
          FROM audits_apply 
          WHERE merchant_id = mp.user_id 
          AND target_type = 'merchant_apply'
        )
      WHERE 1=1 
    `;

    const params: any[] = [];
    const countParams: any[] = [];
    
    // --- 2. 动态添加条件 ---
    // 如果不是查全部，则追加状态条件
    if (status !== 'all') {
      baseSql += ` AND mp.status = ? `;
      params.push(status);
      countParams.push(status);
    }
    
    // 关键词搜索
    if (keyword && keyword.trim() !== '') {
      baseSql += ` AND (u.username LIKE ? OR u.phone LIKE ?) `;
      params.push(`%${keyword}%`, `%${keyword}%`);
      countParams.push(`%${keyword}%`, `%${keyword}%`);
    }
    
    // --- 3. 数据查询 SQL - 添加所有字段 ---
    const dataSql = `
      SELECT 
        mp.user_id, 
        mp.license_image_url, 
        mp.license_no,           -- 添加统一社会信用代码
        mp.issuing_authority,    -- 添加发证机关
        mp.establish_date,       -- 添加成立日期
        mp.valid_until,          -- 添加有效期限
        mp.apply_reason,
        mp.status as merchant_status,
        mp.created_at, 
        mp.updated_at, 
        mp.rejection_reason,
        u.username as merchant_name, 
        u.phone, 
        u.created_at as registered_at,
        aa.apply_id, 
        aa.created_at as apply_time
      ${baseSql}
      ORDER BY 
        CASE mp.status 
          WHEN 'pending' THEN 1
          WHEN 'approved' THEN 2
          WHEN 'rejected' THEN 3
          ELSE 4
        END,
        mp.updated_at DESC 
      LIMIT ? OFFSET ?
    `;
    
    // 追加分页参数
    const dataParams = [...params, Number(limit), Number(offset)];

    // 总数查询 SQL (直接复用 baseSql 的条件部分)
    const countSql = `SELECT COUNT(*) as count ${baseSql}`;

    // 执行查询
    console.log('Executing SQL:', dataSql);
    const [applies]: any = await pool.query(dataSql, dataParams);
    const [countResult]: any = await pool.query(countSql, countParams);
    
    // 统计各状态数量 (这个查询是独立的，不受筛选影响)
    const [stats]: any = await pool.query(`
      SELECT status, COUNT(*) as count
      FROM merchant_profiles
      WHERE status IN ('pending', 'approved', 'rejected')
      GROUP BY status
    `);
    
    res.json({
      code: 200,
      msg: '获取成功',
      data: applies,
      statistics: stats,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: countResult[0]?.count || 0
      }
    });

  } catch (error: any) {
    console.error('API Error:', error);
    res.status(500).json({ code: 500, msg: error.message });
  }
});
/**
 * 3. 提交商户入驻申请（注册时调用）
 */
router.post('/merchant-apply', async (req: any, res: any) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const { user_id, username, phone, license_image_url, apply_reason } = req.body;

    console.log('提交商户申请:', { user_id, username, phone });
    // 【步骤1】检查 merchant_profiles 是否存在
    const [existing]: any = await connection.execute(
      `SELECT user_id FROM merchant_profiles WHERE user_id = ?`, 
      [user_id]
    );

    if (existing.length > 0) {
      // 存在则更新状态为 pending，重置驳回理由
      await connection.execute(`
        UPDATE merchant_profiles 
        SET status = 'pending', 
            license_image_url = ?, 
            apply_reason = ?, 
            rejection_reason = NULL,
            updated_at = NOW()
        WHERE user_id = ?
      `, [license_image_url, apply_reason || '申请成为商户', user_id]);
      console.log('更新商户资料成功:', user_id);
    } else {
      // 不存在则插入新记录
      await connection.execute(`
        INSERT INTO merchant_profiles 
        (user_id, status, license_image_url, apply_reason, created_at, updated_at)
        VALUES (?, 'pending', ?, ?, NOW(), NOW())
      `, [user_id, license_image_url, apply_reason || '申请成为商户']);
      console.log('创建商户资料成功:', user_id);
    }
    // 【步骤2】插入审核记录，统一使用 'merchant_apply' 类型
    const change_data = JSON.stringify({
      username,
      phone,
      license_image_url,
      role: 'merchant',
      apply_time: new Date().toISOString()
    });

    const [result]: any = await connection.execute(`
      INSERT INTO audits_apply (
        target_type, target_id, merchant_id, change_data, apply_reason, audit_status, created_at
      ) VALUES (?, ?, ?, ?, ?, 'pending', NOW())
    `, [
      'merchant_apply', 
      user_id, 
      user_id, 
      change_data, 
      apply_reason || '申请成为商户'
    ]);

    console.log('创建审核申请成功, apply_id:', result.insertId);

    await connection.commit();

    res.json({
      code: 200,
      msg: '申请提交成功，等待审核',
      data: { 
        apply_id: result.insertId,
        user_id 
      }
    });

  } catch (error: any) {
    await connection.rollback();
    console.error('提交商户申请失败:', error);
    res.status(500).json({
      code: 500,
      msg: '提交申请失败: ' + error.message
    });
  } finally {
    connection.release();
  }
});

/**
 * 4. 审核通过
 */
router.put('/applies/:applyId/approve', async (req: any, res: any) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const { applyId } = req.params;
    const adminId = req.user?.user_id;

    // 1. 获取审核申请详情
    const [applies]: any = await connection.execute(
      'SELECT * FROM audits_apply WHERE apply_id = ?',
      [applyId]
    );

    if (applies.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        code: 404,
        msg: '审核申请不存在'
      });
    }

    const apply = applies[0];

        // 2. 根据不同类型执行审核通过逻辑
        if (apply.target_type === 'hotel_apply' || apply.target_type === 'merchant_apply') {
        // 更新商户资料状态为 approved
        const [updateResult]: any = await connection.execute(
            `UPDATE merchant_profiles 
            SET status = 'approved',
                updated_at = NOW()
            WHERE user_id = ?`,
            [apply.target_id]
        );

      if (updateResult.affectedRows === 0) {
        // 如果商户资料不存在，创建一条
        await connection.execute(
          `INSERT INTO merchant_profiles 
           (user_id, status, created_at, updated_at) 
           VALUES (?, 'approved', NOW(), NOW())`,
          [apply.target_id]
        );
      }

      // 更新用户角色为 merchant
      await connection.execute(
        `UPDATE users 
         SET role = 'merchant',
             updated_at = NOW()
         WHERE user_id = ? AND role != 'merchant'`,
        [apply.target_id]
      );

      // 将该商户其他待审核申请都标记为 obsoleted
      await connection.execute(
        `UPDATE audits_apply 
         SET audit_status = 'obsoleted'
         WHERE merchant_id = ? 
         AND target_type = 'merchant_apply'
         AND audit_status = 'pending'
         AND apply_id != ?`,
        [apply.target_id, applyId]
      );
    }

    // 3. 更新当前审核申请状态为 completed - 只更新存在的字段
    await connection.execute(
      `UPDATE audits_apply 
       SET audit_status = 'completed'
       WHERE apply_id = ?`, 
      [applyId]
    );

    // 4. 记录审核日志 - 在这里记录审核人和审核时间
    await connection.execute(
      `INSERT INTO audit_logs (
        apply_id,
        admin_id,
        action,
        created_at
      ) VALUES (?, ?, 'approve', NOW())`,
      [applyId, adminId]
    );

    await connection.commit();

    res.json({
      code: 200,
      msg: '审核通过成功',
      data: { 
        apply_id: applyId,
        user_id: apply.target_id,
        status: 'approved'
      }
    });

  } catch (error: any) {
    await connection.rollback();
    console.error('审核通过失败:', error);
    res.status(500).json({
      code: 500,
      msg: '审核通过失败: ' + error.message
    });
  } finally {
    connection.release();
  }
});

/**
 * 5. 审核驳回
 */
router.put('/applies/:applyId/reject', async (req: any, res: any) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const { applyId } = req.params;
    const { reason } = req.body;
    const adminId = req.user?.user_id;

    if (!reason || reason.trim() === '') {
      await connection.rollback();
      return res.status(400).json({
        code: 400,
        msg: '请填写驳回理由'
      });
    }

    // 1. 获取审核申请
    const [applies]: any = await connection.execute(
      'SELECT * FROM audits_apply WHERE apply_id = ?',
      [applyId]
    );

    if (applies.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        code: 404,
        msg: '审核申请不存在'
      });
    }

    const apply = applies[0];

        // 2. 如果是商户入驻申请，更新商户资料状态为 rejected
        if (apply.target_type === 'hotel_apply' || apply.target_type === 'merchant_apply') {
        const [updateResult]: any = await connection.execute(
            `UPDATE merchant_profiles 
            SET status = 'rejected',
                rejection_reason = ?,
                updated_at = NOW()
            WHERE user_id = ?`,
            [reason, apply.target_id]
        );

      if (updateResult.affectedRows === 0) {
        // 如果商户资料不存在，创建一条驳回状态的记录
        await connection.execute(
          `INSERT INTO merchant_profiles 
           (user_id, status, rejection_reason, created_at, updated_at) 
           VALUES (?, 'rejected', ?, NOW(), NOW())`,
          [apply.target_id, reason]
        );
      }
    }

    // 3. 更新审核状态为 completed - 只更新存在的字段
    await connection.execute(
      `UPDATE audits_apply 
       SET audit_status = 'completed'
       WHERE apply_id = ?`,  // 移除 audit_time 和 auditor_id
      [applyId]
    );

    // 4. 记录审核日志 - 在这里记录审核人、审核时间和驳回理由
    await connection.execute(
      `INSERT INTO audit_logs (
        apply_id,
        admin_id,
        action,
        reason,
        created_at
      ) VALUES (?, ?, 'reject', ?, NOW())`,
      [applyId, adminId, reason]
    );

    await connection.commit();

    res.json({
      code: 200,
      msg: '已驳回申请',
      data: { 
        apply_id: applyId,
        user_id: apply.target_id,
        status: 'rejected'
      }
    });

  } catch (error: any) {
    await connection.rollback();
    console.error('驳回申请失败:', error);
    res.status(500).json({
      code: 500,
      msg: '驳回申请失败: ' + error.message
    });
  } finally {
    connection.release();
  }
});
/**
 * 6. 获取审核详情
 */
router.get('/applies/:applyId', async (req: any, res: any) => {
  try {
    const { applyId } = req.params;

    const [applies]: any = await pool.execute(`
      SELECT 
        aa.*,
        u.username as merchant_name,
        u.phone as merchant_phone,
        al.action,
        al.reason as reject_reason,
        al.created_at as audit_time,  -- 从 audit_logs 获取审核时间
        admin.username as admin_name
      FROM audits_apply aa
      JOIN users u ON aa.merchant_id = u.user_id
      LEFT JOIN audit_logs al ON aa.apply_id = al.apply_id
      LEFT JOIN users admin ON al.admin_id = admin.user_id
      WHERE aa.apply_id = ?
      ORDER BY al.created_at DESC  -- 取最新的审核记录
      LIMIT 1
    `, [applyId]);

    if (applies.length === 0) {
      return res.status(404).json({
        code: 404,
        msg: '审核申请不存在'
      });
    }

    const apply = applies[0];
    
    // 解析JSON数据
    if (apply.change_data) {
      apply.change_data = JSON.parse(apply.change_data);
    }

    res.json({
      code: 200,
      msg: '获取成功',
      data: apply
    });

  } catch (error: any) {
    console.error('获取审核详情失败:', error);
    res.status(500).json({
      code: 500,
      msg: '获取审核详情失败: ' + error.message
    });
  }
});

/**
 * 7. 获取审核历史
 */
router.get('/history', async (req: any, res: any) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const [logs]: any = await pool.execute(`
      SELECT 
        al.*,
        aa.target_type,
        aa.target_id,
        u.username as merchant_name,
        admin.username as admin_name
      FROM audit_logs al
      JOIN audits_apply aa ON al.apply_id = aa.apply_id
      JOIN users u ON aa.merchant_id = u.user_id
      JOIN users admin ON al.admin_id = admin.user_id
      ORDER BY al.created_at DESC
      LIMIT ? OFFSET ?
    `, [Number(limit), offset]);

    // 获取总条数
    const [total]: any = await pool.execute(`
      SELECT COUNT(*) as count FROM audit_logs
    `);

    res.json({
      code: 200,
      msg: '获取成功',
      data: {
        list: logs,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: total[0].count
        }
      }
    });

  } catch (error: any) {
    console.error('获取审核历史失败:', error);
    res.status(500).json({
      code: 500,
      msg: '获取审核历史失败: ' + error.message
    });
  }
});
/**
 * 获取审核统计信息（用于首页/待办计数）
 */
router.get('/statistics', async (req: any, res: any) => {
  try {
    // 统计商户入驻申请各状态数量
    const [merchantStats]: any = await pool.execute(`
      SELECT 
        status,
        COUNT(*) as count
      FROM merchant_profiles
      WHERE status IN ('pending', 'approved', 'rejected')
      GROUP BY status
    `);

    // 统计今日待审核数量（今日创建的待审核申请）
    const [todayPending]: any = await pool.execute(`
      SELECT COUNT(*) as count
      FROM merchant_profiles
      WHERE status = 'pending'
        AND DATE(created_at) = CURDATE()
    `);

    // 统计各类审核待办数量（酒店入驻、信息变更等）
    const [todoTypes]: any = await pool.execute(`
      SELECT 
        target_type,
        COUNT(*) as count
      FROM audits_apply 
      WHERE audit_status = 'pending'
      GROUP BY target_type
    `);

    res.json({
      code: 200,
      msg: '获取统计成功',
      data: {
        merchant: {
          pending: merchantStats.find((s: any) => s.status === 'pending')?.count || 0,
          approved: merchantStats.find((s: any) => s.status === 'approved')?.count || 0,
          rejected: merchantStats.find((s: any) => s.status === 'rejected')?.count || 0,
          total: merchantStats.reduce((acc: number, cur: any) => acc + cur.count, 0)
        },
        today_pending: todayPending[0]?.count || 0,
        todo_types: todoTypes
      }
    });

  } catch (error: any) {
    console.error('获取统计信息失败:', error);
    res.status(500).json({
      code: 500,
      msg: '获取统计信息失败: ' + error.message
    });
  }
});

export default router;