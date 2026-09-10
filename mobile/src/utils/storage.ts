import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '../types';

const ACCESS_TOKEN_KEY = 'aikart_mobile_access_token';
const USER_CACHE_KEY = 'aikart_mobile_user_cache';

// ─── SecureStore — Sensitive Token Storage ─────────────────────────────────────

export async function saveAccessToken(token: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, token);
  } catch (error) {
    console.error('Failed to save access token in SecureStore:', error);
  }
}

export async function getAccessToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
  } catch (error) {
    console.error('Failed to read access token from SecureStore:', error);
    return null;
  }
}

export async function removeAccessToken(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
  } catch (error) {
    console.error('Failed to remove access token from SecureStore:', error);
  }
}

// ─── AsyncStorage — Non-Sensitive Cached User State ──────────────────────────────

export async function cacheUserData(user: User): Promise<void> {
  try {
    await AsyncStorage.setItem(USER_CACHE_KEY, JSON.stringify(user));
  } catch (error) {
    console.error('Failed to cache user data in AsyncStorage:', error);
  }
}

export async function getCachedUserData(): Promise<User | null> {
  try {
    const raw = await AsyncStorage.getItem(USER_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.error('Failed to read cached user data from AsyncStorage:', error);
    return null;
  }
}

export async function removeCachedUserData(): Promise<void> {
  try {
    await AsyncStorage.removeItem(USER_CACHE_KEY);
  } catch (error) {
    console.error('Failed to remove user cache from AsyncStorage:', error);
  }
}
