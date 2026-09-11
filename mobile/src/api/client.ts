import axios from 'axios';
import { getAccessToken, removeAccessToken, removeCachedUserData } from '../utils/storage';

const getBaseUrl = (): string => {
  let url = process.env.EXPO_PUBLIC_API_URL;
  if (!url && typeof window !== 'undefined' && window.location) {
    url = `http://${window.location.hostname}:5000/api`;
  }
  if (!url) {
    url = 'http://localhost:5000/api';
  }
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

let cachedToken: string | null = null;

export const setStoredToken = (token: string | null) => {
  cachedToken = token;
};

export const getStoredToken = (): string | null => {
  return cachedToken;
};

api.interceptors.request.use(async (config) => {
  const token = await getAccessToken();
  if (token) {
    cachedToken = token;
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      console.warn('[API] 401 Unauthorized received — clearing invalid token');
      cachedToken = null;
      await removeAccessToken();
      await removeCachedUserData();
    }
    return Promise.reject(error);
  }
);
