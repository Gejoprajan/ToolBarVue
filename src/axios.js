// src/axios.js
import axios from 'axios';

const axiosInstance = axios.create({
  baseURL: 'https://c109-120-61-117-114.ngrok-free.app/api', // Your Node server's base URL
});
