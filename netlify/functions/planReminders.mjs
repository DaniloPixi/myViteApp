import admin from 'firebase-admin';
import { getMessaging } from 'firebase-admin/messaging';
import path from 'path';
import fs from 'fs';

let db;

function initializeFirebaseAdmin() {
  if (db) return db;

  if (admin.apps.length > 0) {
    db = admin.firestore();
    return db;
  }

  let serviceAccount;
  if (process.env.FIREBASE_PROJECT_ID) {
    serviceAccount = {
      type: 'service_account',
      project_id: process.env.FIREBASE_PROJECT_ID,
      private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
      private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      client_id: process.env.FIREBASE_CLIENT_ID,
      auth_uri: 'https://accounts.google.com/o/oauth2/auth',
      token_uri: 'https://oauth2.googleapis.com/token',
      auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
      client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL,
    };
  } else {
    const keyPath = path.join(process.cwd(), 'netlify', 'functions', 'serviceAccountKey.json');
    serviceAccount = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
  }

  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  db = admin.firestore();
  return db;
}

function getTextSnippet(text) {
  if (!text) return '';
  const trimmed = String(text).trim();
  if (trimmed.length <= 80) return trimmed;
  return `${trimmed.slice(0, 80)}…`;
}

function getTimePart(timeString) {
  const match = String(timeString || '').match(/(\d{2}):(\d{2})/);
  if (!match) return null;
  return { hour: Number(match[1]), minute: Number(match[2]) };
}

function buildDueDate(dateString, timeString) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(dateString || ''))) return null;

  const [y, m, d] = String(dateString).split('-').map(Number);
  const timePart = getTimePart(timeString);

  // Use local server time for reminders. If no explicit time, default to 09:00.
  const hour = timePart?.hour ?? 9;
  const minute = timePart?.minute ?? 0;

  const dueAt = new Date(y, m - 1, d, hour, minute, 0, 0);
  if (Number.isNaN(dueAt.getTime())) return null;
  return dueAt;
}

function isWithinWindow(nowMs, triggerMs, windowMs) {
  return nowMs >= triggerMs && nowMs < triggerMs + windowMs;
}

async function sendPushToTokens(tokens, title, body, payloadData) {
  if (!tokens.length) return { successCount: 0, failureCount: 0 };

  const stringifiedData = Object.fromEntries(
    Object.entries(payloadData).map(([k, v]) => [String(k), String(v)])
  );

  const message = {
    data: {
      ...stringifiedData,
      title: String(title),
      body: String(body),
      icon: '/icons/manifest-icon-192.png?v=2',
      badge: '/badge-96.png?v=2',
    },
    webpush: {
      fcm_options: { link: String(payloadData.url || '/') },
    },
    tokens,
  };

  return getMessaging().sendEachForMulticast(message);
}

export const config = {
  schedule: '*/15 * * * *',
};

export const handler = async () => {
  try {
    const dbRef = initializeFirebaseAdmin();

    const tokenDocs = await dbRef.collection('fcmTokens').get();
    if (tokenDocs.empty) {
      return {
        statusCode: 200,
        body: JSON.stringify({ success: true, message: 'No FCM tokens found, nothing to send.' }),
      };
    }

    const allTokens = tokenDocs.docs.map((doc) => ({ token: doc.id, uid: doc.data().uid || null }));
    const plansSnapshot = await dbRef.collection('plans').get();

    const nowMs = Date.now();
    const windowMs = 1000 * 60 * 15;
    const reminderRules = [
      { code: '24h', offsetMs: 24 * 60 * 60 * 1000, type: 'planReminder' },
      { code: '1h', offsetMs: 60 * 60 * 1000, type: 'planReminder' },
      { code: 'timeUp', offsetMs: 0, type: 'planTimeUp' },
    ];

    const isDevish =
      process.env.NETLIFY_DEV === 'true' ||
      (process.env.CONTEXT && process.env.CONTEXT !== 'production') ||
      process.env.NODE_ENV !== 'production';

    let sent = 0;
    let skipped = 0;

    for (const doc of plansSnapshot.docs) {
      const data = doc.data();
      const dueAt = buildDueDate(data?.date, data?.time);
      if (!dueAt) {
        skipped += 1;
        continue;
      }

      const dueMs = dueAt.getTime();
      const planId = doc.id;
      const snippet = getTextSnippet(data?.text || 'Your plan');
      const link = `/?view=plans&planId=${encodeURIComponent(planId)}`;

      for (const rule of reminderRules) {
        const triggerMs = dueMs - rule.offsetMs;
        if (!isWithinWindow(nowMs, triggerMs, windowMs)) continue;

        const dedupeKey = `${planId}:${rule.code}:${new Date(dueMs).toISOString()}`;
        const dedupeRef = dbRef.collection('planReminderNotifications').doc(dedupeKey);
        const existing = await dedupeRef.get();
        if (existing.exists) {
          skipped += 1;
          continue;
        }

        const recipientTokens = isDevish
          ? allTokens.map((item) => item.token)
          : allTokens
              .filter((item) => item.uid !== (data?.creatorUid || null))
              .map((item) => item.token);

        if (!recipientTokens.length) {
          await dedupeRef.set({
            planId,
            reminderCode: rule.code,
            dueAt: dueAt.toISOString(),
            skippedReason: 'no-recipient-tokens',
            createdAt: new Date().toISOString(),
          });
          skipped += 1;
          continue;
        }

        const dueAtLabel = dueAt.toLocaleString(undefined, {
          year: 'numeric',
          month: 'short',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        });

        const title =
          rule.code === '24h'
            ? '🗓️ Plan tomorrow'
            : rule.code === '1h'
              ? '⏳ Plan in 1 hour'
              : '⌛ Plan time is up';

        const body =
          rule.code === 'timeUp'
            ? `“${snippet}” is due now (${dueAtLabel}).`
            : `“${snippet}” is coming up (${dueAtLabel}).`;

        const pushResponse = await sendPushToTokens(recipientTokens, title, body, {
          type: rule.type,
          reminderCode: rule.code,
          url: link,
          planId,
          text: snippet,
          date: data?.date || '',
          time: data?.time || '',
          location: data?.location || '',
          dueAt: dueAt.toISOString(),
        });

        await dedupeRef.set({
          planId,
          reminderCode: rule.code,
          dueAt: dueAt.toISOString(),
          title,
          body,
          url: link,
          successCount: pushResponse.successCount,
          failureCount: pushResponse.failureCount,
          createdAt: new Date().toISOString(),
        });

        sent += 1;
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        totalPlans: plansSnapshot.size,
        sent,
        skipped,
      }),
    };
  } catch (error) {
    console.error('planReminders failed:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, message: error.message }),
    };
  }
};
