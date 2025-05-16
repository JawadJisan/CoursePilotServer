import * as ResourceService from "../services/resource.service.js";
import AppError from "../utils/AppError.js";

const validateGenerateCourseInput = (body) => {
  const { targetRole, techStack, experience } = body;

  if (
    !targetRole ||
    typeof targetRole !== "string" ||
    targetRole.trim() === ""
  ) {
    throw new AppError(400, "Target role must be a non-empty string");
  }

  if (
    !Array.isArray(techStack) ||
    techStack.length === 0 ||
    !techStack.every((item) => typeof item === "string")
  ) {
    throw new AppError(400, "Tech stack must be a non-empty array of strings");
  }

  const validExperiences = ["beginner", "intermediate", "advanced", undefined];
  if (experience && !validExperiences.includes(experience)) {
    throw new AppError(400, "Invalid experience level");
  }
};

export const generateCourse = async (req, res, next) => {
  try {
    const { body } = req;

    // Validate input structure
    validateGenerateCourseInput(body);

    const course = await ResourceService.generatePersonalizedCourse(body);

    res.status(200).json({
      status: "success",
      data: course,
    });
  } catch (err) {
    next(err instanceof AppError ? err : new AppError(500, err.message));
  }
};

export const getResourcesBySearch = async (req, res, next) => {
  try {
    let { query } = req.query;

    if (!query) throw new AppError(400, "Query parameter is required");

    query = query.trim();
    if (query === "") throw new AppError(400, "Query cannot be empty");

    const data = await ResourceService.getResourcesBySearch(query);

    res.status(200).json({
      status: "success",
      results:
        (data.videos?.length || 0) +
        (data.blogs?.length || 0) +
        (data.docs?.length || 0),
      data,
    });
  } catch (err) {
    next(err instanceof AppError ? err : new AppError(500, err.message));
  }
};

export const getCoursesByUser = async (req, res, next) => {
  try {
    const userId = req.get("userId");
    console.log("userId", userId);

    const courses = await ResourceService.getCoursesByUserId(userId);

    res.status(200).json({
      status: "success",
      results: courses.length,
      data: courses,
    });
  } catch (error) {
    next(new AppError(500, error.message));
  }
};
