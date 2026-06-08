import axios from 'axios';

const backendHost = process.env.NEXT_PUBLIC_BACKEND_HOST;
const baseURL = backendHost ? `https://${backendHost}/api` : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api');

const api = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default api;
