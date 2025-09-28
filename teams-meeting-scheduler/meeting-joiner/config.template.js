// ============================================
// CONFIGURATION TEMPLATE
// ============================================
// Copy this file to the top of local-joiner.js
// and replace the CONFIG section with your values

const CONFIG = {
  // Firebase Configuration (Required)
  FIREBASE_PROJECT_ID: 'your-firebase-project-id',
  FIREBASE_PRIVATE_KEY: '-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----',
  FIREBASE_CLIENT_EMAIL: 'your-firebase-service-account@your-project.iam.gserviceaccount.com',

  // Encryption Key (Required - use any secure string)
  ENCRYPTION_KEY: 'your-secure-encryption-key-here',

  // Google Speech API Key (Optional - only needed for transcription)
  GOOGLE_API_KEY: 'your-google-api-key-here'
};

// ============================================
// HOW TO GET THESE VALUES:
// ============================================

// 1. FIREBASE_PROJECT_ID:
//    - Go to Firebase Console
//    - Select your project
//    - Project ID is shown in project settings

// 2. FIREBASE_PRIVATE_KEY & FIREBASE_CLIENT_EMAIL:
//    - Go to Firebase Console > Project Settings
//    - Go to Service Accounts tab
//    - Click "Generate new private key"
//    - Download the JSON file
//    - Copy the private_key and client_email values

// 3. ENCRYPTION_KEY:
//    - Create any secure string (like a password)
//    - This is used to encrypt user credentials
//    - Example: 'MySecureKey2024!'

// 4. GOOGLE_API_KEY (Optional):
//    - Go to Google Cloud Console
//    - Enable Speech-to-Text API
//    - Create API Key in Credentials section
//    - Copy the API key

// ============================================
// CHROME PROFILE SETTINGS:
// ============================================

// To use your Chrome profile with existing logins:
let useRealProfile = true;  // Set to true to use your Chrome profile
const profileName = 'Default';  // Or 'Profile 1', 'Profile 2', etc.

// To check available profiles:
// 1. Run the script and look for "Available profiles" in the logs
// 2. Update profileName to match your desired profile