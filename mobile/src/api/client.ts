import axios from 'axios';
import { getAccessToken } from '../utils/storage';

const getBaseUrl = (): string => {
  let url = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:5000/api';
  url = url.trim().replace(/\/+$/, '');
  if (!/\/api$/i.test(url)) {
    url = `${url}/api`;
  }
  return url;
};

export const BASE_URL = getBaseUrl();

export const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  timeout: 15000,
});

api.interceptors.request.use(async (config) => {
  const token = await getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      console.warn('[API] 401 Unauthorized received — token expired or invalid');
    }
    return Promise.reject(error);
  }
);
