import client from './client';

export const getNotificationsApi = (unreadOnly?: boolean) =>
  client.get('/notifications', { params: unreadOnly ? { unread_only: 'true' } : {} });

export const markNotificationReadApi = (id: number) =>
  client.post(`/notifications/${id}/read`);
