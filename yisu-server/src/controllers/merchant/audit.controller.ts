import { Request, Response } from 'express';
import pool from '../../config/db';

// 获取当前商户的审核记录
export const getMyAuditRecords = async (req: Request, res: Response) => {
  try {
    const merchant_id = req.user!.user_id;
    
    console.log('获取审核记录, 商户ID:', merchant_id);
    
    // 查询审核申请及其对应的审核日志
    const [records]: any = await pool.query(
      `SELECT 
        aa.apply_id as id,
        aa.apply_reason as remark,
        aa.audit_status,
        aa.created_at as apply_time,
        al.action,
        al.reason as reject_reason,
        al.created_at as audit_time,
        u.username as operator
       FROM audits_apply aa
       LEFT JOIN audit_logs al ON aa.apply_id = al.apply_id
       LEFT JOIN users u ON al.admin_id = u.user_id
       WHERE aa.merchant_id = ?
       ORDER BY aa.created_at DESC, al.created_at DESC`,
      [merchant_id]
    );
    
    console.log('查询到审核记录:', records);
    
    // 格式化记录，将多条日志合并为一条审核记录
    const recordMap = new Map();
    
    (records || []).forEach((record: any) => {
      if (!recordMap.has(record.id)) {
        // 根据 audit_status 和 action 确定最终状态
        let status = 'pending';
        
        if (record.audit_status === 'completed') {
          if (record.action === 'approve') {
            status = 'approved';
          } else if (record.action === 'reject') {
            status = 'rejected';
          } else {
            // 如果没有操作记录但状态是 completed，默认为通过
            status = 'approved';
          }
        }
        
        // 构建审核记录
        const auditRecord: any = {
          id: record.id,
          remark: record.remark || '',
          status: status,
          created_at: record.apply_time,
          operator: record.operator || '系统'
        };
        
        // 如果是驳回，添加驳回原因
        if (status === 'rejected') {
          auditRecord.reject_reason = record.reject_reason || record.remark || '未提供原因';
        }
        
        recordMap.set(record.id, auditRecord);
      }
    });
    
    const formattedRecords = Array.from(recordMap.values());
    
    // 如果没有审核记录，从 merchant_profiles 的状态生成一条默认记录
    if (formattedRecords.length === 0) {
      const [profile]: any = await pool.query(
        'SELECT status, updated_at FROM merchant_profiles WHERE user_id = ?',
        [merchant_id]
      );
      
      console.log('商户资料:', profile);
      
      if (profile && profile.length > 0) {
        const defaultRecords = [{
          id: 0,
          remark: profile[0].status === 'approved' ? '商户资质已认证' : 
                  profile[0].status === 'rejected' ? '商户资质审核未通过' : '商户资质等待审核',
          status: profile[0].status,
          created_at: profile[0].updated_at || new Date(),
          operator: '系统',
          ...(profile[0].status === 'rejected' ? { reject_reason: '请检查资质材料并重新提交' } : {})
        }];
        
        return res.json({
          code: 200,
          data: defaultRecords
        });
      }
    }
    
    res.json({
      code: 200,
      data: formattedRecords
    });
    
  } catch (error) {
    console.error('获取审核记录失败:', error);
    res.status(500).json({ code: 500, msg: '服务器错误' });
  }
};

// 获取当前商户的审核状态
export const getMyAuditStatus = async (req: Request, res: Response) => {
  try {
    const merchant_id = req.user!.user_id;
    
    const [profile]: any = await pool.query(
      'SELECT status FROM merchant_profiles WHERE user_id = ?',
      [merchant_id]
    );
    
    const status = profile[0]?.status || 'pending';
    
    // 查询最新的审核日志
    const [latestLog]: any = await pool.query(
      `SELECT al.*, u.username 
       FROM audit_logs al
       JOIN audits_apply aa ON al.apply_id = aa.apply_id
       JOIN users u ON al.admin_id = u.user_id
       WHERE aa.merchant_id = ?
       ORDER BY al.created_at DESC
       LIMIT 1`,
      [merchant_id]
    );
    
    const statusTextMap: Record<string, string> = {
      'approved': '已认证',
      'rejected': '已驳回',
      'pending': '审核中'
    };
    
    const responseData: any = {
      status,
      statusText: statusTextMap[status] || '审核中'
    };
    
    // 如果是驳回状态，添加驳回原因
    if (status === 'rejected' && latestLog && latestLog[0]?.reason) {
      responseData.reject_reason = latestLog[0].reason;
    }
    
    res.json({
      code: 200,
      data: responseData
    });
    
  } catch (error) {
    console.error('获取审核状态失败:', error);
    res.status(500).json({ code: 500, msg: '服务器错误' });
  }
};

// 获取商户的待审核申请（用于商户查看自己有哪些申请在审核中）
export const getMyPendingApplies = async (req: Request, res: Response) => {
  try {
    const merchant_id = req.user!.user_id;
    
    const [applies]: any = await pool.query(
      `SELECT 
        apply_id,
        target_type,
        apply_reason,
        created_at
       FROM audits_apply
       WHERE merchant_id = ? AND audit_status = 'pending'
       ORDER BY created_at DESC`,
      [merchant_id]
    );
    
    res.json({
      code: 200,
      data: applies || []
    });
    
  } catch (error) {
    console.error('获取待审核申请失败:', error);
    res.status(500).json({ code: 500, msg: '服务器错误' });
  }
};