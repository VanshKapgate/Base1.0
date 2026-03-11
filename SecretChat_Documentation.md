# 👑 SecretChat Documentation & Record

This document serves as the complete, official record of all features, architecture, and design decisions made for the **SecretChat** application.

---

## 📱 App Overview
*   **App Name:** SecretChat
*   **Android Package:** `com.rain.secretchat`
*   **Tech Stack:** React Native (Expo) & Google Firebase.
*   **Hosting/Servers:** 100% Serverless via Firebase Cloud Firestore (No manual server maintenance required).

## 🎨 Design & Aesthetic
*   **Theme:** Exclusive Dark Mode only.
*   **Palette:** Deep Navy (`#0D0D1A`), Charcoal Surface (`#1A1A2E`), Vibrant Purple Primary (`#6C63FF`).
*   **Vibe:** Premium, secure, exclusive, "hacker" aesthetic.

---

## 🔐 Authentication & Roles
SecretChat abandons traditional phone numbers and passwords for a highly secure, invite-only passkey system.

### 1. The Roles
*   **Admin ("Rain"):** The owner of the app. Has a master login screen (hidden from normal users). Rain can manage all users, see disappearing messages forever, and override chat settings.
*   **Apostle:** Highly trusted users. Only Apostles (and Rain) have the permission to start new 1-on-1 chats or create new Group Chats.
*   **Member:** Standard users. They can only use the app to reply and interact within chats they have been invited to.

### 2. Login System
*   **Name + Passkey:** Users log in using their exact assigned name and a 3-part passkey (e.g., `VP82-NQLX-7W4Z`).
*   **Pre-Seeded Roster:** The database is pre-loaded with the following initial crew:
    *   Viper, Mantis, Oryx, Swift, Falcon, Starling, Merlin, Foxglove, Aster, Nightshade.

---

## 💬 Core Messaging Features
*   **Real-time Sync:** Messages, online status (🟢), and "Last Seen" times update instantly across the world.
*   **WhatsApp-Style Read Receipts:** Shows a single tick (`✓`) when sent, and double ticks with exact timestamps (`✓✓ Read at 2:30 PM`) when read by the recipient.
*   **Edit & Delete:** Users can edit their typos or delete sent messages entirely.
*   **Emoji Reactions:** Long-press a message to attach quick emoji reactions (❤️, 😂, 😮, 😢, 👍, 🙏).
*   **Pinned Messages (📌):** Long-press a message to pin it. It will stick to a glowing banner at the very top of the chat for all members to see.
*   **Speech to Text (🎤):** A native microphone button integrated into the text input. Tapping it activates OS-level voice dictation to type messages hands-free.

---

## 🎭 "Send With Intent" Animations
A custom feature where holding down the "Send" button opens a radial menu. Selecting an intent physically alters the message bubble's appearance and animations for everyone in the chat:
*   🤬 **Angry:** Bubble turns deep blood-red, gains a red glowing shadow, and violently shakes when rendered.
*   ✨ **Excited:** Bubble turns vibrant gold/orange, gains a glowing shadow, and continuously smooth-bounces.
*   🙃 **Sarcastic:** Bubble applies an elegant, italicized serif font to clearly convey sarcastic tone.
*   📤 **Neutral:** Standard beautiful purple bubble.

---

## 🛡️ Ultimate Privacy & Ghost Features
*   **OS-Level Screenshot Blocking:** The app uses native Android security flags (`expo-screen-capture`) to completely disable the ability to take screenshots or record the screen while the app is open.
*   **Disappearing Messages (24h):** By default, messages automatically vanish into thin air exactly 24 hours after being sent.
    *   *Admin Override:* Rain is immune to this. Rain's app will keep the messages forever.
    *   *Group Control:* Rain has a toggle button (`⏳ / ♾️`) at the top of group chats to turn the 24h disappearing feature on or off for that specific group.

---

## 👑 Admin Dashboard Dashboard
Accessible only to Rain via the hidden login portal.
1.  **View All Users:** See everyone registered on the platform.
2.  **Create Users:** Generate a new secure Passkey and assign a Name/Role to onboard someone new.
3.  **Rename Users:** Instantly change any user's display name across the entire database.
4.  **Promote/Demote:** Elevate a Member to an Apostle, or demote them back.
5.  **Remove:** Delete a user, permanently revoking their access to the app.

---

## 🚀 Final Deployment Steps (Pending)
1. Firebase Configuration (`src/config/firebase.js`) needs the Google API Keys pasted in.
2. Run `npm run android` to boot the local version.
3. Run `eas build -p android --profile preview` to generate the installable `.apk` file for distribution to the Apostles and Members.
