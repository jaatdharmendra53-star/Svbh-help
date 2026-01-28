
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyANuwG5Uj6_CJ7ypeel-rurhVJymr629zo",
  authDomain: "svbh-help.firebaseapp.com",
  projectId: "svbh-help",
  storageBucket: "svbh-help.firebasestorage.app",
  messagingSenderId: "764462135031",
  appId: "1:764462135031:web:686f7aa34c6b60ea5905f2"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

// Auth is unused in the new system but we export a mock or nothing. 
// For this app, we strictly use Firestore for 'session' validation.
export { db };
