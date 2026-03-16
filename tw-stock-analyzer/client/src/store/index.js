import { create } from 'zustand';
import { authAPI, userAPI } from '../services/api';

export const useAuthStore = create((set, get) => ({
  user: null,
  token: localStorage.getItem('token'),
  isAuthenticated: false,
  isLoading: false,
  error: null,

  // Initialize - check if user is logged in
  initialize: async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      set({ isAuthenticated: false, user: null });
      return;
    }

    try {
      set({ isLoading: true });
      const response = await authAPI.verify();
      set({ 
        user: response.data.user, 
        isAuthenticated: true, 
        isLoading: false 
      });
    } catch (error) {
      localStorage.removeItem('token');
      set({ user: null, token: null, isAuthenticated: false, isLoading: false });
    }
  },

  // Register
  register: async (email, password, name) => {
    try {
      set({ isLoading: true, error: null });
      const response = await authAPI.register({ email, password, name });
      const { token, user } = response.data;
      localStorage.setItem('token', token);
      set({ user, token, isAuthenticated: true, isLoading: false });
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.error?.message || '註冊失敗';
      set({ error: message, isLoading: false });
      return { success: false, error: message };
    }
  },

  // Login
  login: async (email, password) => {
    try {
      set({ isLoading: true, error: null });
      const response = await authAPI.login({ email, password });
      const { token, user } = response.data;
      localStorage.setItem('token', token);
      set({ user, token, isAuthenticated: true, isLoading: false });
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.error?.message || '登入失敗';
      set({ error: message, isLoading: false });
      return { success: false, error: message };
    }
  },

  // Logout
  logout: async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      // Ignore logout errors
    }
    localStorage.removeItem('token');
    set({ user: null, token: null, isAuthenticated: false });
  },

  // Update profile
  updateProfile: async (data) => {
    try {
      set({ isLoading: true, error: null });
      const response = await userAPI.updateProfile(data);
      set({ user: { ...get().user, ...response.data.user }, isLoading: false });
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.error?.message || '更新失敗';
      set({ error: message, isLoading: false });
      return { success: false, error: message };
    }
  },

  // Change password
  changePassword: async (currentPassword, newPassword) => {
    try {
      set({ isLoading: true, error: null });
      await userAPI.changePassword({ currentPassword, newPassword });
      set({ isLoading: false });
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.error?.message || '密碼變更失敗';
      set({ error: message, isLoading: false });
      return { success: false, error: message };
    }
  },

  // Clear error
  clearError: () => set({ error: null }),
}));

// Watchlist store
export const useWatchlistStore = create((set, get) => ({
  watchlist: [],
  isLoading: false,

  fetchWatchlist: async () => {
    try {
      set({ isLoading: true });
      const response = await import('../services/api').then(m => m.watchlistAPI.getAll());
      set({ watchlist: response.data.watchlist, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
    }
  },

  addStock: async (stockCode) => {
    try {
      await import('../services/api').then(m => m.watchlistAPI.add(stockCode));
      await get().fetchWatchlist();
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.error?.message || '新增失敗';
      return { success: false, error: message };
    }
  },

  removeStock: async (stockCode) => {
    try {
      await import('../services/api').then(m => m.watchlistAPI.remove(stockCode));
      set({ watchlist: get().watchlist.filter(s => s.stockCode !== stockCode) });
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.error?.message || '刪除失敗';
      return { success: false, error: message };
    }
  },
}));

// Bookmarks store
export const useBookmarksStore = create((set, get) => ({
  bookmarks: [],
  isLoading: false,

  fetchBookmarks: async () => {
    try {
      set({ isLoading: true });
      const response = await import('../services/api').then(m => m.bookmarksAPI.getAll());
      set({ bookmarks: response.data.bookmarks, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
    }
  },

  createBookmark: async (name, filters) => {
    try {
      await import('../services/api').then(m => m.bookmarksAPI.create({ name, filters }));
      await get().fetchBookmarks();
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.error?.message || '建立失敗';
      return { success: false, error: message };
    }
  },

  deleteBookmark: async (id) => {
    try {
      await import('../services/api').then(m => m.bookmarksAPI.delete(id));
      set({ bookmarks: get().bookmarks.filter(b => b.id !== id) });
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.error?.message || '刪除失敗';
      return { success: false, error: message };
    }
  },
}));
