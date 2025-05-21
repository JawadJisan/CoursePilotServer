// controllers/interview.controller.js
import AppError from "../utils/AppError.js";
import {
  generateCourseQuestions,
  createInterview,
} from "../services/interview.service.js";

export const generateCourseInterview = async (req, res, next) => {
  try {
    const { courseId, userId } = req.body;
    // const userId = req.user.uid;

    // Generate questions based on course content
    const questions = await generateCourseQuestions(courseId);

    // Create interview record
    const interview = await createInterview({
      courseId,
      userId,
      questions,
      status: "pending",
    });

    res.status(201).json({
      success: true,
      data: interview,
    });
  } catch (error) {
    next(new AppError(500, error.message));
  }
};
