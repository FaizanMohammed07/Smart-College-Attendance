import AttendanceLog from "../models/AttendanceLog.js";

let clients = new Set();

export const initializeSocketHandlers = (io) => {
  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);
    clients.add(socket);

    // Send current active students on connection
    sendActiveStudents(socket);

    // Handle face detection from client
    socket.on("face:detected", async (data) => {
      try {
        const { studentId, confidence } = data;
        console.log(
          `Face detected for student ${studentId} with confidence ${confidence}`,
        );

        // Broadcast to all clients
        io.emit("face:detected:broadcast", {
          studentId,
          confidence,
          timestamp: new Date(),
        });
      } catch (error) {
        console.error("Error handling face detection:", error);
      }
    });

    // Handle manual attendance update
    socket.on("attendance:update", async (data) => {
      try {
        io.emit("attendance:updated", data);
      } catch (error) {
        console.error("Error handling attendance update:", error);
      }
    });

    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
      clients.delete(socket);
    });
  });

  // Periodic check for students who have been in class too long (for notifications)
  setInterval(async () => {
    try {
      const today = new Date().toISOString().split("T")[0];
      const activeLogs = await AttendanceLog.find({
        date: today,
        isActive: true,
      }).populate("studentId", "name rollNumber");

      const now = new Date();

      activeLogs.forEach((log) => {
        const durationMinutes = Math.floor(
          (now - new Date(log.entryTime)) / (1000 * 60),
        );

        // Emit duration updates
        io.emit("attendance:duration:update", {
          logId: log._id,
          studentId: log.studentId._id,
          studentName: log.studentId.name,
          duration: durationMinutes,
        });
      });
    } catch (error) {
      console.error("Error in periodic check:", error);
    }
  }, 30000); // Every 30 seconds
};

async function sendActiveStudents(socket) {
  try {
    const today = new Date().toISOString().split("T")[0];
    const activeLogs = await AttendanceLog.find({
      date: today,
      isActive: true,
    }).populate("studentId", "name rollNumber department photoUrl");

    socket.emit("active:students", activeLogs);
  } catch (error) {
    console.error("Error sending active students:", error);
  }
}
