import client from './client';

export const getMealsApi = (date?: string) =>
  client.get('/meals', { params: date ? { date } : {} });

export const addMealApi = (meal_text: string, meal_type?: string) =>
  client.post('/meals', { meal_text, meal_type });

export const deleteMealApi = (id: number) => client.delete(`/meals/${id}`);

export const repeatMealApi = (id: number) => client.post(`/meals/${id}/repeat`);
