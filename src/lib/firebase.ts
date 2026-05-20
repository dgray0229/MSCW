import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

// We will uncomment and configure this once you get the Web Client ID from Firebase!
/*
GoogleSignin.configure({
  webClientId: 'YOUR_WEB_CLIENT_ID_FROM_FIREBASE',
});
*/

export const firebaseAuth = auth();
export const db = firestore();
