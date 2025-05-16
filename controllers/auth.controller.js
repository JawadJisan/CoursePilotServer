import { adminAuth, adminDb } from "../config/firebase.js";
import AppError from "../utils/AppError.js";

const SESSION_DURATION = 5 * 60 * 1000; // 5 minutes

// User registration
export const signUp = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      throw new AppError(400, "All fields are required");
    }

    try {
      await adminAuth.getUserByEmail(email);
      throw new AppError(400, "User already exists with this email");
    } catch (error) {
      if (error.code !== "auth/user-not-found") throw error;
    }

    const userRecord = await adminAuth.createUser({
      email,
      password,
      displayName: name,
    });

    const userRef = adminDb.collection("users").doc(userRecord.uid);
    const userDoc = await userRef.get();

    if (userDoc.exists) {
      await adminAuth.deleteUser(userRecord.uid);
      throw new AppError(400, "User already exists in system");
    }

    await userRef.set({
      name,
      email,
      createdAt: new Date().toISOString(),
    });

    res.status(201).json({
      success: true,
      data: {
        uid: userRecord.uid,
        email: userRecord.email,
      },
    });
  } catch (error) {
    next(error);
  }
};

// User login
export const logIn = async (req, res, next) => {
  try {
    const { idToken } = req.body;

    // Validate input
    if (!idToken) {
      throw new AppError(400, "ID token is required");
    }

    const sessionCookie = await adminAuth.createSessionCookie(idToken, {
      expiresIn: SESSION_DURATION,
    });

    const decodedToken = await adminAuth.verifySessionCookie(sessionCookie);
    const expiresAt = new Date(decodedToken.exp * 1000);

    // console.log("decodedToken:", decodedToken);

    const userRecord = await adminAuth.getUser(decodedToken.uid);

    // console.log("userRecord:", userRecord);

    res.cookie("session", sessionCookie, {
      maxAge: SESSION_DURATION,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
    });

    res.status(200).json({
      success: true,
      data: {
        uid: userRecord.uid,
        name: userRecord.displayName,
        email: userRecord.email,
        expiresAt: expiresAt.toISOString(),
      },
    });
  } catch (error) {
    next(new AppError(401, "Invalid credentials"));
  }
};

// Session refresh
export const refreshSession = async (req, res, next) => {
  try {
    const { idToken } = req.body;

    const sessionCookie = await adminAuth.createSessionCookie(idToken, {
      expiresIn: SESSION_DURATION,
    });

    const decodedToken = await adminAuth.verifySessionCookie(sessionCookie);
    const expiresAt = new Date(decodedToken.exp * 1000);

    res.cookie("session", sessionCookie, {
      maxAge: SESSION_DURATION,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
    });

    res.json({
      success: true,
      data: {
        expiresAt: expiresAt.toISOString(),
      },
    });
  } catch (error) {
    next(new AppError(401, "Session refresh failed"));
  }
};

// Get current user
export const getCurrentUser = async (req, res, next) => {
  try {
    const { uid } = req.user;
    const userDoc = await adminDb.collection("users").doc(uid).get();

    if (!userDoc.exists) {
      throw new AppError(404, "User not found");
    }

    res.status(200).json({
      success: true,
      data: {
        uid: userDoc.id,
        ...userDoc.data(),
      },
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

/* ------- */

export const logInOld = async (req, res, next) => {
  try {
    const { idToken } = req.body;

    // Validate input
    if (!idToken) {
      throw new AppError(400, "ID token is required");
    }

    // Verify Firebase ID token and create session cookie
    const sessionCookie = await adminAuth.createSessionCookie(idToken, {
      expiresIn: 60 * 60 * 24 * 7 * 1000, // 1 week
    });

    // Get user details from the ID token
    const decodedToken = await adminAuth.verifySessionCookie(
      sessionCookie,
      true
    );
    const userRecord = await adminAuth.getUser(decodedToken.uid);

    // Set session cookie in response
    res.cookie("session", sessionCookie, {
      maxAge: 60 * 60 * 24 * 7 * 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });

    // Return user data (excluding sensitive info)
    res.status(200).json({
      success: true,
      data: {
        uid: userRecord.uid,
        name: userRecord.displayName,
        email: userRecord.email,
      },
    });
  } catch (error) {
    next(new AppError(401, "Invalid credentials or session creation failed"));
  }
};
