import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { User, AuthState } from '@/types';

interface AuthStore extends AuthState {
  setUser: (user: User | undefined) => void;
  setAuthenticated: (isAuthenticated: boolean) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: any) => void;
  login: (user: User) => void;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>()(
  immer((set, get) => ({
    isAuthenticated: false,
    user: undefined,
    session: undefined,
    loading: false,
    error: undefined,

    setUser: (user) => {
      set((state) => {
        state.user = user;
        state.isAuthenticated = !!user;
      });
    },

    setAuthenticated: (isAuthenticated) => {
      set((state) => {
        state.isAuthenticated = isAuthenticated;
      });
    },

    setLoading: (loading) => {
      set((state) => {
        state.loading = loading;
      });
    },

    setError: (error) => {
      set((state) => {
        state.error = error;
      });
    },

    login: (user) => {
      set((state) => {
        state.user = user;
        state.isAuthenticated = true;
        state.error = undefined;
      });
    },

    logout: () => {
      set((state) => {
        state.user = undefined;
        state.isAuthenticated = false;
        state.session = undefined;
        state.error = undefined;
      });
    },

    checkAuth: async () => {
      set((state) => {
        state.loading = true;
      });

      try {
        const response = await fetch('/api/auth/status');
        if (response.ok) {
          const data = await response.json();
          set((state) => {
            state.user = data.user;
            state.isAuthenticated = data.isAuthenticated;
            state.session = data.session;
          });
        } else {
          set((state) => {
            state.isAuthenticated = false;
            state.user = undefined;
          });
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        set((state) => {
          state.isAuthenticated = false;
          state.user = undefined;
          state.error = {
            code: 'AUTH_CHECK_FAILED',
            message: error instanceof Error ? error.message : 'Auth check failed',
            details: error,
            timestamp: new Date()
          };
        });
      } finally {
        set((state) => {
          state.loading = false;
        });
      }
    }
  }))
);

export default useAuthStore;