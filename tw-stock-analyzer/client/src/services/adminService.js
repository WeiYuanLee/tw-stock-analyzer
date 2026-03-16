const API_BASE = '/api';

class AdminService {
  constructor() {
    this.token = localStorage.getItem('admin_token');
  }

  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('admin_token', token);
    } else {
      localStorage.removeItem('admin_token');
    }
  }

  getToken() {
    return this.token;
  }

  async request(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'Request failed');
    }

    return data;
  }

  // Admin authentication
  async login(email, password) {
    const data = await this.request('/admin/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (data.token) {
      this.setToken(data.token);
    }
    return data;
  }

  logout() {
    this.setToken(null);
  }

  // Dashboard
  async getDashboard() {
    return this.request('/admin/dashboard');
  }

  // Users
  async getUsers(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/admin/users?${query}`);
  }

  async getUser(id) {
    return this.request(`/admin/users/${id}`);
  }

  async updateUser(id, data) {
    return this.request(`/admin/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteUser(id) {
    return this.request(`/admin/users/${id}`, {
      method: 'DELETE',
    });
  }

  // Orders
  async getOrders(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/admin/orders?${query}`);
  }

  async getOrder(id) {
    return this.request(`/admin/orders/${id}`);
  }

  // Subscriptions
  async getSubscriptions(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/admin/subscriptions?${query}`);
  }

  // Alerts
  async getAlerts(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/admin/alerts?${query}`);
  }

  async toggleAlert(id) {
    return this.request(`/admin/alerts/${id}/toggle`, {
      method: 'PUT',
    });
  }

  // AI Stats
  async getAIStats() {
    return this.request('/admin/ai-stats');
  }
}

export const adminService = new AdminService();
export default adminService;
