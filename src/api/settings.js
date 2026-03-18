import api from './axios';

export const getSettings         = ()       => api.get('/settings');
export const saveSettings        = (data)   => api.put('/settings', data);
export const getAcademicYears    = ()       => api.get('/settings/academic-years');
export const createAcademicYear  = (data)   => api.post('/settings/academic-years', data);
export const setActiveYear       = (id)     => api.patch(`/settings/academic-years/${id}/activate`);
export const deleteAcademicYear  = (id)     => api.delete(`/settings/academic-years/${id}`);

export const uploadLogo = (file) => {
  const fd = new FormData();
  fd.append('logo', file);
  return api.post('/settings/logo', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
};
export const deleteLogo = () => api.delete('/settings/logo');
