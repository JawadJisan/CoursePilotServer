// services/progress.service.js
import { adminDb } from "../config/firebase.js";

const calculateProgress = (course, progressData) => {
  let completedLessons = 0;
  let completedResources = 0;
  const totalLessons = course.modules.reduce(
    (acc, m) => acc + m.lessons.length,
    0
  );
  const totalResources = course.modules.flatMap((m) =>
    m.lessons.flatMap((l) => l.resources)
  ).length;

  const moduleDetails = course.modules.map((module) => {
    const moduleProgress = progressData.modules[module.id] || { lessons: {} };
    let moduleCompletedLessons = 0;

    const lessonDetails = module.lessons.map((lesson) => {
      const lessonProgress = moduleProgress.lessons[lesson.id] || {
        resources: [],
      };
      const lessonResourceCount = lesson.resources.length;
      const completed = lessonProgress.resources.length >= lessonResourceCount;

      if (completed) {
        completedLessons++;
        completedResources += lessonResourceCount;
      } else {
        completedResources += lessonProgress.resources.length;
      }

      return {
        lessonId: lesson.id,
        completed,
        progress:
          lessonResourceCount > 0
            ? Math.round(
                (lessonProgress.resources.length / lessonResourceCount) * 100
              )
            : 0,
        completedResources: lessonProgress.resources.length,
        totalResources: lessonResourceCount,
      };
    });

    moduleCompletedLessons = lessonDetails.filter((l) => l.completed).length;

    return {
      moduleId: module.id,
      completed: moduleCompletedLessons === module.lessons.length,
      progress:
        module.lessons.length > 0
          ? Math.round((moduleCompletedLessons / module.lessons.length) * 100)
          : 0,
      totalLessons: module.lessons.length,
      completedLessons: moduleCompletedLessons,
      lessons: lessonDetails,
    };
  });

  const completedModules = moduleDetails.filter((m) => m.completed).length;

  return {
    overallProgress: Math.round((completedLessons / totalLessons) * 100),
    totalModules: course.modules.length,
    completedModules,
    totalLessons,
    completedLessons,
    totalResources,
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

  return {
    progress: progressDoc.exists
      ? calculateProgress(courseDoc.data(), progressDoc.data())
      : initializeProgress(courseDoc.data()),
  };
};

export const updateProgressss = async (userId, courseId, lessonId) => {
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

    // Find module and lesson
    const module = course.modules.find((m) =>
      m.lessons.some((l) => l.id === lessonId)
    );
    if (!module) throw new Error("Lesson not found in course");

    const lesson = module.lessons.find((l) => l.id === lessonId);
    if (!lesson) throw new Error("Lesson not found");

    // Get all resource IDs for the lesson
    const allResourceIds = lesson.resources.map((r) => r.id);

    // Initialize progress structure
    if (!progress.modules[module.id]) {
      progress.modules[module.id] = {
        lessons: {},
        lastAccessed: new Date().toISOString(),
      };
    }

    if (!progress.modules[module.id].lessons[lessonId]) {
      progress.modules[module.id].lessons[lessonId] = {
        resources: [],
        completedAt: null,
      };
    }

    // Add all lesson resources if not already present
    const existingResources =
      progress.modules[module.id].lessons[lessonId].resources;
    const newResources = allResourceIds.filter(
      (id) => !existingResources.includes(id)
    );
    progress.modules[module.id].lessons[lessonId].resources = [
      ...existingResources,
      ...newResources,
    ];

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

export const updateProgress = async (userId, courseId, lessonId) => {
  const db = adminDb;
  return db.runTransaction(async (transaction) => {
    const [courseDoc, progressDoc] = await Promise.all([
      transaction.get(db.collection("courses").doc(courseId)),
      transaction.get(
        db
          .collection("users")
          .doc(userId)
          .collection("courseProgress")
          .doc(courseId)
      ),
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

    // Find module and lesson
    const module = course.modules.find((m) =>
      m.lessons.some((l) => l.id === lessonId)
    );
    const lesson = module?.lessons.find((l) => l.id === lessonId);
    if (!lesson) throw new Error("Lesson not found");

    // Initialize progress structure
    progress.modules[module.id] = progress.modules[module.id] || {
      lessons: {},
      lastAccessed: new Date().toISOString(),
    };
    progress.modules[module.id].lessons[lessonId] = progress.modules[module.id]
      .lessons[lessonId] || {
      resources: [],
      completedAt: null,
    };

    // Get all resource IDs and mark them as completed
    const requiredResources = new Set(lesson.resources.map((r) => r.id));
    const currentResources = new Set(
      progress.modules[module.id].lessons[lessonId].resources
    );

    // Add missing resources
    requiredResources.forEach((id) => currentResources.add(id));
    progress.modules[module.id].lessons[lessonId].resources =
      Array.from(currentResources);

    // Update timestamps
    const now = new Date().toISOString();
    progress.lastAccessed = now;
    progress.modules[module.id].lastAccessed = now;

    // Calculate and save progress
    const calculated = calculateProgress(course, progress);
    progress.overallProgress = calculated.overallProgress;

    transaction.set(progressDoc.ref, progress);

    return {
      courseId,
      ...calculated,
      updatedAt: now,
    };
  });
};
