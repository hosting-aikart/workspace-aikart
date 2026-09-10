import React from 'react';
import { Redirect } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { LoadingScreen } from '../src/components/LoadingScreen';

export default function IndexScreen() {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen message="Initializing AIKart Workspace..." />;
  }

  if (!isAuthenticated || !user) {
    return <Redirect href="/(auth)/login" />;
  }

  if (user.role === 'ADMIN') {
    return <Redirect href="/(admin)" />;
  }

  if (user.role === 'MANAGER') {
    return <Redirect href="/(manager)" />;
  }

  return <Redirect href="/(employee)" />;
}
