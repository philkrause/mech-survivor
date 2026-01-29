import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyB3DrNmzLB8G0sHxNe8EbdYI-fwQJViYfY",
  authDomain: "mech-survivor-b8b8f.firebaseapp.com",
  databaseURL: "https://mech-survivor-b8b8f-default-rtdb.firebaseio.com",
  projectId: "mech-survivor-b8b8f",
  storageBucket: "mech-survivor-b8b8f.firebasestorage.app",
  messagingSenderId: "522493664255",
  appId: "1:522493664255:web:943a725c7822eab35f25ca"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Realtime Database (much faster for leaderboards!)
export const db = getDatabase(app);

// Expose for debugging
if (typeof window !== 'undefined') {
  (window as any).firebaseDb = db;
  console.log('🔥 Firebase Realtime Database initialized');
}

export default app;

