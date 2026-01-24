import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;

export const authService = {
  signUp: async (data: any) => {
    return axios.post(`${API_URL}/api/auth/signup-organization`, data);
  },

  login: async (data: { email: string; password: string }) => {
    const res = await axios.post(`${API_URL}/auth/login`, data);
    localStorage.setItem("token", res.data.access_token);
    return res.data;
  },

  forgotPassword: async (data: { email: string }) => {
    const res = await axios.post(`${API_URL}/auth/forgot-password`, data);
    return res.data;
  },

  getToken: () => localStorage.getItem("token"),

  logout: () => {
    localStorage.removeItem("token");
  },
};
