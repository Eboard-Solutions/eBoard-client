import axios from "axios";

const api = axios.create({
  baseURL: "https://eboard-server-6auf.onrender.com/api/v1",
});

export default api;
