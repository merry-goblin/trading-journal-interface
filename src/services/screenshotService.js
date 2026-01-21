import api from './api'

export const getScreenshots = (filters = {}) =>
    api.get('/screenshots', { params: filters })

export const getScreenshotImage = (id) =>
    api.get(`/frontApi/screenshots/${id}/image`, {
        responseType: 'blob'
    })