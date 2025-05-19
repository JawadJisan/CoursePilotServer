import { adminAuth, adminDb } from "../config/firebase.js";
import AppError from "../utils/AppError.js";

export const authenticateUser = async (req, res, next) => {
  try {
    const sessionCookie = req.cookies.session;

    if (!sessionCookie) {
      return next(new AppError(401, "Not authenticated"));
    }

    // Verify session cookie and get expiration time
    const decodedToken = await adminAuth.verifySessionCookie(
      sessionCookie,
      true
    );
    const expiresAt = new Date(decodedToken.exp * 1000);

    // Get user from Firestore
    const userDoc = await adminDb
      .collection("users")
      .doc(decodedToken.uid)
      .get();

    if (!userDoc.exists) {
      return next(new AppError(404, "User not found"));
    }

    // Attach standardized user data to request
    req.user = {
      uid: decodedToken.uid,
      name: userDoc.data().name,
      email: userDoc.data().email,
      expiresAt: expiresAt.toISOString(),
      ...userDoc.data(),
    };

    next();
  } catch (error) {
    next(new AppError(401, "Invalid or expired session"));
  }
};
