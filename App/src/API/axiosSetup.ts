import axios from "axios";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL;

const API = axios.create({
  baseURL: BASE_URL,
})

// API.interceptors.request.use((req) => {
//   if(localStorage.getItem('fintrust-token')){
//     req.headers.authorization = `Bearer ${JSON.parse(localStorage.getItem('fintrust-token'))}`;
//   }

//   return req;
// });



export { API };