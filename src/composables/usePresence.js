import { onMounted, onUnmounted } from 'vue';
import { auth, rtdb, db, firebase } from '../firebase';

export function usePresence() {
  let connectedRef = null;
  let userStatusRef = null;
  let unsubAuth = null;

  const setFirestoreStatus = async (uid, status, lastChanged) => {
    try {
      await db.collection('userPresence').doc(uid).set({ status, lastChanged }, { merge: true });
    } catch (e) {
      console.warn('Failed to mirror presence to Firestore:', e);
    }
  };

  const attachPresenceForUser = (uid) => {
    connectedRef = rtdb.ref('.info/connected');
    userStatusRef = rtdb.ref(`/status/${uid}`);

    connectedRef.on('value', async (snap) => {
      if (snap.val() === false) return;

      const offlineState = {
        status: 'offline',
        lastChanged: firebase.database.ServerValue.TIMESTAMP,
      };

      const onlineState = {
        status: 'online',
        lastChanged: firebase.database.ServerValue.TIMESTAMP,
      };

      // Ensure offline is set if tab/browser disconnects unexpectedly
      userStatusRef
        .onDisconnect()
        .set(offlineState)
        .then(async () => {
          await userStatusRef.set(onlineState);
          await setFirestoreStatus(uid, 'online', Date.now());
        });
    });
  };

  const detachPresence = () => {
    if (connectedRef) connectedRef.off();
    connectedRef = null;
    userStatusRef = null;
  };

  const setFocusedState = async (isFocused) => {
    const user = auth.currentUser;
    if (!user || !userStatusRef) return;

    const status = isFocused ? 'online' : 'away';
    const payload = {
      status,
      lastChanged: firebase.database.ServerValue.TIMESTAMP,
    };

    await userStatusRef.set(payload);
    await setFirestoreStatus(user.uid, status, Date.now());
  };

  const handleFocus = () => setFocusedState(true);
  const handleBlurOrHidden = () => setFocusedState(false);

  onMounted(() => {
    unsubAuth = auth.onAuthStateChanged((user) => {
      detachPresence();
      if (!user) return;
      attachPresenceForUser(user.uid);
    });

    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlurOrHidden);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') handleFocus();
      else handleBlurOrHidden();
    });
  });

  onUnmounted(() => {
    if (typeof unsubAuth === 'function') unsubAuth();
    detachPresence();
    window.removeEventListener('focus', handleFocus);
    window.removeEventListener('blur', handleBlurOrHidden);
  });
}
