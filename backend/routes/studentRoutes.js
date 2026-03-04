import express from "express";
import {
  getAllStudents,
  getStudentById,
  createStudent,
  updateStudent,
  deleteStudent,
  getStudentsWithFaces,
} from "../controllers/studentController.js";

const router = express.Router();

router.route("/").get(getAllStudents).post(createStudent);

router.route("/faces/descriptors").get(getStudentsWithFaces);

router
  .route("/:id")
  .get(getStudentById)
  .put(updateStudent)
  .delete(deleteStudent);

export default router;
