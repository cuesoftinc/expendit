import axios from "axios";
import { getLocalStorageItem } from "@/utils/local-storage";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL;

const API = axios.create({
  baseURL: BASE_URL,
});

API.interceptors.request.use((req) => {
  const token = getLocalStorageItem("Expendit-token") || null;

  if (token) {
    req.headers["Authorization"] = `Bearer ${JSON.parse(token)}`;

    const user_id = getLocalStorageItem("Expendit-userID") || null;
    if (user_id) {
      req.headers["X-UserID"] = `${JSON.parse(user_id)}`;
    }
  }

  return req;
});

export { API };
