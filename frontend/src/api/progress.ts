import client from './client';

export const getWeeklyProgressApi = () => client.get('/progress/weekly');

export const getMonthlyProgressApi = () => client.get('/progress/monthly');

export const getProjectionApi = () => client.get('/progress/projection');

export const getAdjustmentApi = () => client.get('/progress/adjustment');

export const acceptAdjustmentApi = (suggested_target: number, correction_factor: number) =>
  client.post('/progress/adjustment/accept', { suggested_target, correction_factor });

export const rejectAdjustmentApi = () => client.post('/progress/adjustment/reject');
