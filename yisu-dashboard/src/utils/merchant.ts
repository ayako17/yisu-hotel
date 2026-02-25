import { message } from 'antd';
import axios from '../services/axios';

// 获取 token
export const getToken = () => {
  return localStorage.getItem('token');
};

// 图片上传
export const uploadImage = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append('image', file);
  
  try {
    const res = await axios.post('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    if (res.data.code === 200) {
      return res.data.data.url;
    }
    throw new Error(res.data.msg || '上传失败');
  } catch (error) {
    message.error('图片上传失败');
    throw error;
  }
};

// 图片选择器
export const pickAndUploadImage = async (): Promise<string> => {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        try {
          const url = await uploadImage(file);
          resolve(url);
        } catch (error) {
          reject(error);
        }
      }
    };
    input.click();
  });
};

// 格式化日期
export const formatDate = (date: string | Date) => {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString().split('T')[0];
};

// 格式化显示日期
export const formatDisplayDate = (date: string) => {
  if (!date) return '';
  return date.replace(/-/g, '.');
};