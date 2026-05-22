// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDUFzVCjc3kjU9RrQzFu0ntB8EymeaOw9k",
  authDomain: "lbc-local-cart2.firebaseapp.com",
  databaseURL: "https://lbc-local-cart2-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "lbc-local-cart2",
  storageBucket: "lbc-local-cart2.firebasestorage.app",
  messagingSenderId: "4147322474",
  appId: "1:4147322474:web:f370b48f7eb38b28f6b413"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
