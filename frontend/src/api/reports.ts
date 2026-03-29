import client from './client';

export const getDailySummaryApi = (date?: string) =>
  client.get('/reports/daily', { params: date ? { date } : {} });

export const getDailyViewApi = (date?: string) =>
  client.get('/reports/daily/view', { params: date ? { date } : {} });

export const generateReportApi = (date?: string) =>
  client.post('/reports/daily/generate', date ? { date } : {});

export const getWeeklyDataApi = (endDate?: string) =>
  client.get('/reports/weekly', { params: endDate ? { end_date: endDate } : {} });

export const getMonthlyDataApi = (year?: number, month?: number) =>
  client.get('/reports/monthly', { params: { year, month } });

export const getReportsListApi = () => client.get('/reports');

export const getReportDetailApi = (id: number) => client.get(`/reports/${id}`);

export const exportDataApi = (startDate: string, endDate: string, format: 'csv' | 'txt') =>
  client.post('/reports/export', { start_date: startDate, end_date: endDate, format });
