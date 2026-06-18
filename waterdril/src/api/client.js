// =============================================================================
//  Central axios client.
//  Single source of truth for the API base URL, default headers and auth.
//  The bearer token is injected per-request from localStorage so it always
//  reflects the latest login without re-creating the instance.
// =============================================================================
import axios from 'axios';

// Allow the base URL to be overridden at build time (CRA env var), falling
// back to the production host.
export const BASE_URL =
  (typeof process !== 'undefined' && process.env && process.env.REACT_APP_API_URL) ||
  'https://api.antonlinersystems.co.ke/';

const client = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Attach the JWT (if present) to every outgoing request.
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers = { ...config.headers, Authorization: `Bearer ${token}` };
  }
  return config;
});

export default client;
