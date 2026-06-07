import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, GithubAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCJGNnmnptUELFS8ooPw0PGfrhdDCKO5oY",
  authDomain: "jangid-blog.firebaseapp.com",
  projectId: "jangid-blog",
  storageBucket: "jangid-blog.firebasestorage.app",
  messagingSenderId: "1001477589857",
  appId: "1:1001477589857:web:b3ce281f64661f7a809320",
  databaseURL: "https://jangid-blog-default-rtdb.firebaseio.com"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const rtdb = getDatabase(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();
export const githubProvider = new GithubAuthProvider();
