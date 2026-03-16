import { create } from 'zustand';
import { adminService } from '../services/adminService';

export const useAdminStore = create((set, get) => ({
  admin: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  initialize: () => {
    const token = adminService.getToken();
    if (token) {
      // Token exists, user is considered authenticated
      set({ isAuthenticated: true });
    }
  },

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const data = await adminService.login(email, password);
      set({
        admin: data.admin,
        isAuthenticated: true,
        isLoading: false,
      });
      return data;
    } catch (error) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  logout: () => {
    adminService.logout();
    set({
      admin: null,
      isAuthenticated: false,
      error: null,
    });
  },

  clearError: () => {
    set({ error: null });
  },
}));
