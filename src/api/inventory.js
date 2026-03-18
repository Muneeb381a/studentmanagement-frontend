import api from './axios';

export const getInventoryItems   = (params) => api.get('/inventory', { params });
export const getInventorySummary = ()        => api.get('/inventory/summary');
export const createInventoryItem = (data)    => api.post('/inventory', data);
export const updateInventoryItem = (id, data)=> api.put(`/inventory/${id}`, data);
export const deleteInventoryItem = (id)      => api.delete(`/inventory/${id}`);
