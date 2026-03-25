import client from './client';

export const getActivitiesApi = (date?: string) =>
  client.get('/activities', { params: date ? { date } : {} });

export const addActivityApi = (activity_text: string) =>
  client.post('/activities', { activity_text });

export const deleteActivityApi = (id: number) => client.delete(`/activities/${id}`);
