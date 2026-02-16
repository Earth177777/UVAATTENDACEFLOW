import axios from 'axios';

const host = (typeof window !== 'undefined' && window.location.hostname) || import.meta.env.VITE_API_HOST || 'localhost';
const port = import.meta.env.VITE_API_PORT || 5001; // backend

export const API_URL = import.meta.env.VITE_API_URL || `http://${host}:${port}/api`;
export const WS_URL = import.meta.env.VITE_WS_URL || `ws://${host}:${port}`;

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export const login = (credentials: any) => api.post('/auth/login', credentials);

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            if (!window.location.pathname.includes('/login')) {
                localStorage.removeItem('token');
                localStorage.removeItem('currentUser');
                window.location.href = '/';
            }
        }
        return Promise.reject(error);
    }
);
export default api;
