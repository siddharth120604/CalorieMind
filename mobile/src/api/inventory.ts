import client from './client';

export const getInventoryApi = () => client.get('/inventory');

export const addInventoryItemApi = (name: string, quantity: string) =>
  client.post('/inventory', { name, quantity });

export const deleteInventoryItemApi = (id: number) => client.delete(`/inventory/${id}`);
