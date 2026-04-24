// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDI25pxsyKWGkwdmIBmr6Uq_TPVdnz1YCQ",
  authDomain: "katz-urban-threads.firebaseapp.com",
  projectId: "katz-urban-threads",
  storageBucket: "katz-urban-threads.firebasestorage.app",
  messagingSenderId: "525151519240",
  appId: "1:525151519240:web:05131e6febab84434587bd",
  measurementId: "G-SMLWCCWLV4"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

export { db, auth, storage };