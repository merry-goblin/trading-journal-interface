import api from './api'

export const getPositions = (filters = {}, page = 1, limit = 20) =>
    api.get('/positions', { params: { page, limit, ...filters } })

export const getPosition = (id) =>
    api.get(`/position/${id}`)

export const enrichPosition = (id, data) =>
    api.patch(`/position/${id}`, data)

export const deletePosition = (id) =>
    api.delete(`/position/${id}`)
