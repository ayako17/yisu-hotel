// routes/merchant/upload.ts
import express from 'express';
import { uploadImage } from '../../controllers/merchant/upload.controller';

const router = express.Router();

// 直接使用，让 app.ts 的全局配置生效
// 不要使用 express.raw()，它会绕过 JSON 解析
router.post('/', uploadImage);

export default router;