import axios from "axios";
import { google as googleApis } from "googleapis";
import { generateText } from "ai";
import { google as googleGemini } from "@ai-sdk/google";
import AppError from "../utils/AppError.js";
import { adminDb } from "../config/firebase.js";
import { v4 as uuidv4 } from "uuid";

const API_KEY = "AIzaSyA6-Y_-vtdlOEjYOj1jbl8VOguiDgKWcEw"; // learning
// const API_KEY = "AIzaSyA5ZJEbACohPVgYdjtS0YIs5DNEZ-j1WoY";
const youtube = googleApis.youtube({ version: "v3", auth: API_KEY });

function transformCourseStructure(courseData, userId) {
  const { overview, modules } = courseData.course;

  return {
    userId: "y1lYCqJpC3M5ROb0QDgirkGuu5f1",
    title: overview.title,
    description: overview.description,
    objectives: overview.objectives,
    createdAt: new Date(),
    modules: modules.map((module) => ({
      id: uuidv4(),
      title: module.title,
      lessons: module.lessons.map((lesson) => ({
        id: uuidv4(),
        title: lesson.title,
        description: lesson.description,
        resources: lesson.resources.map((resource) => ({
          ...resource,
          id: uuidv4(),
        })),
      })),
    })),
  };
}

// YouTube Validation Helpers
const validateYouTubeItem = (item) => {
  if (!item.id?.videoId || !item.snippet?.title) return null;

  return {
    videoId: item.id.videoId,
    title: item.snippet.title,
    description: item.snippet.description,
    channelTitle: item.snippet.channelTitle,
    thumbnails: item.snippet.thumbnails,
    publishTime: item.snippet.publishTime,
    url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
  };
};

export async function getYouTubeVideos(query) {
  try {
    const res = await youtube.search.list({
      part: "snippet",
      q: query,
      type: "video",
      maxResults: 2,
      videoEmbeddable: "true",
    });

    console.log("youtube response", res?.data);

    const validItems = (res.data.items || [])
      .map(validateYouTubeItem)
      .filter(Boolean)
      .slice(0, 5);

    return validItems;
  } catch (err) {
    console.error("YouTube API error:", err.message);
    return [];
  }
}

// Dev.to Validation Helpers
const validateDevToArticle = (article) => {
  if (!article.url || !article.title) return null;
  return {
    title: article.title,
    url: article.url,
    publishedAt: article.published_at,
    tags: article.tag_list,
  };
};

const MAX_TAGS = 3;
const PER_TAG_LIMIT = 3;

export async function getDevToArticles(query) {
  const candidates = Array.from(
    new Set(
      query
        .replace(/["']/g, "")
        .split(/\s+/)
        .map((w) => w.toLowerCase())
        .filter((w) => w.length > 2)
    )
  ).slice(0, MAX_TAGS);

  const articlesMap = new Map();

  for (const tag of candidates) {
    try {
      const res = await axios.get("https://dev.to/api/articles", {
        params: { per_page: PER_TAG_LIMIT, tag },
      });

      (res.data || []).forEach((a) => {
        const validated = validateDevToArticle(a);
        if (validated) articlesMap.set(validated.url, validated);
      });
    } catch (err) {
      console.error(`Dev.to [${tag}] error:`, err.message);
    }
  }

  return Array.from(articlesMap.values()).slice(0, 5);
}

// MDN Validation Helpers
const validateMDNDoc = (doc) => {
  if (!doc.title || !doc.mdn_url) return null;
  return {
    title: doc.title,
    url: `https://developer.mozilla.org${doc.mdn_url}`,
    summary: doc.summary,
  };
};

export async function getMDNDocs(query) {
  try {
    const res = await axios.get(`https://developer.mozilla.org/api/v1/search`, {
      params: { q: query, locale: "en-US" },
    });

    const validDocs = (res.data.documents || [])
      .map(validateMDNDoc)
      .filter(Boolean)
      .slice(0, 5);

    return validDocs;
  } catch (err) {
    console.error("MDN error:", err.message);
    return [];
  }
}

// Resource Service
export async function getResourcesBySearch(query) {
  try {
    const [videos, blogs, docs] = await Promise.all([
      getYouTubeVideos(query),
      getDevToArticles(query),
      getMDNDocs(query),
    ]);

    if (!videos.length && !blogs.length && !docs.length) {
      throw new AppError(404, "No resources found for this search query");
    }

    return { videos, blogs, docs };
  } catch (err) {
    throw new AppError(
      err.statusCode || 500,
      err.message || "Failed to fetch resources"
    );
  }
}

// Course Generation
const SYSTEM_MSGS = {
  queryGenerator: `You are an expert technical curriculum designer. Generate 7-10 search queries following these rules:
    1. Return ONLY valid JSON array format
    2. Escape double quotes with \\
    3. No markdown formatting
    4. Remove special characters
    5. Example format: ["query 1", "query 2"]
    
    Consider these factors:
    - Experience: {experience}
    - Target role: {targetRole}
    - Tech stack: {techStack}
    - Learning goals: {learningGoals}
    - Preferred resources: {preferredResources}
    - Avoid: {topicsToAvoid}
    
    Prioritize videos when preferredLearningStyle=video
    Prioritize official docs when available
    Return valid JSON array only.`,

  courseDesigner: `You are a senior course architect. Create learning path with:
    1. Strict valid JSON format
    2. No trailing commas
    3. Escaped double quotes
    4. Numeric durations only
    5. Example structure: {
      "course": {
        "overview": {
          "title": "Course Title",
          "description": "Course Description",
          "objectives": ["Objective 1", "Objective 2"],
          "totalHours": 40,
          "weeklyCommitment": 10
        },
        "modules": [
          {
            "title": "Module Title",
            "hoursNeeded": 8,
            "lessons": [
              {
                "title": "Lesson Title",
                "description": "Lesson Description",
                "hoursEstimate": 2,
                "resources": [
                  {
                    "type": "video",
                    "title": "Video Title",
                    "url": "https://example.com",
                    "source": "youtube",
                    "duration": 15
                  }
                ]
              }
            ]
          }
        ]
      }
    }
    
    User profile:
    - Experience: {experience}
    - Target: {targetRole}
    - Style: {preferredLearningStyle}
    - Time: {timeCommitment}h/week
    - Deadline: {deadline}
    
    Resources: {resources}
    
    Return valid JSON with:
    - Numeric durations (minutes)
    - No syntax errors
    - Proper escaping
    - Valid URLs
    - No markdown formatting`,
};

export async function generatePersonalizedCourse(userInput, userId) {
  try {
    const searchQueries = await generateSearchQueries(userInput);
    const allResources = await getAllResources(searchQueries);

    if (!allResources.length) {
      throw new AppError(
        404,
        "No learning resources found for generated queries"
      );
    }

    const rawCourseData = await generateCourseStructure(
      userInput,
      allResources
    );
    const transformedCourse = transformCourseStructure(rawCourseData, userId);

    // Save to Firestore
    const courseRef = await adminDb
      .collection("courses")
      .add(transformedCourse);

    return {
      id: courseRef.id,
      ...transformedCourse,
    };
  } catch (err) {
    throw new AppError(
      err.statusCode || 500,
      err.message || "Course generation failed"
    );
  }
}

// Helper Functions
const validateSearchQueries = (queries) => {
  if (!Array.isArray(queries) || queries.length === 0) {
    throw new AppError(400, "Invalid search queries format");
  }
  if (queries.some((q) => typeof q !== "string" || q.trim() === "")) {
    throw new AppError(400, "Search queries must be non-empty strings");
  }
};

async function generateSearchQueries(userInput) {
  try {
    const { text } = await generateText({
      model: googleGemini("gemini-2.0-flash-001"),
      system: SYSTEM_MSGS.queryGenerator,
      prompt: JSON.stringify(userInput),
    });

    const cleanedText = text
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .replace(/(,)(\s*?)([}\]])/g, "$3")
      .trim();

    const parsed = JSON.parse(cleanedText);
    validateSearchQueries(parsed);
    return parsed.map((q) => q.replace(/^"(.*)"$/, "$1").trim());
  } catch (err) {
    throw new AppError(400, `Query generation failed: ${err.message}`);
  }
}

async function getAllResources(queries) {
  try {
    const resourcePromises = queries.map(async (query) => {
      const [videos, blogs, docs] = await Promise.all([
        getYouTubeVideos(query),
        getDevToArticles(query),
        getMDNDocs(query),
      ]);

      return [
        ...videos.map((v) => ({ ...v, type: "video", source: "youtube" })),
        ...blogs.map((b) => ({ ...b, type: "article", source: "devto" })),
        ...docs.map((d) => ({ ...d, type: "doc", source: "mdn" })),
      ];
    });

    const resources = (await Promise.all(resourcePromises))
      .flat()
      .filter((r) => r.title && r.url);

    return resources;
  } catch (err) {
    throw new AppError(500, "Failed to fetch learning resources");
  }
}

async function generateCourseStructure(userInput, resources) {
  try {
    const { text } = await generateText({
      model: googleGemini("gemini-2.0-flash-001"),
      system: SYSTEM_MSGS.courseDesigner,
      prompt: JSON.stringify({
        userInput,
        resources: resources.map((r) => ({
          type: r.type,
          title: r.title,
          url: r.url,
          source: r.source,
        })),
      }),
    });

    const cleanedText = text
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .replace(/(,)(\s*?)([}\]])/g, "$3")
      .trim();

    console.log("cleanedText", cleanedText);

    const courseData = JSON.parse(cleanedText);
    return validateCourseStructure(courseData, resources);
  } catch (err) {
    console.log("error", err);
    throw new AppError(500, `Course generation failed: ${err.message}`);
  }
}

// Updated validation function
const validateCourseStructure = (courseData) => {
  if (!courseData?.course?.modules?.length) {
    throw new AppError(500, "Invalid course structure: Missing modules");
  }

  // Add any additional validation needed for the raw AI response
  return courseData;
};

export async function getCoursesByUserId(userId) {
  try {
    const snapshot = await adminDb
      .collection("courses")
      .where("userId", "==", userId)
      .get();

    const courses = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    if (!courses.length) {
      throw new AppError(404, "No courses found for this user");
    }

    return courses;
  } catch (err) {
    throw new AppError(
      err.statusCode || 500,
      err.message || "Failed to fetch user courses"
    );
  }
}
