import { adminDb } from "../config/firebase.js";

// export async function getAllCourses(userId) {
//   try {
//     const snapshot = await adminDb.collection("courses").get();
//     return snapshot.docs.map((doc) => ({
//       id: doc.id,
//       ...doc.data(),
//     }));
//   } catch (error) {
//     throw new Error("Failed to fetch courses");
//   }
// }

// services/course.service.js
export async function getAllCourses() {
  try {
    // Get all courses
    const coursesSnapshot = await adminDb.collection("courses").get();
    const courses = coursesSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Get unique user IDs from all courses
    const userIds = [...new Set(courses.map((course) => course.userId))];

    // Batch get all users
    const userPromises = userIds.map((userId) =>
      adminDb.collection("users").doc(userId).get()
    );
    const userSnapshots = await Promise.all(userPromises);

    // Create user map { userId: userData }
    const usersMap = new Map();
    userSnapshots.forEach((userDoc, index) => {
      console.log("userDoc:", userDoc);
      const userId = userIds[index];
      usersMap.set(
        userId,
        userDoc.exists
          ? {
              id: userDoc.id,
              name: userDoc.data().name,
              email: userDoc.data().email,
            }
          : null
      );
    });

    // Merge user data into courses
    return courses.map((course) => ({
      ...course,
      user: usersMap.get(course.userId) || null,
    }));
  } catch (error) {
    throw new Error("Failed to fetch courses");
  }
}

export async function getUserCourses(userId) {
  console.log("userId:", userId);
  try {
    const snapshot = await adminDb
      .collection("courses")
      .where("userId", "==", userId)
      .get();

    const courses = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return courses;
  } catch (error) {
    throw {
      message: error.message || "Failed to fetch user courses",
      statusCode: error.statusCode || 500,
    };
  }
}

// services/course.service.js
export async function getCourseById(courseId) {
  try {
    const courseRef = adminDb.collection("courses").doc(courseId);
    const courseDoc = await courseRef.get();

    if (!courseDoc.exists) {
      throw { message: "Course not found", statusCode: 404 };
    }

    const courseData = courseDoc.data();

    // Get user data
    const userRef = adminDb.collection("users").doc(courseData.userId);
    const userDoc = await userRef.get();

    const user = userDoc.exists
      ? {
          id: userDoc.id,
          name: userDoc.data().name,
          email: userDoc.data().email,
        }
      : null;

    return {
      id: courseDoc.id,
      ...courseData,
      user, // Add user data to response
      // Convert Firestore timestamp to ISO string
      createdAt: courseData.createdAt.toDate().toISOString(),
    };
  } catch (error) {
    throw {
      message: error.message || "Failed to fetch course details",
      statusCode: error.statusCode || 500,
    };
  }
}
