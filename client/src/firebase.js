import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword 
} from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDtK37CUNJeZ2f4585cZxWr2xoUIdAWTtA",
  authDomain: "sos-application-68e43.firebaseapp.com",
  projectId: "sos-application-68e43",
  storageBucket: "sos-application-68e43.firebasestorage.app",
  messagingSenderId: "576527955648",
  appId: "1:576527955648:web:e03bd18452ff8ca0b11f25",
  measurementId: "G-C0T8BKHHG7"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export { 
  auth, 
  googleProvider, 
  signInWithPopup, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword 
};