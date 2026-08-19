import axios from 'axios';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api').replace(/\/$/, '');

const API = axios.create({
  baseURL: API_BASE_URL,
});

export const fetchInventory = () => API.get('/inventory');
export const createOrder = (orderData) => API.post('/orders/create', null, { params: orderData });
export const verifyPackImage = (formData) => API.post('/orders/verify-pack', formData);
export const submitDamageClaim = (claimData) => API.post('/customer/claim-refund', null, { params: claimData });    