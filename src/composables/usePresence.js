import { onMounted, onUnmounted } from 'vue';
import { auth, rtdb, db, firebase } from '../firebase';

export function usePresence() {
  const HEARTBEAT_INTERVAL_MS = 5000;

  let connectedRef = null;
  let userStatusRef = null;
  let unsubAuth = null;
  let heartbeatTimer = null;

  const setFirestoreStatus = async (uid, status, lastChanged) => {
    try {
      await db.collection('userPresence').doc(uid).set(
        {
          status,
          lastChanged,
        },
        {
          merge: true,
        }
      );
    } catch (error) {
      console.warn('Failed to mirror presence to Firestore:', error);
    }
  };

  const stopHeartbeat = () => {
    if (heartbeatTimer !== null) {
      window.clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
  };

  const writeStatus = async (status) => {
    const currentUser = auth.currentUser;

    if (!currentUser || !userStatusRef) {
      return;
    }

    await userStatusRef.set({
      status,
      lastChanged: firebase.database.ServerValue.TIMESTAMP,
    });

    await setFirestoreStatus(
      currentUser.uid,
      status,
      Date.now()
    );
  };

  const startHeartbeat = () => {
    stopHeartbeat();

    heartbeatTimer = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        writeStatus('online');
      }
    }, HEARTBEAT_INTERVAL_MS);
  };

  const attachPresenceForUser = (uid) => {
    connectedRef = rtdb.ref('.info/connected');
    userStatusRef = rtdb.ref(`/status/${uid}`);

    connectedRef.on('value', async (snapshot) => {
      if (snapshot.val() === false) {
        return;
      }

      const offlineState = {
        status: 'offline',
        lastChanged: firebase.database.ServerValue.TIMESTAMP,
      };

      const onlineState = {
        status: 'online',
        lastChanged: firebase.database.ServerValue.TIMESTAMP,
      };

      // Firebase applies this automatically if the PWA, browser,
      // device, or network disconnects unexpectedly.
      await userStatusRef.onDisconnect().set(offlineState);

      await userStatusRef.set(onlineState);
      await setFirestoreStatus(uid, 'online', Date.now());

      startHeartbeat();
    });
  };

  const detachPresence = () => {
    stopHeartbeat();

    if (connectedRef) {
      connectedRef.off();
    }

    connectedRef = null;
    userStatusRef = null;
  };

  const setFocusedState = async (isFocused) => {
    if (isFocused) {
      startHeartbeat();
      await writeStatus('online');
      return;
    }

    stopHeartbeat();
    await writeStatus('away');
  };

  const handleFocus = () => {
    setFocusedState(true);
  };

  const handleBlur = () => {
    setFocusedState(false);
  };

  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      setFocusedState(true);
    } else {
      setFocusedState(false);
    }
  };

  onMounted(() => {
    unsubAuth = auth.onAuthStateChanged((user) => {
      detachPresence();

      if (!user) {
        return;
      }

      attachPresenceForUser(user.uid);
    });

    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);
    document.addEventListener(
      'visibilitychange',
      handleVisibilityChange
    );
  });

  onUnmounted(() => {
    if (typeof unsubAuth === 'function') {
      unsubAuth();
    }

    detachPresence();

    window.removeEventListener('focus', handleFocus);
    window.removeEventListener('blur', handleBlur);
    document.removeEventListener(
      'visibilitychange',
      handleVisibilityChange
    );
  });
}