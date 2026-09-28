"""Create the logical ER diagrams PDF. Requires reportlab; run from repo root."""
from pathlib import Path
import sys, html, math
ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'tmp/er-pdf-tools'))
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor, white
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph
from reportlab.lib.styles import ParagraphStyle

OUT=ROOT/'output/pdf/Grus-Corner-ER-Diagrams.pdf'
OUT.parent.mkdir(parents=True,exist_ok=True)
for name,f in [('Body','arial.ttf'),('Bold','arialbd.ttf')]:
    pdfmetrics.registerFont(TTFont(name,'C:/Windows/Fonts/'+f))
pdfmetrics.registerFontFamily('Body',normal='Body',bold='Bold',italic='Body',boldItalic='Bold')
W,H=842,595
INK='#172A3A';MUTED='#536678';LINE='#C9D5DE';BLUE='#245CCD';TEAL='#087F83';PURPLE='#7950AF';AMBER='#AD6813'
FILL={BLUE:'#EDF3FF',TEAL:'#EAF7F5',PURPLE:'#F3EEFA',AMBER:'#FFF5E6'}
c=canvas.Canvas(str(OUT),pagesize=(W,H),pageCompression=1)
c.setTitle('Grus Corner | Entity-relationship diagrams')
c.setAuthor('Project architecture documentation')
c.setSubject('Logical ER model of Firebase Auth, Firestore, Realtime Database and embedded media')
page=0

def text(x,y,s,size=9,color=INK,bold=False):
    c.setFont('Bold' if bold else 'Body',size);c.setFillColor(HexColor(color));c.drawString(x,H-y-size*.8,s)

def p(x,y,w,s,size=9,color=INK):
    item=Paragraph(s,ParagraphStyle('p',fontName='Body',fontSize=size,leading=size*1.3,textColor=HexColor(color)))
    _,h=item.wrap(w,1000);item.drawOn(c,x,H-y-h);return h

def rect(x,y,w,h,fill,stroke=None,r=6):
    c.setFillColor(HexColor(fill));c.setStrokeColor(HexColor(stroke or fill));c.setLineWidth(.8)
    c.roundRect(x,H-y-h,w,h,r,stroke=1,fill=1)

def line(points,color=TEAL,dashed=False,width=1.2):
    c.setLineWidth(width);c.setStrokeColor(HexColor(color));c.setDash([4,3] if dashed else [])
    path=c.beginPath();path.moveTo(points[0][0],H-points[0][1])
    for x,y in points[1:]:path.lineTo(x,H-y)
    c.drawPath(path);c.setDash([])

def marker(endpoint,near,kind,color):
    x,y=endpoint;dx=near[0]-x;dy=near[1]-y;l=math.hypot(dx,dy);dx/=l;dy/=l
    def at(d,offset=0):return (x+dx*d-dy*offset,y+dy*d+dx*offset)
    def bar(d):line([at(d,-4.5),at(d,4.5)],color,width=1.2)
    if kind=='1':bar(7);bar(12)
    elif kind in ['0..*','0..1']:
        if kind=='0..*':
            for off in [-5,0,5]:line([at(0,off),at(13)],color,width=1.2)
        else:bar(7)
        cx,cy=at(21);c.setStrokeColor(HexColor(color));c.setFillColor(white)
        c.circle(cx,H-cy,3.7,fill=1,stroke=1)

def rel(points,start='1',end='0..*',color=TEAL,dashed=False):
    line(points,color,dashed)
    marker(points[0],points[1],start,color);marker(points[-1],points[-2],end,color)

def label(x,y,w,s,color=TEAL):
    return p(x,y,w,s,8.5,color)

def entity(x,y,w,title,store,fields,color=BLUE):
    header=45;rowh=14
    h=header+len(fields)*rowh+11
    rect(x,y,w,h,'#FFFFFF',color)
    rect(x+1,y+1,w-2,header-2,FILL[color],r=5)
    ts=min(11,11*(w-22)/pdfmetrics.stringWidth(title,'Bold',11))
    text(x+11,y+9,title,ts,color,True)
    text(x+11,y+27,store,7.6,MUTED)
    for i,f in enumerate(fields):
        assert pdfmetrics.stringWidth(f,'Body',8.7)<w-22,(title,f,'field overflow')
        text(x+11,y+header+4+i*rowh,f,8.7)
    return (x,y,w,h)

def begin(title,sub,source):
    global page
    page+=1;c.bookmarkPage('er'+str(page));c.addOutlineEntry(title,'er'+str(page),0)
    text(36,25,'GRUS CORNER  /  LOGICAL ENTITY-RELATIONSHIP MODEL',8.5,MUTED,True)
    text(36,49,title,24,INK,True)
    p(36,84,770,sub,10.3,MUTED)
    line([(36,548),(806,548)],LINE,width=.8)
    p(36,554,770,'<b>Code:</b> '+html.escape(source),7.2,MUTED)
    text(36,581,'25 SEP 2026  |  CODE SNAPSHOT  |  NO LIVE DATABASE CONTENT',7,MUTED)
    text(766,579,f'{page:02d} / 04',8,MUTED,True)

def legend(y=506):
    rect(36,y,770,32,'#F2F6F9')
    for xx,kind in [(46,'1'),(193,'0..*'),(363,'0..1')]:
        line([(xx,y+16),(xx+48,y+16)],INK)
        marker((xx,y+16),(xx+48,y+16),kind,INK)
    text(102,y+12,'1 = exactly one',8,INK)
    text(249,y+12,'0..* = zero or many',8,INK)
    text(419,y+12,'0..1 = optional one',8,INK)
    text(558,y+7,'ID = document/path key; REF = logical reference',7.7,MUTED)
    text(558,y+19,'No SQL foreign keys or automatic cascade deletes.',7.7,MUTED)

# 1: core content -------------------------------------------------------------
begin('Users and authored content',
      'Crow\'s-foot notation shows intended relationships for records created by the app. UID references are strings, not enforced foreign keys.',
      'src/views/Register.vue; netlify/functions/routes/plans.mjs; routes/memos.mjs; routes/timeCapsules.mjs')
entity(296,125,250,'AuthUser','Firebase Authentication (not a collection)',[
    'KEY uid : string','email : string','displayName : string'],PURPLE)
entity(36,314,220,'Plan','Firestore: plans/{id}',[
    'ID id : document key','REF creatorUid -> AuthUser.uid','text, date, time : strings','location : string','locationCoords : object | null','hashtags : string[]','createdBy : string','createdAt : timestamp'],BLUE)
entity(311,314,220,'Memo','Firestore: memos/{id}',[
    'ID id : document key','REF creatorUid -> AuthUser.uid','description, date : strings','location, locationCoords','hashtags : string[]','photos : embedded array','createdBy : string','createdAt : ISO string'],BLUE)
entity(586,314,220,'TimeCapsule','Firestore: timeCapsules/{id}',[
    'ID id : document key','REF fromUid -> AuthUser.uid','REF toUid -> AuthUser.uid','title, message, fromName : strings','unlockAt, unlockDateKey : strings','photos : embedded array','opened : boolean','openedAt : ISO | null; createdAt : ISO'],BLUE)
rel([(296,166),(146,166),(146,314)],color=PURPLE)
label(158,245,140,'creates<br/>creatorUid',PURPLE)
rel([(421,223),(421,314)],color=PURPLE)
label(435,257,133,'creates<br/>creatorUid',PURPLE)
rel([(500,223),(500,263),(625,263),(625,314)],color=PURPLE)
label(637,270,115,'sends<br/>fromUid',PURPLE)
rel([(546,206),(775,206),(775,314)],color=PURPLE)
label(678,260,88,'receives<br/>toUid',PURPLE)
text(36,491,'Each record has one author; each capsule has one sender and one recipient. The same user may fill both capsule roles.',8,MUTED)
legend();c.showPage()

# 2: identity-linked support entities ----------------------------------------
begin('Quests, device tokens and presence',
      'One Auth user can own many quest records and device tokens, and at most one presence record in each database.',
      'src/composables/useDailyQuests.js; usePresence.js; netlify/functions/api.mjs:POST /api/register; firestore.rules')
entity(296,125,250,'AuthUser','Same identity as page 1',[
    'KEY uid : string','email, displayName : strings'],PURPLE)
entity(36,322,177,'DailyQuest','Firestore: dailyQuests/{id}',[
    'ID {userId}_{date}','REF userId -> AuthUser.uid','date : YYYY-MM-DD','userName, text : strings','completed : boolean','completedAt : timestamp | null','createdAt : timestamp'],BLUE)
entity(234,322,177,'UserPresence','Firestore: userPresence/{uid}',[
    'ID / REF uid -> AuthUser.uid','status : string','lastChanged : epoch ms'],TEAL)
entity(433,322,177,'RealtimePresence','RTDB: /status/{uid}',[
    'KEY / REF uid -> AuthUser.uid','status : string','lastChanged : server epoch ms'],AMBER)
entity(631,322,175,'DeviceToken','Firestore: fcmTokens/{token}',[
    'ID token : FCM token string','REF uid -> AuthUser.uid','createdAt : timestamp'],TEAL)
rel([(296,169),(124,169),(124,322)],color=PURPLE)
label(138,241,134,'owns daily quests<br/>One generated ID<br/>per user/date',PURPLE)
rel([(342,209),(342,266),(322,266),(322,322)],end='0..1',color=TEAL)
label(242,279,70,'client-written<br/>mirror',TEAL)
rel([(500,209),(500,266),(521,266),(521,322)],end='0..1',color=AMBER)
label(533,279,76,'live presence<br/>record',AMBER)
rel([(546,169),(719,169),(719,322)],color=PURPLE)
label(731,252,75,'registers<br/>device tokens',PURPLE)
text(36,491,'UserPresence and RealtimePresence share a UID; they are separate records and are not updated atomically.',8,MUTED)
legend();c.showPage()

# 3: media -------------------------------------------------------------------
begin('Embedded media and hosted assets',
      'Dashed relationships indicate containment in photos[] arrays. Media items are embedded values, not separate Firestore collections.',
      'src/components/MemoForm.vue; TimeCapsuleFormModal.vue; netlify/functions/routes/memos.mjs; routes/timeCapsules.mjs')
entity(36,132,220,'Memo','Firestore: memos/{id}',[
    'ID id : document key','photos : MemoMedia[]'],BLUE)
entity(586,132,220,'TimeCapsule','Firestore: timeCapsules/{id}',[
    'ID id : document key','photos : CapsuleMedia[]'],BLUE)
entity(36,323,220,'MemoMedia','Embedded object; no document ID',[
    'REF url -> HostedAsset URL','resource_type : image | video','isAdult : boolean'],AMBER)
entity(586,323,220,'CapsuleMedia','Embedded object; no document ID',[
    'REF url -> HostedAsset URL','resource_type : image | video'],AMBER)
entity(311,309,220,'HostedAsset','External: Cloudinary (logical entity)',[
    'URL : media URL used by the app','resource_type : image | video','File bytes hosted by Cloudinary'],TEAL)
rel([(146,216),(146,323)],color=AMBER,dashed=True)
label(160,248,130,'contains<br/>photos[]',AMBER)
rel([(696,216),(696,323)],color=AMBER,dashed=True)
label(711,248,90,'contains<br/>photos[]',AMBER)
rel([(256,367),(311,367)],start='0..*',end='1',color=TEAL)
rel([(586,367),(531,367)],start='0..*',end='1',color=TEAL)
label(263,342,42,'URL',TEAL);label(545,342,38,'URL',TEAL)
rect(36,447,770,48,'#F2F6F9')
p(48,457,746,'Each embedded item belongs to one parent document and references one hosted asset by URL. The same URL may appear in multiple items. Cloudinary existence and URL uniqueness are not enforced by Firestore. Legacy photoUrls[] is also read by backend helpers.',9)
legend();c.showPage()

# 4: reminder logs -----------------------------------------------------------
begin('Reminder logs and polymorphic references',
      'These collections record notification attempts. Their document keys support deduplication; they are not per-recipient delivery tables.',
      'netlify/functions/planReminders.mjs:dedupeKey and dedupeRef.set; anniversaryReminders.mjs:reminderKey and reminderRef.set')
entity(36,128,220,'Plan','Firestore: plans/{id}',[
    'ID id : document key','date, time : strings'],BLUE)
entity(586,128,220,'Memo','Firestore: memos/{id}',[
    'ID id : document key','date : string'],BLUE)
entity(36,313,258,'PlanReminderNotification','Firestore: planReminderNotifications/{key}',[
    'ID key = planId : code : dueISO','REF planId -> Plan.id','reminderCode : 24h | 1h | timeUp','dueAt, createdAt : ISO strings','title, body, url : strings','successCount, failureCount : numbers','skippedReason : string (skip records)'],TEAL)
entity(448,299,358,'AnniversaryNotification','Firestore: anniversaryNotifications/{key}',[
    'ID key = collection : docId : milestone : runDay','REF collectionName + docId -> Plan OR Memo','collectionName : plans | memos','milestoneCode : 6m | 1y; milestoneLabel : string','date : source date; createdAt : ISO string','title, body, url : strings','successCount, failureCount : numbers'],TEAL)
rel([(145,212),(145,313)],color=TEAL)
label(159,244,116,'has attempts',TEAL)
rel([(256,170),(284,170),(284,262),(500,262),(500,299)],start='0..1',color=TEAL)
label(365,223,185,'source when<br/>collectionName = plans',TEAL)
rel([(696,212),(696,299)],start='0..1',color=TEAL)
label(710,238,90,'source when<br/>memos',TEAL)
rect(321,128,217,58,FILL[PURPLE])
p(333,137,193,'<b>XOR source constraint (logical)</b><br/>Each anniversary log refers to one Plan OR one Memo, never both.',8.8,PURPLE)
text(36,491,'0..1 on each anniversary source branch is conditional: together, the two branches identify exactly one source.',8,MUTED)
legend();c.showPage()
c.save()
print(f'Created {OUT} ({page} pages)')
