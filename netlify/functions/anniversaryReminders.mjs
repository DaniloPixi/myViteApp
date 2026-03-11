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

function parseYmd(ymd) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(ymd || ''))) return null;
  const [y, m, d] = String(ymd).split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (
    dt.getUTCFullYear() !== y ||
    dt.getUTCMonth() !== m - 1 ||
    dt.getUTCDate() !== d
  ) {
    return null;
  }
  return dt;
}

function addCalendarMonths(dateUtc, monthsToAdd) {
  const y = dateUtc.getUTCFullYear();
  const m = dateUtc.getUTCMonth();
  const d = dateUtc.getUTCDate();

  const rawTargetMonth = m + monthsToAdd;
  const targetYear = y + Math.floor(rawTargetMonth / 12);
  const targetMonth = ((rawTargetMonth % 12) + 12) % 12;
  const daysInTargetMonth = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
  const clampedDay = Math.min(d, daysInTargetMonth);

  return new Date(Date.UTC(targetYear, targetMonth, clampedDay));
}

function addCalendarYears(dateUtc, yearsToAdd) {
  return addCalendarMonths(dateUtc, yearsToAdd * 12);
}

function toUtcDateOnly(dateLike) {
  const d = new Date(dateLike);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function isSameUtcDay(a, b) {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}

function getMilestoneForDate(eventDateUtc, todayUtc) {
  const afterSixMonths = addCalendarMonths(eventDateUtc, 6);
  if (isSameUtcDay(afterSixMonths, todayUtc)) {
    return { code: '6m', label: '6 months ago' };
  }

  const afterOneYear = addCalendarYears(eventDateUtc, 1);
  if (isSameUtcDay(afterOneYear, todayUtc)) {
    return { code: '1y', label: '1 year ago' };
  }

  return null;
}

async function getRecipientTokens(dbRef) {
  const tokensSnapshot = await dbRef.collection('fcmTokens').get();
  if (tokensSnapshot.empty) return [];
  return tokensSnapshot.docs.map((doc) => doc.id);
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
      icon: '/icons/manifest-icon-192.png?v=6',
    },
    webpush: {
      fcm_options: { link: String(payloadData.url || '/') },
    },
    tokens,
  };

  return getMessaging().sendEachForMulticast(message);
}

async function processCollection({
  dbRef,
  collectionName,
  idField,
  dateField,
  textField,
  type,
  view,
  todayUtc,
  runDateKey,
  tokens,
}) {
  const snapshot = await dbRef.collection(collectionName).get();
  let sent = 0;
  let skipped = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const eventDate = parseYmd(data?.[dateField]);
    if (!eventDate) {
      skipped += 1;
      continue;
    }

    const milestone = getMilestoneForDate(eventDate, todayUtc);
    if (!milestone) {
      skipped += 1;
      continue;
    }

    const reminderKey = `${collectionName}:${doc.id}:${milestone.code}:${runDateKey}`;
    const reminderRef = dbRef.collection('anniversaryNotifications').doc(reminderKey);
    const existing = await reminderRef.get();

    if (existing.exists) {
      skipped += 1;
      continue;
    }

    const textSnippet = getTextSnippet(data?.[textField]);
    const deepLink = `/?view=${view}&${idField}=${encodeURIComponent(doc.id)}`;

    const title = `🕰️ ${milestone.label}`;
    const body = textSnippet
      ? `“${textSnippet}” happened ${milestone.label}.`
      : `You have a ${collectionName.slice(0, -1)} from ${milestone.label}.`;

    const pushResponse = await sendPushToTokens(tokens, title, body, {
      type,
      periodCode: milestone.code,
      periodLabel: milestone.label,
      url: deepLink,
      [idField]: doc.id,
      [textField]: textSnippet,
      date: data?.[dateField] || '',
    });

    await reminderRef.set({
      collectionName,
      docId: doc.id,
      milestoneCode: milestone.code,
      milestoneLabel: milestone.label,
      date: data?.[dateField] || null,
      title,
      body,
      url: deepLink,
      successCount: pushResponse.successCount,
      failureCount: pushResponse.failureCount,
      createdAt: new Date().toISOString(),
    });

    sent += 1;
  }

  return { sent, skipped, total: snapshot.size };
}

export const config = {
  schedule: '0 9 * * *',
};

export const handler = async () => {
  try {
    const dbRef = initializeFirebaseAdmin();
    const tokens = await getRecipientTokens(dbRef);

    if (tokens.length === 0) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          message: 'No FCM tokens found, nothing to send.',
        }),
      };
    }

    const todayUtc = toUtcDateOnly(new Date());
    const runDateKey = todayUtc.toISOString().slice(0, 10);

    const plansResult = await processCollection({
      dbRef,
      collectionName: 'plans',
      idField: 'planId',
      dateField: 'date',
      textField: 'text',
      type: 'planAnniversary',
      view: 'plans',
      todayUtc,
      runDateKey,
      tokens,
    });

    const memosResult = await processCollection({
      dbRef,
      collectionName: 'memos',
      idField: 'memoId',
      dateField: 'date',
      textField: 'description',
      type: 'memoAnniversary',
      view: 'memos',
      todayUtc,
      runDateKey,
      tokens,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        plans: plansResult,
        memos: memosResult,
      }),
    };
  } catch (error) {
    console.error('anniversaryReminders failed:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, message: error.message }),
    };
  }
};
