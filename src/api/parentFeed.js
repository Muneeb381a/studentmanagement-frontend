import api from './axios';
export const getParentFeed          = (params = {}) => api.get('/parent-feed', { params });
