import express from 'express';
import { getTags } from '../../controllers/merchant/tags.controller';

const router = express.Router();

router.get('/', getTags);

export default router;