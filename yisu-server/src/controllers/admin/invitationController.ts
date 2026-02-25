import { Request, Response } from 'express';
import { query, queryOne, execute, } from '../../utils/dbHelpers';

interface InvitationRow {
  invitation_id: number;
  invite_code: string;
  creator_id: number;
  is_used: number;
  used_by_id: number | null;
  expire_at: Date;
  created_at: Date;
  creator_name?: string;
  creator_phone?: string;
  used_by_name?: string;
  used_by_phone?: string;
  status_text?: string;
}

class InvitationController {
//生成邀请码（带重试机制）
async generate(req: Request, res: Response) {
  try {
    // 1. 检查用户是否登录
    if (!req.user) {
      return res.status(401).json({
        code: 401,
        msg: '请先登录'
      });
    }

    const currentUser = req.user;
    const { expiresInDays = 7 } = req.body;

    // 2. 检查权限
    if (currentUser.role !== 'super_admin') {
      return res.status(403).json({
        code: 403,
        msg: '只有超级管理员可以生成邀请码'
      });
    }

    const creatorId = currentUser.user_id;
    if (!creatorId) {
      console.error('无法获取用户ID, req.user:', currentUser);
      return res.status(400).json({
        code: 400,
        msg: '无法获取用户ID'
      });
    }

    const expireAt = new Date();
    expireAt.setDate(expireAt.getDate() + expiresInDays);

    // 3. 带重试机制的邀请码生成
    let inviteCode = '';
    let retryCount = 0;
    const MAX_RETRY = 5;
    let inserted = false;

    while (!inserted && retryCount < MAX_RETRY) {
      // 生成邀请码
      inviteCode = this.generateInviteCodeWithTimestamp();
      
      try {
        // 尝试插入数据库
        const result = await execute(
          `INSERT INTO admin_invitations (invite_code, creator_id, expire_at, created_at)
           VALUES (?, ?, ?, NOW())`,
          [inviteCode, creatorId, expireAt]
        );
        
        inserted = true;
      } catch (error: any) {
        // 4. 捕获唯一索引冲突错误
        if (error.code === 'ER_DUP_ENTRY' || error.errno === 1062) {
          retryCount++;
          console.log(`邀请码冲突，重试第 ${retryCount} 次`);
          
          if (retryCount >= MAX_RETRY) {
            // 最后一次尝试：使用更复杂的生成策略
            inviteCode = this.generateInviteCodeWithUUID();
            
            const result = await execute(
              `INSERT INTO admin_invitations (invite_code, creator_id, expire_at, created_at)
               VALUES (?, ?, ?, NOW())`,
              [inviteCode, creatorId, expireAt]
            );
            
            inserted = true;
          }
        } else {
          // 其他数据库错误
          throw error;
        }
      }
    }

    if (!inserted) {
      throw new Error('无法生成唯一的邀请码，请稍后重试');
    }

    res.json({
      code: 200,
      msg: '邀请码生成成功',
      data: {
        invite_code: inviteCode,
        expire_at: expireAt,
        creator_id: creatorId
      }
    });
  } catch (error: any) {
    console.error('生成邀请码失败:', error);
    res.status(500).json({
      code: 500,
      msg: error.message || '生成失败'
    });
  }
}

//生成带时间戳的邀请码
generateInviteCodeWithTimestamp(): string {
  // 格式: YISU-年月日-随机6位
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  
  // 生成6位随机数
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  
  return `YISU-${year}${month}${day}-${random}`;
  // 示例: YISU-240215-ABC123
}

//生成基于UUID的邀请码（极端情况备用）
generateInviteCodeWithUUID(): string {
  // 格式: YISU-时间戳-随机8位
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 10).toUpperCase();
  
  return `YISU-${timestamp}-${random}`;
  // 示例: YISU-1A2B3C-ABCDEFGH
}

  //获取邀请码列表
  async getList(req: Request, res: Response) {
    try {
      const { page = 1, pageSize = 20, status } = req.query;
      const offset = (Number(page) - 1) * Number(pageSize);
      const limit = Number(pageSize);

      // 构建查询条件
      let whereClause = '';
      
      if (status === 'used') {
        whereClause = 'WHERE i.is_used = 1';
      } else if (status === 'unused') {
        whereClause = 'WHERE i.is_used = 0 AND i.expire_at > NOW()';
      } else if (status === 'expired') {
        whereClause = 'WHERE i.is_used = 0 AND i.expire_at <= NOW()';
      }

      // 查询总数
      const countSql = `SELECT COUNT(*) as total FROM admin_invitations i ${whereClause}`;
      const countResult = await query<any[]>(countSql, []);
      const total = countResult[0]?.total || 0;

      // 查询列表 - 根据实际表结构
      const listSql = `
        SELECT 
          i.*,
          c.username as creator_name,
          c.phone as creator_phone,
          u.username as used_by_name,
          u.phone as used_by_phone,
          CASE 
            WHEN i.is_used = 1 THEN '已使用'
            WHEN i.expire_at <= NOW() THEN '已过期'
            ELSE '未使用'
          END as status_text
        FROM admin_invitations i
        LEFT JOIN users c ON i.creator_id = c.user_id
        LEFT JOIN users u ON i.used_by_id = u.user_id
        ${whereClause}
        ORDER BY i.created_at DESC
        LIMIT ? OFFSET ?
      `;
      
      const list = await query<any[]>(listSql, [limit, offset]);

      res.json({
        code: 200,
        data: {
          list,
          total,
          page: Number(page),
          pageSize: Number(pageSize)
        }
      });
    } catch (error: any) {
      console.error('获取邀请码列表失败:', error);
      res.status(500).json({
        code: 500,
        msg: error.message || '获取失败'
      });
    }
  }

  // 验证邀请码
  async verify(req: Request, res: Response) {
    try {
      const { invite_code } = req.body;

      const [rows]: any = await execute(
        `SELECT * FROM admin_invitations 
         WHERE invite_code = ? AND is_used = 0 AND expire_at > NOW()`,
        [invite_code]
      );

      const invitation = rows[0];
      if (!invitation) {
        return res.json({
          code: 400,
          msg: '邀请码无效或已过期'
        });
      }

      res.json({
        code: 200,
        msg: '邀请码有效',
        data: {
          invitation_id: invitation.invitation_id,
          invite_code: invitation.invite_code
        }
      });
    } catch (error: any) {
      console.error('验证邀请码失败:', error);
      res.status(500).json({
        code: 500,
        msg: error.message || '验证失败'
      });
    }
  }

// 使用邀请码（注册成功后调用）
async use(req: Request, res: Response) {
  try {
    const { invite_code, user_id } = req.body;

    // 移除 used_at 字段
    const [result]: any = await execute(
      `UPDATE admin_invitations 
       SET is_used = 1, used_by_id = ?
       WHERE invite_code = ? AND is_used = 0 AND expire_at > NOW()`,
      [user_id, invite_code]
    );

    if (result.affectedRows === 0) {
      return res.json({
        code: 400,
        msg: '邀请码无效或已过期'
      });
    }

    res.json({
      code: 200,
      msg: '邀请码使用成功'
    });
  } catch (error: any) {
    console.error('使用邀请码失败:', error);
    res.status(500).json({
      code: 500,
      msg: error.message || '使用失败'
    });
  }
}

  //删除邀请码
  async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const [rows]: any = await execute(
        'SELECT * FROM admin_invitations WHERE invitation_id = ?',
        [id]
      );

      const invitation = rows[0];
      if (!invitation) {
        return res.status(404).json({
          code: 404,
          msg: '邀请码不存在'
        });
      }

      if (invitation.is_used === 1) {
        return res.status(400).json({
          code: 400,
          msg: '已使用的邀请码不能删除'
        });
      }

      await execute('DELETE FROM admin_invitations WHERE invitation_id = ?', [id]);

      res.json({
        code: 200,
        msg: '删除成功'
      });
    } catch (error: any) {
      console.error('删除邀请码失败:', error);
      res.status(500).json({
        code: 500,
        msg: error.message || '删除失败'
      });
    }
  }
}

export default new InvitationController();