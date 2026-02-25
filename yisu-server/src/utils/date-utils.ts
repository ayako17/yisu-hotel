/**
 * 日期工具函数
 */

// 格式化日期为 YYYY-MM-DD
export const formatDate = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString().slice(0, 10);
};

// 解析日期字符串
export const parseDate = (dateStr: string): Date => {
  return new Date(dateStr);
};

// 获取日期数组（从开始到结束）
export const getDateRange = (startDate: string, endDate: string): string[] => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const dates: string[] = [];
  
  let current = new Date(start);
  while (current <= end) {
    dates.push(formatDate(current));
    current.setDate(current.getDate() + 1);
  }
  
  return dates;
};

// 判断是否为周末
export const isWeekend = (date: Date | string): boolean => {
  const d = typeof date === 'string' ? new Date(date) : date;
  const day = d.getDay();
  return day === 0 || day === 6;
};

// 获取某月的天数
export const getDaysInMonth = (year: number, month: number): number => {
  return new Date(year, month + 1, 0).getDate();
};

// 日期加减天数
export const addDays = (date: Date | string, days: number): Date => {
  const d = typeof date === 'string' ? new Date(date) : new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

// 格式化显示日期（用于前端展示）
export const formatDisplayDate = (date: string): string => {
  return date.replace(/-/g, '.');
};