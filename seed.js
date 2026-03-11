import { collection, addDoc, serverTimestamp, getDocs, query, where } from 'firebase/firestore';
import { db } from './src/config/firebase';

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

export const seedDatabase = async () => {
  console.log('Starting database seed...');
  let addedCount = 0;

  for (const u of NEW_USERS) {
    // Check if user already exists
    const q = query(collection(db, 'users'), where('name', '==', u.name));
    const snap = await getDocs(q);

    if (snap.empty) {
      // Add new user
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
  }

  console.log(`Seed complete! Added ${addedCount} new users.`);
};
