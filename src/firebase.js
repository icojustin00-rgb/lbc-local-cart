import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAgcigGTgyIcprstvUbTujDyCyKY-dUciY",
  authDomain: "lbc-local-cart-60928.firebaseapp.com",
  databaseURL: "https://lbc-local-cart-60928-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "lbc-local-cart-60928",
  storageBucket: "lbc-local-cart-60928.firebasestorage.app",
  messagingSenderId: "177709843779",
  appId: "1:177709843779:web:b516ce6e56c02b3d1d9bf6"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);