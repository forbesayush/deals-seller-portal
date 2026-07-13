import { create } from 'zustand';

interface UserState {
  id: string;
  name: string;
  email: string;
  mobile: string | null;
  role: string;
  status: string;
  joined: string;
  verified: boolean;
  referral: string;
}

interface AuthStore {
  user: UserState | null;
  isAuthenticated: boolean;
  loading: boolean;
  setUser: (user: UserState | null) => void;
  setAuthenticated: (status: boolean) => void;
  checkAuth: () => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuth = create<AuthStore>((set) => ({
  user: null,
  isAuthenticated: false,
  loading: true,
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  setAuthenticated: (status) => set({ isAuthenticated: status }),
  
  checkAuth: async () => {
    set({ loading: true });
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      if (data.success && data.user) {
        set({ user: data.user, isAuthenticated: true });
      } else {
        set({ user: null, isAuthenticated: false });
      }
    } catch (e) {
      set({ user: null, isAuthenticated: false });
    } finally {
      set({ loading: false });
    }
  },

  logout: async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {
      // ignore
    }
    set({ user: null, isAuthenticated: false });
    window.location.href = '/login';
  }
}));
