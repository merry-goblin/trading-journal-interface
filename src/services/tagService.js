import api from './api'

export const getTags = () =>
    api.get('/tags')

export const createTag = (data) =>
    api.post('/tag', data)
