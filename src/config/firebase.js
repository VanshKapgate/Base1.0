import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 🔥 Replace these values with your Firebase project config
// Go to: Firebase Console → Project Settings → Your Apps → Web App
const firebaseConfig = {
  apiKey: "AIzaSyCSdxSR_eqLWoTjkgXa7X63MDZy0YnOdyA",
  authDomain: "base-1-trail.firebaseapp.com",
  projectId: "base-1-trail",
  storageBucket: "base-1-trail.firebasestorage.app",
  messagingSenderId: "56860788899",
  appId: "1:56860788899:web:311fc669edbea06a9cd716",
  measurementId: "G-0VJCQ6T6C7"
};

const app = initializeApp(firebaseConfig);

export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
