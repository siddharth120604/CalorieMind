import client from './client';

export const getGoalsApi = () => client.get('/goals');

export const updateGoalsApi = (data: {
  target_weight?: number | null;
  target_body_fat_pct?: number | null;
  target_muscle_mass?: number | null;
  target_waist_size?: number | null;
}) => client.put('/goals', data);

export const getGoalStatusApi = () => client.get('/goals/status');
