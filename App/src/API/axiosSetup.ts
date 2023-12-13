import axios from "axios";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL;

const API = axios.create({
  baseURL: BASE_URL,
});

API.interceptors.request.use((req) => {
  const token = localStorage.getItem('Expendit-token') || null;
  const user_id = localStorage.getItem('Expendit-user') || null;

  if (token && user_id) {
    req.headers["Authorization"] = `Bearer ${JSON.parse(token)}`;
    req.headers["X-UserID"] = `Bearer ${JSON.parse(user_id)}`;
  }

  return req;
});

export { API };
