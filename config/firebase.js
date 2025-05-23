import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import {
  getFirestore,
  Timestamp,
  FieldValue,
  FieldPath,
} from "firebase-admin/firestore";

const firebaseAdminConfig = {
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  }),
};

const apps = getApps();
const adminApp = apps.length ? apps[0] : initializeApp(firebaseAdminConfig);

export const adminAuth = getAuth(adminApp);
export const adminDb = getFirestore(adminApp);
export { Timestamp, FieldValue, FieldPath }; // Export Timestamp
