// Import the functions you need from the SDKs you need
import { getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDfYHWYyfSzG0d4AHP1hs6zzQ8vk17H9QE",
  authDomain: "chatapplication-fc0f3.firebaseapp.com",
  projectId: "chatapplication-fc0f3",
  storageBucket: "chatapplication-fc0f3.firebasestorage.app",
  messagingSenderId: "1025796615909",
  appId: "1:1025796615909:web:44e9ce953ee926b815ae0c",
};

// Initialize Firebase
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };
