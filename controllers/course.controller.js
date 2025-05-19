import AppError from "../utils/AppError.js";
import * as CourseService from "../services/course.service.js";

// controllers/course.controller.js
export const getAllCourses = async (req, res, next) => {
  try {
    const courses = await CourseService.getAllCourses();
    res.status(200).json({
      success: true,
      data: courses,
    });
  } catch (error) {
    next(new AppError(500, error.message));
  }
};

export const getMyCourses = async (req, res, next) => {
  try {
    const courses = await CourseService.getUserCourses(req.user.uid);
    res.status(200).json({
      success: true,
      data: courses,
    });
  } catch (error) {
    next(new AppError(500, error.message));
  }
};

export const getCourseById = async (req, res, next) => {
  try {
    const course = await CourseService.getCourseById(req.params.courseId);
    res.status(200).json({
      success: true,
      data: course,
    });
  } catch (error) {
    next(new AppError(error.statusCode || 500, error.message));
  }
};
