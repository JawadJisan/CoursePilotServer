// controllers/auth.controller.js
import { adminAuth, adminDb } from "../config/firebase.js";
import AppError from "../utils/AppError.js";

// const SESSION_DURATION = 5 * 1000 * 60; // 5 minutes in milliseconds
// const COOKIE_MAX_AGE = SESSION_DURATION * 1000; // 5 minutes in milliseconds

const SESSION_DURATION = 2 * 24 * 60 * 60 * 1000; // 2 days in milliseconds (172800000 ms)
const COOKIE_MAX_AGE = SESSION_DURATION; // Same value for cookie maxAge

// Keep all other code the same except these constants

const formatUserResponse = (userData) => ({
  uid: userData.uid,
  name: userData.name,
  email: userData.email,
  expiresAt: userData.expiresAt,
  ...userData,
});

// User registration
export const signUp = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      throw new AppError(400, "All fields are required");
    }

    // Check existing user
    try {
      await adminAuth.getUserByEmail(email);
      throw new AppError(400, "User already exists with this email");
    } catch (error) {
      if (error.code !== "auth/user-not-found") throw error;
    }

    // Create Firebase Auth user
    const userRecord = await adminAuth.createUser({
      email,
      password,
      displayName: name,
    });

    // Create Firestore user document
    const userRef = adminDb.collection("users").doc(userRecord.uid);
    await userRef.set({
      name,
      email,
      createdAt: new Date().toISOString(),
    });

    res.status(201).json({
      success: true,
      data: formatUserResponse({
        uid: userRecord.uid,
        name,
        email,
      }),
    });
  } catch (error) {
    next(error);
  }
};

// User login
export const logIn = async (req, res, next) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      throw new AppError(400, "ID token is required");
    }

    // Create session cookie
    const sessionCookie = await adminAuth.createSessionCookie(idToken, {
      expiresIn: SESSION_DURATION,
    });

    // Verify and get user data
    const decodedToken = await adminAuth.verifySessionCookie(sessionCookie);
    const userRecord = await adminAuth.getUser(decodedToken.uid);

    // Set cookie
    res.cookie("session", sessionCookie, {
      maxAge: COOKIE_MAX_AGE,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      // sameSite: "strict",
      sameSite: "lax",
      path: "/",
    });

    res.status(200).json({
      success: true,
      data: formatUserResponse({
        uid: userRecord.uid,
        name: userRecord.displayName,
        email: userRecord.email,
        expiresAt: new Date(decodedToken.exp * 1000).toISOString(),
      }),
    });
  } catch (error) {
    console.log("error:", error);
    next(new AppError(401, "Invalid credentials"));
  }
};

// Session refresh
export const refreshSession = async (req, res, next) => {
  try {
    const { idToken } = req.body;

    // Create new session cookie
    const sessionCookie = await adminAuth.createSessionCookie(idToken, {
      expiresIn: SESSION_DURATION,
    });

    // Verify and get expiration
    const decodedToken = await adminAuth.verifySessionCookie(sessionCookie);

    // Set cookie
    res.cookie("session", sessionCookie, {
      maxAge: COOKIE_MAX_AGE,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      // sameSite: "strict",
      sameSite: "lax",
      path: "/",
    });

    res.json({
      success: true,
      data: {
        expiresAt: new Date(decodedToken.exp * 1000).toISOString(),
      },
    });
  } catch (error) {
    next(new AppError(401, "Session refresh failed"));
  }
};

// Get current user
export const getCurrentUser = async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      data: formatUserResponse(req.user),
    });
  } catch (error) {
    next(error);
  }
};

// User logout
export const signOut = (req, res) => {
  res.clearCookie("session", {
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  });

  res.status(200).json({
    success: true,
    message: "Logged out successfully",
  });
};
