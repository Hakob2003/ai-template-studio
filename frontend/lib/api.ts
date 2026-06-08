import axios from 'axios';

const isBrowser = typeof window !== 'undefined';

// On the client side, we use the relative /api path which Next.js rewrites to the backend.
let baseURL = '/api';

// On the server side (SSR/SSG), Next.js cannot use relative paths, so we use absolute URLs.
if (!isBrowser) {
  if (process.env.BACKEND_HOST) {
    baseURL = process.env.BACKEND_HOST.includes('.') 
      ? `https://${process.env.BACKEND_HOST}/api` 
      : `https://${process.env.BACKEND_HOST}.onrender.com/api`;
  } else {
    baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
  }
}

const api = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default api;
