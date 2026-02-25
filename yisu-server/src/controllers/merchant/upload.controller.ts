// controllers/merchant/upload.controller.ts
import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';

const UPLOAD_DIR = path.join(__dirname, '../../../uploads');

export const uploadImage = async (req: Request, res: Response) => {
  try {
    console.log('收到上传请求 body 类型:', typeof req.body);
    console.log('收到上传请求 body 键:', Object.keys(req.body));
    
    const { base64, filename } = req.body;
    
    if (!base64) {
      return res.status(400).json({ code: 400, msg: '缺少base64数据' });
    }
    
    // 处理base64
    const base64Data = base64.includes(',') ? base64.split(',')[1] : base64;
    const buffer = Buffer.from(base64Data, 'base64');
    
    // 检查文件大小
    const fileSizeMB = buffer.length / (1024 * 1024);
    console.log(`文件大小: ${fileSizeMB.toFixed(2)}MB`);
    
    // 生成文件名
    const ext = filename ? path.extname(filename) : '.jpg';
    const fileName = `img_${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`;
    const filePath = path.join(UPLOAD_DIR, fileName);
    
    console.log('上传目录:', UPLOAD_DIR);
    console.log('完整文件路径:', filePath);
    
    // 确保上传目录存在
    if (!fs.existsSync(UPLOAD_DIR)) {
      console.log('上传目录不存在，创建目录');
      fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    }
    
    // 保存文件
    fs.writeFileSync(filePath, buffer);
    console.log('文件保存成功:', fileName);
    
    // 检查文件是否存在
    if (fs.existsSync(filePath)) {
      console.log('文件存在确认');
      
      // 获取文件信息
      const stats = fs.statSync(filePath);
      console.log('文件大小:', stats.size, 'bytes');
      console.log('文件权限:', stats.mode.toString(8));
    } else {
      console.log('文件不存在！');
    }
    
    // 返回完整的URL
    const protocol = req.protocol;
    const host = req.get('host');
    const fullUrl = `${protocol}://${host}/uploads/${fileName}`;
    const relativeUrl = `/uploads/${fileName}`;
    
    console.log('返回的URL:', fullUrl);
    console.log('返回的相对路径:', relativeUrl);
    
    res.json({
      code: 200,
      url: fullUrl,
      relativeUrl: relativeUrl,
      fileName: fileName,
      msg: '上传成功'
    });
  } catch (error) {
    console.error('上传失败:', error);
    res.status(500).json({ code: 500, msg: '上传失败: ' + (error as Error).message });
  }
};