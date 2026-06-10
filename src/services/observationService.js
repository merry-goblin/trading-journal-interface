import api from './api'

export const getObservations = (filters = {}, page = 1, limit = 20) =>
    api.get('/observations', { params: { page, limit, ...filters } })

export const getObservation = (id) =>
    api.get(`/observation/${id}`)
