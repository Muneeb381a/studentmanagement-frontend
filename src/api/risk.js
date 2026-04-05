import api from './axios';

export const getStudentRisk = (studentId) =>
  api.get(`/risk/student/${studentId}`);

export const getRiskScores = (params = {}) =>
  api.get('/risk/scores', { params });

export const getRiskSummary = () =>
  api.get('/risk/summary');

export const recalculateRisk = () =>
  api.post('/risk/recalculate');
