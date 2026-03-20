import api from './axios';

export const login          = (data) => api.post('/auth/login',           data);
export const logout         = (data) => api.post('/auth/logout',           data);
export const refreshToken   = (data) => api.post('/auth/refresh',          data);
export const getMe          = ()     => api.get('/auth/me');
export const changePassword = (data) => api.put('/auth/change-password',   data);
export const getSessions    = ()     => api.get('/auth/sessions');
export const revokeSession  = (id)   => api.delete(`/auth/sessions/${id}`);
