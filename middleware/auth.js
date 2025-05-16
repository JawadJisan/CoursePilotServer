import { adminAuth, adminDb } from "../config/firebase.js";
import AppError from "../utils/AppError.js";

export const authenticateUser = async (req, res, next) => {
  try {
    const sessionCookie = req.cookies.session;

    console.log("sessionCookie:", sessionCookie);

    if (!sessionCookie) {
      return next(new AppError(401, "Not authenticated"));
    }

    // Verify session cookie
    const decodedToken = await adminAuth.verifySessionCookie(
      sessionCookie,
      true
    );

    console.log("decodedToken:", decodedToken);

    // Get user from Firestore
    const userDoc = await adminDb
      .collection("users")
      .doc(decodedToken.uid)
      .get();

    if (!userDoc.exists) {
      return next(new AppError(404, "User not found"));
    }

    // Attach user to request
    req.user = {
      uid: decodedToken.uid,
      ...userDoc.data(),
    };

    next();
  } catch (error) {
    console.log("error:", error);
    next(new AppError(401, "Invalid or expired session"));
  }
};
