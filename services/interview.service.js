// services/interview.service.js
import { adminDb, Timestamp } from "../config/firebase.js";
import { generateText } from "ai";
import { google } from "@ai-sdk/google";

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

// services/interview.service.js
export async function createInterview(data) {
  try {
    const interviewData = {
      ...data,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      feedbackId: null,
      transcript: [],
      status: "pending",
      attemptCount: data.attemptCount || 1,
      lastAttempt: Timestamp.now(),
      nextRetakeDate: data.nextRetakeDate || null,
    };


    console.log("received data:", data);

    console.log("interviewData:", interviewData);

    const interviewRef = await adminDb
      .collection("interviews")
      .add(interviewData);

    console.log("interviewRef:", interviewRef.id);

    // Only archive previous interviews on retry attempts
    if (data.attemptCount > 1) {
      const batch = adminDb.batch();
      const previousInterviews = await adminDb
        .collection("interviews")
        .where("courseId", "==", data.courseId)
        .where("userId", "==", data.userId)
        .where(adminDb.FieldPath.documentId(), "!=", interviewRef.id)
        .get();

      previousInterviews.docs.forEach((doc) => {
        batch.update(doc.ref, {
          status: "archived",
          archivedAt: Timestamp.now(),
        });
      });

      await batch.commit();
    }

    return {
      id: interviewRef.id,
      ...interviewData,
      // Convert timestamps for frontend
      createdAt: interviewData.createdAt.toDate(),
      updatedAt: interviewData.updatedAt.toDate(),
      lastAttempt: interviewData.lastAttempt.toDate(),
      nextRetakeDate: interviewData.nextRetakeDate?.toDate() || null,
    };
  } catch (error) {
    console.log("interview creation error:", error);
    throw new Error("Failed to create interview record");
  }
}

export async function getLatestInterview(courseId, userId) {
  const snapshot = await adminDb
    .collection("interviews")
    .where("courseId", "==", courseId)
    .where("userId", "==", userId)
    .orderBy("createdAt", "desc")
    .limit(1)
    .get();

  if (snapshot.empty) return null;

  const interviewDoc = snapshot.docs[0];
  const interviewData = interviewDoc.data();

  // Get feedback document if exists
  let feedback = null;
  if (interviewData.feedbackId) {
    const feedbackDoc = await adminDb
      .collection("feedback")
      .doc(interviewData.feedbackId)
      .get();

    if (feedbackDoc.exists) {
      feedback = feedbackDoc.data();
      // Verify feedback ownership
      if (feedback.userId !== userId) {
        throw new Error("Unauthorized feedback access");
      }
    }
  }

  return {
    id: interviewDoc.id,
    ...interviewData,
    feedback, // Include populated feedback data
    createdAt: interviewData.createdAt.toDate(),
    updatedAt: interviewData.updatedAt?.toDate(),
    nextRetakeDate: interviewData.nextRetakeDate?.toDate() || null,
  };
}

export async function checkRetakeEligibility(interview) {
  if (interview.status === "pending") return true;

  const MIN_SCORE = 70;
  const MAX_ATTEMPTS = 3;

  // Disallow retake if max attempts reached
  if (interview.attemptCount >= MAX_ATTEMPTS) return false;

  // Disallow retake if already passed
  if (interview.feedback?.totalScore >= MIN_SCORE) return false;

  // Handle cooldown logic for completed interviews
  if (interview.status === "completed") {
    if (!interview.nextRetakeDate) return true;

    const now = Date.now(); // current timestamp in ms
    const retakeDate =
      interview.nextRetakeDate instanceof Date
        ? interview.nextRetakeDate.getTime()
        : new Date(interview.nextRetakeDate).getTime();

    console.log("Retake date:", new Date(retakeDate).toISOString());
    console.log("Now:", new Date(now).toISOString());

    return now > retakeDate;
  }

  // Default allow
  return true;
}

export async function getAllUserInterviews(userId) {
  const snapshot = await adminDb
    .collection("interviews")
    .where("userId", "==", userId)
    .orderBy("createdAt", "desc")
    .get();

  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

export async function getPendingInterview(courseId, userId) {
  const snapshot = await adminDb
    .collection("interviews")
    .where("courseId", "==", courseId)
    .where("userId", "==", userId)
    .where("status", "==", "pending")
    .limit(1)
    .get();

  return snapshot.empty
    ? null
    : {
        id: snapshot.docs[0].id,
        ...snapshot.docs[0].data(),
        createdAt: snapshot.docs[0].data().createdAt.toDate(),
        updatedAt: snapshot.docs[0].data().updatedAt?.toDate(),
      };
}
