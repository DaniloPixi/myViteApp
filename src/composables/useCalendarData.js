import { ref } from 'vue';
import { getFirestore, collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { auth } from '../firebase';

export function useCalendarData() {
  const memos = ref([]);
  const plans = ref([]);

  let unsubscribeMemos = null;
  let unsubscribePlans = null;

  const setupDataListeners = () => {
    if (!auth.currentUser) return;

    const db = getFirestore();

    const memosQuery = query(collection(db, 'memos'), orderBy('createdAt', 'desc'));
    unsubscribeMemos = onSnapshot(
      memosQuery,
      (snapshot) => {
        memos.value = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      },
      (err) => {
        console.error('Error fetching memos for calendar:', err);
      }
    );

    const plansQuery = query(collection(db, 'plans'), orderBy('date', 'desc'));
    unsubscribePlans = onSnapshot(
      plansQuery,
      (snapshot) => {
        plans.value = snapshot.docs.map((doc) => {
          const data = doc.data();
          const date = new Date(data.date);

          if (data.time) {
            const timeParts = data.time.match(/(\d{2}):(\d{2})/);
            if (timeParts) {
              date.setHours(timeParts[1], timeParts[2]);
            }
          }

          return {
            id: doc.id,
            ...data,
            creationDate: doc.createTime ? doc.createTime.toDate() : new Date(),
            fullDate: date,
          };
        });
      },
      (err) => {
        console.error('Error fetching plans for calendar:', err);
      }
    );
  };

  const clearDataListeners = () => {
    if (unsubscribeMemos) unsubscribeMemos();
    if (unsubscribePlans) unsubscribePlans();
  };

  return {
    memos,
    plans,
    setupDataListeners,
    clearDataListeners,
  };
}
