import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { loginApi, registerApi } from '../api/auth';
import { getProfileApi } from '../api/profile';
import type { User } from '../utils/types';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  initializing: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  loading: false,
  initializing: true,
  error: null,
};

export const initAuth = createAsyncThunk('auth/init', async () => {
  const token = await AsyncStorage.getItem('access_token');
  return !!token;
});

export const login = createAsyncThunk(
  'auth/login',
  async ({ email, password }: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const res = await loginApi(email, password);
      await AsyncStorage.setItem('access_token', res.data.access_token);
      await AsyncStorage.setItem('refresh_token', res.data.refresh_token);
      return res.data.user as User;
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      return rejectWithValue(error.response?.data?.error || 'Login failed');
    }
  }
);

export const register = createAsyncThunk(
  'auth/register',
  async (
    { email, password, confirm_password }: { email: string; password: string; confirm_password: string },
    { rejectWithValue }
  ) => {
    try {
      const res = await registerApi(email, password, confirm_password);
      if (res.data.access_token) {
        await AsyncStorage.setItem('access_token', res.data.access_token);
        await AsyncStorage.setItem('refresh_token', res.data.refresh_token);
      }
      return res.data;
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      return rejectWithValue(error.response?.data?.error || 'Registration failed');
    }
  }
);

export const fetchProfile = createAsyncThunk(
  'auth/fetchProfile',
  async (_, { rejectWithValue }) => {
    try {
      const res = await getProfileApi();
      return res.data as User;
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch profile');
    }
  }
);

export const logoutAction = createAsyncThunk('auth/logout', async () => {
  await AsyncStorage.removeItem('access_token');
  await AsyncStorage.removeItem('refresh_token');
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError(state) {
      state.error = null;
    },
    setUser(state, action) {
      state.user = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(initAuth.fulfilled, (state, action) => {
        state.isAuthenticated = action.payload;
        state.initializing = false;
      })
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        state.isAuthenticated = true;
        state.user = action.payload;
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(register.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(register.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload.access_token) {
          state.isAuthenticated = true;
          state.user = action.payload.user;
        }
      })
      .addCase(register.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchProfile.fulfilled, (state, action) => {
        state.user = action.payload;
        state.isAuthenticated = true;
      })
      .addCase(fetchProfile.rejected, (state) => {
        state.user = null;
        state.isAuthenticated = false;
      })
      .addCase(logoutAction.fulfilled, (state) => {
        state.user = null;
        state.isAuthenticated = false;
      });
  },
});

export const { clearError, setUser } = authSlice.actions;
export default authSlice.reducer;
