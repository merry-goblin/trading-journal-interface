import api from './api'

/**
 * Construit les params en retirant les valeurs vides/nulles,
 * sauf isBacktest qui peut etre null (= tous).
 */
function buildParams(filters = {}) {
    const p = {}
    Object.entries(filters).forEach(([k, v]) => {
        if (k === 'isBacktest') {
            // null => 'null' (le backend interprete comme "tous")
            p[k] = v === null ? 'null' : v
        } else if (v !== '' && v !== null && v !== undefined) {
            p[k] = v
        }
    })
    return p
}

export const getStats      = (filters = {}) =>
    api.get('/stats',                { params: buildParams(filters) })

export const getStatsByTag = (filters = {}) =>
    api.get('/stats/by-tag',         { params: buildParams(filters) })

export const getEquity     = (filters = {}) =>
    api.get('/equity',               { params: buildParams(filters) })

export const getRRDist     = (filters = {}) =>
    api.get('/stats/rr-distribution',{ params: buildParams(filters) })

export const getTemporal   = (filters = {}) =>
    api.get('/stats/temporal',       { params: buildParams(filters) })
