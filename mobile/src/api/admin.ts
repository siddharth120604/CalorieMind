import client from './client';

export const getPendingUsersApi = () => client.get('/admin/pending');

export const approveUserApi = (userId: number) => client.post(`/admin/approve/${userId}`);

export const rejectUserApi = (userId: number) => client.post(`/admin/reject/${userId}`);

export const promoteUserApi = (userId: number) => client.post(`/admin/promote/${userId}`);

export const getAllUsersApi = () => client.get('/admin/users');
