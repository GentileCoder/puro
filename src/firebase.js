import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'

// Non-secret client config — safe to commit (see docs/app-development/02-firebase/project-setup.md).
// Same GCP project as the rest of Alejandro's apps; Identity Platform provides the auth backend.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: 'gentilecoder.firebaseapp.com',
  projectId: 'gentilecoder',
}

export const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
