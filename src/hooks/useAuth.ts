import { create } from 'zustand';

// ── JWT Token helpers for MongoDB mode ──
export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('ds_jwt_token');
}

export function setAuthToken(token: string | null) {
  if (typeof window === 'undefined') return;
  if (token) localStorage.setItem('ds_jwt_token', token);
  else localStorage.removeItem('ds_jwt_token');
}

// Augmented fetch that injects JWT Authorization header when token exists
export async function authFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const token = getAuthToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(init?.headers as Record<string, string> || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return fetch(input, { ...init, headers });
}

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
  upi?: string | null;
  bio?: string | null;
  vipTier?: string | null;
  kycStatus?: string | null;
  [key: string]: any;
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
      const res = await authFetch('/api/auth/me');
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
      await authFetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {/* ignore */}
    setAuthToken(null);
    // Clear mock session too
    if (typeof window !== 'undefined') sessionStorage.removeItem('ds_session_user_id');
    set({ user: null, isAuthenticated: false });
    window.location.href = '/login';
  }
}));
