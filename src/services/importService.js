import api from './api'

export const importPositions = (timeframeId, positions) =>
    api.post('/import/positions', { timeframeId, positions })
