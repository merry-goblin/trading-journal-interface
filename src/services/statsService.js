import api from './api'

export const getStats      = (tagId = null) =>
    api.get('/stats',        { params: tagId ? { tagId } : {} })

export const getStatsByTag = () =>
    api.get('/stats/by-tag')

export const getEquity     = (tagId = null) =>
    api.get('/equity',       { params: tagId ? { tagId } : {} })
