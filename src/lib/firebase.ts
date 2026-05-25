import AsyncStorage from '@react-native-async-storage/async-storage';
import firebase from '@react-native-firebase/app';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { Platform } from 'react-native';
import './polyfills';

if (Platform.OS === 'web') {
  if (firebase.apps.length === 0) {
    firebase.setReactNativeAsyncStorage(AsyncStorage);
    firebase.initializeApp({
      apiKey: 'AIzaSyCa6HS8oWvT0Q32nenioIq0N-BTv32F9Gs',
      authDomain: 'mscw-e2cee.firebaseapp.com',
      projectId: 'mscw-e2cee',
      storageBucket: 'mscw-e2cee.firebasestorage.app',
      messagingSenderId: '515447198418',
      appId: '1:515447198418:web:bb199b6c26fe2adaa8530b',
      databaseURL: 'https://mscw-e2cee-default-rtdb.firebaseio.com',
    });
  }
}

// We will uncomment and configure this once you get the Web Client ID from Firebase!

GoogleSignin.configure({
  webClientId: '515447198418-rlde94lrm4vk6181sm8p7be8cd0u50a0.apps.googleusercontent.com',
});


export const firebaseAuth = auth();
export const db = firestore();

