# Quick Start Guide

## Prerequisites Check

Before starting, ensure you have:

- [ ] Node.js v18+ installed (`node --version`)
- [ ] MongoDB installed and running
- [ ] Git (optional)

## Step-by-Step Setup

### 1. Start MongoDB

**Windows:**

```powershell
# MongoDB should start automatically if installed as a service
# Or manually start it:
"C:\Program Files\MongoDB\Server\6.0\bin\mongod.exe" --dbpath="C:\data\db"
```

**macOS/Linux:**

```bash
sudo systemctl start mongodb
# or
brew services start mongodb-community
```

Verify MongoDB is running:

```bash
mongosh
# or
mongo
```

### 2. Setup Backend (Terminal 1)

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# The .env file is already created with default values
# You can modify it if needed

# Optional: Seed database with sample students
npm run seed

# Start the backend server
npm run dev
```

You should see:

```
Server running on port 5000
MongoDB Connected: localhost
```

### 3. Setup Frontend (Terminal 2)

Open a new terminal:

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# The .env file is already created
# Start the frontend development server
npm run dev
```

You should see:

```
  VITE ready in Xms
  ➜  Local:   http://localhost:5173/
```

### 4. Access the Application

Open your browser and navigate to:

```
http://localhost:5173
```

## First Steps

### Add Your First Student

1. Click on **Students** in the sidebar
2. Click **Add Student** button
3. Fill in the details:
   - Name: John Doe
   - Roll Number: CS001
   - Department: Computer Science
   - Parent Phone: 9876543210
4. Click **Camera** or Upload to add a photo
   - **Important:** Photo is required for face recognition
   - Make sure the face is clearly visible
5. Click **Create**

### Test Face Recognition

1. Go to **Live Monitor** page
2. Click **Start Monitoring**
3. Allow camera access when prompted
4. Position your face (the student's face) in front of the camera
5. The system will detect and mark attendance automatically

### View Results

1. **Dashboard** - See real-time statistics
2. **Attendance Logs** - View detailed records
3. **Analytics** - See trends over time

## Common Issues & Solutions

### Backend won't start

**Error: MongoDB connection failed**

```bash
# Check if MongoDB is running
mongosh

# If not, start MongoDB service
# Windows: Check Services app
# macOS: brew services start mongodb-community
# Linux: sudo systemctl start mongodb
```

**Error: Port 5000 already in use**

```bash
# Change PORT in backend/.env to another port (e.g., 5001)
# Also update VITE_API_URL and VITE_SOCKET_URL in frontend/.env
```

### Frontend won't start

**Error: Port 5173 already in use**

```bash
# Vite will automatically try the next available port
# Or stop the process using port 5173
```

**Camera not working**

- Make sure you're using `http://localhost:5173` (not IP address)
- Grant camera permissions in browser
- Check if another app is using the camera

### Face detection not working

**Models not loading**

- Verify `frontend/public/models/` contains all model files
- Check browser console for errors
- Wait for "Models loaded" indicator

**Face not detected**

- Ensure good lighting
- Face the camera directly
- Move closer to the camera
- Try a different photo

## Testing the Complete Flow

1. **Add 2-3 students** with photos
2. **Start Live Monitor**
3. **Show your face** (if you added yourself) or a student's photo to the camera
4. Watch the **Currently Detected** panel on the right
5. Wait 30+ seconds to test "Present" status
6. Hide from camera for 10 seconds to test exit
7. Check **Attendance Logs** to see the record
8. View **Dashboard** for updated statistics

## Production Deployment

For production, you'll need to:

1. **Build Frontend:**

```bash
cd frontend
npm run build
# Serve the dist/ folder with nginx or similar
```

2. **Configure Backend:**

```bash
# Set NODE_ENV=production in backend/.env
# Use a production MongoDB instance
# Add authentication and security headers
```

3. **Use HTTPS:**

- Camera access requires HTTPS in production
- Use Let's Encrypt or similar for SSL certificates

4. **Environment Variables:**

- Update all URLs to production domains
- Use strong, unique credentials

## Need Help?

- Check the main [README.md](README.md) for detailed documentation
- Review code comments in source files
- Check browser console for errors
- Verify all services are running

---

**You're all set! 🎉 Start building your attendance system.**
