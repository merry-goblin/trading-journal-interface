import api from './api'

export const getAssets = (filters = {}) =>
    api.get('/assets', { params: filters })