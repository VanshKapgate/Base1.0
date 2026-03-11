import React, { createContext, useContext, useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { signInAnonymously, signOut } from 'firebase/auth';
import { auth, db } from '../config/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AuthContext = createContext();

// 🔑 MASTER ADMIN PASSKEY — Change this to your own secret!
export const ADMIN_PASSKEY = 'jk02al8348';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);       // current user object from Firestore
  const [role, setRole] = useState(null);       // 'admin' | 'apostle' | 'member'
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // On app start, try to restore session from AsyncStorage
    restoreSession();
  }, []);

  const restoreSession = async () => {
    try {
      const savedUid = await AsyncStorage.getItem('userUid');
      if (savedUid) {
        // Re-attach Firestore listener for this user
        const unsub = onSnapshot(doc(db, 'users', savedUid), (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            setUser({ uid: savedUid, ...data });
            setRole(data.role);
          }
        });
        return unsub;
      }
    } catch (e) {
      console.log('No saved session');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Login with name + passkey
   * Firestore users/{uid} must already exist (created by admin panel)
   * We find the user document where passkey matches
   */
  const loginWithPasskey = async (name, passkey) => {
    // ── Admin shortcut: name=Rain + master passkey logs in as admin silently ──
    if (name.trim() === 'Rain' && passkey.trim() === ADMIN_PASSKEY) {
      await AsyncStorage.setItem('userUid', 'ADMIN');
      setUser({ uid: 'ADMIN', name: 'Rain', role: 'admin' });
      setRole('admin');
      return { role: 'admin' };
    }

    const { collection, query, where, getDocs, updateDoc } = await import('firebase/firestore');

    // Find the user record matching name + passkey
    const q = query(
      collection(db, 'users'),
      where('name', '==', name.trim()),
      where('passkey', '==', passkey.trim())
    );
    const snap = await getDocs(q);
    if (snap.empty) {
      throw new Error('Invalid name or passkey. Please check with your admin.');
    }

    const userDoc = snap.docs[0];
    const userData = userDoc.data();
    const uid = userDoc.id;

    // Sign in anonymously in Firebase Auth to get a real auth session
    await signInAnonymously(auth);

    // Save uid to local storage for session restore
    await AsyncStorage.setItem('userUid', uid);

    // Update online status + last seen
    await updateDoc(doc(db, 'users', uid), {
      isOnline: true,
      lastSeen: serverTimestamp(),
    });

    setUser({ uid, ...userData });
    setRole(userData.role);
    return userData;
  };

  /**
   * Login as admin with master passkey
   */
  const loginAsAdmin = async (masterPasskey) => {
    if (masterPasskey !== ADMIN_PASSKEY) {
      throw new Error('Wrong master passkey');
    }
    await AsyncStorage.setItem('userUid', 'ADMIN');
    setUser({ uid: 'ADMIN', name: 'Rain', role: 'admin' });
    setRole('admin');
  };

  const logout = async () => {
    const uid = user?.uid;
    if (uid && uid !== 'ADMIN') {
      await updateDoc(doc(db, 'users', uid), {
        isOnline: false,
        lastSeen: serverTimestamp(),
      });
    }
    await signOut(auth);
    await AsyncStorage.removeItem('userUid');
    setUser(null);
    setRole(null);
  };

  const canStartDirectChat = role === 'admin' || role === 'apostle' || role === 'member';
  const canCreateGroup = true; // all users can create groups
  const isAdmin = role === 'admin';

  return (
    <AuthContext.Provider value={{
      user,
      role,
      loading,
      loginWithPasskey,
      loginAsAdmin,
      logout,
      canStartDirectChat,
      canCreateGroup,
      isAdmin,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
