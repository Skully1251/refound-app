# ReFound — Bringing Things Back

A modern **Lost & Found** progressive web app built for campus communities. Students can report lost items, employees can manage inventory, and administrators can oversee the entire workflow — all from a single, mobile-first interface with push notifications.

---

## Features

- **Role-based access** — Students, Employees, and Admins each get their own dashboard
- **Report & claim items** — Upload photos, describe lost property, and submit claims with ID verification
- **Push notifications** — Real-time alerts via Firebase Cloud Messaging (works even when the app is closed)
- **Image uploads** — Cloudinary integration for fast, reliable image hosting
- **PWA support** — Installable on mobile and desktop with offline caching
- **Google Sign-In** — Quick authentication alongside email/password

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, React Router 7 |
| Build | Vite 8, vite-plugin-pwa |
| Backend | Firebase (Auth, Firestore, Storage, Cloud Messaging) |
| Image CDN | Cloudinary |
| Hosting | Firebase Hosting |

## Getting Started

### Prerequisites

- **Node.js** ≥ 18
- **npm** ≥ 9
- A [Firebase project](https://console.firebase.google.com/) with Auth, Firestore, and Cloud Messaging enabled
- A [Cloudinary account](https://cloudinary.com/) with an unsigned upload preset

### Installation

```bash
# Clone the repository
git clone https://github.com/<your-username>/ReFound.git
cd ReFound

# Install dependencies
npm install

# Copy the example env file and fill in your credentials
cp .env.example .env
```

### Environment Variables

Create a `.env` file in the project root (use `.env.example` as a template):

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_MEASUREMENT_ID=

# Firebase Cloud Messaging (Push Notifications)
VITE_FIREBASE_VAPID_KEY=

# Cloudinary Configuration
VITE_CLOUDINARY_CLOUD_NAME=
VITE_CLOUDINARY_UPLOAD_PRESET=
```

> **Note:** The Firebase Messaging service worker (`public/firebase-messaging-sw.js`) uses placeholder tokens that are automatically replaced at build time by a custom Vite plugin. You do **not** need to edit that file manually.

### Development

```bash
npm run dev
```

The app will be available at `http://localhost:5173`.

### Production Build

```bash
npm run build
npm run preview   # preview the production build locally
```

### Deploy to Firebase

```bash
# Install the Firebase CLI (if not already installed)
npm install -g firebase-tools

# Login and deploy
firebase login
firebase deploy
```

## Project Structure

```
ReFound/
├── public/                  # Static assets & service worker template
│   ├── firebase-messaging-sw.js
│   └── icons/
├── src/
│   ├── components/          # Shared UI components
│   ├── contexts/            # React context providers (Auth)
│   ├── firebase/            # Firebase SDK wrappers (auth, firestore, messaging, cloudinary)
│   ├── pages/
│   │   ├── admin/           # Admin dashboard pages
│   │   └── emp/             # Employee dashboard pages
│   ├── App.jsx              # Root component & routing
│   └── main.jsx             # Entry point
├── functions/               # Firebase Cloud Functions
├── firestore.rules          # Firestore security rules
├── firebase.json            # Firebase project config
├── vite.config.js           # Vite + PWA + SW env injection plugin
├── .env.example             # Template for environment variables
└── .gitignore
```

## Security Notes

- All credentials are loaded from `.env` at build time — **no secrets are committed to the repository**.
- Firestore security rules in `firestore.rules` should be tightened for production use. The default rules expire on a set date and allow open reads/writes.
- Firebase API keys are client-side identifiers; actual access control is enforced by [Firebase Security Rules](https://firebase.google.com/docs/rules).

## License

This project is for academic / personal use.
