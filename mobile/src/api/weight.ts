import client from './client';

export const logWeightApi = (weight: number, date?: string, notes?: string) =>
  client.post('/weight', { weight, date, notes });

export const getWeightHistoryApi = (days?: number) =>
  client.get('/weight', { params: days ? { days } : {} });

export const getWeightTrendApi = (days?: number) =>
  client.get('/weight/trend', { params: days ? { days } : {} });
