// services/progress.service.js
import { adminDb } from "../config/firebase.js";

const calculateProgress = (course, progressData) => {
  let completedModules = 0;
  let completedLessons = 0;
  let completedResources = 0;

  const moduleDetails = course.modules.map((module) => {
    const moduleProgress = progressData.modules[module.id] || { lessons: {} };
    const moduleLessons = module.lessons.length;
    let completedModuleLessons = 0;

    const lessonDetails = module.lessons.map((lesson) => {
      const lessonProgress = moduleProgress.lessons[lesson.id] || {
        resources: [],
      };
      const lessonResources = lesson.resources.length;
      const completedLessonResources = lessonProgress.resources.length;

      completedResources += completedLessonResources;

      return {
        lessonId: lesson.id,
        completed: completedLessonResources === lessonResources,
        progress:
          lessonResources > 0
            ? Math.round((completedLessonResources / lessonResources) * 100)
            : 0,
        completedResources: completedLessonResources,
        totalResources: lessonResources,
      };
    });

    completedModuleLessons = lessonDetails.filter((l) => l.completed).length;
    completedLessons += completedModuleLessons;

    const moduleComplete = completedModuleLessons === moduleLessons;
    if (moduleComplete) completedModules++;

    return {
      moduleId: module.id,
      completed: moduleComplete,
      progress:
        moduleLessons > 0
          ? Math.round((completedModuleLessons / moduleLessons) * 100)
          : 0,
      totalLessons: moduleLessons,
      completedLessons: completedModuleLessons,
      lessons: lessonDetails,
    };
  });

  return {
    overallProgress: Math.round(
      (completedModules / course.modules.length) * 100
    ),
    totalModules: course.modules.length,
    completedModules,
    totalLessons: course.modules.reduce((acc, m) => acc + m.lessons.length, 0),
    completedLessons,
    totalResources: course.modules.flatMap((m) =>
      m.lessons.flatMap((l) => l.resources)
    ).length,
    completedResources,
    modules: moduleDetails,
  };
};

const initializeProgress = (course) => {
  return {
    overallProgress: 0,
    totalModules: course.modules.length,
    completedModules: 0,
    totalLessons: course.modules.reduce(
      (acc, module) => acc + module.lessons.length,
      0
    ),
    completedLessons: 0,
    totalResources: course.modules.flatMap((m) =>
      m.lessons.flatMap((l) => l.resources)
    ).length,
    completedResources: 0,
    modules: course.modules.map((module) => ({
      moduleId: module.id,
      title: module.title,
      completed: false,
      progress: 0,
      totalLessons: module.lessons.length,
      completedLessons: 0,
      lessons: module.lessons.map((lesson) => ({
        lessonId: lesson.id,
        title: lesson.title,
        completed: false,
        progress: 0,
        completedResources: 0,
        totalResources: lesson.resources.length,
        resources: [],
      })),
    })),
    createdAt: new Date().toISOString(),
    lastAccessed: new Date().toISOString(),
  };
};

export const getUserProgress = async (userId) => {
  const snapshot = await adminDb
    .collectionGroup("courseProgress")
    .where("userId", "==", userId)
    .get();

  return snapshot.docs.map((doc) => doc.data());
};

export const getCourseProgress = async (userId, courseId) => {
  const courseRef = adminDb.collection("courses").doc(courseId);
  const courseDoc = await courseRef.get();

  if (!courseDoc.exists) {
    throw new Error("Course not found");
  }

  const progressRef = adminDb
    .collection("users")
    .doc(userId)
    .collection("courseProgress")
    .doc(courseId);

  const progressDoc = await progressRef.get();
  console.log("progressDoc:", progressDoc);

  return {
    course: courseDoc.data(),
    progress: progressDoc.exists
      ? calculateProgress(courseDoc.data(), progressDoc.data())
      : initializeProgress(courseDoc.data()),
  };
};

export const updateProgress = async (
  userId,
  courseId,
  lessonId,
  resourceId
) => {
  const db = adminDb;
  return db.runTransaction(async (transaction) => {
    const courseRef = db.collection("courses").doc(courseId);
    const progressRef = db
      .collection("users")
      .doc(userId)
      .collection("courseProgress")
      .doc(courseId);

    const [courseDoc, progressDoc] = await Promise.all([
      transaction.get(courseRef),
      transaction.get(progressRef),
    ]);

    if (!courseDoc.exists) throw new Error("Course not found");

    const course = courseDoc.data();
    const progress = progressDoc.exists
      ? progressDoc.data()
      : {
          userId,
          courseId,
          modules: {},
          lastAccessed: new Date().toISOString(),
        };

    // Find module containing the lesson
    const module = course.modules.find((m) =>
      m.lessons.some((l) => l.id === lessonId)
    );

    if (!module) throw new Error("Lesson not found in course");

    // Initialize module progress
    if (!progress.modules[module.id]) {
      progress.modules[module.id] = {
        lessons: {},
        lastAccessed: new Date().toISOString(),
      };
    }

    // Initialize lesson progress
    if (!progress.modules[module.id].lessons[lessonId]) {
      progress.modules[module.id].lessons[lessonId] = {
        resources: [],
        completedAt: null,
      };
    }

    // Add resource if not already present
    if (
      !progress.modules[module.id].lessons[lessonId].resources.includes(
        resourceId
      )
    ) {
      progress.modules[module.id].lessons[lessonId].resources.push(resourceId);
    }

    // Update timestamps
    progress.lastAccessed = new Date().toISOString();
    progress.modules[module.id].lastAccessed = new Date().toISOString();

    // Calculate and save progress
    const calculatedProgress = calculateProgress(course, progress);
    progress.overallProgress = calculatedProgress.overallProgress;

    transaction.set(progressRef, progress);

    return {
      courseId,
      ...calculatedProgress,
      updatedAt: new Date().toISOString(),
    };
  });
};
