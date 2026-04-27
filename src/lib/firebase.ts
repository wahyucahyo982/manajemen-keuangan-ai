import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBHSYVsCZAAfcB5j8PbrBFmoQqZ6V33Fso",
  authDomain: "my-finance-project-id.firebaseapp.com",
  databaseURL: "https://my-finance-project-id-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "my-finance-project-id",
  storageBucket: "my-finance-project-id.firebasestorage.app",
  messagingSenderId: "262444956887",
  appId: "1:262444956887:web:13c2573d4dbd07a56e0492",
  measurementId: "G-1MKPP9TVSC"
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Realtime Database and get a reference to the service
export const database = getDatabase(app);

export default app;
