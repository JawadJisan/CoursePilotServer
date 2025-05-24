// controllers/feedback.controller.js
import {
  generateAndSaveFeedback,
  getFeedbackById,
  getAllUserFeedback,
} from "../services/feedback.service.js";
import AppError from "../utils/AppError.js";

export const generateInterviewFeedback = async (req, res, next) => {
  try {
    const { interviewId, transcript } = req.body;
    const userId = req.user.uid;

    const feedback = await generateAndSaveFeedback({
      interviewId,
      userId,
      transcript,
    });

    res.status(201).json({
      success: true,
      data: feedback,
    });
  } catch (error) {
    next(new AppError(500, error.message));
  }
};

export const getFeedback = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.uid;

    const feedback = await getFeedbackById(id, userId);

    if (!feedback) {
      return next(new AppError(404, "Feedback not found"));
    }

    res.status(200).json({
      success: true,
      data: feedback,
    });
  } catch (error) {
    next(new AppError(500, error.message));
  }
};

export const getUserFeedback = async (req, res, next) => {
  try {
    const userId = req.user.uid;
    const feedbacks = await getAllUserFeedback(userId);

    res.status(200).json({
      success: true,
      data: feedbacks,
    });
  } catch (error) {
    next(new AppError(500, error.message));
  }
};
