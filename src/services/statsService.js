import api from './api'

export const getStats = () =>
    api.get('/stats')

export const getStatsByTag = () =>
    api.get('/stats/by-tag')
