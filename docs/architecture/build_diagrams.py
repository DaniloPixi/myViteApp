"""Generate the repository's architecture PDF. Requires reportlab.

Run from the repository root: python docs/architecture/build_diagrams.py
Diagrams describe the inspected working tree, not verified cloud configuration.
"""
from pathlib import Path
import sys, math, html

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'tmp/pdf-tools'))
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor, Color, white
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph
from reportlab.lib.styles import ParagraphStyle

OUT = ROOT / 'output/pdf/Grus-Corner-Project-Diagrams.pdf'
OUT.parent.mkdir(parents=True, exist_ok=True)
for name, file in [('Body', 'arial.ttf'), ('Bold', 'arialbd.ttf')]:
    pdfmetrics.registerFont(TTFont(name, 'C:/Windows/Fonts/' + file))

W, H = 842, 595
INK = '#172A3A'; MUTED = '#536678'; LINE = '#C9D5DE'
BLUE = '#245CCD'; TEAL = '#087F83'; PURPLE = '#7950AF'; AMBER = '#AD6813'
PALE = '#F2F6F9'
fills = {BLUE:'#EDF3FF', TEAL:'#EAF7F5', PURPLE:'#F3EEFA', AMBER:'#FFF5E6', INK:PALE}
c = canvas.Canvas(str(OUT), pagesize=(W,H), pageCompression=1)
c.setTitle('Grus Corner | Project diagrams')
c.setAuthor('Project architecture documentation')
c.setSubject('Code-based architecture, interactions, APIs, data model and runtime')
page_no = 0
checks = []

def text(x,y,s,size=10,color=INK,bold=False):
    c.setFillColor(HexColor(color)); c.setFont('Bold' if bold else 'Body',size)
    c.drawString(x,H-y-size*.8,s)

def para(x,y,w,s,size=10,color=INK,bold=False,leading=None):
    p = Paragraph(s, ParagraphStyle('p',fontName='Bold' if bold else 'Body',fontSize=size,
        leading=leading or size*1.35,textColor=HexColor(color)))
    _,height=p.wrap(w,1000); p.drawOn(c,x,H-y-height)
    return height

def rect(x,y,w,h,fill=PALE,stroke=None,r=9):
    c.setFillColor(HexColor(fill)); c.setStrokeColor(HexColor(stroke or fill))
    c.setLineWidth(.8); c.roundRect(x,H-y-h,w,h,r,stroke=1,fill=1)

def box(x,y,w,h,title,body='',color=BLUE,size=10):
    rect(x,y,w,h,fills.get(color,PALE),color)
    th=para(x+12,y+10,w-24,html.escape(title),size+1,color,True)
    if body:
        bh=para(x+12,y+15+th,w-24,body,size-1,INK)
        assert 15+th+bh <= h-7, (page_no,title,'box overflow',15+th+bh,h)
    return (x,y,w,h)

def tag(x,y,s,color=TEAL):
    w=pdfmetrics.stringWidth(s,'Bold',8)+16
    rect(x,y,w,18,fills[color],r=4); text(x+8,y+5,s,8,color,True)

def line(points,color=LINE,dashed=False,width=1):
    c.setStrokeColor(HexColor(color)); c.setLineWidth(width)
    c.setDash([4,3] if dashed else [])
    p=c.beginPath();p.moveTo(points[0][0],H-points[0][1])
    for x,y in points[1:]:p.lineTo(x,H-y)
    c.drawPath(p);c.setDash([])

def arrow(points,label=None,color=TEAL,dashed=False,lx=None,ly=None,lw=130):
    line(points,color,dashed,1.35)
    x,y=points[-1];px,py=points[-2];a=math.atan2(y-py,x-px)
    tip=[(x,y),(x-6*math.cos(a-.48),y-6*math.sin(a-.48)),(x-6*math.cos(a+.48),y-6*math.sin(a+.48))]
    c.setFillColor(HexColor(color));p=c.beginPath();p.moveTo(tip[0][0],H-tip[0][1])
    for xx,yy in tip[1:]:p.lineTo(xx,H-yy)
    p.close();c.drawPath(p,fill=1,stroke=0)
    if label:
        if lx is None: lx=(points[0][0]+points[-1][0])/2-lw/2
        if ly is None: ly=(points[0][1]+points[-1][1])/2-18
        # Label background preserves readability over connector lines.
        rect(lx-3,ly-1,lw+6,14,'#FFFFFF',r=2)
        para(lx,ly,lw,html.escape(label),8,color)

def note(y,title,body,color=TEAL,x=36,w=770,h=60):
    rect(x,y,w,h,fills[color],r=7)
    text(x+12,y+9,title,10,color,True)
    ht=para(x+12,y+25,w-24,body,9,INK,leading=12)
    assert ht <= h-30,(page_no,title,'note overflow',ht,h)

def begin(title,subtitle,sources):
    global page_no
    page_no+=1
    c.bookmarkPage('p'+str(page_no));c.addOutlineEntry(title,'p'+str(page_no),0)
    c.setFillColor(white);c.rect(0,0,W,H,fill=1,stroke=0)
    rect(36,27,27,4,TEAL,r=1)
    text(73,24,'GRUS CORNER  /  PROJECT DIAGRAMS',8.5,MUTED,True)
    title_size=min(25,25*770/pdfmetrics.stringWidth(title,'Bold',25))
    text(36,49,title,title_size,INK,True)
    para(36,85,770,subtitle,10.5,MUTED)
    line([(36,546),(806,546)],LINE)
    ht=para(36,551,720,'<b>Code:</b> '+html.escape(sources),7.2,MUTED,leading=9)
    assert ht<29,('source footer overflow',page_no)
    text(36,580,'WORKING TREE  |  25 SEP 2026  |  BASE COMMIT 2d9151ed',7,MUTED)
    text(759,578,f'{page_no:02d} / 13',8,MUTED,True)

def end():c.showPage()

def sequence(actors,steps,start=132,gap=39,bottom=429):
    xs=[80+i*682/(len(actors)-1) for i in range(len(actors))]
    for x,name in zip(xs,actors):
        box(x-57,start,114,40,name,color=BLUE,size=8.5)
        line([(x,start+40),(x,bottom)],LINE,True)
    for n,(src,dst,label,ret) in enumerate(steps):
        y=start+80+n*gap
        a,b=xs[src],xs[dst]
        arrow([(a,y),(b,y)],color=TEAL if not ret else MUTED,dashed=ret)
        left=min(a,b)+8; width=abs(b-a)-16
        # Wide steps use available span; adjacent steps wrap above their line.
        ht=para(left,y-29,width,html.escape(label),8.7,INK,leading=10.5)
        assert ht<=28,(page_no,label,'sequence label overflow',ht,width)

# 01 -------------------------------------------------------------------------
begin('The system at a glance',
      'Vue screens, direct Firebase subscriptions and a Netlify API work together. Arrows show the direction of requests or delivery.',
      'src/App.vue; src/firebase.js; netlify/functions/api.mjs; netlify.toml; src/sw.js')
box(36,142,170,72,'Person using the app','Browser or installed PWA<br/>Plans, moments, capsules',BLUE)
box(281,142,204,72,'Vue 3 application','Vite build + shared composables<br/>App.vue controls the active view',BLUE)
box(585,132,221,65,'Firebase Authentication','Email/password sign-in<br/>Firebase ID tokens',PURPLE)
box(585,221,221,67,'Cloud Firestore','Live screen data; persistent records<br/>Browser SDK + server Admin SDK',TEAL)
box(281,319,204,83,'Netlify API function','Express + serverless-http<br/>Bearer token verification<br/>Feature routers + notifications',PURPLE)
box(36,319,170,83,'Cloudinary','Direct browser media uploads<br/>Server-side media deletion<br/>Hosted media URLs',AMBER)
box(585,319,221,83,'Other services','Realtime Database: presence<br/>FCM: push delivery<br/>Nominatim / CARTO: locations & maps',TEAL)
arrow([(206,177),(281,177)],'interact',lx=219,ly=158,lw=54)
arrow([(485,160),(585,160)],'sign in',lx=504,ly=141,lw=70,color=PURPLE)
arrow([(485,190),(530,190),(530,251),(585,251)],'SDK reads',lx=488,ly=218,lw=85)
arrow([(383,214),(383,319)],'HTTP /api/*',lx=392,ly=254,lw=100,color=PURPLE)
arrow([(485,342),(553,342),(553,270),(585,270)],color=PURPLE)
text(478,300,'Admin SDK',8,PURPLE)
arrow([(281,361),(206,361)],'delete',lx=221,ly=341,lw=51,color=AMBER)
arrow([(281,192),(246,192),(246,286),(121,286),(121,319)],'upload from browser',lx=66,ly=266,lw=157,color=AMBER)
arrow([(485,379),(585,379)],'send push',lx=500,ly=360,lw=74)
note(438,'How to read this document',
     'Blue = browser/UI. Purple = identity or API. Teal = stored data and event delivery. Amber = media or external lookup. Solid arrows are calls; dashed arrows are replies or subscriptions. This is a code snapshot, not a verification of deployed cloud settings.',h=76)
end()

# 02 -------------------------------------------------------------------------
begin('Screens and user interactions',
      'App.vue switches views with local state; there is no Vue Router dependency in the project.',
      'src/App.vue; src/composables/useViewFilters.js; src/views/*.vue; src/components/CombinedCalendar.vue')
box(36,138,164,67,'Login / Register','Firebase Auth<br/>Nickname becomes displayName',PURPLE)
box(286,138,218,67,'Authenticated app shell','Navigation, filters, notifications<br/>Presence, sound and PWA updates',BLUE)
arrow([(200,172),(286,172)],'auth state',lx=208,ly=150,lw=74,color=PURPLE)
text(581,143,'VIEW STATE',8,TEAL,True)
para(581,159,224,'currentView is persisted in localStorage. Sign-out clears it and returns to Home.',9.5)
line([(395,205),(395,233)],TEAL)
line([(109,233),(730,233)],TEAL)
cards=[(36,'Home','Calendar + daily quest<br/>Selected-date summaries<br/>Send-love action'),
       (193,'Moments','Memo cards and media<br/>Create / edit / delete<br/>Filter and focus a memo'),
       (350,'Plans','Plan cards + forms<br/>Date, time and location<br/>Create / edit / delete'),
       (507,'Time capsules','Schedule for a recipient<br/>Edit before unlock<br/>Open / delete'),
       (664,'Map spots','MapLibre map<br/>Grouped plans + moments<br/>Select a saved place')]
for x,title,body in cards:
    arrow([(x+71,233),(x+71,260)],color=TEAL)
    box(x,260,142,123,title,body,BLUE,size=9)
tag(36,404,'LIVE DATA: FIRESTORE')
para(234,406,570,'Calendar combines plans, moments, quests and capsules. Map spots derive from plans and moments; there is no separate spots collection.',9.5)
note(448,'Notification links reopen the relevant screen',
     'Query parameters such as ?view=plans&amp;planId=... select the view and focus a record. The parser accepts home, memos, plans and capsules, then removes the consumed parameters from the URL.',h=65)
end()

# 03 -------------------------------------------------------------------------
begin('Sign-in and API access',
      'Credentials go to Firebase Auth. Application requests carry an ID token in the Authorization header.',
      'src/views/Login.vue; src/views/Register.vue; src/App.vue; netlify/functions/api.mjs:95-117,252-272; firestore.rules')
sequence(['Browser UI','Firebase Auth','Netlify / Express','Firebase Admin','Firestore'],[
    (0,1,'1. Sign in / create user',False),
    (1,0,'2. User session + ID token',True),
    (0,2,'3. /api/* + Bearer <ID token>',False),
    (2,3,'4. verifyIdToken()',False),
    (3,2,'5. uid, name, email',True),
    (2,4,'6. checkDb, route checks, Admin SDK operation',False),
    (2,0,'7. JSON response',True),
],gap=35,bottom=442)
note(465,'Two access-control paths',
     'Browser Firestore calls are governed by firestore.rules. Server Admin SDK calls use backend authorization checks. API responses include 401 for a missing token, 403 for an invalid token, and 503 when Firebase or the database is unavailable.',h=62)
end()

# 04 -------------------------------------------------------------------------
begin('API reference | 16 implemented routes',
      'All routes below require a Firebase Bearer token. JSON bodies use Content-Type: application/json.',
      'netlify/functions/api.mjs; netlify/functions/routes/{plans,memos,quests,timeCapsules}.mjs')
cols=[36,94,284,515,806]
rect(36,119,770,25,INK,r=4)
for x,label in zip(cols,['VERB','PATH','BODY / INPUT','RESULT / BEHAVIOR']):text(x+7,127,label,8,'#FFFFFF',True)
rows=[
('GET','/api/plans','None','Array of plans; date descending'),
('POST','/api/plans','text, date, time, location, coords, hashtags','201: success + planId; sends push'),
('PUT','/api/plans/:planId','Updated plan fields','200: success; sends update push'),
('DELETE','/api/plans/:planId','Path ID','200: success; sends cancellation push'),
('GET','/api/memos','None','Array of memos; createdAt descending'),
('POST','/api/memos','description, date, location, photos, tags','201: success + memoId; sends push'),
('PUT','/api/memos/:memoId','Updated memo fields / photos','200: success; removes discarded media'),
('DELETE','/api/memos/:memoId','Path ID','200: success; removes media + memo'),
('GET','/api/time-capsules','None','success + items; all capsules, unlock order'),
('POST','/api/time-capsules','toUid, unlockAt; title, message, photos','201: success + id; requires future unlock'),
('PUT','/api/time-capsules/:id','title, message, unlockAt, photos','Creator only; unopened and before unlock'),
('POST','/api/time-capsules/:id/open','Path ID','Sender or recipient; at/after unlock; idempotent'),
('DELETE','/api/time-capsules/:id','Path ID','Creator only; deletes capsule + media'),
('POST','/api/quests','date, text','Notification trigger; does not save the quest'),
('POST','/api/register','token (FCM device token)','Stores fcmTokens/{token} with uid'),
('POST','/api/send-love','No body required','Sends a love notification'),
]
for i,row in enumerate(rows):
    yy=144+i*23.5
    if i%2==0:rect(36,yy,770,23.5,PALE,r=0)
    for j,val in enumerate(row):
        # Compact table wording only: persisted/API field names are detailed on pages 5 and 11.
        ht=para(cols[j]+7,yy+5,cols[j+1]-cols[j]-14,html.escape(val),8,INK,j==0,leading=9)
        assert ht<=19,(row,ht)
text(36,530,'coords = locationCoords; tags = hashtags. GET routes exist even where screens use Firestore listeners.',8,MUTED)
end()

# 05 -------------------------------------------------------------------------
begin('Plans and moments | write, then live refresh',
      'The API persists mutations. Firestore subscriptions update the lists, calendar and map without a manual page reload.',
      'src/views/Plans.vue; src/components/MemoForm.vue; src/views/MemosAndMoments.vue; src/composables/useCalendarData.js; routes/plans.mjs; routes/memos.mjs')
sequence(['Form / card','Netlify API','Firestore','Other open views','FCM'],[
    (0,1,'1. POST / PUT / DELETE + token',False),
    (1,2,'2. Write or delete record',False),
    (2,3,'3. onSnapshot update',True),
    (1,4,'4. Send event notification after write',False),
    (1,0,'5. Return success / record ID',True),
],gap=46,bottom=416)
note(430,'Core payloads',
     '<b>Plan:</b> text, date, time, location, locationCoords, hashtags; creatorUid and createdAt are added by the API.<br/>'
     '<b>Memo:</b> description, date, location, locationCoords, hashtags, photos[]. Media is uploaded before the record is saved.',h=67)
para(36,510,770,'Current behavior: plan and memo routes authenticate callers, but do not enforce creator ownership on edits or deletions. Their browser rules also allow any signed-in user to read and write.',9,AMBER)
end()

# 06 -------------------------------------------------------------------------
begin('Media and location integrations',
      'Large media files and map lookups travel directly from the browser to external services.',
      'src/components/{MemoForm,TimeCapsuleFormModal,LocationAutocomplete}.vue; src/composables/useLocationGeocoding.js; src/views/MapSpotsView.vue; routes/memos.mjs; routes/timeCapsules.mjs')
tag(36,122,'MEDIA',AMBER);tag(447,122,'LOCATIONS & MAPS',TEAL)
box(36,158,165,73,'Memo / capsule form','File + upload_preset<br/>POST multipart/form-data',BLUE)
box(266,158,148,73,'Cloudinary upload','/v1_1/{cloud}/<br/>{image|video}/upload',AMBER,size=9)
arrow([(201,181),(266,181)],color=AMBER)
arrow([(266,213),(201,213)],color=AMBER,dashed=True)
text(206,237,'secure_url',8,AMBER)
box(36,286,165,74,'Netlify API','Save media URLs in photos[]<br/>No file bytes stored in Firestore',PURPLE)
arrow([(118,231),(118,286)],'save form',lx=128,ly=253,lw=88,color=PURPLE)
box(266,286,148,74,'Cloudinary Admin','delete_resources()<br/>API key + secret on server',AMBER,size=9)
arrow([(201,320),(266,320)],'remove',lx=211,ly=299,lw=44,color=AMBER)
box(447,158,161,73,'Location input','Search suggestions<br/>Resolve label to coordinates',BLUE,size=9)
box(669,158,137,73,'Nominatim','GET /search<br/>q, format=jsonv2, limit',TEAL,size=9)
arrow([(608,184),(669,184)],color=TEAL)
arrow([(669,213),(608,213)],color=TEAL,dashed=True)
box(447,286,161,74,'MapLibre view','Read plans + memos<br/>Group locations into map spots',BLUE,size=9)
box(669,286,137,74,'CARTO basemap','Dark Matter style<br/>Style / tile resources',TEAL,size=9)
arrow([(608,320),(669,320)],color=TEAL)
arrow([(528,231),(528,286)],'saved coordinates',lx=540,ly=253,lw=125)
note(397,'Storage boundary',
     'Firestore holds media URLs and metadata, not the uploaded files. Upload requests use a preset and do not include the Cloudinary API secret. The API uses server credentials when media is removed.',h=63)
para(36,477,770,'Current behavior: uploads happen before the metadata save. No automatic rollback of a successful upload is shown if saving the record fails. Capsule cleanup catches media-deletion errors; memo cleanup can fail the request.',9.5,MUTED)
end()

# 07 -------------------------------------------------------------------------
begin('Time capsules | lifecycle and permissions',
      'A time-based UI state is combined with explicit server checks when a capsule is edited, opened or deleted.',
      'src/composables/useTimeCapsules.js; src/views/TimeCapsulesView.vue; netlify/functions/routes/timeCapsules.mjs; firestore.rules; firestore.indexes.json')
box(36,150,164,88,'Create','POST /time-capsules<br/>toUid + future unlockAt<br/>opened = false',PURPLE)
box(271,150,169,88,'Locked / unopened','now &lt; unlockAt<br/>Creator can edit<br/>Photos / message already stored',BLUE,size=9)
box(507,150,143,88,'Unlocked / unopened','now &gt;= unlockAt<br/>Time comparison<br/>No scheduled state write',TEAL,size=9)
box(705,150,101,88,'Opened','opened = true<br/>openedAt set',TEAL,size=9)
arrow([(200,194),(271,194)],'save',lx=212,ly=173,lw=48,color=PURPLE)
arrow([(440,194),(507,194)],'time',lx=451,ly=173,lw=45)
arrow([(650,194),(705,194)],'open',lx=658,ly=173,lw=40)
box(271,319,169,66,'Deleted','Creator may delete at any time<br/>Media cleanup attempted',AMBER,size=9)
arrow([(353,238),(353,319)],'DELETE',lx=366,ly=271,lw=67,color=AMBER)
arrow([(507,215),(476,215),(476,351),(440,351)],color=AMBER)
arrow([(794,238),(794,409),(353,409),(353,385)],color=AMBER)
para(36,280,193,'<b>Reads in the UI</b><br/>Two subscriptions: fromUid == me and toUid == me. Results are merged, deduplicated and sorted by unlockAt.',10)
para(506,264,270,'<b>POST /:id/open</b><br/>Code permits either the sender or recipient after unlock. Reopening succeeds without repeating the state write or notification.',10)
note(432,'The current lock is not a data-secrecy boundary',
     'Firestore rules let the sender and recipient read complete capsule documents before unlock. The REST GET route returns all capsules to any authenticated caller. The diagram documents this implementation; it does not imply that locked content is withheld by the backend.',color=AMBER,h=79)
end()

# 08 -------------------------------------------------------------------------
begin('Daily quests | client write, server notification',
      'Each user has one quest document per local calendar date. Completion and push delivery are separate operations.',
      'src/composables/useDailyQuests.js; src/components/DailyQuestWidget.vue; netlify/functions/routes/quests.mjs; firestore.rules')
sequence(['Quest widget','Firestore','Netlify /quests','FCM'],[
    (0,1,'1. Get or create {uid}_{YYYY-MM-DD}',False),
    (0,1,'2. Set completed + completedAt',False),
    (1,0,'3. Update local / calendar data',True),
    (0,2,'4. POST date + text, with ID token',False),
    (2,1,'5. Query date + completed == true',False),
    (2,3,'6. Send only if completed count < 2',False),
],gap=38,bottom=428)
note(451,'Two-person assumption',
     'The server counts completed quest documents for the date across the collection. At two or more completions it skips the push. It does not create or complete the quest itself. A failed notification request does not roll back the client-side completion.',h=68)
end()

# 09 -------------------------------------------------------------------------
begin('Push delivery and deep links',
      'One shared API helper delivers data-only FCM messages; foreground UI and the service worker render them differently.',
      'src/App.vue:notification registration, onMessage, URL handling; src/sw.js; netlify/functions/api.mjs:sendPushNotification; routes/quests.mjs')
box(36,142,188,80,'Device registration','Permission + service worker<br/>getToken(VAPID key)<br/>POST /api/register { token }',BLUE)
box(296,142,209,80,'Token registry','fcmTokens/{token}<br/>{ uid, createdAt }<br/>Read by API and reminder jobs',TEAL)
box(580,142,226,80,'Notification event','Plan / memo changes, capsules<br/>Quest completion, send-love<br/>Scheduled reminders',PURPLE)
arrow([(224,182),(296,182)],'save',lx=239,ly=161,lw=48)
box(296,278,209,74,'FCM delivery','Data strings: title, body, type, url<br/>API: sendEachForMulticast()<br/>API removes invalid device tokens',TEAL,size=9)
arrow([(401,222),(401,278)],'select tokens',lx=413,ly=243,lw=105)
arrow([(693,222),(693,315),(505,315)],'send',lx=590,ly=295,lw=68,color=PURPLE)
box(36,397,220,73,'Foreground: App.vue','messaging.onMessage()<br/>In-app notification / notification stack',BLUE)
box(331,397,226,73,'Background: service worker','onBackgroundMessage()<br/>showNotification() + action buttons',BLUE)
box(621,397,185,73,'Notification click','Focus / open app window<br/>Navigate to view + record ID',BLUE)
arrow([(296,315),(147,315),(147,397)],color=TEAL)
arrow([(442,352),(442,397)],color=TEAL)
arrow([(557,432),(621,432)],color=BLUE)
para(36,489,770,'<b>Recipient behavior:</b> the shared API helper sends to all registered tokens in development; production excludes the initiating UID. It does not filter to a specific capsule toUid. Quest pushes currently carry /#/calendar, while the app deep-link parser reads query parameters.',9.3,AMBER)
end()

# 10 -------------------------------------------------------------------------
begin('Presence | online, away and offline',
      'Realtime Database is the live presence source. The client also mirrors status into Firestore.',
      'src/composables/usePresence.js; src/App.vue:setPartnerPresenceSubscription; src/views/TimeCapsulesView.vue:startPartnerSubscription; firestore.rules')
box(36,145,181,75,'Connect after sign-in','.info/connected listener<br/>Arm onDisconnect(offline)<br/>Write online state',PURPLE,size=9)
box(296,145,207,75,'Online','Focused / visible tab<br/>Write status every 5 seconds',TEAL)
box(601,145,205,75,'Away','Blur or hidden tab<br/>Stop heartbeat; write away',AMBER)
arrow([(217,183),(296,183)],'connected',lx=225,ly=162,lw=63)
arrow([(503,171),(601,171)],'blur / hide',lx=517,ly=149,lw=77,color=AMBER)
arrow([(601,205),(503,205)],'focus / show',lx=510,ly=227,lw=87)
box(36,320,181,85,'RTDB /status/{uid}','status + lastChanged<br/>Server timestamps<br/>onDisconnect writes offline',TEAL,size=9)
box(296,320,207,85,'Firestore userPresence/{uid}','Client mirror: status + lastChanged<br/>Also used to discover the other<br/>user for capsule addressing',TEAL,size=9)
box(601,320,205,85,'Partner indicator','App.vue watches RTDB /status<br/>Selects another user<br/>Applies local freshness checks',BLUE,size=9)
arrow([(399,220),(399,272),(126,272),(126,320)],color=TEAL)
arrow([(399,272),(399,320)],color=TEAL)
line([(703,220),(703,272),(399,272)],TEAL,width=1.35)
arrow([(217,382),(255,382),(255,433),(703,433),(703,405)],color=TEAL)
note(463,'Disconnect handling is asymmetric',
     'The RTDB server can mark a disconnected client offline. The Firestore mirror is written by the client, so it may remain stale after an abrupt disconnect. No server-side presence-mirroring function or Realtime Database rules file is present in this repository.',h=63)
end()

# 11 -------------------------------------------------------------------------
begin('Data model and access paths',
      'These are document collections and key fields, not relational tables. UID fields refer to Firebase Auth users.',
      'netlify/functions/api.mjs; routes/*.mjs; planReminders.mjs; anniversaryReminders.mjs; src/composables/{useDailyQuests,usePresence}.js; firestore.rules; firestore.indexes.json')
items=[
('plans/{id}','text, date, time, locationCoords<br/>creatorUid, hashtags, createdAt<br/><b>Browser:</b> signed-in read/write',BLUE),
('memos/{id}','description, date, photos[], locationCoords<br/>creatorUid, hashtags, createdAt<br/><b>Browser:</b> signed-in read/write',BLUE),
('timeCapsules/{id}','fromUid, toUid, unlockAt, message, photos[]<br/>opened, openedAt, unlockDateKey<br/><b>Browser:</b> participants read; no writes',PURPLE),
('dailyQuests/{uid_date}','userId, userName, date, text<br/>completed, completedAt, createdAt<br/><b>Browser:</b> signed-in read; UID write check',BLUE),
('userPresence/{uid}','status, lastChanged<br/>Client-written Firestore presence mirror<br/><b>Browser:</b> signed-in read; own UID write',TEAL),
('fcmTokens/{token}','uid, createdAt<br/>Device token is the document ID<br/><b>Server:</b> register / select / clean up',TEAL),
('planReminderNotifications/{key}','planId, reminderCode, dueAt<br/>successCount, failureCount, createdAt<br/><b>Server:</b> reminder deduplication',TEAL),
('anniversaryNotifications/{key}','collectionName, docId, milestoneCode<br/>date, delivery counts, createdAt<br/><b>Server:</b> anniversary deduplication',TEAL),
('RTDB: /status/{uid}','status, lastChanged<br/>Auth UID links to Firestore mirror<br/><b>Separate database:</b> live presence',AMBER),
]
for i,(title,body,color) in enumerate(items):
    box(36+(i%3)*263,131+(i//3)*111,244,98,title,body,color,size=9)
note(477,'Rules and indexes in this repository',
     'No client allow rules are declared for token or reminder-log collections. Capsule indexes combine fromUid + unlockAt and toUid + unlockAt. dailyQuests writes check the resulting userId; deletion uses the same request.resource condition, which has no resulting document.',color=AMBER,h=60)
end()

# 12 -------------------------------------------------------------------------
begin('Scheduled reminders',
      'Two exported Netlify schedules read Firestore, select device tokens and record notification attempts.',
      'netlify/functions/planReminders.mjs:53-69,96-235; netlify/functions/anniversaryReminders.mjs:44-105,133-269')
tag(36,126,'PLAN REMINDERS',PURPLE);tag(441,126,'ANNIVERSARIES',PURPLE)
box(36,160,159,77,'Every 15 minutes','Cron: */15 * * * *<br/>Read plans + fcmTokens<br/>Default plan time: 09:00',PURPLE,size=9)
box(250,160,153,77,'Find due triggers','24 hours before<br/>1 hour before<br/>At the due time',BLUE,size=9)
arrow([(195,198),(250,198)],color=PURPLE)
box(36,297,159,91,'Check dedupe key','planId : reminderCode : dueISO<br/>15-minute trigger window<br/>Skip existing attempt',TEAL,size=9)
box(250,297,153,91,'Send + log','FCM multicast<br/>Write reminder log<br/>Prod excludes plan creator',TEAL,size=9)
arrow([(326,237),(326,266),(115,266),(115,297)],color=TEAL)
arrow([(195,341),(250,341)],color=TEAL)
box(441,160,156,77,'Daily cron','Cron: 0 9 * * *<br/>Read plans + memos<br/>Compare UTC dates',PURPLE,size=9)
box(650,160,156,77,'Match milestone','Exactly 6 months later<br/>Exactly 1 year later<br/>Clamp end-of-month dates',BLUE,size=9)
arrow([(597,198),(650,198)],color=PURPLE)
box(441,297,156,91,'Check dedupe key','collection : id : milestone : day<br/>anniversaryNotifications<br/>Skip existing attempt',TEAL,size=9)
box(650,297,156,91,'Send + log','All registered FCM tokens<br/>Record delivery counts<br/>Deep link to plan / memo',TEAL,size=9)
arrow([(728,237),(728,266),(519,266),(519,297)],color=TEAL)
arrow([(597,341),(650,341)],color=TEAL)
note(430,'Timing and delivery details',
     'Plan due dates use the server runtime timezone; anniversary comparisons use UTC. The log check, push and log write are separate operations, not a transaction. Logged failures are not automatically retried by these handlers. Cloud scheduling was not invoked during documentation.',color=AMBER,h=80)
end()

# 13 -------------------------------------------------------------------------
begin('Local runtime, build and deployment boundaries',
      'Use Netlify Dev for the combined frontend and API. The production frontend is generated into dist/.',
      'package.json; netlify/functions/package.json; netlify.toml; vite.config.js; firebase.json; src/composables/usePwaAutoUpdate.js; src/sw.js')
box(36,145,168,78,'Browser','http://localhost:8888<br/>App assets + /api/* requests',BLUE)
box(279,145,216,78,'Netlify Dev :8888','Loads .env + connected site vars<br/>Proxies the frontend<br/>Routes /api/* to api function',PURPLE,size=9)
box(595,132,211,59,'Vite :5173','npm run dev<br/>Vue modules + hot reload',BLUE,size=9)
box(595,216,211,59,'Netlify function runtime','api + two reminder functions<br/>Firebase Admin / Cloudinary SDKs',PURPLE,size=9)
arrow([(204,184),(279,184)],color=BLUE)
arrow([(495,164),(595,164)],'frontend',lx=509,ly=145,lw=72,color=BLUE)
arrow([(495,205),(544,205),(544,246),(595,246)],color=PURPLE)
box(36,327,168,69,'Install dependencies','npm ci<br/>npm ci --prefix netlify/functions',BLUE,size=9)
box(279,327,216,69,'Production build','npm run build<br/>Vite + injectManifest PWA',BLUE)
box(595,327,211,69,'Build output: dist/','HTML / JS / CSS / manifest<br/>sw.js + precached assets',TEAL)
arrow([(204,362),(279,362)],color=BLUE)
arrow([(495,362),(595,362)],color=TEAL)
note(427,'Configuration boundaries',
     'VITE_* values configure the browser; Firebase Admin and Cloudinary secrets stay server-side. netlify.toml rewrites /api/* to the API function. firebase.json serves dist/ with an SPA fallback, but does not route /api/* to Netlify.',h=65)
para(36,504,770,'PWA: Workbox precaches build assets and caches Firebase libraries. The update composable checks every 60 seconds and reloads after a 3-second update notice. No general API/data offline cache is configured.',9,MUTED)
end()

c.save()
print(f'Created {OUT} ({page_no} pages)')
