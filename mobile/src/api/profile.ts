import client from './client';

export const getProfileApi = () => client.get('/profile');

export const updateProfileApi = (data: {
  name: string;
  age: number;
  gender: string;
  weight: number;
  height: number;
  goal: string;
}) => client.put('/profile', data);
