import axios from "axios";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL;

const API = axios.create({
  baseURL: BASE_URL,
});

API.interceptors.request.use((req) => {
  if (localStorage.getItem('Expendit-token')) {
    const token = localStorage.getItem('Expendit-token');
    if (token !== null) {
      console.log(token)
      req.headers["Authorization"] = `Bearer ${JSON.parse(token)}`;
    }
  }

  return req;
});

export { API };
