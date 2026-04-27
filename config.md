// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
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
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);