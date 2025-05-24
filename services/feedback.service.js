// services/feedback.service.js
import {
  adminDb,
  Timestamp,
  FieldValue,
  FieldPath,
} from "../config/firebase.js";
import { generateObject } from "ai";
import { google } from "@ai-sdk/google";
import { z } from "zod";

const feedbackSchema = z.object({
  totalScore: z.number().min(0).max(100),
  categoryScores: z.object({
    communication: z.number().min(0).max(100),
    technical: z.number().min(0).max(100),
    problemSolving: z.number().min(0).max(100),
    culturalFit: z.number().min(0).max(100),
    confidence: z.number().min(0).max(100),
  }),
  strengths: z.array(z.string()),
  areasForImprovement: z.array(z.string()),
  finalAssessment: z.string(),
});

export async function generateAndSaveFeedbacks(data) {
  try {
    const { interviewId, userId, transcript } = data;

    const formattedTranscript = transcript
      .map(({ role, content }) => `${role}: ${content}`)
      .join("\n");

    const { object } = await generateObject({
      model: google("gemini-2.0-flash-001"),
      schema: feedbackSchema,
      prompt: `
        Analyze this technical interview transcript for a course completion assessment.
        Course ID: ${interviewId}
        Candidate ID: ${userId}
        
        Transcript:
        ${formattedTranscript}

        Provide detailed evaluation with:
        - Technical accuracy based on course content
        - Implementation capability of concepts
        - Communication clarity
        - Problem-solving approach
        - Course-specific knowledge retention
      `,
      system: `
        You are a senior technical interviewer analyzing course completion interviews.
        Be objective but constructive in feedback.
        Consider the course curriculum and expected competency levels.
      `,
    });

    const feedbackData = {
      interviewId,
      userId,
      ...object,
      createdAt: Timestamp.now(),
      transcript: formattedTranscript,
    };

    const feedbackRef = await adminDb.collection("feedback").add(feedbackData);

    // Update interview document with feedback reference
    await adminDb.collection("interviews").doc(interviewId).update({
      feedbackId: feedbackRef.id,
      status: "completed",
    });

    return {
      id: feedbackRef.id,
      ...feedbackData,
      createdAt: feedbackData.createdAt.toDate(),
    };
  } catch (error) {
    console.error("Feedback Error:", error);
    throw new Error(`Feedback generation failed: ${error.message}`);
  }
}

// services/feedback.service.js
export async function generateAndSaveFeedback(data) {
  let feedbackRef = null; // Declare outside try-catch for cleanup
  try {
    const { interviewId, userId, transcript } = data;
    const MIN_SCORE = 70;
    const COOLDOWN_DAYS = 7;
    const MAX_ATTEMPTS = 3;

    console.log(transcript);

    console.log("Received transcript data:", {
      type: typeof transcript,
      length: Array.isArray(transcript) ? transcript.length : "N/A",
      sample: Array.isArray(transcript) ? transcript.slice(0, 3) : transcript,
    });

    // Enhanced validation with detailed logging
    if (!Array.isArray(transcript)) {
      console.error("Invalid transcript format:", {
        receivedType: typeof transcript,
        receivedValue: transcript,
      });
      throw new Error(`Expected array, received ${typeof transcript}`);
    }

    // 1. Generate formatted transcript
    const formattedTranscript = transcript
      .map(({ role, content }) => {
        if (!role || !content) {
          throw new Error("Invalid transcript entry format");
        }
        return `${role}: ${content}`;
      })
      .join("\n");

    // 2. Generate AI feedback
    const { object } = await generateObject({
      model: google("gemini-2.0-flash-001"),
      schema: feedbackSchema,
      prompt: `
        Analyze this technical interview transcript for a course completion assessment.
        Course ID: ${interviewId}
        Candidate ID: ${userId}
        
        Transcript:
        ${formattedTranscript}

        Provide detailed evaluation with:
        - Technical accuracy based on course content
        - Implementation capability of concepts
        - Communication clarity
        - Problem-solving approach
        - Course-specific knowledge retention
      `,
      system: `
        You are a senior technical interviewer analyzing course completion interviews.
        Be objective but constructive in feedback.
        Consider the course curriculum and expected competency levels.
      `,
    });

    // 3. Get interview reference
    const interviewRef = adminDb.collection("interviews").doc(interviewId);
    const interviewDoc = await interviewRef.get();

    if (!interviewDoc.exists) {
      throw new Error("Interview document not found");
    }

    // 4. Calculate retake eligibility
    const requiresRetake = object.totalScore < MIN_SCORE;
    const cooldownEnd = new Date(Date.now() + COOLDOWN_DAYS * 86400000);
    const cooldownTimestamp = Timestamp.fromDate(cooldownEnd);
    const currentAttempt = interviewDoc.data().attemptCount + 1;

    // 5. Prepare batch operations
    const batch = adminDb.batch();

    // Create feedback document
    feedbackRef = adminDb.collection("feedback").doc();
    const feedbackData = {
      interviewId,
      userId,
      ...object,
      createdAt: Timestamp.now(),
      transcript: formattedTranscript,
      isLatest: true,
    };
    batch.set(feedbackRef, feedbackData);

    // Update interview document
    const interviewUpdate = {
      status: "completed",
      feedbackId: feedbackRef.id,
      updatedAt: Timestamp.now(),
      attemptCount: FieldValue.increment(1),
    };

    if (requiresRetake) {
      interviewUpdate.nextRetakeDate = cooldownTimestamp;
    }
    batch.update(interviewRef, interviewUpdate);

    // 6. Handle previous feedback
    const previousFeedback = await adminDb
      .collection("feedback")
      .where("interviewId", "==", interviewId)
      .get();

    if (!previousFeedback.empty) {
      previousFeedback.docs.forEach((doc) => {
        batch.update(doc.ref, { isLatest: false });
      });
    }

    // 7. Handle max attempts
    if (currentAttempt >= MAX_ATTEMPTS) {
      const previousInterviews = await adminDb
        .collection("interviews")
        .where("courseId", "==", interviewDoc.data().courseId)
        .where("userId", "==", userId)
        .where(FieldPath.documentId(), "!=", interviewId)
        .get();

      previousInterviews.docs.forEach((doc) => {
        batch.update(doc.ref, {
          status: "archived",
          archivedAt: Timestamp.now(),
        });
      });
    }

    // 8. Commit transaction
    await batch.commit();

    // 9. Return formatted response
    return {
      id: feedbackRef.id,
      ...feedbackData,
      createdAt: feedbackData.createdAt.toDate(),
      retakeEligibility: {
        required: requiresRetake,
        availableDate: requiresRetake ? cooldownEnd : null,
        attemptsRemaining: MAX_ATTEMPTS - currentAttempt,
      },
    };
  } catch (error) {
    console.error("Feedback Error:", error);

    // Cleanup failed feedback creation
    if (feedbackRef) {
      try {
        await adminDb.collection("feedback").doc(feedbackRef.id).delete();
      } catch (cleanupError) {
        console.error("Cleanup failed:", cleanupError);
      }
    }

    throw new Error(`Feedback generation failed: ${error.message}`);
  }
}

export async function getFeedbackById(feedbackId, userId) {
  try {
    const feedbackRef = adminDb.collection("feedback").doc(feedbackId);
    const doc = await feedbackRef.get();

    if (!doc.exists) {
      return null;
    }

    const feedback = { id: doc.id, ...doc.data() };

    // Verify feedback ownership
    if (feedback.userId !== userId) {
      throw new Error("Unauthorized access to feedback");
    }

    return {
      ...feedback,
      createdAt: feedback.createdAt.toDate(),
    };
  } catch (error) {
    throw new Error(`Failed to get feedback: ${error.message}`);
  }
}

export async function getAllUserFeedback(userId) {
  try {
    const snapshot = await adminDb
      .collection("feedback")
      .where("userId", "==", userId)
      .orderBy("createdAt", "desc")
      .get();

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt.toDate(),
    }));
  } catch (error) {
    throw new Error(`Failed to fetch user feedback: ${error.message}`);
  }
}
