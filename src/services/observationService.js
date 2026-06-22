import api from './api'

export const getObservations  = (filters = {}, page = 1, limit = 20) =>
    api.get('/observations', { params: { page, limit, ...filters } })

export const getObservation   = (id) => api.get(`/observation/${id}`)

export const createObservation = (data) => api.post('/observation', data)

export const updateObservation = (id, data) => api.patch(`/observation/${id}`, data)

export const deleteObservation = (id) => api.delete(`/observation/${id}`)
