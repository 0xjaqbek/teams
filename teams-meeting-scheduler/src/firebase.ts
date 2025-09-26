import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID
};

// Debug: Log config to check if env vars are loaded
console.log('Firebase Config:', {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY ? 'SET' : 'MISSING',
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN ? 'SET' : 'MISSING',
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID ? 'SET' : 'MISSING',
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET ? 'SET' : 'MISSING',
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID ? 'SET' : 'MISSING',
  appId: process.env.REACT_APP_FIREBASE_APP_ID ? 'SET' : 'MISSING'
});

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app);

// Google Auth Provider
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Connect to emulators only when explicitly enabled
if (process.env.REACT_APP_USE_EMULATORS === 'true') {
  try {
    connectAuthEmulator(auth, 'http://localhost:9099');
    connectFirestoreEmulator(db, 'localhost', 8080);
    connectFunctionsEmulator(functions, 'localhost', 5001);
    console.log('Connected to Firebase emulators');
  } catch (error) {
    console.log('Firebase emulators connection failed (may already be connected):', error);
  }
}

export default app;
