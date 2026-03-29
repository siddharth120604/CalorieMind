import client from './client';

export const generateMealPlanApi = (date?: string) =>
  client.post('/meal-plans/generate', date ? { date } : {});

export const getMealPlansApi = (date?: string) =>
  client.get('/meal-plans', { params: date ? { date } : {} });

export const getMealPlanApi = (id: number) => client.get(`/meal-plans/${id}`);

export const deleteMealPlanApi = (id: number) => client.delete(`/meal-plans/${id}`);
