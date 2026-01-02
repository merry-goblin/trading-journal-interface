import api from './api'

export const getTrades = (filters = {}) =>
    api.get('/trades', { params: filters })