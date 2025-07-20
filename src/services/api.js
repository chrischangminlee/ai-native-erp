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
  getDashboard: (period) => api.get('/sales/dashboard', { params: { period } }),
  getByProduct: (period) => api.get('/sales/by-product', { params: { period } }),
  getByCustomer: (period) => api.get('/sales/by-customer', { params: { period } }),
  getByRegion: (period) => api.get('/sales/by-region', { params: { period } }),
  getForecast: (periods) => api.get('/sales/forecast', { params: { periods } }),
  getReceivables: () => api.get('/sales/receivables'),
};

// Inventory APIs
export const inventoryAPI = {
  getDashboard: (period) => api.get('/inventory/dashboard', { params: { period } }),
  getByItem: (warehouseId) => api.get('/inventory/by-item', { params: { warehouse_id: warehouseId } }),
  getExpiry: (daysAhead) => api.get('/inventory/expiry', { params: { days_ahead: daysAhead } }),
  getHistory: (period) => api.get('/inventory/history', { params: { period } }),
  getValuation: (method) => api.get('/inventory/valuation', { params: { method } }),
  getRisk: () => api.get('/inventory/risk'),
};

// Production APIs
export const productionAPI = {
  getOutput: (period) => api.get('/production/output', { params: { period } }),
  getByProcess: (period) => api.get('/production/by-process', { params: { period } }),
  getUsage: (period) => api.get('/production/usage', { params: { period } }),
  getDefects: (period) => api.get('/production/defects', { params: { period } }),
  getEquipment: (period) => api.get('/production/equipment', { params: { period } }),
  getWIP: () => api.get('/production/wip'),
};

// Finance APIs
export const financeAPI = {
  getDashboard: (period) => api.get('/finance/dashboard', { params: { period } }),
  getByDepartment: (period) => api.get('/finance/by-dept', { params: { period } }),
  getByProduct: (period) => api.get('/finance/by-product', { params: { period } }),
  getCostStructure: (period) => api.get('/finance/cost-structure', { params: { period } }),
  getVariance: (period) => api.get('/finance/variance', { params: { period } }),
  getCashflow: (period) => api.get('/finance/cashflow', { params: { period } }),
};

export default api;