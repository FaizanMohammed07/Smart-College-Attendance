# Face Recognition Attendance System

A production-ready attendance management system with real-time face recognition using React, Node.js, Express, MongoDB, and face-api.js.

## Features

- 📸 **Real-time Face Recognition** - Automatic attendance using face-api.js
- 🔄 **Live Updates** - Real-time attendance updates using Socket.IO
- 📊 **Analytics Dashboard** - Comprehensive attendance statistics and trends
- 👥 **Student Management** - Add, edit, and manage student records
- ⏱️ **Smart Attendance Logic**:
  - Present: ≥ 30 minutes
  - Partial: 10-29 minutes
  - Absent: < 10 minutes
- 📱 **Responsive Design** - Works on desktop and mobile devices
- 🎨 **Modern UI** - Built with Tailwind CSS

## Tech Stack

### Frontend

- React 18
- TypeScript
- Tailwind CSS
- face-api.js
- Socket.IO Client
- Axios

### Backend

- Node.js
- Express.js
- MongoDB with Mongoose
- Socket.IO
- Helmet & Compression

## Project Structure

```
project/
├── frontend/          # React frontend application
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   └── services/
│   └── public/
│       └── models/    # face-api.js models
├── backend/           # Node.js backend API
│   ├── controllers/
│   ├── models/
│   ├── routes/
│   ├── sockets/
│   └── config/
└── README.md
```

## Prerequisites

- Node.js (v18 or higher)
- MongoDB (v6 or higher)
- Modern web browser with camera access

## Installation

### 1. Clone the repository

```bash
cd project
```

### 2. Install MongoDB

**Windows:**
Download and install from [MongoDB Download Center](https://www.mongodb.com/try/download/community)

**macOS:**

```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

**Linux:**

```bash
sudo apt-get install mongodb
sudo systemctl start mongodb
```

### 3. Setup Backend

```bash
cd backend
npm install

# Create .env file
cp .env.example .env

# Edit .env with your configuration
# Default values should work for local development

# (Optional) Seed database with sample data
npm run seed

# Start backend server
npm run dev
```

Backend will run on `http://localhost:5000`

### 4. Setup Frontend

```bash
cd frontend
npm install

# Create .env file
cp .env.example .env

# Start frontend dev server
npm run dev
```

Frontend will run on `http://localhost:5173`

## Usage

### 1. Add Students

- Navigate to **Students** page
- Click **Add Student** button
- Fill in student details (Name, Roll Number, Department, Parent Phone)
- **Capture or upload a photo** (Required for face recognition)
- Face descriptor will be automatically extracted
- Click **Create** to save

### 2. Start Live Monitoring

- Navigate to **Live Monitor** page
- Click **Start Monitoring** button
- Allow camera access when prompted
- System will automatically detect and track students
- Entry is recorded when a face is recognized
- Exit is recorded when face is no longer detected for 10 seconds

### 3. View Attendance

- **Dashboard** - View today's statistics
- **Attendance Logs** - Filter and view detailed logs
- **Analytics** - View trends and department-wise stats

## Attendance Logic

The system calculates attendance status based on duration:

| Status      | Duration      | Description                          |
| ----------- | ------------- | ------------------------------------ |
| **Present** | ≥ 30 minutes  | Student attended for sufficient time |
| **Partial** | 10-29 minutes | Student attended but left early      |
| **Absent**  | < 10 minutes  | Insufficient attendance time         |

## API Endpoints

### Students

- `GET /api/students` - Get all students
- `POST /api/students` - Create new student
- `PUT /api/students/:id` - Update student
- `DELETE /api/students/:id` - Delete student
- `GET /api/students/faces/descriptors` - Get students with face data

### Attendance

- `POST /api/attendance/entry` - Record entry
- `POST /api/attendance/exit` - Record exit
- `GET /api/attendance/logs` - Get attendance logs
- `GET /api/attendance/active` - Get currently active students
- `GET /api/attendance/summary/:date` - Get daily summary

### Analytics

- `GET /api/analytics/dashboard` - Get dashboard stats
- `GET /api/analytics/trends` - Get attendance trends
- `GET /api/analytics/departments` - Get department stats
- `GET /api/analytics/student/:id` - Get student history

## Socket.IO Events

### Client → Server

- `face:detected` - Emit when face is detected

### Server → Client

- `attendance:entry` - New attendance entry
- `attendance:exit` - Attendance exit recorded
- `attendance:duration:update` - Duration updates
- `active:students` - Currently active students list

## Development

### Backend Development

```bash
cd backend
npm run dev  # Runs with nodemon for auto-reload
```

### Frontend Development

```bash
cd frontend
npm run dev  # Runs with Vite HMR
```

### Build for Production

**Backend:**

```bash
cd backend
npm start
```

**Frontend:**

```bash
cd frontend
npm run build
npm run preview
```

## Troubleshooting

### Camera not working

- Ensure browser has camera permissions
- Use HTTPS or localhost (required for camera access)
- Check if camera is being used by another application

### Face detection not working

- Ensure face-api.js models are in `frontend/public/models/`
- Check browser console for model loading errors
- Ensure good lighting for better detection

### Database connection errors

- Verify MongoDB is running: `mongosh` or `mongo`
- Check MONGODB_URI in backend/.env
- Ensure MongoDB is accessible on port 27017

### Real-time updates not working

- Check Socket.IO connection in browser console
- Verify backend and frontend URLs in .env files
- Ensure CORS is properly configured

## Security Considerations

For production deployment:

1. **Environment Variables**
   - Use strong, unique values for all secrets
   - Never commit .env files to version control

2. **Database**
   - Enable MongoDB authentication
   - Use strong passwords
   - Restrict network access

3. **API Security**
   - Implement authentication & authorization
   - Add rate limiting
   - Enable HTTPS

4. **Face Data**
   - Consider encrypting face descriptors
   - Implement data retention policies
   - Ensure GDPR/privacy compliance

## License

MIT License - Feel free to use this project for educational or commercial purposes.

## Support

For issues and questions:

- Check the troubleshooting section
- Review code comments and documentation
- Open an issue on GitHub

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

---

**Built with ❤️ using React, Node.js, Express, and MongoDB**
