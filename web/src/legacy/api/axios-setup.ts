import axios from "axios";
import { getLocalStorageItem } from "@/utils/local-storage";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL;

const API = axios.create({
  baseURL: BASE_URL,
});

API.interceptors.request.use((req) => {
  const token = getLocalStorageItem("Expendit-token") || null;

  if (token) {
    // Identity comes from the JWT alone — the backend derives the user id
    // from the token's uid claim, never from a client-supplied header.
    req.headers["Authorization"] = `Bearer ${JSON.parse(token)}`;
  }

  return req;
});

export { API };
