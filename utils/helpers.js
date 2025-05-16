export function loadEnv() {
  const requiredEnvVars = [
    "FIREBASE_PROJECT_ID",
    "FIREBASE_CLIENT_EMAIL",
    "FIREBASE_PRIVATE_KEY",
    "GOOGLE_GENERATIVE_AI_API_KEY",
  ];

  requiredEnvVars.forEach((varName) => {
    if (!process.env[varName]) {
      throw new Error(`Missing required environment variable: ${varName}`);
    }
  });
}
