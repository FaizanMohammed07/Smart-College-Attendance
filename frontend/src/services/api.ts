import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Students API
export const studentsAPI = {
  getAll: (params = {}) => api.get("/students", { params }),
  getById: (id: string) => api.get(`/students/${id}`),
  create: (data: any) => api.post("/students", data),
  update: (id: string, data: any) => api.put(`/students/${id}`, data),
  delete: (id: string) => api.delete(`/students/${id}`),
  getFacesDescriptors: () => api.get("/students/faces/descriptors"),
};

// Attendance API
export const attendanceAPI = {
  recordEntry: (studentId: string) =>
    api.post("/attendance/entry", { studentId }),
  recordExit: (studentId: string) =>
    api.post("/attendance/exit", { studentId }),
  getLogs: (params = {}) => api.get("/attendance/logs", { params }),
  getActive: () => api.get("/attendance/active"),
  getSummary: (date: string) => api.get(`/attendance/summary/${date}`),
  update: (id: string, data: any) => api.put(`/attendance/${id}`, data),
};

// Analytics API
export const analyticsAPI = {
  getDashboard: () => api.get("/analytics/dashboard"),
  getTrends: (days = 7) => api.get("/analytics/trends", { params: { days } }),
  getDepartments: () => api.get("/analytics/departments"),
  getStudentsSummary: (days = 30) =>
    api.get("/analytics/students-summary", { params: { days } }),
  getStudentHistory: (studentId: string, params = {}) =>
    api.get(`/analytics/student/${studentId}`, { params }),
};

export default api;
