const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc, serverTimestamp, getDocs, query, where } = require('firebase/firestore');

// Required for Node.js fetch implementation in Firebase 9+
const fetch = require('node-fetch');

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
const db = getFirestore(app);

const NEW_USERS = [
  { name: 'Viper', passkey: 'VP82-NQLX-7W4Z', role: 'member' },
  { name: 'Mantis', passkey: 'MT91-KJSB-3V6R', role: 'member' },
  { name: 'Oryx', passkey: 'OX55-ZMPT-9Y2Q', role: 'member' },
  { name: 'Swift', passkey: 'SW10-RBDH-5G8K', role: 'member' },
  { name: 'Falcon', passkey: 'FC29-YVLT-4M1X', role: 'member' },
  { name: 'Starling', passkey: 'ST38-WNCJ-6H7P', role: 'member' },
  { name: 'Merlin', passkey: 'MN47-QLPR-2B9S', role: 'member' },
  { name: 'Foxglove', passkey: 'FG63-HTMK-8Z5V', role: 'member' },
  { name: 'Aster', passkey: 'AS14-PXRL-7D3N', role: 'member' },
  { name: 'Nightshade', passkey: 'NS50-VKYG-1J6W', role: 'member' },
];

const seedDatabase = async () => {
  console.log('Starting database seed...');
  let addedCount = 0;

  for (const u of NEW_USERS) {
    try {
      const q = query(collection(db, 'users'), where('name', '==', u.name));
      const snap = await getDocs(q);

      if (snap.empty) {
        await addDoc(collection(db, 'users'), {
          ...u,
          isOnline: false,
          lastSeen: null,
          avatarUrl: null,
          createdAt: serverTimestamp(),
        });
        console.log(`Added user: ${u.name}`);
        addedCount++;
      } else {
        console.log(`User ${u.name} already exists. Skipping.`);
      }
    } catch (e) {
      console.error(`Error adding user ${u.name}:`, e.message);
    }
  }

  console.log(`Seed complete! Added ${addedCount} new users.`);
  process.exit(0);
};

seedDatabase();
