import axios from 'axios';
import type { Invoice, Vendor, PurchaseOrder, AgentActivity, AgentSuggestion, DashboardStats } from '../types';

const API_BASE_URL = 'https://server-eb0g35lmt-xelix-projects.vercel.app/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const invoiceService = {
  getAll: async (params?: { status?: string; vendorId?: string; hasIssues?: boolean }) => {
    const response = await api.get<Invoice[]>('/invoices', { params });
    return response.data;
  },

  getById: async (id: string) => {
    const response = await api.get<Invoice>(`/invoices/${id}`);
    return response.data;
  },

  updateStatus: async (id: string, status: string) => {
    const response = await api.patch<Invoice>(`/invoices/${id}/status`, { status });
    return response.data;
  },

  createMatch: async (invoiceId: string, lineItemId: string, data: {
    poLineItemId: string;
    matchType: string;
    confidenceScore: number;
    matchNotes?: string;
  }) => {
    const response = await api.post(`/invoices/${invoiceId}/line-items/${lineItemId}/match`, data);
    return response.data;
  },

  getSuggestions: async (invoiceId: string, lineItemId: string) => {
    const response = await api.get(`/invoices/${invoiceId}/line-items/${lineItemId}/suggestions`);
    return response.data;
  },

  bulkApprove: async (invoiceIds: string[]) => {
    const response = await api.post('/invoices/bulk-approve', { invoiceIds });
    return response.data;
  },
};

export const vendorService = {
  getAll: async () => {
    const response = await api.get<Vendor[]>('/vendors');
    return response.data;
  },

  getById: async (id: string) => {
    const response = await api.get<Vendor>(`/vendors/${id}`);
    return response.data;
  },
};

export const purchaseOrderService = {
  getAll: async (params?: { vendorId?: string; status?: string }) => {
    const response = await api.get<PurchaseOrder[]>('/purchase-orders', { params });
    return response.data;
  },

  getById: async (id: string) => {
    const response = await api.get<PurchaseOrder>(`/purchase-orders/${id}`);
    return response.data;
  },
};

export const agentService = {
  getActivities: async (limit?: number) => {
    const response = await api.get<AgentActivity[]>('/agents/activities', { params: { limit } });
    return response.data;
  },

  getInsights: async () => {
    const response = await api.get('/agents/insights');
    return response.data;
  },

  getSuggestions: async () => {
    const response = await api.get<AgentSuggestion[]>('/agents/suggestions');
    return response.data;
  },
};

export const dashboardService = {
  getStats: async () => {
    const response = await api.get<DashboardStats>('/dashboard/stats');
    return response.data;
  },

  getTimeSeries: async (days?: number) => {
    const response = await api.get('/dashboard/time-series', { params: { days } });
    return response.data;
  },
};