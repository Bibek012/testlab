
export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Validation to prevent crash on missing configuration
export const isFirebaseConfigValid = !!(
  firebaseConfig.apiKey && 
  firebaseConfig.apiKey !== "undefined" &&
  firebaseConfig.projectId
);

if (typeof window !== 'undefined' && !isFirebaseConfigValid) {
  console.warn(
    "Testlab: Firebase configuration is missing or incomplete. " +
    "Please check your .env file and ensure all NEXT_PUBLIC_FIREBASE_* variables are set."
  );
}
