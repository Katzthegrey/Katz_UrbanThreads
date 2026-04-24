// firebase-config.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

// Use window._env_ for Netlify injection (works in browser)
const firebaseConfig = {
  apiKey: window._env_?.FIREBASE_API_KEY,
  authDomain: window._env_?.FIREBASE_AUTH_DOMAIN,
  projectId: window._env_?.FIREBASE_PROJECT_ID,
  storageBucket: window._env_?.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: window._env_?.FIREBASE_MESSAGING_SENDER_ID,
  appId: window._env_?.FIREBASE_APP_ID,
  measurementId: window._env_?.FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

export { db, auth, storage };