import firebase from "firebase/compat/app";
import "firebase/compat/auth";
import "firebase/compat/firestore";

// Configuration provided
const firebaseConfig = {
  apiKey: "AIzaSyDgSQ4HAs1eiivav3fV1Py7DUmsJFRpO-w",
  authDomain: "meis-staff-quiz.firebaseapp.com",
  projectId: "meis-staff-quiz",
  storageBucket: "meis-staff-quiz.firebasestorage.app",
  messagingSenderId: "974853248153",
  appId: "1:974853248153:web:37a24afc04529581a95408"
};

// Initialize Firebase (Compat mode to support existing v8-style code)
const app = !firebase.apps.length ? firebase.initializeApp(firebaseConfig) : firebase.app();
console.log("Firebase initialized for project:", firebaseConfig.projectId);

export const auth = app.auth();
export const db = app.firestore();
export default app;