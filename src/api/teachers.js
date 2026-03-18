import api from './axios';

export const getTeachers = (params = {}) =>
  api.get('/teachers', { params });

export const getTeacher = (id) =>
  api.get(`/teachers/${id}`);

export const createTeacher = (data) =>
  api.post('/teachers', data);

export const updateTeacher = (id, data) =>
  api.put(`/teachers/${id}`, data);

export const deleteTeacher = (id) =>
  api.delete(`/teachers/${id}`);

/** Classes assigned to this teacher */
export const getTeacherClasses = (id) =>
  api.get(`/teachers/${id}/classes`);

/** Students taught by this teacher (via their classes) */
export const getTeacherStudents = (id) =>
  api.get(`/teachers/${id}/students`);

export const uploadTeacherPhoto = (id, formData) =>
  api.post(`/teachers/${id}/photo`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });

export const getTeacherDocuments = (id) =>
  api.get(`/teachers/${id}/documents`);

export const uploadTeacherDocument = (id, formData) =>
  api.post(`/teachers/${id}/documents`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });

export const deleteTeacherDocument = (teacherId, docId) =>
  api.delete(`/teachers/${teacherId}/documents/${docId}`);
