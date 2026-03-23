import client from './client';

export const loginApi = (email: string, password: string) =>
  client.post('/auth/login', { email, password });

export const registerApi = (email: string, password: string, confirm_password: string) =>
  client.post('/auth/register', { email, password, confirm_password });

export const refreshTokenApi = (refreshToken: string) =>
  client.post('/auth/refresh', null, {
    headers: { Authorization: `Bearer ${refreshToken}` },
  });

export const logoutApi = () => client.post('/auth/logout');
