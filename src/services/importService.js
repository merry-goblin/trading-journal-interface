import api from './api'

export const importPositions = (timeframeId, positions, isBacktest = true) =>
    api.post('/import/positions', { timeframeId, positions, isBacktest })
