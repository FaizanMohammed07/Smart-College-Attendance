import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Response interceptor: handle 401
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      if (window.location.hash !== "#login") {
        window.location.hash = "login";
        window.location.reload();
      }
    }
    return Promise.reject(error);
  },
);

// ── Auth API ──
export const authAPI = {
  login: (email: string, password: string) =>
    api.post("/auth/login", { email, password }),
  getMe: () => api.get("/auth/me"),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.put("/auth/change-password", { currentPassword, newPassword }),
};

// ── Admin API ──
export const adminAPI = {
  // Users
  getUsers: (params = {}) => api.get("/admin/users", { params }),
  createUser: (data: any) => api.post("/admin/users", data),
  updateUser: (id: string, data: any) => api.put(`/admin/users/${id}`, data),
  deleteUser: (id: string) => api.delete(`/admin/users/${id}`),
  // Faculty
  getFaculty: () => api.get("/admin/faculty"),
  createFaculty: (data: any) => api.post("/admin/faculty", data),
  updateFaculty: (id: string, data: any) =>
    api.put(`/admin/faculty/${id}`, data),
  // Classrooms
  getClassrooms: () => api.get("/admin/classrooms"),
  createClassroom: (data: any) => api.post("/admin/classrooms", data),
  updateClassroom: (id: string, data: any) =>
    api.put(`/admin/classrooms/${id}`, data),
  deleteClassroom: (id: string) => api.delete(`/admin/classrooms/${id}`),
  // Subjects
  getSubjects: (params = {}) => api.get("/admin/subjects", { params }),
  createSubject: (data: any) => api.post("/admin/subjects", data),
  updateSubject: (id: string, data: any) =>
    api.put(`/admin/subjects/${id}`, data),
  deleteSubject: (id: string) => api.delete(`/admin/subjects/${id}`),
  // Timetable
  getTimetable: (params = {}) => api.get("/admin/timetable", { params }),
  createTimetable: (data: any) => api.post("/admin/timetable", data),
  updateTimetable: (id: string, data: any) =>
    api.put(`/admin/timetable/${id}`, data),
  deleteTimetable: (id: string) => api.delete(`/admin/timetable/${id}`),
  // Linking
  linkParent: (parentUserId: string, studentId: string) =>
    api.post("/admin/link-parent", { parentUserId, studentId }),
  assignClassroom: (classroomId: string, studentIds: string[]) =>
    api.post("/admin/assign-classroom", { classroomId, studentIds }),
  // Overview
  getOverview: () => api.get("/admin/overview"),
};

// ── Faculty API ──
export const facultyAPI = {
  getDashboard: () => api.get("/faculty/dashboard"),
  getTimetable: (params = {}) => api.get("/faculty/timetable", { params }),
  getStudents: (params = {}) => api.get("/faculty/students", { params }),
  getAttendance: (params = {}) => api.get("/faculty/attendance", { params }),
};

// ── Student Dashboard API ──
export const studentDashAPI = {
  getDashboard: () => api.get("/student-dash/dashboard"),
  getTimetable: (params = {}) => api.get("/student-dash/timetable", { params }),
  getAttendance: (params = {}) => api.get("/student-dash/attendance", { params }),
  getSubjects: () => api.get("/student-dash/subjects"),
};

// ── Parent API ──
export const parentAPI = {
  getDashboard: () => api.get("/parent/dashboard"),
  getAttendance: (params = {}) => api.get("/parent/attendance", { params }),
  getTrends: (days = 14) => api.get("/parent/trends", { params: { days } }),
};

// ── Notifications API ──
export const notificationsAPI = {
  getAll: (params = {}) => api.get("/notifications", { params }),
  markRead: (id: string) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put("/notifications/read-all"),
};

// ── Students API (existing) ──
export const studentsAPI = {
  getAll: (params = {}) => api.get("/students", { params }),
  getById: (id: string) => api.get(`/students/${id}`),
  create: (data: any) => api.post("/students", data),
  update: (id: string, data: any) => api.put(`/students/${id}`, data),
  delete: (id: string) => api.delete(`/students/${id}`),
  getFacesDescriptors: () => api.get("/students/faces/descriptors"),
};

// ── Attendance API (existing) ──
export const attendanceAPI = {
  recordEntry: (studentId: string, livenessScore?: number) =>
    api.post("/attendance/entry", { studentId, livenessScore }),
  recordExit: (studentId: string) =>
    api.post("/attendance/exit", { studentId }),
  getLogs: (params = {}) => api.get("/attendance/logs", { params }),
  getActive: () => api.get("/attendance/active"),
  getSummary: (date: string) => api.get(`/attendance/summary/${date}`),
  update: (id: string, data: any) => api.put(`/attendance/${id}`, data),
};

// ── Analytics API (existing) ──
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
