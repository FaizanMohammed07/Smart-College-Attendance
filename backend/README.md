# Attendance System Backend

Backend API for Face Recognition Attendance System

## Tech Stack

- Node.js
- Express.js
- MongoDB
- Socket.IO (for real-time updates)

## Setup

### Prerequisites

- Node.js (v18 or higher)
- MongoDB (running locally or MongoDB Atlas)

### Installation

1. Install dependencies:

```bash
npm install
```

2. Create `.env` file:

```bash
cp .env.example .env
```

3. Update `.env` with your configuration:

```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/attendance_system
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
```

4. Seed the database (optional):

```bash
npm run seed
```

5. Start the server:

```bash
# Development
npm run dev

# Production
npm start
```

## API Endpoints

### Students

- `GET /api/students` - Get all students
- `GET /api/students/:id` - Get student by ID
- `POST /api/students` - Create new student
- `PUT /api/students/:id` - Update student
- `DELETE /api/students/:id` - Delete student
- `GET /api/students/faces/descriptors` - Get students with face descriptors

### Attendance

- `POST /api/attendance/entry` - Record entry
- `POST /api/attendance/exit` - Record exit
- `GET /api/attendance/logs` - Get attendance logs
- `GET /api/attendance/active` - Get currently active students
- `GET /api/attendance/summary/:date` - Get attendance summary for date
- `PUT /api/attendance/:id` - Update attendance record

### Analytics

- `GET /api/analytics/dashboard` - Get dashboard statistics
- `GET /api/analytics/trends` - Get attendance trends
- `GET /api/analytics/departments` - Get department-wise statistics
- `GET /api/analytics/student/:studentId` - Get student attendance history

## Attendance Logic

The system calculates attendance status based on duration:

- **Present**: Duration >= 30 minutes
- **Partial**: Duration >= 10 minutes and < 30 minutes
- **Absent**: Duration < 10 minutes

## Socket.IO Events

### Client → Server

- `face:detected` - When a face is detected
- `attendance:update` - Manual attendance update

### Server → Client

- `attendance:entry` - New entry recorded
- `attendance:exit` - Exit recorded
- `attendance:duration:update` - Duration updates every 30 seconds
- `active:students` - List of currently active students
- `face:detected:broadcast` - Broadcast face detection to all clients
