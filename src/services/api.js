import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Sales APIs
export const salesAPI = {
  getDashboard: (period) => api.get('/sales', { params: { action: 'dashboard', period } }),
  getByProduct: (period) => api.get('/sales', { params: { action: 'by-product', period } }),
  getByCustomer: (period) => api.get('/sales', { params: { action: 'by-customer', period } }),
  getByRegion: (period) => api.get('/sales', { params: { action: 'by-region', period } }),
  getForecast: (periods) => api.get('/sales', { params: { action: 'forecast', periods } }),
  getReceivables: () => api.get('/sales', { params: { action: 'receivables' } }),
};

// Inventory APIs
export const inventoryAPI = {
  getDashboard: (period) => api.get('/inventory', { params: { action: 'dashboard', period } }),
  getByItem: (warehouseId) => api.get('/inventory', { params: { action: 'by-item', warehouse_id: warehouseId } }),
  getExpiry: (daysAhead) => api.get('/inventory', { params: { action: 'expiry', days_ahead: daysAhead } }),
  getHistory: (period) => api.get('/inventory', { params: { action: 'history', period } }),
  getValuation: (method) => api.get('/inventory', { params: { action: 'valuation', method } }),
  getRisk: () => api.get('/inventory', { params: { action: 'risk' } }),
};

// Production APIs
export const productionAPI = {
  getOutput: (period) => api.get('/production', { params: { action: 'output', period } }),
  getByProcess: (period) => api.get('/production', { params: { action: 'by-process', period } }),
  getUsage: (period) => api.get('/production', { params: { action: 'usage', period } }),
  getDefects: (period) => api.get('/production', { params: { action: 'defects', period } }),
  getEquipment: (period) => api.get('/production', { params: { action: 'equipment', period } }),
  getWIP: () => api.get('/production', { params: { action: 'wip' } }),
};

// Finance APIs
export const financeAPI = {
  getDashboard: (period) => api.get('/finance', { params: { action: 'dashboard', period } }),
  getByDepartment: (period) => api.get('/finance', { params: { action: 'by-dept', period } }),
  getByProduct: (period) => api.get('/finance', { params: { action: 'by-product', period } }),
  getCostStructure: (period) => api.get('/finance', { params: { action: 'cost-structure', period } }),
  getVariance: (period) => api.get('/finance', { params: { action: 'variance', period } }),
  getCashflow: (period) => api.get('/finance', { params: { action: 'cashflow', period } }),
};

export default api;