import client from './client';

export const logBodyMetricsApi = (data: {
  body_fat_pct?: number;
  muscle_mass?: number;
  waist_size?: number;
  date?: string;
}) => client.post('/body-metrics', data);

export const getBodyMetricsApi = (days?: number) =>
  client.get('/body-metrics', { params: days ? { days } : {} });
