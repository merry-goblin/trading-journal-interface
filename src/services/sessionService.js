import api from './api'

export const getSession    = (date)       => api.get(`/session/${date}`)
export const updateSession = (date, data) => api.patch(`/session/${date}`, data)
