
import axios from 'axios'

const api = axios.create({
    baseURL: 'http://www.trading-journal.local/frontApi'
})

api.interceptors.request.use(config => {
    const token = localStorage.getItem('jwt')
console.log('token to insert into request header')
console.log(token)
    if (token) {
        config.headers.Authorization = `Bearer ${token}`
    }

    return config
})

api.interceptors.response.use(
    response => response,
    error => {
        if (error.response?.status === 401) {
            localStorage.removeItem('jwt')
            window.location.href = '/login'
        }
        return Promise.reject(error)
    }
)

export default api
