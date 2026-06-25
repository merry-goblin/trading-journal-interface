import api from './api'

export const getStats       = (tagId = null, isBacktest = false) =>
    api.get('/stats',                { params: { ...(tagId ? { tagId } : {}), isBacktest } })

export const getStatsByTag  = () =>
    api.get('/stats/by-tag')

export const getEquity      = (tagId = null, isBacktest = false) =>
    api.get('/equity',               { params: { ...(tagId ? { tagId } : {}), isBacktest } })

export const getRRDist      = (tagId = null, isBacktest = false) =>
    api.get('/stats/rr-distribution',{ params: { ...(tagId ? { tagId } : {}), isBacktest } })

export const getTemporal    = (isBacktest = false) =>
    api.get('/stats/temporal',       { params: { isBacktest } })
