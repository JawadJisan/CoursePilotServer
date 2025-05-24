// controllers/interview.controller.js
import AppError from "../utils/AppError.js";
import {
  generateCourseQuestions,
  createInterview,
  getLatestInterview,
  checkRetakeEligibility,
  getAllUserInterviews,
  getPendingInterview,
} from "../services/interview.service.js";
import { Timestamp } from "../config/firebase.js";

// controllers/interview.controller.js (Updated)
export const generateCourseInterview = async (req, res, next) => {
  try {
    const { courseId } = req.body;
    const userId = req.user.uid;

    // Check for existing pending interview first
    const pendingInterview = await getPendingInterview(courseId, userId);
    if (pendingInterview) {
      return res.status(200).json({
        success: true,
        data: pendingInterview,
        message: "Resume pending interview",
      });
    }

    // Check existing interviews
    const existingInterview = await getLatestInterview(courseId, userId);

    if (existingInterview) {
      const eligible = await checkRetakeEligibility(existingInterview);
      if (!eligible) {
        return next(
          new AppError(403, "Retake cooldown active", {
            code: "RETAKE_COOLDOWN",
            retakeDate: existingInterview.nextRetakeDate,
          })
        );
      }
    }

    console.log("existingInterview:", existingInterview);

    // Generate questions and create interview
    const questions = await generateCourseQuestions(courseId);
    console.log("questions:", questions);
    const interview = await createInterview({
      courseId,
      userId,
      questions,
      status: "pending",
      attemptCount: existingInterview ? existingInterview.attemptCount + 1 : 1,
      lastAttempt: Timestamp.now(),
      nextRetakeDate: null,
    });

    console.log("interview:", interview);

    res.status(201).json({
      success: true,
      data: interview,
    });
  } catch (error) {
    next(new AppError(500, error.message));
  }
};
export const getInterviewStatus = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const userId = req.user.uid;
    const interview = await getLatestInterview(courseId, userId);

    if (!interview) {
      return res.status(200).json({ exists: false });
    }

    const canRetake = await checkRetakeEligibility(interview);

    res.status(200).json({
      exists: true,
      status: interview.status,
      feedbackId: interview?.feedbackId,
      score: interview.feedback?.totalScore || null,
      canRetake,
      retakeAvailableDate: interview.nextRetakeDate || null,
    });
  } catch (error) {
    next(new AppError(500, error.message));
  }
};

export const getUserInterviews = async (req, res, next) => {
  try {
    const userId = req.user.uid;
    const interviews = await getAllUserInterviews(userId);
    res.status(200).json(interviews);
  } catch (error) {
    next(new AppError(500, error.message));
  }
};
