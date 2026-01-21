import api from './api'

export const login = (email, password) =>
    api.post('/login', { email, password })

export const me = () =>
    api.get('/me')

export const logout = () =>
    localStorage.removeItem('jwt')
