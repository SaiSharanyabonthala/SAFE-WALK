import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  createUserWithEmailAndPassword, // ADD THIS
  signInWithEmailAndPassword      // ADD THIS
} from "firebase/auth";

// Your real configuration from Firebase Console
const firebaseConfig = {
  apiKey: "AIzaSyDtK37CUNJeZ2f4585cZxWr2xoUIdAWTtA",
  authDomain: "sos-application-68e43.firebaseapp.com",
  projectId: "sos-application-68e43",
  storageBucket: "sos-application-68e43.firebasestorage.app",
  messagingSenderId: "576527955648",
  appId: "1:576527955648:web:e03bd18452ff8ca0b11f25",
  measurementId: "G-C0T8BKHHG7"
};

// 1. Initialize Firebase
const app = initializeApp(firebaseConfig);

// 2. Initialize Auth services
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// 3. THE CRITICAL STEP: Added the two new functions to the export list
export { 
  auth, 
  googleProvider, 
  signInWithPopup, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword 
};