// services/interview.service.js
import { adminDb } from "../config/firebase.js";
import { generateText } from "ai";
import { google } from "@ai-sdk/google";

export async function generateCourseQuestionss(courseId) {
  try {
    const courseRef = adminDb.collection("courses").doc(courseId);
    const courseDoc = await courseRef.get();

    if (!courseDoc.exists) {
      throw new Error("Course not found");
    }

    const course = courseDoc.data();

    const { text } = await generateText({
      model: google("gemini-2.0-flash-001"),
      prompt: `Generate interview questions based on this course content:
        Course Title: ${course.title}
        Modules: ${course.modules.map((m) => m.title).join(", ")}
        Technologies: ${course.techStack.join(", ")}
        Learning Objectives: ${course.overview.objectives.join(", ")}
        
        Generate 8-12 technical interview questions that test understanding 
        of these concepts. Return as JSON array format:
        ["Question 1", "Question 2", ...]`,
    });

    return JSON.parse(
      text
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim()
    );
  } catch (error) {
    throw new Error(`Question generation failed: ${error.message}`);
  }
}
export async function generateCourseQuestions(courseId) {
  try {
    const courseRef = adminDb.collection("courses").doc(courseId);
    const courseDoc = await courseRef.get();

    if (!courseDoc.exists) {
      throw new Error("Course not found");
    }

    const course = courseDoc.data();

    // Construct detailed module descriptions
    const moduleDetails = course.modules
      .map(
        (module) =>
          `Module: "${module.title}"\n` +
          `Lessons:\n${module.lessons
            .map(
              (lesson) =>
                `- "${lesson.title}": ${lesson.description}\n` +
                `  Key Topics: ${lesson.resources
                  .map((r) => r.title)
                  .join(", ")}`
            )
            .join("\n")}`
      )
      .join("\n\n");

    const { text } = await generateText({
      model: google("gemini-2.0-flash-001"),
      prompt: `Generate simple technical interview questions based on this course content:

        COURSE TITLE: ${course.title}
        COURSE DESCRIPTION: ${course.description}
        LEARNING OBJECTIVES: ${course.objectives.join(", ")}

        COURSE MODULES DETAILS:
        ${moduleDetails}

        Generate 10-15 technical interview questions that:
        1. Test practical understanding of course concepts
        2. Cover all main modules and lessons
        3. Include questions about implementation details
        4. Mix theoretical and practical aspects
        5. Focus on key technologies mentioned in resources

        Return valid JSON array format:
        ["Question 1", "Question 2", ...]`,
    });

    // Improved JSON parsing with error handling
    const cleanedText = text
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .replace(/(\w)"(\w)/g, '$1\\"$2') // Handle escaped quotes
      .trim();

    try {
      return JSON.parse(cleanedText);
    } catch (parseError) {
      console.error("Failed to parse JSON:", cleanedText);
      throw new Error(`JSON parsing failed: ${parseError.message}`);
    }
  } catch (error) {
    throw new Error(`Question generation failed: ${error.message}`);
  }
}

export async function createInterview(data) {
  try {
    const interviewRef = await adminDb.collection("interviews").add({
      ...data,
      createdAt: new Date().toISOString(),
      feedback: null,
      transcript: [],
    });

    return {
      id: interviewRef.id,
      ...data,
    };
  } catch (error) {
    throw new Error("Failed to create interview record");
  }
}
