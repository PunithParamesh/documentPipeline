import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000',
  withCredentials: true, // Crucial for sending/receiving HttpOnly cookies
});

export default api;
