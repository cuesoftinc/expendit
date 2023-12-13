import axios from "axios";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL;

const API = axios.create({
  baseURL: BASE_URL,
});

API.interceptors.request.use((req) => {
  const token = localStorage.getItem('Expendit-token') || null;
  if (token) {
    console.log(token)
    req.headers["Authorization"] = `Bearer ${JSON.parse(token)}`;
  }

  return req;
});

export { API };
