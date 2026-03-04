# Attendance System Frontend

React + TypeScript frontend for the attendance system with real-time face recognition.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env` file:

```bash
cp .env.example .env
```

3. Update `.env` with your backend URL (default should work):

```
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

4. Start development server:

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

## Build for Production

```bash
npm run build
npm run preview
```

## Features

- Dashboard with real-time statistics
- Live face recognition monitoring
- Student management (CRUD operations)
- Attendance logs with filtering
- Analytics and trends visualization
- Responsive design

## Face Recognition Models

The face-api.js models are located in `public/models/`. These are required for face detection and recognition:

- `tiny_face_detector_model-*`
- `face_landmark_68_model-*`
- `face_recognition_model-*`

These models are loaded automatically when the app starts.

## Project Structure

```
src/
├── components/
│   ├── pages/          # Main page components
│   │   ├── Dashboard.tsx
│   │   ├── LiveMonitor.tsx
│   │   ├── Students.tsx
│   │   ├── AttendanceLogs.tsx
│   │   ├── Analytics.tsx
│   │   └── Settings.tsx
│   ├── Layout.tsx
│   └── Sidebar.tsx
├── services/
│   ├── api.ts          # API client
│   ├── socket.ts       # Socket.IO client
│   └── faceRecognition.ts  # Face detection service
├── App.tsx
└── main.tsx
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run typecheck` - Run TypeScript compiler check
