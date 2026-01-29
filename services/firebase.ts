import { initializeApp, getApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Firebase configuration for SVBH Help Portal
const firebaseConfig = {
  apiKey: "AIzaSyANuwG5Uj6_CJ7ypeel-rurhVJymr629zo",
  authDomain: "svbh-help.firebaseapp.com",
  projectId: "svbh-help",
  storageBucket: "svbh-help.firebasestorage.app",
  messagingSenderId: "764462135031",
  appId: "1:764462135031:web:686f7aa34c6b60ea5905f2"
};

// Initialize Firebase only once to prevent "app already exists" errors in environments with HMR
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

export { db };
