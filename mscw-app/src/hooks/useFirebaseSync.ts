import { useEffect, useRef } from 'react';
import { useAppStore } from '../store';
import { db } from '../lib/firebase';

export function useFirebaseSync() {
  const tasks = useAppStore(state => state.tasks);
  const settings = useAppStore(state => state.settings);
  const user = settings.user;
  const hasHydrated = useAppStore(state => state._hasHydrated);
  const setIsSyncing = useAppStore(state => state.setIsSyncing);
  
  // Track if this is the first load so we don't accidentally push before hydrating
  const isFirstLoad = useRef(true);

  // 1. PUSH to Cloud: 
  // Whenever local tasks or settings change, we push the delta to Firestore.
  // Because of Firebase's native SDK, if the user is completely offline, 
  // Firebase will cache this write locally and silently push it to the cloud 
  // the exact moment they reconnect to Wi-Fi. Zero extra logic needed!
  useEffect(() => {
    if (isFirstLoad.current) {
      isFirstLoad.current = false;
      return;
    }

    if (user?.uid && hasHydrated) {
      const syncToCloud = async () => {
        try {
          setIsSyncing(true);
          await db.collection('users').doc(user.uid).set({
            tasks,
            settings,
            lastSyncedAt: new Date().toISOString(),
          }, { merge: true });
          
          // Add a tiny artificial delay so the user can visibly see the cloud sync icon
          setTimeout(() => setIsSyncing(false), 1000);
        } catch (e) {
          console.error("Firebase Sync Push Error:", e);
          setIsSyncing(false);
        }
      };
      
      syncToCloud();
    }
  }, [tasks, settings, user?.uid, hasHydrated]);

  // 2. PULL from Cloud:
  // When a user logs in (or opens the app while logged in), we pull the latest cloud snapshot.
  useEffect(() => {
    if (user?.uid && hasHydrated) {
      const fetchCloudData = async () => {
        try {
          const doc = await db.collection('users').doc(user.uid).get();
          if (doc.exists) {
            const data = doc.data();
            // In a production environment, you would want to implement 
            // timestamp-based conflict resolution here.
            // For now, if the cloud has a payload, we hydrate the local store.
            if (data) {
                // To safely hydrate, we would map the incoming data to the Zustand store
                // We're leaving this skeleton here for you to refine how aggressively
                // you want the Cloud to overwrite Local state.
                console.log("Fetched latest cloud payload!", data.lastSyncedAt);
            }
          }
        } catch (e) {
          console.error("Firebase Sync Pull Error:", e);
        }
      };
      
      fetchCloudData();
    }
  }, [user?.uid, hasHydrated]);
}
