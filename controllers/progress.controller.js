import AppError from "../utils/AppError.js";
import * as ProgressService from "../services/progress.service.js";

export const getAllProgress = async (req, res, next) => {
  try {
    const progress = await ProgressService.getUserProgress(req.user.uid);
    res.status(200).json({
      success: true,
      data: progress,
    });
  } catch (error) {
    next(new AppError(500, "Failed to fetch progress"));
  }
};

export const getCourseProgress = async (req, res, next) => {
  try {
    console.log(req.user.uid, req.params.courseId);
    const progress = await ProgressService.getCourseProgress(
      req.user.uid,
      req.params.courseId
    );
    res.status(200).json({
      success: true,
      data: progress,
    });
  } catch (error) {
    console.log("error:", error);
    next(new AppError(500, "Failed to fetch course progress"));
  }
};

export const updateProgress = async (req, res, next) => {
  try {
    const result = await ProgressService.updateProgress(
      req.user.uid,
      req.params.courseId,
      req.params.lessonId
    );
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(new AppError(500, "Failed to update progress"));
  }
};
