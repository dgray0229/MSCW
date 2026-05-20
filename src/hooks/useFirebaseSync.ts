import { useEffect, useRef } from 'react';
import { useAppStore } from '../store';
import { db } from '../lib/firebase';

export function useFirebaseSync() {
  const tasks = useAppStore(state => state.tasks);
  const settings = useAppStore(state => state.settings);
  const user = settings.user;
  const hasHydrated = useAppStore(state => state._hasHydrated);
  const setIsSyncing = useAppStore(state => state.setIsSyncing);
  const syncWithCloud = useAppStore(state => state.syncWithCloud);
  
  const initialPullCompleted = useRef(false);
  const lastSyncedState = useRef<string>('');

  // 1. PUSH to Cloud: 
  // Whenever local tasks or settings change, we push the delta to Firestore.
  // Because of Firebase's native SDK, if the user is completely offline, 
  // Firebase will cache this write locally and silently push it to the cloud 
  // the exact moment they reconnect to Wi-Fi. Zero extra logic needed!
  useEffect(() => {
    if (!initialPullCompleted.current || !user?.uid || !hasHydrated) {
      return;
    }

    const currentStateStr = JSON.stringify({ tasks, settings });
    if (currentStateStr === lastSyncedState.current) {
      return;
    }

    const syncToCloud = async () => {
      try {
        setIsSyncing(true);
        // Set immediately to prevent concurrent triggers or other states from firing pushing
        lastSyncedState.current = currentStateStr;
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
  }, [tasks, settings, user?.uid, hasHydrated]);

  // 2. PULL/SYNC from Cloud (Real-time):
  useEffect(() => {
    if (!user?.uid || !hasHydrated) {
      return;
    }

    const unsubscribe = db.collection('users').doc(user.uid).onSnapshot(
      (doc) => {
        try {
          const docExists = typeof doc.exists === 'function' ? (doc.exists as Function)() : doc.exists;
          if (docExists) {
            const data = doc.data();
            if (data) {
              const currentStore = useAppStore.getState();
              const tasksChanged = JSON.stringify(currentStore.tasks) !== JSON.stringify(data.tasks);
              
              let settingsChanged = false;
              if (data.settings) {
                for (const key of Object.keys(data.settings)) {
                  if (JSON.stringify(currentStore.settings[key as keyof typeof currentStore.settings]) !== JSON.stringify(data.settings[key])) {
                    settingsChanged = true;
                    break;
                  }
                }
              }
              
              if (tasksChanged || settingsChanged) {
                // Update local store with cloud state
                syncWithCloud(data.tasks, data.settings);
                
                // Capture the fully merged local state to prevent pushing it back
                const updatedStore = useAppStore.getState();
                lastSyncedState.current = JSON.stringify({
                  tasks: updatedStore.tasks,
                  settings: updatedStore.settings,
                });
                console.log("Merged real-time cloud payload into local store!", data.lastSyncedAt);
              } else {
                // Align lastSyncedState to avoid pushes on identical content
                lastSyncedState.current = JSON.stringify({
                  tasks: currentStore.tasks,
                  settings: currentStore.settings,
                });
              }
            } else {
              lastSyncedState.current = JSON.stringify({ tasks, settings });
            }
          } else {
            lastSyncedState.current = JSON.stringify({ tasks, settings });
          }
        } catch (e) {
          console.error("Firebase Real-time Sync Error:", e);
        } finally {
          initialPullCompleted.current = true;
        }
      },
      (error) => {
        console.error("Firebase Real-time Subscription Error:", error);
        // Fallback: enable pushing so user doesn't get blocked
        initialPullCompleted.current = true;
      }
    );

    return () => unsubscribe();
  }, [user?.uid, hasHydrated]);
}

