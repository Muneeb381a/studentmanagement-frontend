import api from './axios';

// ── Summary ────────────────────────────────────────────────
export const getTransportSummary         = (params = {}) => api.get('/transport/summary',                    { params });
export const getStudentsWithoutTransport = (params = {}) => api.get('/transport/students-without-transport', { params });

// ── Buses ──────────────────────────────────────────────────
export const getBuses     = (params = {}) => api.get('/transport/buses',         { params });
export const getBusById   = (id)          => api.get(`/transport/buses/${id}`);
export const createBus    = (data)        => api.post('/transport/buses',        data);
export const updateBus    = (id, data)    => api.put(`/transport/buses/${id}`,   data);
export const deleteBus    = (id)          => api.delete(`/transport/buses/${id}`);

// ── Routes ─────────────────────────────────────────────────
export const getRoutes    = (params = {}) => api.get('/transport/routes',         { params });
export const getRouteById = (id)          => api.get(`/transport/routes/${id}`);
export const createRoute  = (data)        => api.post('/transport/routes',        data);
export const updateRoute  = (id, data)    => api.put(`/transport/routes/${id}`,   data);
export const deleteRoute  = (id)          => api.delete(`/transport/routes/${id}`);

// ── Stops ──────────────────────────────────────────────────
export const getStops     = (routeId)        => api.get(`/transport/routes/${routeId}/stops`);
export const addStop      = (routeId, data)  => api.post(`/transport/routes/${routeId}/stops`, data);
export const updateStop   = (id, data)       => api.put(`/transport/stops/${id}`,   data);
export const deleteStop   = (id)             => api.delete(`/transport/stops/${id}`);

// ── Assignments ────────────────────────────────────────────
export const getAssignments    = (params = {}) => api.get('/transport/assignments',         { params });
export const createAssignment  = (data)        => api.post('/transport/assignments',        data);
export const updateAssignment  = (id, data)    => api.put(`/transport/assignments/${id}`,   data);
export const deleteAssignment  = (id)          => api.delete(`/transport/assignments/${id}`);
