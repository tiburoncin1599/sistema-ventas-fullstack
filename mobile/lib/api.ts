import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

let onUnauthorized: (() => void) | null = null;

export function setOnUnauthorized(cb: () => void) {
  onUnauthorized = cb;
}

const api = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL || 'https://web-production-c811d.up.railway.app',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await AsyncStorage.clear();
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('usuario');
      onUnauthorized?.();
    }
    return Promise.reject(error);
  },
);

export { api };
