import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { initAuth, fetchProfile } from '../store/authSlice';
import AuthNavigator from './AuthNavigator';
import AppNavigator from './AppNavigator';
import LoadingSpinner from '../components/LoadingSpinner';

export default function RootNavigator() {
  const dispatch = useAppDispatch();
  const { isAuthenticated, initializing, user } = useAppSelector((s) => s.auth);

  useEffect(() => {
    dispatch(initAuth());
  }, [dispatch]);

  useEffect(() => {
    if (isAuthenticated && !user) {
      dispatch(fetchProfile());
    }
  }, [isAuthenticated, user, dispatch]);

  if (initializing) return <LoadingSpinner text="Starting..." />;

  return (
    <NavigationContainer>
      {isAuthenticated ? <AppNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}
