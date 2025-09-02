(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const r of document.querySelectorAll('link[rel="modulepreload"]'))s(r);new MutationObserver(r=>{for(const i of r)if(i.type==="childList")for(const o of i.addedNodes)o.tagName==="LINK"&&o.rel==="modulepreload"&&s(o)}).observe(document,{childList:!0,subtree:!0});function n(r){const i={};return r.integrity&&(i.integrity=r.integrity),r.referrerPolicy&&(i.referrerPolicy=r.referrerPolicy),r.crossOrigin==="use-credentials"?i.credentials="include":r.crossOrigin==="anonymous"?i.credentials="omit":i.credentials="same-origin",i}function s(r){if(r.ep)return;r.ep=!0;const i=n(r);fetch(r.href,i)}})();/**
* @vue/shared v3.5.20
* (c) 2018-present Yuxi (Evan) You and Vue contributors
* @license MIT
**//*! #__NO_SIDE_EFFECTS__ */function os(e){const t=Object.create(null);for(const n of e.split(","))t[n]=1;return n=>n in t}const j={},ct=[],Se=()=>{},Br=()=>!1,on=e=>e.charCodeAt(0)===111&&e.charCodeAt(1)===110&&(e.charCodeAt(2)>122||e.charCodeAt(2)<97),as=e=>e.startsWith("onUpdate:"),re=Object.assign,cs=(e,t)=>{const n=e.indexOf(t);n>-1&&e.splice(n,1)},vo=Object.prototype.hasOwnProperty,F=(e,t)=>vo.call(e,t),D=Array.isArray,vt=e=>an(e)==="[object Map]",So=e=>an(e)==="[object Set]",O=e=>typeof e=="function",G=e=>typeof e=="string",dt=e=>typeof e=="symbol",q=e=>e!==null&&typeof e=="object",kr=e=>(q(e)||O(e))&&O(e.then)&&O(e.catch),Eo=Object.prototype.toString,an=e=>Eo.call(e),Io=e=>an(e).slice(8,-1),To=e=>an(e)==="[object Object]",ls=e=>G(e)&&e!=="NaN"&&e[0]!=="-"&&""+parseInt(e,10)===e,St=os(",key,ref,ref_for,ref_key,onVnodeBeforeMount,onVnodeMounted,onVnodeBeforeUpdate,onVnodeUpdated,onVnodeBeforeUnmount,onVnodeUnmounted"),cn=e=>{const t=Object.create(null);return(n=>t[n]||(t[n]=e(n)))},Ao=/-(\w)/g,Ue=cn(e=>e.replace(Ao,(t,n)=>n?n.toUpperCase():"")),Co=/\B([A-Z])/g,it=cn(e=>e.replace(Co,"-$1").toLowerCase()),Lr=cn(e=>e.charAt(0).toUpperCase()+e.slice(1)),wn=cn(e=>e?`on${Lr(e)}`:""),He=(e,t)=>!Object.is(e,t),vn=(e,...t)=>{for(let n=0;n<e.length;n++)e[n](...t)},Hr=(e,t,n,s=!1)=>{Object.defineProperty(e,t,{configurable:!0,enumerable:!1,writable:s,value:n})},xo=e=>{const t=parseFloat(e);return isNaN(t)?e:t};let Us;const ln=()=>Us||(Us=typeof globalThis<"u"?globalThis:typeof self<"u"?self:typeof window<"u"?window:typeof global<"u"?global:{});function fs(e){if(D(e)){const t={};for(let n=0;n<e.length;n++){const s=e[n],r=G(s)?Po(s):fs(s);if(r)for(const i in r)t[i]=r[i]}return t}else if(G(e)||q(e))return e}const Do=/;(?![^(]*\))/g,Oo=/:([^]+)/,Mo=/\/\*[^]*?\*\//g;function Po(e){const t={};return e.replace(Mo,"").split(Do).forEach(n=>{if(n){const s=n.split(Oo);s.length>1&&(t[s[0].trim()]=s[1].trim())}}),t}function us(e){let t="";if(G(e))t=e;else if(D(e))for(let n=0;n<e.length;n++){const s=us(e[n]);s&&(t+=s+" ")}else if(q(e))for(const n in e)e[n]&&(t+=n+" ");return t.trim()}const Ro="itemscope,allowfullscreen,formnovalidate,ismap,nomodule,novalidate,readonly",No=os(Ro);function jr(e){return!!e||e===""}/**
* @vue/reactivity v3.5.20
* (c) 2018-present Yuxi (Evan) You and Vue contributors
* @license MIT
**/let ae;class Fo{constructor(t=!1){this.detached=t,this._active=!0,this._on=0,this.effects=[],this.cleanups=[],this._isPaused=!1,this.parent=ae,!t&&ae&&(this.index=(ae.scopes||(ae.scopes=[])).push(this)-1)}get active(){return this._active}pause(){if(this._active){this._isPaused=!0;let t,n;if(this.scopes)for(t=0,n=this.scopes.length;t<n;t++)this.scopes[t].pause();for(t=0,n=this.effects.length;t<n;t++)this.effects[t].pause()}}resume(){if(this._active&&this._isPaused){this._isPaused=!1;let t,n;if(this.scopes)for(t=0,n=this.scopes.length;t<n;t++)this.scopes[t].resume();for(t=0,n=this.effects.length;t<n;t++)this.effects[t].resume()}}run(t){if(this._active){const n=ae;try{return ae=this,t()}finally{ae=n}}}on(){++this._on===1&&(this.prevScope=ae,ae=this)}off(){this._on>0&&--this._on===0&&(ae=this.prevScope,this.prevScope=void 0)}stop(t){if(this._active){this._active=!1;let n,s;for(n=0,s=this.effects.length;n<s;n++)this.effects[n].stop();for(this.effects.length=0,n=0,s=this.cleanups.length;n<s;n++)this.cleanups[n]();if(this.cleanups.length=0,this.scopes){for(n=0,s=this.scopes.length;n<s;n++)this.scopes[n].stop(!0);this.scopes.length=0}if(!this.detached&&this.parent&&!t){const r=this.parent.scopes.pop();r&&r!==this&&(this.parent.scopes[this.index]=r,r.index=this.index)}this.parent=void 0}}}function $o(){return ae}let H;const Sn=new WeakSet;class Vr{constructor(t){this.fn=t,this.deps=void 0,this.depsTail=void 0,this.flags=5,this.next=void 0,this.cleanup=void 0,this.scheduler=void 0,ae&&ae.active&&ae.effects.push(this)}pause(){this.flags|=64}resume(){this.flags&64&&(this.flags&=-65,Sn.has(this)&&(Sn.delete(this),this.trigger()))}notify(){this.flags&2&&!(this.flags&32)||this.flags&8||Kr(this)}run(){if(!(this.flags&1))return this.fn();this.flags|=2,Ks(this),Wr(this);const t=H,n=ue;H=this,ue=!0;try{return this.fn()}finally{qr(this),H=t,ue=n,this.flags&=-3}}stop(){if(this.flags&1){for(let t=this.deps;t;t=t.nextDep)ps(t);this.deps=this.depsTail=void 0,Ks(this),this.onStop&&this.onStop(),this.flags&=-2}}trigger(){this.flags&64?Sn.add(this):this.scheduler?this.scheduler():this.runIfDirty()}runIfDirty(){jn(this)&&this.run()}get dirty(){return jn(this)}}let Ur=0,Et,It;function Kr(e,t=!1){if(e.flags|=8,t){e.next=It,It=e;return}e.next=Et,Et=e}function ds(){Ur++}function hs(){if(--Ur>0)return;if(It){let t=It;for(It=void 0;t;){const n=t.next;t.next=void 0,t.flags&=-9,t=n}}let e;for(;Et;){let t=Et;for(Et=void 0;t;){const n=t.next;if(t.next=void 0,t.flags&=-9,t.flags&1)try{t.trigger()}catch(s){e||(e=s)}t=n}}if(e)throw e}function Wr(e){for(let t=e.deps;t;t=t.nextDep)t.version=-1,t.prevActiveLink=t.dep.activeLink,t.dep.activeLink=t}function qr(e){let t,n=e.depsTail,s=n;for(;s;){const r=s.prevDep;s.version===-1?(s===n&&(n=r),ps(s),Bo(s)):t=s,s.dep.activeLink=s.prevActiveLink,s.prevActiveLink=void 0,s=r}e.deps=t,e.depsTail=n}function jn(e){for(let t=e.deps;t;t=t.nextDep)if(t.dep.version!==t.version||t.dep.computed&&(zr(t.dep.computed)||t.dep.version!==t.version))return!0;return!!e._dirty}function zr(e){if(e.flags&4&&!(e.flags&16)||(e.flags&=-17,e.globalVersion===Mt)||(e.globalVersion=Mt,!e.isSSR&&e.flags&128&&(!e.deps&&!e._dirty||!jn(e))))return;e.flags|=2;const t=e.dep,n=H,s=ue;H=e,ue=!0;try{Wr(e);const r=e.fn(e._value);(t.version===0||He(r,e._value))&&(e.flags|=128,e._value=r,t.version++)}catch(r){throw t.version++,r}finally{H=n,ue=s,qr(e),e.flags&=-3}}function ps(e,t=!1){const{dep:n,prevSub:s,nextSub:r}=e;if(s&&(s.nextSub=r,e.prevSub=void 0),r&&(r.prevSub=s,e.nextSub=void 0),n.subs===e&&(n.subs=s,!s&&n.computed)){n.computed.flags&=-5;for(let i=n.computed.deps;i;i=i.nextDep)ps(i,!0)}!t&&!--n.sc&&n.map&&n.map.delete(n.key)}function Bo(e){const{prevDep:t,nextDep:n}=e;t&&(t.nextDep=n,e.prevDep=void 0),n&&(n.prevDep=t,e.nextDep=void 0)}let ue=!0;const Gr=[];function Me(){Gr.push(ue),ue=!1}function Pe(){const e=Gr.pop();ue=e===void 0?!0:e}function Ks(e){const{cleanup:t}=e;if(e.cleanup=void 0,t){const n=H;H=void 0;try{t()}finally{H=n}}}let Mt=0;class ko{constructor(t,n){this.sub=t,this.dep=n,this.version=n.version,this.nextDep=this.prevDep=this.nextSub=this.prevSub=this.prevActiveLink=void 0}}class gs{constructor(t){this.computed=t,this.version=0,this.activeLink=void 0,this.subs=void 0,this.map=void 0,this.key=void 0,this.sc=0,this.__v_skip=!0}track(t){if(!H||!ue||H===this.computed)return;let n=this.activeLink;if(n===void 0||n.sub!==H)n=this.activeLink=new ko(H,this),H.deps?(n.prevDep=H.depsTail,H.depsTail.nextDep=n,H.depsTail=n):H.deps=H.depsTail=n,Jr(n);else if(n.version===-1&&(n.version=this.version,n.nextDep)){const s=n.nextDep;s.prevDep=n.prevDep,n.prevDep&&(n.prevDep.nextDep=s),n.prevDep=H.depsTail,n.nextDep=void 0,H.depsTail.nextDep=n,H.depsTail=n,H.deps===n&&(H.deps=s)}return n}trigger(t){this.version++,Mt++,this.notify(t)}notify(t){ds();try{for(let n=this.subs;n;n=n.prevSub)n.sub.notify()&&n.sub.dep.notify()}finally{hs()}}}function Jr(e){if(e.dep.sc++,e.sub.flags&4){const t=e.dep.computed;if(t&&!e.dep.subs){t.flags|=20;for(let s=t.deps;s;s=s.nextDep)Jr(s)}const n=e.dep.subs;n!==e&&(e.prevSub=n,n&&(n.nextSub=e)),e.dep.subs=e}}const Vn=new WeakMap,et=Symbol(""),Un=Symbol(""),Pt=Symbol("");function Y(e,t,n){if(ue&&H){let s=Vn.get(e);s||Vn.set(e,s=new Map);let r=s.get(n);r||(s.set(n,r=new gs),r.map=s,r.key=n),r.track()}}function xe(e,t,n,s,r,i){const o=Vn.get(e);if(!o){Mt++;return}const a=l=>{l&&l.trigger()};if(ds(),t==="clear")o.forEach(a);else{const l=D(e),u=l&&ls(n);if(l&&n==="length"){const d=Number(s);o.forEach((p,S)=>{(S==="length"||S===Pt||!dt(S)&&S>=d)&&a(p)})}else switch((n!==void 0||o.has(void 0))&&a(o.get(n)),u&&a(o.get(Pt)),t){case"add":l?u&&a(o.get("length")):(a(o.get(et)),vt(e)&&a(o.get(Un)));break;case"delete":l||(a(o.get(et)),vt(e)&&a(o.get(Un)));break;case"set":vt(e)&&a(o.get(et));break}}hs()}function ot(e){const t=N(e);return t===e?t:(Y(t,"iterate",Pt),de(e)?t:t.map(te))}function ms(e){return Y(e=N(e),"iterate",Pt),e}const Lo={__proto__:null,[Symbol.iterator](){return En(this,Symbol.iterator,te)},concat(...e){return ot(this).concat(...e.map(t=>D(t)?ot(t):t))},entries(){return En(this,"entries",e=>(e[1]=te(e[1]),e))},every(e,t){return Ie(this,"every",e,t,void 0,arguments)},filter(e,t){return Ie(this,"filter",e,t,n=>n.map(te),arguments)},find(e,t){return Ie(this,"find",e,t,te,arguments)},findIndex(e,t){return Ie(this,"findIndex",e,t,void 0,arguments)},findLast(e,t){return Ie(this,"findLast",e,t,te,arguments)},findLastIndex(e,t){return Ie(this,"findLastIndex",e,t,void 0,arguments)},forEach(e,t){return Ie(this,"forEach",e,t,void 0,arguments)},includes(...e){return In(this,"includes",e)},indexOf(...e){return In(this,"indexOf",e)},join(e){return ot(this).join(e)},lastIndexOf(...e){return In(this,"lastIndexOf",e)},map(e,t){return Ie(this,"map",e,t,void 0,arguments)},pop(){return _t(this,"pop")},push(...e){return _t(this,"push",e)},reduce(e,...t){return Ws(this,"reduce",e,t)},reduceRight(e,...t){return Ws(this,"reduceRight",e,t)},shift(){return _t(this,"shift")},some(e,t){return Ie(this,"some",e,t,void 0,arguments)},splice(...e){return _t(this,"splice",e)},toReversed(){return ot(this).toReversed()},toSorted(e){return ot(this).toSorted(e)},toSpliced(...e){return ot(this).toSpliced(...e)},unshift(...e){return _t(this,"unshift",e)},values(){return En(this,"values",te)}};function En(e,t,n){const s=ms(e),r=s[t]();return s!==e&&!de(e)&&(r._next=r.next,r.next=()=>{const i=r._next();return i.value&&(i.value=n(i.value)),i}),r}const Ho=Array.prototype;function Ie(e,t,n,s,r,i){const o=ms(e),a=o!==e&&!de(e),l=o[t];if(l!==Ho[t]){const p=l.apply(e,i);return a?te(p):p}let u=n;o!==e&&(a?u=function(p,S){return n.call(this,te(p),S,e)}:n.length>2&&(u=function(p,S){return n.call(this,p,S,e)}));const d=l.call(o,u,s);return a&&r?r(d):d}function Ws(e,t,n,s){const r=ms(e);let i=n;return r!==e&&(de(e)?n.length>3&&(i=function(o,a,l){return n.call(this,o,a,l,e)}):i=function(o,a,l){return n.call(this,o,te(a),l,e)}),r[t](i,...s)}function In(e,t,n){const s=N(e);Y(s,"iterate",Pt);const r=s[t](...n);return(r===-1||r===!1)&&ws(n[0])?(n[0]=N(n[0]),s[t](...n)):r}function _t(e,t,n=[]){Me(),ds();const s=N(e)[t].apply(e,n);return hs(),Pe(),s}const jo=os("__proto__,__v_isRef,__isVue"),Yr=new Set(Object.getOwnPropertyNames(Symbol).filter(e=>e!=="arguments"&&e!=="caller").map(e=>Symbol[e]).filter(dt));function Vo(e){dt(e)||(e=String(e));const t=N(this);return Y(t,"has",e),t.hasOwnProperty(e)}class Xr{constructor(t=!1,n=!1){this._isReadonly=t,this._isShallow=n}get(t,n,s){if(n==="__v_skip")return t.__v_skip;const r=this._isReadonly,i=this._isShallow;if(n==="__v_isReactive")return!r;if(n==="__v_isReadonly")return r;if(n==="__v_isShallow")return i;if(n==="__v_raw")return s===(r?i?Zo:ti:i?ei:Qr).get(t)||Object.getPrototypeOf(t)===Object.getPrototypeOf(s)?t:void 0;const o=D(t);if(!r){let l;if(o&&(l=Lo[n]))return l;if(n==="hasOwnProperty")return Vo}const a=Reflect.get(t,n,X(t)?t:s);return(dt(n)?Yr.has(n):jo(n))||(r||Y(t,"get",n),i)?a:X(a)?o&&ls(n)?a:a.value:q(a)?r?ni(a):_s(a):a}}class Zr extends Xr{constructor(t=!1){super(!1,t)}set(t,n,s,r){let i=t[n];if(!this._isShallow){const l=tt(i);if(!de(s)&&!tt(s)&&(i=N(i),s=N(s)),!D(t)&&X(i)&&!X(s))return l||(i.value=s),!0}const o=D(t)&&ls(n)?Number(n)<t.length:F(t,n),a=Reflect.set(t,n,s,X(t)?t:r);return t===N(r)&&(o?He(s,i)&&xe(t,"set",n,s):xe(t,"add",n,s)),a}deleteProperty(t,n){const s=F(t,n);t[n];const r=Reflect.deleteProperty(t,n);return r&&s&&xe(t,"delete",n,void 0),r}has(t,n){const s=Reflect.has(t,n);return(!dt(n)||!Yr.has(n))&&Y(t,"has",n),s}ownKeys(t){return Y(t,"iterate",D(t)?"length":et),Reflect.ownKeys(t)}}class Uo extends Xr{constructor(t=!1){super(!0,t)}set(t,n){return!0}deleteProperty(t,n){return!0}}const Ko=new Zr,Wo=new Uo,qo=new Zr(!0);const Kn=e=>e,qt=e=>Reflect.getPrototypeOf(e);function zo(e,t,n){return function(...s){const r=this.__v_raw,i=N(r),o=vt(i),a=e==="entries"||e===Symbol.iterator&&o,l=e==="keys"&&o,u=r[e](...s),d=n?Kn:t?Wn:te;return!t&&Y(i,"iterate",l?Un:et),{next(){const{value:p,done:S}=u.next();return S?{value:p,done:S}:{value:a?[d(p[0]),d(p[1])]:d(p),done:S}},[Symbol.iterator](){return this}}}}function zt(e){return function(...t){return e==="delete"?!1:e==="clear"?void 0:this}}function Go(e,t){const n={get(r){const i=this.__v_raw,o=N(i),a=N(r);e||(He(r,a)&&Y(o,"get",r),Y(o,"get",a));const{has:l}=qt(o),u=t?Kn:e?Wn:te;if(l.call(o,r))return u(i.get(r));if(l.call(o,a))return u(i.get(a));i!==o&&i.get(r)},get size(){const r=this.__v_raw;return!e&&Y(N(r),"iterate",et),r.size},has(r){const i=this.__v_raw,o=N(i),a=N(r);return e||(He(r,a)&&Y(o,"has",r),Y(o,"has",a)),r===a?i.has(r):i.has(r)||i.has(a)},forEach(r,i){const o=this,a=o.__v_raw,l=N(a),u=t?Kn:e?Wn:te;return!e&&Y(l,"iterate",et),a.forEach((d,p)=>r.call(i,u(d),u(p),o))}};return re(n,e?{add:zt("add"),set:zt("set"),delete:zt("delete"),clear:zt("clear")}:{add(r){!t&&!de(r)&&!tt(r)&&(r=N(r));const i=N(this);return qt(i).has.call(i,r)||(i.add(r),xe(i,"add",r,r)),this},set(r,i){!t&&!de(i)&&!tt(i)&&(i=N(i));const o=N(this),{has:a,get:l}=qt(o);let u=a.call(o,r);u||(r=N(r),u=a.call(o,r));const d=l.call(o,r);return o.set(r,i),u?He(i,d)&&xe(o,"set",r,i):xe(o,"add",r,i),this},delete(r){const i=N(this),{has:o,get:a}=qt(i);let l=o.call(i,r);l||(r=N(r),l=o.call(i,r)),a&&a.call(i,r);const u=i.delete(r);return l&&xe(i,"delete",r,void 0),u},clear(){const r=N(this),i=r.size!==0,o=r.clear();return i&&xe(r,"clear",void 0,void 0),o}}),["keys","values","entries",Symbol.iterator].forEach(r=>{n[r]=zo(r,e,t)}),n}function bs(e,t){const n=Go(e,t);return(s,r,i)=>r==="__v_isReactive"?!e:r==="__v_isReadonly"?e:r==="__v_raw"?s:Reflect.get(F(n,r)&&r in s?n:s,r,i)}const Jo={get:bs(!1,!1)},Yo={get:bs(!1,!0)},Xo={get:bs(!0,!1)};const Qr=new WeakMap,ei=new WeakMap,ti=new WeakMap,Zo=new WeakMap;function Qo(e){switch(e){case"Object":case"Array":return 1;case"Map":case"Set":case"WeakMap":case"WeakSet":return 2;default:return 0}}function ea(e){return e.__v_skip||!Object.isExtensible(e)?0:Qo(Io(e))}function _s(e){return tt(e)?e:ys(e,!1,Ko,Jo,Qr)}function ta(e){return ys(e,!1,qo,Yo,ei)}function ni(e){return ys(e,!0,Wo,Xo,ti)}function ys(e,t,n,s,r){if(!q(e)||e.__v_raw&&!(t&&e.__v_isReactive))return e;const i=ea(e);if(i===0)return e;const o=r.get(e);if(o)return o;const a=new Proxy(e,i===2?s:n);return r.set(e,a),a}function Tt(e){return tt(e)?Tt(e.__v_raw):!!(e&&e.__v_isReactive)}function tt(e){return!!(e&&e.__v_isReadonly)}function de(e){return!!(e&&e.__v_isShallow)}function ws(e){return e?!!e.__v_raw:!1}function N(e){const t=e&&e.__v_raw;return t?N(t):e}function na(e){return!F(e,"__v_skip")&&Object.isExtensible(e)&&Hr(e,"__v_skip",!0),e}const te=e=>q(e)?_s(e):e,Wn=e=>q(e)?ni(e):e;function X(e){return e?e.__v_isRef===!0:!1}function sa(e){return ra(e,!1)}function ra(e,t){return X(e)?e:new ia(e,t)}class ia{constructor(t,n){this.dep=new gs,this.__v_isRef=!0,this.__v_isShallow=!1,this._rawValue=n?t:N(t),this._value=n?t:te(t),this.__v_isShallow=n}get value(){return this.dep.track(),this._value}set value(t){const n=this._rawValue,s=this.__v_isShallow||de(t)||tt(t);t=s?t:N(t),He(t,n)&&(this._rawValue=t,this._value=s?t:te(t),this.dep.trigger())}}function oa(e){return X(e)?e.value:e}const aa={get:(e,t,n)=>t==="__v_raw"?e:oa(Reflect.get(e,t,n)),set:(e,t,n,s)=>{const r=e[t];return X(r)&&!X(n)?(r.value=n,!0):Reflect.set(e,t,n,s)}};function si(e){return Tt(e)?e:new Proxy(e,aa)}class ca{constructor(t,n,s){this.fn=t,this.setter=n,this._value=void 0,this.dep=new gs(this),this.__v_isRef=!0,this.deps=void 0,this.depsTail=void 0,this.flags=16,this.globalVersion=Mt-1,this.next=void 0,this.effect=this,this.__v_isReadonly=!n,this.isSSR=s}notify(){if(this.flags|=16,!(this.flags&8)&&H!==this)return Kr(this,!0),!0}get value(){const t=this.dep.track();return zr(this),t&&(t.version=this.dep.version),this._value}set value(t){this.setter&&this.setter(t)}}function la(e,t,n=!1){let s,r;return O(e)?s=e:(s=e.get,r=e.set),new ca(s,r,n)}const Gt={},Zt=new WeakMap;let Xe;function fa(e,t=!1,n=Xe){if(n){let s=Zt.get(n);s||Zt.set(n,s=[]),s.push(e)}}function ua(e,t,n=j){const{immediate:s,deep:r,once:i,scheduler:o,augmentJob:a,call:l}=n,u=C=>r?C:de(C)||r===!1||r===0?Le(C,1):Le(C);let d,p,S,I,M=!1,R=!1;if(X(e)?(p=()=>e.value,M=de(e)):Tt(e)?(p=()=>u(e),M=!0):D(e)?(R=!0,M=e.some(C=>Tt(C)||de(C)),p=()=>e.map(C=>{if(X(C))return C.value;if(Tt(C))return u(C);if(O(C))return l?l(C,2):C()})):O(e)?t?p=l?()=>l(e,2):e:p=()=>{if(S){Me();try{S()}finally{Pe()}}const C=Xe;Xe=d;try{return l?l(e,3,[I]):e(I)}finally{Xe=C}}:p=Se,t&&r){const C=p,z=r===!0?1/0:r;p=()=>Le(C(),z)}const J=$o(),B=()=>{d.stop(),J&&J.active&&cs(J.effects,d)};if(i&&t){const C=t;t=(...z)=>{C(...z),B()}}let V=R?new Array(e.length).fill(Gt):Gt;const W=C=>{if(!(!(d.flags&1)||!d.dirty&&!C))if(t){const z=d.run();if(r||M||(R?z.some((Fe,he)=>He(Fe,V[he])):He(z,V))){S&&S();const Fe=Xe;Xe=d;try{const he=[z,V===Gt?void 0:R&&V[0]===Gt?[]:V,I];V=z,l?l(t,3,he):t(...he)}finally{Xe=Fe}}}else d.run()};return a&&a(W),d=new Vr(p),d.scheduler=o?()=>o(W,!1):W,I=C=>fa(C,!1,d),S=d.onStop=()=>{const C=Zt.get(d);if(C){if(l)l(C,4);else for(const z of C)z();Zt.delete(d)}},t?s?W(!0):V=d.run():o?o(W.bind(null,!0),!0):d.run(),B.pause=d.pause.bind(d),B.resume=d.resume.bind(d),B.stop=B,B}function Le(e,t=1/0,n){if(t<=0||!q(e)||e.__v_skip||(n=n||new Set,n.has(e)))return e;if(n.add(e),t--,X(e))Le(e.value,t,n);else if(D(e))for(let s=0;s<e.length;s++)Le(e[s],t,n);else if(So(e)||vt(e))e.forEach(s=>{Le(s,t,n)});else if(To(e)){for(const s in e)Le(e[s],t,n);for(const s of Object.getOwnPropertySymbols(e))Object.prototype.propertyIsEnumerable.call(e,s)&&Le(e[s],t,n)}return e}/**
* @vue/runtime-core v3.5.20
* (c) 2018-present Yuxi (Evan) You and Vue contributors
* @license MIT
**/function Lt(e,t,n,s){try{return s?e(...s):e()}catch(r){fn(r,t,n)}}function Ee(e,t,n,s){if(O(e)){const r=Lt(e,t,n,s);return r&&kr(r)&&r.catch(i=>{fn(i,t,n)}),r}if(D(e)){const r=[];for(let i=0;i<e.length;i++)r.push(Ee(e[i],t,n,s));return r}}function fn(e,t,n,s=!0){const r=t?t.vnode:null,{errorHandler:i,throwUnhandledErrorInProduction:o}=t&&t.appContext.config||j;if(t){let a=t.parent;const l=t.proxy,u=`https://vuejs.org/error-reference/#runtime-${n}`;for(;a;){const d=a.ec;if(d){for(let p=0;p<d.length;p++)if(d[p](e,l,u)===!1)return}a=a.parent}if(i){Me(),Lt(i,null,10,[e,l,u]),Pe();return}}da(e,n,r,s,o)}function da(e,t,n,s=!0,r=!1){if(r)throw e;console.error(e)}const ne=[];let ye=-1;const lt=[];let Be=null,at=0;const ri=Promise.resolve();let Qt=null;function ha(e){const t=Qt||ri;return e?t.then(this?e.bind(this):e):t}function pa(e){let t=ye+1,n=ne.length;for(;t<n;){const s=t+n>>>1,r=ne[s],i=Rt(r);i<e||i===e&&r.flags&2?t=s+1:n=s}return t}function vs(e){if(!(e.flags&1)){const t=Rt(e),n=ne[ne.length-1];!n||!(e.flags&2)&&t>=Rt(n)?ne.push(e):ne.splice(pa(t),0,e),e.flags|=1,ii()}}function ii(){Qt||(Qt=ri.then(ai))}function ga(e){D(e)?lt.push(...e):Be&&e.id===-1?Be.splice(at+1,0,e):e.flags&1||(lt.push(e),e.flags|=1),ii()}function qs(e,t,n=ye+1){for(;n<ne.length;n++){const s=ne[n];if(s&&s.flags&2){if(e&&s.id!==e.uid)continue;ne.splice(n,1),n--,s.flags&4&&(s.flags&=-2),s(),s.flags&4||(s.flags&=-2)}}}function oi(e){if(lt.length){const t=[...new Set(lt)].sort((n,s)=>Rt(n)-Rt(s));if(lt.length=0,Be){Be.push(...t);return}for(Be=t,at=0;at<Be.length;at++){const n=Be[at];n.flags&4&&(n.flags&=-2),n.flags&8||n(),n.flags&=-2}Be=null,at=0}}const Rt=e=>e.id==null?e.flags&2?-1:1/0:e.id;function ai(e){try{for(ye=0;ye<ne.length;ye++){const t=ne[ye];t&&!(t.flags&8)&&(t.flags&4&&(t.flags&=-2),Lt(t,t.i,t.i?15:14),t.flags&4||(t.flags&=-2))}}finally{for(;ye<ne.length;ye++){const t=ne[ye];t&&(t.flags&=-2)}ye=-1,ne.length=0,oi(),Qt=null,(ne.length||lt.length)&&ai()}}let ve=null,ci=null;function en(e){const t=ve;return ve=e,ci=e&&e.type.__scopeId||null,t}function ma(e,t=ve,n){if(!t||e._n)return e;const s=(...r)=>{s._d&&tr(-1);const i=en(t);let o;try{o=e(...r)}finally{en(i),s._d&&tr(1)}return o};return s._n=!0,s._c=!0,s._d=!0,s}function Je(e,t,n,s){const r=e.dirs,i=t&&t.dirs;for(let o=0;o<r.length;o++){const a=r[o];i&&(a.oldValue=i[o].value);let l=a.dir[s];l&&(Me(),Ee(l,n,8,[e.el,a,e,t]),Pe())}}const ba=Symbol("_vte"),_a=e=>e.__isTeleport,ya=Symbol("_leaveCb");function Ss(e,t){e.shapeFlag&6&&e.component?(e.transition=t,Ss(e.component.subTree,t)):e.shapeFlag&128?(e.ssContent.transition=t.clone(e.ssContent),e.ssFallback.transition=t.clone(e.ssFallback)):e.transition=t}function li(e){e.ids=[e.ids[0]+e.ids[2]+++"-",0,0]}function At(e,t,n,s,r=!1){if(D(e)){e.forEach((M,R)=>At(M,t&&(D(t)?t[R]:t),n,s,r));return}if(Ct(s)&&!r){s.shapeFlag&512&&s.type.__asyncResolved&&s.component.subTree.component&&At(e,t,n,s.component.subTree);return}const i=s.shapeFlag&4?As(s.component):s.el,o=r?null:i,{i:a,r:l}=e,u=t&&t.r,d=a.refs===j?a.refs={}:a.refs,p=a.setupState,S=N(p),I=p===j?Br:M=>F(S,M);if(u!=null&&u!==l){if(G(u))d[u]=null,I(u)&&(p[u]=null);else if(X(u)){u.value=null;const M=t;M.k&&(d[M.k]=null)}}if(O(l))Lt(l,a,12,[o,d]);else{const M=G(l),R=X(l);if(M||R){const J=()=>{if(e.f){const B=M?I(l)?p[l]:d[l]:l.value;if(r)D(B)&&cs(B,i);else if(D(B))B.includes(i)||B.push(i);else if(M)d[l]=[i],I(l)&&(p[l]=d[l]);else{const V=[i];l.value=V,e.k&&(d[e.k]=V)}}else M?(d[l]=o,I(l)&&(p[l]=o)):R&&(l.value=o,e.k&&(d[e.k]=o))};o?(J.id=-1,le(J,n)):J()}}}ln().requestIdleCallback;ln().cancelIdleCallback;const Ct=e=>!!e.type.__asyncLoader,fi=e=>e.type.__isKeepAlive;function wa(e,t){ui(e,"a",t)}function va(e,t){ui(e,"da",t)}function ui(e,t,n=se){const s=e.__wdc||(e.__wdc=()=>{let r=n;for(;r;){if(r.isDeactivated)return;r=r.parent}return e()});if(un(t,s,n),n){let r=n.parent;for(;r&&r.parent;)fi(r.parent.vnode)&&Sa(s,t,n,r),r=r.parent}}function Sa(e,t,n,s){const r=un(t,e,s,!0);hi(()=>{cs(s[t],r)},n)}function un(e,t,n=se,s=!1){if(n){const r=n[e]||(n[e]=[]),i=t.__weh||(t.__weh=(...o)=>{Me();const a=Ht(n),l=Ee(t,n,e,o);return a(),Pe(),l});return s?r.unshift(i):r.push(i),i}}const Ne=e=>(t,n=se)=>{(!Ft||e==="sp")&&un(e,(...s)=>t(...s),n)},Ea=Ne("bm"),di=Ne("m"),Ia=Ne("bu"),Ta=Ne("u"),Aa=Ne("bum"),hi=Ne("um"),Ca=Ne("sp"),xa=Ne("rtg"),Da=Ne("rtc");function Oa(e,t=se){un("ec",e,t)}const Ma=Symbol.for("v-ndc"),qn=e=>e?Ni(e)?As(e):qn(e.parent):null,xt=re(Object.create(null),{$:e=>e,$el:e=>e.vnode.el,$data:e=>e.data,$props:e=>e.props,$attrs:e=>e.attrs,$slots:e=>e.slots,$refs:e=>e.refs,$parent:e=>qn(e.parent),$root:e=>qn(e.root),$host:e=>e.ce,$emit:e=>e.emit,$options:e=>gi(e),$forceUpdate:e=>e.f||(e.f=()=>{vs(e.update)}),$nextTick:e=>e.n||(e.n=ha.bind(e.proxy)),$watch:e=>Qa.bind(e)}),Tn=(e,t)=>e!==j&&!e.__isScriptSetup&&F(e,t),Pa={get({_:e},t){if(t==="__v_skip")return!0;const{ctx:n,setupState:s,data:r,props:i,accessCache:o,type:a,appContext:l}=e;let u;if(t[0]!=="$"){const I=o[t];if(I!==void 0)switch(I){case 1:return s[t];case 2:return r[t];case 4:return n[t];case 3:return i[t]}else{if(Tn(s,t))return o[t]=1,s[t];if(r!==j&&F(r,t))return o[t]=2,r[t];if((u=e.propsOptions[0])&&F(u,t))return o[t]=3,i[t];if(n!==j&&F(n,t))return o[t]=4,n[t];zn&&(o[t]=0)}}const d=xt[t];let p,S;if(d)return t==="$attrs"&&Y(e.attrs,"get",""),d(e);if((p=a.__cssModules)&&(p=p[t]))return p;if(n!==j&&F(n,t))return o[t]=4,n[t];if(S=l.config.globalProperties,F(S,t))return S[t]},set({_:e},t,n){const{data:s,setupState:r,ctx:i}=e;return Tn(r,t)?(r[t]=n,!0):s!==j&&F(s,t)?(s[t]=n,!0):F(e.props,t)||t[0]==="$"&&t.slice(1)in e?!1:(i[t]=n,!0)},has({_:{data:e,setupState:t,accessCache:n,ctx:s,appContext:r,propsOptions:i,type:o}},a){let l,u;return!!(n[a]||e!==j&&a[0]!=="$"&&F(e,a)||Tn(t,a)||(l=i[0])&&F(l,a)||F(s,a)||F(xt,a)||F(r.config.globalProperties,a)||(u=o.__cssModules)&&u[a])},defineProperty(e,t,n){return n.get!=null?e._.accessCache[t]=0:F(n,"value")&&this.set(e,t,n.value,null),Reflect.defineProperty(e,t,n)}};function zs(e){return D(e)?e.reduce((t,n)=>(t[n]=null,t),{}):e}let zn=!0;function Ra(e){const t=gi(e),n=e.proxy,s=e.ctx;zn=!1,t.beforeCreate&&Gs(t.beforeCreate,e,"bc");const{data:r,computed:i,methods:o,watch:a,provide:l,inject:u,created:d,beforeMount:p,mounted:S,beforeUpdate:I,updated:M,activated:R,deactivated:J,beforeDestroy:B,beforeUnmount:V,destroyed:W,unmounted:C,render:z,renderTracked:Fe,renderTriggered:he,errorCaptured:$e,serverPrefetch:jt,expose:qe,inheritAttrs:pt,components:Vt,directives:Ut,filters:_n}=t;if(u&&Na(u,s,null),o)for(const K in o){const k=o[K];O(k)&&(s[K]=k.bind(n))}if(r){const K=r.call(n,n);q(K)&&(e.data=_s(K))}if(zn=!0,i)for(const K in i){const k=i[K],ze=O(k)?k.bind(n,n):O(k.get)?k.get.bind(n,n):Se,Kt=!O(k)&&O(k.set)?k.set.bind(n):Se,Ge=Ec({get:ze,set:Kt});Object.defineProperty(s,K,{enumerable:!0,configurable:!0,get:()=>Ge.value,set:pe=>Ge.value=pe})}if(a)for(const K in a)pi(a[K],s,n,K);if(l){const K=O(l)?l.call(n):l;Reflect.ownKeys(K).forEach(k=>{Ha(k,K[k])})}d&&Gs(d,e,"c");function Q(K,k){D(k)?k.forEach(ze=>K(ze.bind(n))):k&&K(k.bind(n))}if(Q(Ea,p),Q(di,S),Q(Ia,I),Q(Ta,M),Q(wa,R),Q(va,J),Q(Oa,$e),Q(Da,Fe),Q(xa,he),Q(Aa,V),Q(hi,C),Q(Ca,jt),D(qe))if(qe.length){const K=e.exposed||(e.exposed={});qe.forEach(k=>{Object.defineProperty(K,k,{get:()=>n[k],set:ze=>n[k]=ze,enumerable:!0})})}else e.exposed||(e.exposed={});z&&e.render===Se&&(e.render=z),pt!=null&&(e.inheritAttrs=pt),Vt&&(e.components=Vt),Ut&&(e.directives=Ut),jt&&li(e)}function Na(e,t,n=Se){D(e)&&(e=Gn(e));for(const s in e){const r=e[s];let i;q(r)?"default"in r?i=Jt(r.from||s,r.default,!0):i=Jt(r.from||s):i=Jt(r),X(i)?Object.defineProperty(t,s,{enumerable:!0,configurable:!0,get:()=>i.value,set:o=>i.value=o}):t[s]=i}}function Gs(e,t,n){Ee(D(e)?e.map(s=>s.bind(t.proxy)):e.bind(t.proxy),t,n)}function pi(e,t,n,s){let r=s.includes(".")?xi(n,s):()=>n[s];if(G(e)){const i=t[e];O(i)&&Cn(r,i)}else if(O(e))Cn(r,e.bind(n));else if(q(e))if(D(e))e.forEach(i=>pi(i,t,n,s));else{const i=O(e.handler)?e.handler.bind(n):t[e.handler];O(i)&&Cn(r,i,e)}}function gi(e){const t=e.type,{mixins:n,extends:s}=t,{mixins:r,optionsCache:i,config:{optionMergeStrategies:o}}=e.appContext,a=i.get(t);let l;return a?l=a:!r.length&&!n&&!s?l=t:(l={},r.length&&r.forEach(u=>tn(l,u,o,!0)),tn(l,t,o)),q(t)&&i.set(t,l),l}function tn(e,t,n,s=!1){const{mixins:r,extends:i}=t;i&&tn(e,i,n,!0),r&&r.forEach(o=>tn(e,o,n,!0));for(const o in t)if(!(s&&o==="expose")){const a=Fa[o]||n&&n[o];e[o]=a?a(e[o],t[o]):t[o]}return e}const Fa={data:Js,props:Ys,emits:Ys,methods:wt,computed:wt,beforeCreate:ee,created:ee,beforeMount:ee,mounted:ee,beforeUpdate:ee,updated:ee,beforeDestroy:ee,beforeUnmount:ee,destroyed:ee,unmounted:ee,activated:ee,deactivated:ee,errorCaptured:ee,serverPrefetch:ee,components:wt,directives:wt,watch:Ba,provide:Js,inject:$a};function Js(e,t){return t?e?function(){return re(O(e)?e.call(this,this):e,O(t)?t.call(this,this):t)}:t:e}function $a(e,t){return wt(Gn(e),Gn(t))}function Gn(e){if(D(e)){const t={};for(let n=0;n<e.length;n++)t[e[n]]=e[n];return t}return e}function ee(e,t){return e?[...new Set([].concat(e,t))]:t}function wt(e,t){return e?re(Object.create(null),e,t):t}function Ys(e,t){return e?D(e)&&D(t)?[...new Set([...e,...t])]:re(Object.create(null),zs(e),zs(t??{})):t}function Ba(e,t){if(!e)return t;if(!t)return e;const n=re(Object.create(null),e);for(const s in t)n[s]=ee(e[s],t[s]);return n}function mi(){return{app:null,config:{isNativeTag:Br,performance:!1,globalProperties:{},optionMergeStrategies:{},errorHandler:void 0,warnHandler:void 0,compilerOptions:{}},mixins:[],components:{},directives:{},provides:Object.create(null),optionsCache:new WeakMap,propsCache:new WeakMap,emitsCache:new WeakMap}}let ka=0;function La(e,t){return function(s,r=null){O(s)||(s=re({},s)),r!=null&&!q(r)&&(r=null);const i=mi(),o=new WeakSet,a=[];let l=!1;const u=i.app={_uid:ka++,_component:s,_props:r,_container:null,_context:i,_instance:null,version:Ic,get config(){return i.config},set config(d){},use(d,...p){return o.has(d)||(d&&O(d.install)?(o.add(d),d.install(u,...p)):O(d)&&(o.add(d),d(u,...p))),u},mixin(d){return i.mixins.includes(d)||i.mixins.push(d),u},component(d,p){return p?(i.components[d]=p,u):i.components[d]},directive(d,p){return p?(i.directives[d]=p,u):i.directives[d]},mount(d,p,S){if(!l){const I=u._ceVNode||De(s,r);return I.appContext=i,S===!0?S="svg":S===!1&&(S=void 0),e(I,d,S),l=!0,u._container=d,d.__vue_app__=u,As(I.component)}},onUnmount(d){a.push(d)},unmount(){l&&(Ee(a,u._instance,16),e(null,u._container),delete u._container.__vue_app__)},provide(d,p){return i.provides[d]=p,u},runWithContext(d){const p=ft;ft=u;try{return d()}finally{ft=p}}};return u}}let ft=null;function Ha(e,t){if(se){let n=se.provides;const s=se.parent&&se.parent.provides;s===n&&(n=se.provides=Object.create(s)),n[e]=t}}function Jt(e,t,n=!1){const s=bc();if(s||ft){let r=ft?ft._context.provides:s?s.parent==null||s.ce?s.vnode.appContext&&s.vnode.appContext.provides:s.parent.provides:void 0;if(r&&e in r)return r[e];if(arguments.length>1)return n&&O(t)?t.call(s&&s.proxy):t}}const bi={},_i=()=>Object.create(bi),yi=e=>Object.getPrototypeOf(e)===bi;function ja(e,t,n,s=!1){const r={},i=_i();e.propsDefaults=Object.create(null),wi(e,t,r,i);for(const o in e.propsOptions[0])o in r||(r[o]=void 0);n?e.props=s?r:ta(r):e.type.props?e.props=r:e.props=i,e.attrs=i}function Va(e,t,n,s){const{props:r,attrs:i,vnode:{patchFlag:o}}=e,a=N(r),[l]=e.propsOptions;let u=!1;if((s||o>0)&&!(o&16)){if(o&8){const d=e.vnode.dynamicProps;for(let p=0;p<d.length;p++){let S=d[p];if(dn(e.emitsOptions,S))continue;const I=t[S];if(l)if(F(i,S))I!==i[S]&&(i[S]=I,u=!0);else{const M=Ue(S);r[M]=Jn(l,a,M,I,e,!1)}else I!==i[S]&&(i[S]=I,u=!0)}}}else{wi(e,t,r,i)&&(u=!0);let d;for(const p in a)(!t||!F(t,p)&&((d=it(p))===p||!F(t,d)))&&(l?n&&(n[p]!==void 0||n[d]!==void 0)&&(r[p]=Jn(l,a,p,void 0,e,!0)):delete r[p]);if(i!==a)for(const p in i)(!t||!F(t,p))&&(delete i[p],u=!0)}u&&xe(e.attrs,"set","")}function wi(e,t,n,s){const[r,i]=e.propsOptions;let o=!1,a;if(t)for(let l in t){if(St(l))continue;const u=t[l];let d;r&&F(r,d=Ue(l))?!i||!i.includes(d)?n[d]=u:(a||(a={}))[d]=u:dn(e.emitsOptions,l)||(!(l in s)||u!==s[l])&&(s[l]=u,o=!0)}if(i){const l=N(n),u=a||j;for(let d=0;d<i.length;d++){const p=i[d];n[p]=Jn(r,l,p,u[p],e,!F(u,p))}}return o}function Jn(e,t,n,s,r,i){const o=e[n];if(o!=null){const a=F(o,"default");if(a&&s===void 0){const l=o.default;if(o.type!==Function&&!o.skipFactory&&O(l)){const{propsDefaults:u}=r;if(n in u)s=u[n];else{const d=Ht(r);s=u[n]=l.call(null,t),d()}}else s=l;r.ce&&r.ce._setProp(n,s)}o[0]&&(i&&!a?s=!1:o[1]&&(s===""||s===it(n))&&(s=!0))}return s}const Ua=new WeakMap;function vi(e,t,n=!1){const s=n?Ua:t.propsCache,r=s.get(e);if(r)return r;const i=e.props,o={},a=[];let l=!1;if(!O(e)){const d=p=>{l=!0;const[S,I]=vi(p,t,!0);re(o,S),I&&a.push(...I)};!n&&t.mixins.length&&t.mixins.forEach(d),e.extends&&d(e.extends),e.mixins&&e.mixins.forEach(d)}if(!i&&!l)return q(e)&&s.set(e,ct),ct;if(D(i))for(let d=0;d<i.length;d++){const p=Ue(i[d]);Xs(p)&&(o[p]=j)}else if(i)for(const d in i){const p=Ue(d);if(Xs(p)){const S=i[d],I=o[p]=D(S)||O(S)?{type:S}:re({},S),M=I.type;let R=!1,J=!0;if(D(M))for(let B=0;B<M.length;++B){const V=M[B],W=O(V)&&V.name;if(W==="Boolean"){R=!0;break}else W==="String"&&(J=!1)}else R=O(M)&&M.name==="Boolean";I[0]=R,I[1]=J,(R||F(I,"default"))&&a.push(p)}}const u=[o,a];return q(e)&&s.set(e,u),u}function Xs(e){return e[0]!=="$"&&!St(e)}const Es=e=>e==="_"||e==="_ctx"||e==="$stable",Is=e=>D(e)?e.map(we):[we(e)],Ka=(e,t,n)=>{if(t._n)return t;const s=ma((...r)=>Is(t(...r)),n);return s._c=!1,s},Si=(e,t,n)=>{const s=e._ctx;for(const r in e){if(Es(r))continue;const i=e[r];if(O(i))t[r]=Ka(r,i,s);else if(i!=null){const o=Is(i);t[r]=()=>o}}},Ei=(e,t)=>{const n=Is(t);e.slots.default=()=>n},Ii=(e,t,n)=>{for(const s in t)(n||!Es(s))&&(e[s]=t[s])},Wa=(e,t,n)=>{const s=e.slots=_i();if(e.vnode.shapeFlag&32){const r=t._;r?(Ii(s,t,n),n&&Hr(s,"_",r,!0)):Si(t,s)}else t&&Ei(e,t)},qa=(e,t,n)=>{const{vnode:s,slots:r}=e;let i=!0,o=j;if(s.shapeFlag&32){const a=t._;a?n&&a===1?i=!1:Ii(r,t,n):(i=!t.$stable,Si(t,r)),o=t}else t&&(Ei(e,t),o={default:1});if(i)for(const a in r)!Es(a)&&o[a]==null&&delete r[a]},le=oc;function za(e){return Ga(e)}function Ga(e,t){const n=ln();n.__VUE__=!0;const{insert:s,remove:r,patchProp:i,createElement:o,createText:a,createComment:l,setText:u,setElementText:d,parentNode:p,nextSibling:S,setScopeId:I=Se,insertStaticContent:M}=e,R=(c,f,h,b=null,g=null,m=null,v=void 0,w=null,y=!!f.dynamicChildren)=>{if(c===f)return;c&&!yt(c,f)&&(b=Wt(c),pe(c,g,m,!0),c=null),f.patchFlag===-2&&(y=!1,f.dynamicChildren=null);const{type:_,ref:A,shapeFlag:E}=f;switch(_){case hn:J(c,f,h,b);break;case Ke:B(c,f,h,b);break;case xn:c==null&&V(f,h,b,v);break;case Ce:Vt(c,f,h,b,g,m,v,w,y);break;default:E&1?z(c,f,h,b,g,m,v,w,y):E&6?Ut(c,f,h,b,g,m,v,w,y):(E&64||E&128)&&_.process(c,f,h,b,g,m,v,w,y,mt)}A!=null&&g?At(A,c&&c.ref,m,f||c,!f):A==null&&c&&c.ref!=null&&At(c.ref,null,m,c,!0)},J=(c,f,h,b)=>{if(c==null)s(f.el=a(f.children),h,b);else{const g=f.el=c.el;f.children!==c.children&&u(g,f.children)}},B=(c,f,h,b)=>{c==null?s(f.el=l(f.children||""),h,b):f.el=c.el},V=(c,f,h,b)=>{[c.el,c.anchor]=M(c.children,f,h,b,c.el,c.anchor)},W=({el:c,anchor:f},h,b)=>{let g;for(;c&&c!==f;)g=S(c),s(c,h,b),c=g;s(f,h,b)},C=({el:c,anchor:f})=>{let h;for(;c&&c!==f;)h=S(c),r(c),c=h;r(f)},z=(c,f,h,b,g,m,v,w,y)=>{f.type==="svg"?v="svg":f.type==="math"&&(v="mathml"),c==null?Fe(f,h,b,g,m,v,w,y):jt(c,f,g,m,v,w,y)},Fe=(c,f,h,b,g,m,v,w)=>{let y,_;const{props:A,shapeFlag:E,transition:T,dirs:x}=c;if(y=c.el=o(c.type,m,A&&A.is,A),E&8?d(y,c.children):E&16&&$e(c.children,y,null,b,g,An(c,m),v,w),x&&Je(c,null,b,"created"),he(y,c,c.scopeId,v,b),A){for(const L in A)L!=="value"&&!St(L)&&i(y,L,null,A[L],m,b);"value"in A&&i(y,"value",null,A.value,m),(_=A.onVnodeBeforeMount)&&_e(_,b,c)}x&&Je(c,null,b,"beforeMount");const P=Ja(g,T);P&&T.beforeEnter(y),s(y,f,h),((_=A&&A.onVnodeMounted)||P||x)&&le(()=>{_&&_e(_,b,c),P&&T.enter(y),x&&Je(c,null,b,"mounted")},g)},he=(c,f,h,b,g)=>{if(h&&I(c,h),b)for(let m=0;m<b.length;m++)I(c,b[m]);if(g){let m=g.subTree;if(f===m||Oi(m.type)&&(m.ssContent===f||m.ssFallback===f)){const v=g.vnode;he(c,v,v.scopeId,v.slotScopeIds,g.parent)}}},$e=(c,f,h,b,g,m,v,w,y=0)=>{for(let _=y;_<c.length;_++){const A=c[_]=w?ke(c[_]):we(c[_]);R(null,A,f,h,b,g,m,v,w)}},jt=(c,f,h,b,g,m,v)=>{const w=f.el=c.el;let{patchFlag:y,dynamicChildren:_,dirs:A}=f;y|=c.patchFlag&16;const E=c.props||j,T=f.props||j;let x;if(h&&Ye(h,!1),(x=T.onVnodeBeforeUpdate)&&_e(x,h,f,c),A&&Je(f,c,h,"beforeUpdate"),h&&Ye(h,!0),(E.innerHTML&&T.innerHTML==null||E.textContent&&T.textContent==null)&&d(w,""),_?qe(c.dynamicChildren,_,w,h,b,An(f,g),m):v||k(c,f,w,null,h,b,An(f,g),m,!1),y>0){if(y&16)pt(w,E,T,h,g);else if(y&2&&E.class!==T.class&&i(w,"class",null,T.class,g),y&4&&i(w,"style",E.style,T.style,g),y&8){const P=f.dynamicProps;for(let L=0;L<P.length;L++){const $=P[L],ie=E[$],oe=T[$];(oe!==ie||$==="value")&&i(w,$,ie,oe,g,h)}}y&1&&c.children!==f.children&&d(w,f.children)}else!v&&_==null&&pt(w,E,T,h,g);((x=T.onVnodeUpdated)||A)&&le(()=>{x&&_e(x,h,f,c),A&&Je(f,c,h,"updated")},b)},qe=(c,f,h,b,g,m,v)=>{for(let w=0;w<f.length;w++){const y=c[w],_=f[w],A=y.el&&(y.type===Ce||!yt(y,_)||y.shapeFlag&198)?p(y.el):h;R(y,_,A,null,b,g,m,v,!0)}},pt=(c,f,h,b,g)=>{if(f!==h){if(f!==j)for(const m in f)!St(m)&&!(m in h)&&i(c,m,f[m],null,g,b);for(const m in h){if(St(m))continue;const v=h[m],w=f[m];v!==w&&m!=="value"&&i(c,m,w,v,g,b)}"value"in h&&i(c,"value",f.value,h.value,g)}},Vt=(c,f,h,b,g,m,v,w,y)=>{const _=f.el=c?c.el:a(""),A=f.anchor=c?c.anchor:a("");let{patchFlag:E,dynamicChildren:T,slotScopeIds:x}=f;x&&(w=w?w.concat(x):x),c==null?(s(_,h,b),s(A,h,b),$e(f.children||[],h,A,g,m,v,w,y)):E>0&&E&64&&T&&c.dynamicChildren?(qe(c.dynamicChildren,T,h,g,m,v,w),(f.key!=null||g&&f===g.subTree)&&Ti(c,f,!0)):k(c,f,h,A,g,m,v,w,y)},Ut=(c,f,h,b,g,m,v,w,y)=>{f.slotScopeIds=w,c==null?f.shapeFlag&512?g.ctx.activate(f,h,b,v,y):_n(f,h,b,g,m,v,y):Bs(c,f,y)},_n=(c,f,h,b,g,m,v)=>{const w=c.component=mc(c,b,g);if(fi(c)&&(w.ctx.renderer=mt),_c(w,!1,v),w.asyncDep){if(g&&g.registerDep(w,Q,v),!c.el){const y=w.subTree=De(Ke);B(null,y,f,h),c.placeholder=y.el}}else Q(w,c,f,h,g,m,v)},Bs=(c,f,h)=>{const b=f.component=c.component;if(rc(c,f,h))if(b.asyncDep&&!b.asyncResolved){K(b,f,h);return}else b.next=f,b.update();else f.el=c.el,b.vnode=f},Q=(c,f,h,b,g,m,v)=>{const w=()=>{if(c.isMounted){let{next:E,bu:T,u:x,parent:P,vnode:L}=c;{const me=Ai(c);if(me){E&&(E.el=L.el,K(c,E,v)),me.asyncDep.then(()=>{c.isUnmounted||w()});return}}let $=E,ie;Ye(c,!1),E?(E.el=L.el,K(c,E,v)):E=L,T&&vn(T),(ie=E.props&&E.props.onVnodeBeforeUpdate)&&_e(ie,P,E,L),Ye(c,!0);const oe=Qs(c),ge=c.subTree;c.subTree=oe,R(ge,oe,p(ge.el),Wt(ge),c,g,m),E.el=oe.el,$===null&&ic(c,oe.el),x&&le(x,g),(ie=E.props&&E.props.onVnodeUpdated)&&le(()=>_e(ie,P,E,L),g)}else{let E;const{el:T,props:x}=f,{bm:P,m:L,parent:$,root:ie,type:oe}=c,ge=Ct(f);Ye(c,!1),P&&vn(P),!ge&&(E=x&&x.onVnodeBeforeMount)&&_e(E,$,f),Ye(c,!0);{ie.ce&&ie.ce._def.shadowRoot!==!1&&ie.ce._injectChildStyle(oe);const me=c.subTree=Qs(c);R(null,me,h,b,c,g,m),f.el=me.el}if(L&&le(L,g),!ge&&(E=x&&x.onVnodeMounted)){const me=f;le(()=>_e(E,$,me),g)}(f.shapeFlag&256||$&&Ct($.vnode)&&$.vnode.shapeFlag&256)&&c.a&&le(c.a,g),c.isMounted=!0,f=h=b=null}};c.scope.on();const y=c.effect=new Vr(w);c.scope.off();const _=c.update=y.run.bind(y),A=c.job=y.runIfDirty.bind(y);A.i=c,A.id=c.uid,y.scheduler=()=>vs(A),Ye(c,!0),_()},K=(c,f,h)=>{f.component=c;const b=c.vnode.props;c.vnode=f,c.next=null,Va(c,f.props,b,h),qa(c,f.children,h),Me(),qs(c),Pe()},k=(c,f,h,b,g,m,v,w,y=!1)=>{const _=c&&c.children,A=c?c.shapeFlag:0,E=f.children,{patchFlag:T,shapeFlag:x}=f;if(T>0){if(T&128){Kt(_,E,h,b,g,m,v,w,y);return}else if(T&256){ze(_,E,h,b,g,m,v,w,y);return}}x&8?(A&16&&gt(_,g,m),E!==_&&d(h,E)):A&16?x&16?Kt(_,E,h,b,g,m,v,w,y):gt(_,g,m,!0):(A&8&&d(h,""),x&16&&$e(E,h,b,g,m,v,w,y))},ze=(c,f,h,b,g,m,v,w,y)=>{c=c||ct,f=f||ct;const _=c.length,A=f.length,E=Math.min(_,A);let T;for(T=0;T<E;T++){const x=f[T]=y?ke(f[T]):we(f[T]);R(c[T],x,h,null,g,m,v,w,y)}_>A?gt(c,g,m,!0,!1,E):$e(f,h,b,g,m,v,w,y,E)},Kt=(c,f,h,b,g,m,v,w,y)=>{let _=0;const A=f.length;let E=c.length-1,T=A-1;for(;_<=E&&_<=T;){const x=c[_],P=f[_]=y?ke(f[_]):we(f[_]);if(yt(x,P))R(x,P,h,null,g,m,v,w,y);else break;_++}for(;_<=E&&_<=T;){const x=c[E],P=f[T]=y?ke(f[T]):we(f[T]);if(yt(x,P))R(x,P,h,null,g,m,v,w,y);else break;E--,T--}if(_>E){if(_<=T){const x=T+1,P=x<A?f[x].el:b;for(;_<=T;)R(null,f[_]=y?ke(f[_]):we(f[_]),h,P,g,m,v,w,y),_++}}else if(_>T)for(;_<=E;)pe(c[_],g,m,!0),_++;else{const x=_,P=_,L=new Map;for(_=P;_<=T;_++){const ce=f[_]=y?ke(f[_]):we(f[_]);ce.key!=null&&L.set(ce.key,_)}let $,ie=0;const oe=T-P+1;let ge=!1,me=0;const bt=new Array(oe);for(_=0;_<oe;_++)bt[_]=0;for(_=x;_<=E;_++){const ce=c[_];if(ie>=oe){pe(ce,g,m,!0);continue}let be;if(ce.key!=null)be=L.get(ce.key);else for($=P;$<=T;$++)if(bt[$-P]===0&&yt(ce,f[$])){be=$;break}be===void 0?pe(ce,g,m,!0):(bt[be-P]=_+1,be>=me?me=be:ge=!0,R(ce,f[be],h,null,g,m,v,w,y),ie++)}const Hs=ge?Ya(bt):ct;for($=Hs.length-1,_=oe-1;_>=0;_--){const ce=P+_,be=f[ce],js=f[ce+1],Vs=ce+1<A?js.el||js.placeholder:b;bt[_]===0?R(null,be,h,Vs,g,m,v,w,y):ge&&($<0||_!==Hs[$]?Ge(be,h,Vs,2):$--)}}},Ge=(c,f,h,b,g=null)=>{const{el:m,type:v,transition:w,children:y,shapeFlag:_}=c;if(_&6){Ge(c.component.subTree,f,h,b);return}if(_&128){c.suspense.move(f,h,b);return}if(_&64){v.move(c,f,h,mt);return}if(v===Ce){s(m,f,h);for(let E=0;E<y.length;E++)Ge(y[E],f,h,b);s(c.anchor,f,h);return}if(v===xn){W(c,f,h);return}if(b!==2&&_&1&&w)if(b===0)w.beforeEnter(m),s(m,f,h),le(()=>w.enter(m),g);else{const{leave:E,delayLeave:T,afterLeave:x}=w,P=()=>{c.ctx.isUnmounted?r(m):s(m,f,h)},L=()=>{m._isLeaving&&m[ya](!0),E(m,()=>{P(),x&&x()})};T?T(m,P,L):L()}else s(m,f,h)},pe=(c,f,h,b=!1,g=!1)=>{const{type:m,props:v,ref:w,children:y,dynamicChildren:_,shapeFlag:A,patchFlag:E,dirs:T,cacheIndex:x}=c;if(E===-2&&(g=!1),w!=null&&(Me(),At(w,null,h,c,!0),Pe()),x!=null&&(f.renderCache[x]=void 0),A&256){f.ctx.deactivate(c);return}const P=A&1&&T,L=!Ct(c);let $;if(L&&($=v&&v.onVnodeBeforeUnmount)&&_e($,f,c),A&6)wo(c.component,h,b);else{if(A&128){c.suspense.unmount(h,b);return}P&&Je(c,null,f,"beforeUnmount"),A&64?c.type.remove(c,f,h,mt,b):_&&!_.hasOnce&&(m!==Ce||E>0&&E&64)?gt(_,f,h,!1,!0):(m===Ce&&E&384||!g&&A&16)&&gt(y,f,h),b&&ks(c)}(L&&($=v&&v.onVnodeUnmounted)||P)&&le(()=>{$&&_e($,f,c),P&&Je(c,null,f,"unmounted")},h)},ks=c=>{const{type:f,el:h,anchor:b,transition:g}=c;if(f===Ce){yo(h,b);return}if(f===xn){C(c);return}const m=()=>{r(h),g&&!g.persisted&&g.afterLeave&&g.afterLeave()};if(c.shapeFlag&1&&g&&!g.persisted){const{leave:v,delayLeave:w}=g,y=()=>v(h,m);w?w(c.el,m,y):y()}else m()},yo=(c,f)=>{let h;for(;c!==f;)h=S(c),r(c),c=h;r(f)},wo=(c,f,h)=>{const{bum:b,scope:g,job:m,subTree:v,um:w,m:y,a:_}=c;Zs(y),Zs(_),b&&vn(b),g.stop(),m&&(m.flags|=8,pe(v,c,f,h)),w&&le(w,f),le(()=>{c.isUnmounted=!0},f)},gt=(c,f,h,b=!1,g=!1,m=0)=>{for(let v=m;v<c.length;v++)pe(c[v],f,h,b,g)},Wt=c=>{if(c.shapeFlag&6)return Wt(c.component.subTree);if(c.shapeFlag&128)return c.suspense.next();const f=S(c.anchor||c.el),h=f&&f[ba];return h?S(h):f};let yn=!1;const Ls=(c,f,h)=>{c==null?f._vnode&&pe(f._vnode,null,null,!0):R(f._vnode||null,c,f,null,null,null,h),f._vnode=c,yn||(yn=!0,qs(),oi(),yn=!1)},mt={p:R,um:pe,m:Ge,r:ks,mt:_n,mc:$e,pc:k,pbc:qe,n:Wt,o:e};return{render:Ls,hydrate:void 0,createApp:La(Ls)}}function An({type:e,props:t},n){return n==="svg"&&e==="foreignObject"||n==="mathml"&&e==="annotation-xml"&&t&&t.encoding&&t.encoding.includes("html")?void 0:n}function Ye({effect:e,job:t},n){n?(e.flags|=32,t.flags|=4):(e.flags&=-33,t.flags&=-5)}function Ja(e,t){return(!e||e&&!e.pendingBranch)&&t&&!t.persisted}function Ti(e,t,n=!1){const s=e.children,r=t.children;if(D(s)&&D(r))for(let i=0;i<s.length;i++){const o=s[i];let a=r[i];a.shapeFlag&1&&!a.dynamicChildren&&((a.patchFlag<=0||a.patchFlag===32)&&(a=r[i]=ke(r[i]),a.el=o.el),!n&&a.patchFlag!==-2&&Ti(o,a)),a.type===hn&&a.patchFlag!==-1&&(a.el=o.el),a.type===Ke&&!a.el&&(a.el=o.el)}}function Ya(e){const t=e.slice(),n=[0];let s,r,i,o,a;const l=e.length;for(s=0;s<l;s++){const u=e[s];if(u!==0){if(r=n[n.length-1],e[r]<u){t[s]=r,n.push(s);continue}for(i=0,o=n.length-1;i<o;)a=i+o>>1,e[n[a]]<u?i=a+1:o=a;u<e[n[i]]&&(i>0&&(t[s]=n[i-1]),n[i]=s)}}for(i=n.length,o=n[i-1];i-- >0;)n[i]=o,o=t[o];return n}function Ai(e){const t=e.subTree.component;if(t)return t.asyncDep&&!t.asyncResolved?t:Ai(t)}function Zs(e){if(e)for(let t=0;t<e.length;t++)e[t].flags|=8}const Xa=Symbol.for("v-scx"),Za=()=>Jt(Xa);function Cn(e,t,n){return Ci(e,t,n)}function Ci(e,t,n=j){const{immediate:s,deep:r,flush:i,once:o}=n,a=re({},n),l=t&&s||!t&&i!=="post";let u;if(Ft){if(i==="sync"){const I=Za();u=I.__watcherHandles||(I.__watcherHandles=[])}else if(!l){const I=()=>{};return I.stop=Se,I.resume=Se,I.pause=Se,I}}const d=se;a.call=(I,M,R)=>Ee(I,d,M,R);let p=!1;i==="post"?a.scheduler=I=>{le(I,d&&d.suspense)}:i!=="sync"&&(p=!0,a.scheduler=(I,M)=>{M?I():vs(I)}),a.augmentJob=I=>{t&&(I.flags|=4),p&&(I.flags|=2,d&&(I.id=d.uid,I.i=d))};const S=ua(e,t,a);return Ft&&(u?u.push(S):l&&S()),S}function Qa(e,t,n){const s=this.proxy,r=G(e)?e.includes(".")?xi(s,e):()=>s[e]:e.bind(s,s);let i;O(t)?i=t:(i=t.handler,n=t);const o=Ht(this),a=Ci(r,i.bind(s),n);return o(),a}function xi(e,t){const n=t.split(".");return()=>{let s=e;for(let r=0;r<n.length&&s;r++)s=s[n[r]];return s}}const ec=(e,t)=>t==="modelValue"||t==="model-value"?e.modelModifiers:e[`${t}Modifiers`]||e[`${Ue(t)}Modifiers`]||e[`${it(t)}Modifiers`];function tc(e,t,...n){if(e.isUnmounted)return;const s=e.vnode.props||j;let r=n;const i=t.startsWith("update:"),o=i&&ec(s,t.slice(7));o&&(o.trim&&(r=n.map(d=>G(d)?d.trim():d)),o.number&&(r=n.map(xo)));let a,l=s[a=wn(t)]||s[a=wn(Ue(t))];!l&&i&&(l=s[a=wn(it(t))]),l&&Ee(l,e,6,r);const u=s[a+"Once"];if(u){if(!e.emitted)e.emitted={};else if(e.emitted[a])return;e.emitted[a]=!0,Ee(u,e,6,r)}}function Di(e,t,n=!1){const s=t.emitsCache,r=s.get(e);if(r!==void 0)return r;const i=e.emits;let o={},a=!1;if(!O(e)){const l=u=>{const d=Di(u,t,!0);d&&(a=!0,re(o,d))};!n&&t.mixins.length&&t.mixins.forEach(l),e.extends&&l(e.extends),e.mixins&&e.mixins.forEach(l)}return!i&&!a?(q(e)&&s.set(e,null),null):(D(i)?i.forEach(l=>o[l]=null):re(o,i),q(e)&&s.set(e,o),o)}function dn(e,t){return!e||!on(t)?!1:(t=t.slice(2).replace(/Once$/,""),F(e,t[0].toLowerCase()+t.slice(1))||F(e,it(t))||F(e,t))}function Qs(e){const{type:t,vnode:n,proxy:s,withProxy:r,propsOptions:[i],slots:o,attrs:a,emit:l,render:u,renderCache:d,props:p,data:S,setupState:I,ctx:M,inheritAttrs:R}=e,J=en(e);let B,V;try{if(n.shapeFlag&4){const C=r||s,z=C;B=we(u.call(z,C,d,p,I,S,M)),V=a}else{const C=t;B=we(C.length>1?C(p,{attrs:a,slots:o,emit:l}):C(p,null)),V=t.props?a:nc(a)}}catch(C){Dt.length=0,fn(C,e,1),B=De(Ke)}let W=B;if(V&&R!==!1){const C=Object.keys(V),{shapeFlag:z}=W;C.length&&z&7&&(i&&C.some(as)&&(V=sc(V,i)),W=ut(W,V,!1,!0))}return n.dirs&&(W=ut(W,null,!1,!0),W.dirs=W.dirs?W.dirs.concat(n.dirs):n.dirs),n.transition&&Ss(W,n.transition),B=W,en(J),B}const nc=e=>{let t;for(const n in e)(n==="class"||n==="style"||on(n))&&((t||(t={}))[n]=e[n]);return t},sc=(e,t)=>{const n={};for(const s in e)(!as(s)||!(s.slice(9)in t))&&(n[s]=e[s]);return n};function rc(e,t,n){const{props:s,children:r,component:i}=e,{props:o,children:a,patchFlag:l}=t,u=i.emitsOptions;if(t.dirs||t.transition)return!0;if(n&&l>=0){if(l&1024)return!0;if(l&16)return s?er(s,o,u):!!o;if(l&8){const d=t.dynamicProps;for(let p=0;p<d.length;p++){const S=d[p];if(o[S]!==s[S]&&!dn(u,S))return!0}}}else return(r||a)&&(!a||!a.$stable)?!0:s===o?!1:s?o?er(s,o,u):!0:!!o;return!1}function er(e,t,n){const s=Object.keys(t);if(s.length!==Object.keys(e).length)return!0;for(let r=0;r<s.length;r++){const i=s[r];if(t[i]!==e[i]&&!dn(n,i))return!0}return!1}function ic({vnode:e,parent:t},n){for(;t;){const s=t.subTree;if(s.suspense&&s.suspense.activeBranch===e&&(s.el=e.el),s===e)(e=t.vnode).el=n,t=t.parent;else break}}const Oi=e=>e.__isSuspense;function oc(e,t){t&&t.pendingBranch?D(e)?t.effects.push(...e):t.effects.push(e):ga(e)}const Ce=Symbol.for("v-fgt"),hn=Symbol.for("v-txt"),Ke=Symbol.for("v-cmt"),xn=Symbol.for("v-stc"),Dt=[];let fe=null;function Yn(e=!1){Dt.push(fe=e?null:[])}function ac(){Dt.pop(),fe=Dt[Dt.length-1]||null}let Nt=1;function tr(e,t=!1){Nt+=e,e<0&&fe&&t&&(fe.hasOnce=!0)}function Mi(e){return e.dynamicChildren=Nt>0?fe||ct:null,ac(),Nt>0&&fe&&fe.push(e),e}function nr(e,t,n,s,r,i){return Mi(Ot(e,t,n,s,r,i,!0))}function cc(e,t,n,s,r){return Mi(De(e,t,n,s,r,!0))}function Pi(e){return e?e.__v_isVNode===!0:!1}function yt(e,t){return e.type===t.type&&e.key===t.key}const Ri=({key:e})=>e??null,Yt=({ref:e,ref_key:t,ref_for:n})=>(typeof e=="number"&&(e=""+e),e!=null?G(e)||X(e)||O(e)?{i:ve,r:e,k:t,f:!!n}:e:null);function Ot(e,t=null,n=null,s=0,r=null,i=e===Ce?0:1,o=!1,a=!1){const l={__v_isVNode:!0,__v_skip:!0,type:e,props:t,key:t&&Ri(t),ref:t&&Yt(t),scopeId:ci,slotScopeIds:null,children:n,component:null,suspense:null,ssContent:null,ssFallback:null,dirs:null,transition:null,el:null,anchor:null,target:null,targetStart:null,targetAnchor:null,staticCount:0,shapeFlag:i,patchFlag:s,dynamicProps:r,dynamicChildren:null,appContext:null,ctx:ve};return a?(Ts(l,n),i&128&&e.normalize(l)):n&&(l.shapeFlag|=G(n)?8:16),Nt>0&&!o&&fe&&(l.patchFlag>0||i&6)&&l.patchFlag!==32&&fe.push(l),l}const De=lc;function lc(e,t=null,n=null,s=0,r=null,i=!1){if((!e||e===Ma)&&(e=Ke),Pi(e)){const a=ut(e,t,!0);return n&&Ts(a,n),Nt>0&&!i&&fe&&(a.shapeFlag&6?fe[fe.indexOf(e)]=a:fe.push(a)),a.patchFlag=-2,a}if(Sc(e)&&(e=e.__vccOpts),t){t=fc(t);let{class:a,style:l}=t;a&&!G(a)&&(t.class=us(a)),q(l)&&(ws(l)&&!D(l)&&(l=re({},l)),t.style=fs(l))}const o=G(e)?1:Oi(e)?128:_a(e)?64:q(e)?4:O(e)?2:0;return Ot(e,t,n,s,r,o,i,!0)}function fc(e){return e?ws(e)||yi(e)?re({},e):e:null}function ut(e,t,n=!1,s=!1){const{props:r,ref:i,patchFlag:o,children:a,transition:l}=e,u=t?hc(r||{},t):r,d={__v_isVNode:!0,__v_skip:!0,type:e.type,props:u,key:u&&Ri(u),ref:t&&t.ref?n&&i?D(i)?i.concat(Yt(t)):[i,Yt(t)]:Yt(t):i,scopeId:e.scopeId,slotScopeIds:e.slotScopeIds,children:a,target:e.target,targetStart:e.targetStart,targetAnchor:e.targetAnchor,staticCount:e.staticCount,shapeFlag:e.shapeFlag,patchFlag:t&&e.type!==Ce?o===-1?16:o|16:o,dynamicProps:e.dynamicProps,dynamicChildren:e.dynamicChildren,appContext:e.appContext,dirs:e.dirs,transition:l,component:e.component,suspense:e.suspense,ssContent:e.ssContent&&ut(e.ssContent),ssFallback:e.ssFallback&&ut(e.ssFallback),placeholder:e.placeholder,el:e.el,anchor:e.anchor,ctx:e.ctx,ce:e.ce};return l&&s&&Ss(d,l.clone(d)),d}function uc(e=" ",t=0){return De(hn,null,e,t)}function dc(e="",t=!1){return t?(Yn(),cc(Ke,null,e)):De(Ke,null,e)}function we(e){return e==null||typeof e=="boolean"?De(Ke):D(e)?De(Ce,null,e.slice()):Pi(e)?ke(e):De(hn,null,String(e))}function ke(e){return e.el===null&&e.patchFlag!==-1||e.memo?e:ut(e)}function Ts(e,t){let n=0;const{shapeFlag:s}=e;if(t==null)t=null;else if(D(t))n=16;else if(typeof t=="object")if(s&65){const r=t.default;r&&(r._c&&(r._d=!1),Ts(e,r()),r._c&&(r._d=!0));return}else{n=32;const r=t._;!r&&!yi(t)?t._ctx=ve:r===3&&ve&&(ve.slots._===1?t._=1:(t._=2,e.patchFlag|=1024))}else O(t)?(t={default:t,_ctx:ve},n=32):(t=String(t),s&64?(n=16,t=[uc(t)]):n=8);e.children=t,e.shapeFlag|=n}function hc(...e){const t={};for(let n=0;n<e.length;n++){const s=e[n];for(const r in s)if(r==="class")t.class!==s.class&&(t.class=us([t.class,s.class]));else if(r==="style")t.style=fs([t.style,s.style]);else if(on(r)){const i=t[r],o=s[r];o&&i!==o&&!(D(i)&&i.includes(o))&&(t[r]=i?[].concat(i,o):o)}else r!==""&&(t[r]=s[r])}return t}function _e(e,t,n,s=null){Ee(e,t,7,[n,s])}const pc=mi();let gc=0;function mc(e,t,n){const s=e.type,r=(t?t.appContext:e.appContext)||pc,i={uid:gc++,vnode:e,type:s,parent:t,appContext:r,root:null,next:null,subTree:null,effect:null,update:null,job:null,scope:new Fo(!0),render:null,proxy:null,exposed:null,exposeProxy:null,withProxy:null,provides:t?t.provides:Object.create(r.provides),ids:t?t.ids:["",0,0],accessCache:null,renderCache:[],components:null,directives:null,propsOptions:vi(s,r),emitsOptions:Di(s,r),emit:null,emitted:null,propsDefaults:j,inheritAttrs:s.inheritAttrs,ctx:j,data:j,props:j,attrs:j,slots:j,refs:j,setupState:j,setupContext:null,suspense:n,suspenseId:n?n.pendingId:0,asyncDep:null,asyncResolved:!1,isMounted:!1,isUnmounted:!1,isDeactivated:!1,bc:null,c:null,bm:null,m:null,bu:null,u:null,um:null,bum:null,da:null,a:null,rtg:null,rtc:null,ec:null,sp:null};return i.ctx={_:i},i.root=t?t.root:i,i.emit=tc.bind(null,i),e.ce&&e.ce(i),i}let se=null;const bc=()=>se||ve;let nn,Xn;{const e=ln(),t=(n,s)=>{let r;return(r=e[n])||(r=e[n]=[]),r.push(s),i=>{r.length>1?r.forEach(o=>o(i)):r[0](i)}};nn=t("__VUE_INSTANCE_SETTERS__",n=>se=n),Xn=t("__VUE_SSR_SETTERS__",n=>Ft=n)}const Ht=e=>{const t=se;return nn(e),e.scope.on(),()=>{e.scope.off(),nn(t)}},sr=()=>{se&&se.scope.off(),nn(null)};function Ni(e){return e.vnode.shapeFlag&4}let Ft=!1;function _c(e,t=!1,n=!1){t&&Xn(t);const{props:s,children:r}=e.vnode,i=Ni(e);ja(e,s,i,t),Wa(e,r,n||t);const o=i?yc(e,t):void 0;return t&&Xn(!1),o}function yc(e,t){const n=e.type;e.accessCache=Object.create(null),e.proxy=new Proxy(e.ctx,Pa);const{setup:s}=n;if(s){Me();const r=e.setupContext=s.length>1?vc(e):null,i=Ht(e),o=Lt(s,e,0,[e.props,r]),a=kr(o);if(Pe(),i(),(a||e.sp)&&!Ct(e)&&li(e),a){if(o.then(sr,sr),t)return o.then(l=>{rr(e,l)}).catch(l=>{fn(l,e,0)});e.asyncDep=o}else rr(e,o)}else Fi(e)}function rr(e,t,n){O(t)?e.type.__ssrInlineRender?e.ssrRender=t:e.render=t:q(t)&&(e.setupState=si(t)),Fi(e)}function Fi(e,t,n){const s=e.type;e.render||(e.render=s.render||Se);{const r=Ht(e);Me();try{Ra(e)}finally{Pe(),r()}}}const wc={get(e,t){return Y(e,"get",""),e[t]}};function vc(e){const t=n=>{e.exposed=n||{}};return{attrs:new Proxy(e.attrs,wc),slots:e.slots,emit:e.emit,expose:t}}function As(e){return e.exposed?e.exposeProxy||(e.exposeProxy=new Proxy(si(na(e.exposed)),{get(t,n){if(n in t)return t[n];if(n in xt)return xt[n](e)},has(t,n){return n in t||n in xt}})):e.proxy}function Sc(e){return O(e)&&"__vccOpts"in e}const Ec=(e,t)=>la(e,t,Ft),Ic="3.5.20";/**
* @vue/runtime-dom v3.5.20
* (c) 2018-present Yuxi (Evan) You and Vue contributors
* @license MIT
**/let Zn;const ir=typeof window<"u"&&window.trustedTypes;if(ir)try{Zn=ir.createPolicy("vue",{createHTML:e=>e})}catch{}const $i=Zn?e=>Zn.createHTML(e):e=>e,Tc="http://www.w3.org/2000/svg",Ac="http://www.w3.org/1998/Math/MathML",Te=typeof document<"u"?document:null,or=Te&&Te.createElement("template"),Cc={insert:(e,t,n)=>{t.insertBefore(e,n||null)},remove:e=>{const t=e.parentNode;t&&t.removeChild(e)},createElement:(e,t,n,s)=>{const r=t==="svg"?Te.createElementNS(Tc,e):t==="mathml"?Te.createElementNS(Ac,e):n?Te.createElement(e,{is:n}):Te.createElement(e);return e==="select"&&s&&s.multiple!=null&&r.setAttribute("multiple",s.multiple),r},createText:e=>Te.createTextNode(e),createComment:e=>Te.createComment(e),setText:(e,t)=>{e.nodeValue=t},setElementText:(e,t)=>{e.textContent=t},parentNode:e=>e.parentNode,nextSibling:e=>e.nextSibling,querySelector:e=>Te.querySelector(e),setScopeId(e,t){e.setAttribute(t,"")},insertStaticContent(e,t,n,s,r,i){const o=n?n.previousSibling:t.lastChild;if(r&&(r===i||r.nextSibling))for(;t.insertBefore(r.cloneNode(!0),n),!(r===i||!(r=r.nextSibling)););else{or.innerHTML=$i(s==="svg"?`<svg>${e}</svg>`:s==="mathml"?`<math>${e}</math>`:e);const a=or.content;if(s==="svg"||s==="mathml"){const l=a.firstChild;for(;l.firstChild;)a.appendChild(l.firstChild);a.removeChild(l)}t.insertBefore(a,n)}return[o?o.nextSibling:t.firstChild,n?n.previousSibling:t.lastChild]}},xc=Symbol("_vtc");function Dc(e,t,n){const s=e[xc];s&&(t=(t?[t,...s]:[...s]).join(" ")),t==null?e.removeAttribute("class"):n?e.setAttribute("class",t):e.className=t}const ar=Symbol("_vod"),Oc=Symbol("_vsh"),Mc=Symbol(""),Pc=/(^|;)\s*display\s*:/;function Rc(e,t,n){const s=e.style,r=G(n);let i=!1;if(n&&!r){if(t)if(G(t))for(const o of t.split(";")){const a=o.slice(0,o.indexOf(":")).trim();n[a]==null&&Xt(s,a,"")}else for(const o in t)n[o]==null&&Xt(s,o,"");for(const o in n)o==="display"&&(i=!0),Xt(s,o,n[o])}else if(r){if(t!==n){const o=s[Mc];o&&(n+=";"+o),s.cssText=n,i=Pc.test(n)}}else t&&e.removeAttribute("style");ar in e&&(e[ar]=i?s.display:"",e[Oc]&&(s.display="none"))}const cr=/\s*!important$/;function Xt(e,t,n){if(D(n))n.forEach(s=>Xt(e,t,s));else if(n==null&&(n=""),t.startsWith("--"))e.setProperty(t,n);else{const s=Nc(e,t);cr.test(n)?e.setProperty(it(s),n.replace(cr,""),"important"):e[s]=n}}const lr=["Webkit","Moz","ms"],Dn={};function Nc(e,t){const n=Dn[t];if(n)return n;let s=Ue(t);if(s!=="filter"&&s in e)return Dn[t]=s;s=Lr(s);for(let r=0;r<lr.length;r++){const i=lr[r]+s;if(i in e)return Dn[t]=i}return t}const fr="http://www.w3.org/1999/xlink";function ur(e,t,n,s,r,i=No(t)){s&&t.startsWith("xlink:")?n==null?e.removeAttributeNS(fr,t.slice(6,t.length)):e.setAttributeNS(fr,t,n):n==null||i&&!jr(n)?e.removeAttribute(t):e.setAttribute(t,i?"":dt(n)?String(n):n)}function dr(e,t,n,s,r){if(t==="innerHTML"||t==="textContent"){n!=null&&(e[t]=t==="innerHTML"?$i(n):n);return}const i=e.tagName;if(t==="value"&&i!=="PROGRESS"&&!i.includes("-")){const a=i==="OPTION"?e.getAttribute("value")||"":e.value,l=n==null?e.type==="checkbox"?"on":"":String(n);(a!==l||!("_value"in e))&&(e.value=l),n==null&&e.removeAttribute(t),e._value=n;return}let o=!1;if(n===""||n==null){const a=typeof e[t];a==="boolean"?n=jr(n):n==null&&a==="string"?(n="",o=!0):a==="number"&&(n=0,o=!0)}try{e[t]=n}catch{}o&&e.removeAttribute(r||t)}function Fc(e,t,n,s){e.addEventListener(t,n,s)}function $c(e,t,n,s){e.removeEventListener(t,n,s)}const hr=Symbol("_vei");function Bc(e,t,n,s,r=null){const i=e[hr]||(e[hr]={}),o=i[t];if(s&&o)o.value=s;else{const[a,l]=kc(t);if(s){const u=i[t]=jc(s,r);Fc(e,a,u,l)}else o&&($c(e,a,o,l),i[t]=void 0)}}const pr=/(?:Once|Passive|Capture)$/;function kc(e){let t;if(pr.test(e)){t={};let s;for(;s=e.match(pr);)e=e.slice(0,e.length-s[0].length),t[s[0].toLowerCase()]=!0}return[e[2]===":"?e.slice(3):it(e.slice(2)),t]}let On=0;const Lc=Promise.resolve(),Hc=()=>On||(Lc.then(()=>On=0),On=Date.now());function jc(e,t){const n=s=>{if(!s._vts)s._vts=Date.now();else if(s._vts<=n.attached)return;Ee(Vc(s,n.value),t,5,[s])};return n.value=e,n.attached=Hc(),n}function Vc(e,t){if(D(t)){const n=e.stopImmediatePropagation;return e.stopImmediatePropagation=()=>{n.call(e),e._stopped=!0},t.map(s=>r=>!r._stopped&&s&&s(r))}else return t}const gr=e=>e.charCodeAt(0)===111&&e.charCodeAt(1)===110&&e.charCodeAt(2)>96&&e.charCodeAt(2)<123,Uc=(e,t,n,s,r,i)=>{const o=r==="svg";t==="class"?Dc(e,s,o):t==="style"?Rc(e,n,s):on(t)?as(t)||Bc(e,t,n,s,i):(t[0]==="."?(t=t.slice(1),!0):t[0]==="^"?(t=t.slice(1),!1):Kc(e,t,s,o))?(dr(e,t,s),!e.tagName.includes("-")&&(t==="value"||t==="checked"||t==="selected")&&ur(e,t,s,o,i,t!=="value")):e._isVueCE&&(/[A-Z]/.test(t)||!G(s))?dr(e,Ue(t),s,i,t):(t==="true-value"?e._trueValue=s:t==="false-value"&&(e._falseValue=s),ur(e,t,s,o))};function Kc(e,t,n,s){if(s)return!!(t==="innerHTML"||t==="textContent"||t in e&&gr(t)&&O(n));if(t==="spellcheck"||t==="draggable"||t==="translate"||t==="autocorrect"||t==="form"||t==="list"&&e.tagName==="INPUT"||t==="type"&&e.tagName==="TEXTAREA")return!1;if(t==="width"||t==="height"){const r=e.tagName;if(r==="IMG"||r==="VIDEO"||r==="CANVAS"||r==="SOURCE")return!1}return gr(t)&&G(n)?!1:t in e}const Wc=re({patchProp:Uc},Cc);let mr;function qc(){return mr||(mr=za(Wc))}const zc=((...e)=>{const t=qc().createApp(...e),{mount:n}=t;return t.mount=s=>{const r=Jc(s);if(!r)return;const i=t._component;!O(i)&&!i.render&&!i.template&&(i.template=r.innerHTML),r.nodeType===1&&(r.textContent="");const o=n(r,!1,Gc(r));return r instanceof Element&&(r.removeAttribute("v-cloak"),r.setAttribute("data-v-app","")),o},t});function Gc(e){if(e instanceof SVGElement)return"svg";if(typeof MathMLElement=="function"&&e instanceof MathMLElement)return"mathml"}function Jc(e){return G(e)?document.querySelector(e):e}const Yc=()=>{};var br={};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Bi=function(e){const t=[];let n=0;for(let s=0;s<e.length;s++){let r=e.charCodeAt(s);r<128?t[n++]=r:r<2048?(t[n++]=r>>6|192,t[n++]=r&63|128):(r&64512)===55296&&s+1<e.length&&(e.charCodeAt(s+1)&64512)===56320?(r=65536+((r&1023)<<10)+(e.charCodeAt(++s)&1023),t[n++]=r>>18|240,t[n++]=r>>12&63|128,t[n++]=r>>6&63|128,t[n++]=r&63|128):(t[n++]=r>>12|224,t[n++]=r>>6&63|128,t[n++]=r&63|128)}return t},Xc=function(e){const t=[];let n=0,s=0;for(;n<e.length;){const r=e[n++];if(r<128)t[s++]=String.fromCharCode(r);else if(r>191&&r<224){const i=e[n++];t[s++]=String.fromCharCode((r&31)<<6|i&63)}else if(r>239&&r<365){const i=e[n++],o=e[n++],a=e[n++],l=((r&7)<<18|(i&63)<<12|(o&63)<<6|a&63)-65536;t[s++]=String.fromCharCode(55296+(l>>10)),t[s++]=String.fromCharCode(56320+(l&1023))}else{const i=e[n++],o=e[n++];t[s++]=String.fromCharCode((r&15)<<12|(i&63)<<6|o&63)}}return t.join("")},ki={byteToCharMap_:null,charToByteMap_:null,byteToCharMapWebSafe_:null,charToByteMapWebSafe_:null,ENCODED_VALS_BASE:"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",get ENCODED_VALS(){return this.ENCODED_VALS_BASE+"+/="},get ENCODED_VALS_WEBSAFE(){return this.ENCODED_VALS_BASE+"-_."},HAS_NATIVE_SUPPORT:typeof atob=="function",encodeByteArray(e,t){if(!Array.isArray(e))throw Error("encodeByteArray takes an array as a parameter");this.init_();const n=t?this.byteToCharMapWebSafe_:this.byteToCharMap_,s=[];for(let r=0;r<e.length;r+=3){const i=e[r],o=r+1<e.length,a=o?e[r+1]:0,l=r+2<e.length,u=l?e[r+2]:0,d=i>>2,p=(i&3)<<4|a>>4;let S=(a&15)<<2|u>>6,I=u&63;l||(I=64,o||(S=64)),s.push(n[d],n[p],n[S],n[I])}return s.join("")},encodeString(e,t){return this.HAS_NATIVE_SUPPORT&&!t?btoa(e):this.encodeByteArray(Bi(e),t)},decodeString(e,t){return this.HAS_NATIVE_SUPPORT&&!t?atob(e):Xc(this.decodeStringToByteArray(e,t))},decodeStringToByteArray(e,t){this.init_();const n=t?this.charToByteMapWebSafe_:this.charToByteMap_,s=[];for(let r=0;r<e.length;){const i=n[e.charAt(r++)],a=r<e.length?n[e.charAt(r)]:0;++r;const u=r<e.length?n[e.charAt(r)]:64;++r;const p=r<e.length?n[e.charAt(r)]:64;if(++r,i==null||a==null||u==null||p==null)throw new Zc;const S=i<<2|a>>4;if(s.push(S),u!==64){const I=a<<4&240|u>>2;if(s.push(I),p!==64){const M=u<<6&192|p;s.push(M)}}}return s},init_(){if(!this.byteToCharMap_){this.byteToCharMap_={},this.charToByteMap_={},this.byteToCharMapWebSafe_={},this.charToByteMapWebSafe_={};for(let e=0;e<this.ENCODED_VALS.length;e++)this.byteToCharMap_[e]=this.ENCODED_VALS.charAt(e),this.charToByteMap_[this.byteToCharMap_[e]]=e,this.byteToCharMapWebSafe_[e]=this.ENCODED_VALS_WEBSAFE.charAt(e),this.charToByteMapWebSafe_[this.byteToCharMapWebSafe_[e]]=e,e>=this.ENCODED_VALS_BASE.length&&(this.charToByteMap_[this.ENCODED_VALS_WEBSAFE.charAt(e)]=e,this.charToByteMapWebSafe_[this.ENCODED_VALS.charAt(e)]=e)}}};class Zc extends Error{constructor(){super(...arguments),this.name="DecodeBase64StringError"}}const Qc=function(e){const t=Bi(e);return ki.encodeByteArray(t,!0)},Li=function(e){return Qc(e).replace(/\./g,"")},el=function(e){try{return ki.decodeString(e,!0)}catch(t){console.error("base64Decode failed: ",t)}return null};/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function tl(){if(typeof self<"u")return self;if(typeof window<"u")return window;if(typeof global<"u")return global;throw new Error("Unable to locate global object.")}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const nl=()=>tl().__FIREBASE_DEFAULTS__,sl=()=>{if(typeof process>"u"||typeof br>"u")return;const e=br.__FIREBASE_DEFAULTS__;if(e)return JSON.parse(e)},rl=()=>{if(typeof document>"u")return;let e;try{e=document.cookie.match(/__FIREBASE_DEFAULTS__=([^;]+)/)}catch{return}const t=e&&el(e[1]);return t&&JSON.parse(t)},il=()=>{try{return Yc()||nl()||sl()||rl()}catch(e){console.info(`Unable to get __FIREBASE_DEFAULTS__ due to: ${e}`);return}},Hi=()=>il()?.config;/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ol{constructor(){this.reject=()=>{},this.resolve=()=>{},this.promise=new Promise((t,n)=>{this.resolve=t,this.reject=n})}wrapCallback(t){return(n,s)=>{n?this.reject(n):this.resolve(s),typeof t=="function"&&(this.promise.catch(()=>{}),t.length===1?t(n):t(n,s))}}}function ji(){try{return typeof indexedDB=="object"}catch{return!1}}function Vi(){return new Promise((e,t)=>{try{let n=!0;const s="validate-browser-context-for-indexeddb-analytics-module",r=self.indexedDB.open(s);r.onsuccess=()=>{r.result.close(),n||self.indexedDB.deleteDatabase(s),e(!0)},r.onupgradeneeded=()=>{n=!1},r.onerror=()=>{t(r.error?.message||"")}}catch(n){t(n)}})}function al(){return!(typeof navigator>"u"||!navigator.cookieEnabled)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const cl="FirebaseError";class ht extends Error{constructor(t,n,s){super(n),this.code=t,this.customData=s,this.name=cl,Object.setPrototypeOf(this,ht.prototype),Error.captureStackTrace&&Error.captureStackTrace(this,pn.prototype.create)}}class pn{constructor(t,n,s){this.service=t,this.serviceName=n,this.errors=s}create(t,...n){const s=n[0]||{},r=`${this.service}/${t}`,i=this.errors[t],o=i?ll(i,s):"Error",a=`${this.serviceName}: ${o} (${r}).`;return new ht(r,a,s)}}function ll(e,t){return e.replace(fl,(n,s)=>{const r=t[s];return r!=null?String(r):`<${s}?>`})}const fl=/\{\$([^}]+)}/g;function Qn(e,t){if(e===t)return!0;const n=Object.keys(e),s=Object.keys(t);for(const r of n){if(!s.includes(r))return!1;const i=e[r],o=t[r];if(_r(i)&&_r(o)){if(!Qn(i,o))return!1}else if(i!==o)return!1}for(const r of s)if(!n.includes(r))return!1;return!0}function _r(e){return e!==null&&typeof e=="object"}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Cs(e){return e&&e._delegate?e._delegate:e}class We{constructor(t,n,s){this.name=t,this.instanceFactory=n,this.type=s,this.multipleInstances=!1,this.serviceProps={},this.instantiationMode="LAZY",this.onInstanceCreated=null}setInstantiationMode(t){return this.instantiationMode=t,this}setMultipleInstances(t){return this.multipleInstances=t,this}setServiceProps(t){return this.serviceProps=t,this}setInstanceCreatedCallback(t){return this.onInstanceCreated=t,this}}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Ze="[DEFAULT]";/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ul{constructor(t,n){this.name=t,this.container=n,this.component=null,this.instances=new Map,this.instancesDeferred=new Map,this.instancesOptions=new Map,this.onInitCallbacks=new Map}get(t){const n=this.normalizeInstanceIdentifier(t);if(!this.instancesDeferred.has(n)){const s=new ol;if(this.instancesDeferred.set(n,s),this.isInitialized(n)||this.shouldAutoInitialize())try{const r=this.getOrInitializeService({instanceIdentifier:n});r&&s.resolve(r)}catch{}}return this.instancesDeferred.get(n).promise}getImmediate(t){const n=this.normalizeInstanceIdentifier(t?.identifier),s=t?.optional??!1;if(this.isInitialized(n)||this.shouldAutoInitialize())try{return this.getOrInitializeService({instanceIdentifier:n})}catch(r){if(s)return null;throw r}else{if(s)return null;throw Error(`Service ${this.name} is not available`)}}getComponent(){return this.component}setComponent(t){if(t.name!==this.name)throw Error(`Mismatching Component ${t.name} for Provider ${this.name}.`);if(this.component)throw Error(`Component for ${this.name} has already been provided`);if(this.component=t,!!this.shouldAutoInitialize()){if(hl(t))try{this.getOrInitializeService({instanceIdentifier:Ze})}catch{}for(const[n,s]of this.instancesDeferred.entries()){const r=this.normalizeInstanceIdentifier(n);try{const i=this.getOrInitializeService({instanceIdentifier:r});s.resolve(i)}catch{}}}}clearInstance(t=Ze){this.instancesDeferred.delete(t),this.instancesOptions.delete(t),this.instances.delete(t)}async delete(){const t=Array.from(this.instances.values());await Promise.all([...t.filter(n=>"INTERNAL"in n).map(n=>n.INTERNAL.delete()),...t.filter(n=>"_delete"in n).map(n=>n._delete())])}isComponentSet(){return this.component!=null}isInitialized(t=Ze){return this.instances.has(t)}getOptions(t=Ze){return this.instancesOptions.get(t)||{}}initialize(t={}){const{options:n={}}=t,s=this.normalizeInstanceIdentifier(t.instanceIdentifier);if(this.isInitialized(s))throw Error(`${this.name}(${s}) has already been initialized`);if(!this.isComponentSet())throw Error(`Component ${this.name} has not been registered yet`);const r=this.getOrInitializeService({instanceIdentifier:s,options:n});for(const[i,o]of this.instancesDeferred.entries()){const a=this.normalizeInstanceIdentifier(i);s===a&&o.resolve(r)}return r}onInit(t,n){const s=this.normalizeInstanceIdentifier(n),r=this.onInitCallbacks.get(s)??new Set;r.add(t),this.onInitCallbacks.set(s,r);const i=this.instances.get(s);return i&&t(i,s),()=>{r.delete(t)}}invokeOnInitCallbacks(t,n){const s=this.onInitCallbacks.get(n);if(s)for(const r of s)try{r(t,n)}catch{}}getOrInitializeService({instanceIdentifier:t,options:n={}}){let s=this.instances.get(t);if(!s&&this.component&&(s=this.component.instanceFactory(this.container,{instanceIdentifier:dl(t),options:n}),this.instances.set(t,s),this.instancesOptions.set(t,n),this.invokeOnInitCallbacks(s,t),this.component.onInstanceCreated))try{this.component.onInstanceCreated(this.container,t,s)}catch{}return s||null}normalizeInstanceIdentifier(t=Ze){return this.component?this.component.multipleInstances?t:Ze:t}shouldAutoInitialize(){return!!this.component&&this.component.instantiationMode!=="EXPLICIT"}}function dl(e){return e===Ze?void 0:e}function hl(e){return e.instantiationMode==="EAGER"}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class pl{constructor(t){this.name=t,this.providers=new Map}addComponent(t){const n=this.getProvider(t.name);if(n.isComponentSet())throw new Error(`Component ${t.name} has already been registered with ${this.name}`);n.setComponent(t)}addOrOverwriteComponent(t){this.getProvider(t.name).isComponentSet()&&this.providers.delete(t.name),this.addComponent(t)}getProvider(t){if(this.providers.has(t))return this.providers.get(t);const n=new ul(t,this);return this.providers.set(t,n),n}getProviders(){return Array.from(this.providers.values())}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var U;(function(e){e[e.DEBUG=0]="DEBUG",e[e.VERBOSE=1]="VERBOSE",e[e.INFO=2]="INFO",e[e.WARN=3]="WARN",e[e.ERROR=4]="ERROR",e[e.SILENT=5]="SILENT"})(U||(U={}));const gl={debug:U.DEBUG,verbose:U.VERBOSE,info:U.INFO,warn:U.WARN,error:U.ERROR,silent:U.SILENT},ml=U.INFO,bl={[U.DEBUG]:"log",[U.VERBOSE]:"log",[U.INFO]:"info",[U.WARN]:"warn",[U.ERROR]:"error"},_l=(e,t,...n)=>{if(t<e.logLevel)return;const s=new Date().toISOString(),r=bl[t];if(r)console[r](`[${s}]  ${e.name}:`,...n);else throw new Error(`Attempted to log a message with an invalid logType (value: ${t})`)};class yl{constructor(t){this.name=t,this._logLevel=ml,this._logHandler=_l,this._userLogHandler=null}get logLevel(){return this._logLevel}set logLevel(t){if(!(t in U))throw new TypeError(`Invalid value "${t}" assigned to \`logLevel\``);this._logLevel=t}setLogLevel(t){this._logLevel=typeof t=="string"?gl[t]:t}get logHandler(){return this._logHandler}set logHandler(t){if(typeof t!="function")throw new TypeError("Value assigned to `logHandler` must be a function");this._logHandler=t}get userLogHandler(){return this._userLogHandler}set userLogHandler(t){this._userLogHandler=t}debug(...t){this._userLogHandler&&this._userLogHandler(this,U.DEBUG,...t),this._logHandler(this,U.DEBUG,...t)}log(...t){this._userLogHandler&&this._userLogHandler(this,U.VERBOSE,...t),this._logHandler(this,U.VERBOSE,...t)}info(...t){this._userLogHandler&&this._userLogHandler(this,U.INFO,...t),this._logHandler(this,U.INFO,...t)}warn(...t){this._userLogHandler&&this._userLogHandler(this,U.WARN,...t),this._logHandler(this,U.WARN,...t)}error(...t){this._userLogHandler&&this._userLogHandler(this,U.ERROR,...t),this._logHandler(this,U.ERROR,...t)}}const wl=(e,t)=>t.some(n=>e instanceof n);let yr,wr;function vl(){return yr||(yr=[IDBDatabase,IDBObjectStore,IDBIndex,IDBCursor,IDBTransaction])}function Sl(){return wr||(wr=[IDBCursor.prototype.advance,IDBCursor.prototype.continue,IDBCursor.prototype.continuePrimaryKey])}const Ui=new WeakMap,es=new WeakMap,Ki=new WeakMap,Mn=new WeakMap,xs=new WeakMap;function El(e){const t=new Promise((n,s)=>{const r=()=>{e.removeEventListener("success",i),e.removeEventListener("error",o)},i=()=>{n(Oe(e.result)),r()},o=()=>{s(e.error),r()};e.addEventListener("success",i),e.addEventListener("error",o)});return t.then(n=>{n instanceof IDBCursor&&Ui.set(n,e)}).catch(()=>{}),xs.set(t,e),t}function Il(e){if(es.has(e))return;const t=new Promise((n,s)=>{const r=()=>{e.removeEventListener("complete",i),e.removeEventListener("error",o),e.removeEventListener("abort",o)},i=()=>{n(),r()},o=()=>{s(e.error||new DOMException("AbortError","AbortError")),r()};e.addEventListener("complete",i),e.addEventListener("error",o),e.addEventListener("abort",o)});es.set(e,t)}let ts={get(e,t,n){if(e instanceof IDBTransaction){if(t==="done")return es.get(e);if(t==="objectStoreNames")return e.objectStoreNames||Ki.get(e);if(t==="store")return n.objectStoreNames[1]?void 0:n.objectStore(n.objectStoreNames[0])}return Oe(e[t])},set(e,t,n){return e[t]=n,!0},has(e,t){return e instanceof IDBTransaction&&(t==="done"||t==="store")?!0:t in e}};function Tl(e){ts=e(ts)}function Al(e){return e===IDBDatabase.prototype.transaction&&!("objectStoreNames"in IDBTransaction.prototype)?function(t,...n){const s=e.call(Pn(this),t,...n);return Ki.set(s,t.sort?t.sort():[t]),Oe(s)}:Sl().includes(e)?function(...t){return e.apply(Pn(this),t),Oe(Ui.get(this))}:function(...t){return Oe(e.apply(Pn(this),t))}}function Cl(e){return typeof e=="function"?Al(e):(e instanceof IDBTransaction&&Il(e),wl(e,vl())?new Proxy(e,ts):e)}function Oe(e){if(e instanceof IDBRequest)return El(e);if(Mn.has(e))return Mn.get(e);const t=Cl(e);return t!==e&&(Mn.set(e,t),xs.set(t,e)),t}const Pn=e=>xs.get(e);function gn(e,t,{blocked:n,upgrade:s,blocking:r,terminated:i}={}){const o=indexedDB.open(e,t),a=Oe(o);return s&&o.addEventListener("upgradeneeded",l=>{s(Oe(o.result),l.oldVersion,l.newVersion,Oe(o.transaction),l)}),n&&o.addEventListener("blocked",l=>n(l.oldVersion,l.newVersion,l)),a.then(l=>{i&&l.addEventListener("close",()=>i()),r&&l.addEventListener("versionchange",u=>r(u.oldVersion,u.newVersion,u))}).catch(()=>{}),a}function Rn(e,{blocked:t}={}){const n=indexedDB.deleteDatabase(e);return t&&n.addEventListener("blocked",s=>t(s.oldVersion,s)),Oe(n).then(()=>{})}const xl=["get","getKey","getAll","getAllKeys","count"],Dl=["put","add","delete","clear"],Nn=new Map;function vr(e,t){if(!(e instanceof IDBDatabase&&!(t in e)&&typeof t=="string"))return;if(Nn.get(t))return Nn.get(t);const n=t.replace(/FromIndex$/,""),s=t!==n,r=Dl.includes(n);if(!(n in(s?IDBIndex:IDBObjectStore).prototype)||!(r||xl.includes(n)))return;const i=async function(o,...a){const l=this.transaction(o,r?"readwrite":"readonly");let u=l.store;return s&&(u=u.index(a.shift())),(await Promise.all([u[n](...a),r&&l.done]))[0]};return Nn.set(t,i),i}Tl(e=>({...e,get:(t,n,s)=>vr(t,n)||e.get(t,n,s),has:(t,n)=>!!vr(t,n)||e.has(t,n)}));/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ol{constructor(t){this.container=t}getPlatformInfoString(){return this.container.getProviders().map(n=>{if(Ml(n)){const s=n.getImmediate();return`${s.library}/${s.version}`}else return null}).filter(n=>n).join(" ")}}function Ml(e){return e.getComponent()?.type==="VERSION"}const ns="@firebase/app",Sr="0.14.2";/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Re=new yl("@firebase/app"),Pl="@firebase/app-compat",Rl="@firebase/analytics-compat",Nl="@firebase/analytics",Fl="@firebase/app-check-compat",$l="@firebase/app-check",Bl="@firebase/auth",kl="@firebase/auth-compat",Ll="@firebase/database",Hl="@firebase/data-connect",jl="@firebase/database-compat",Vl="@firebase/functions",Ul="@firebase/functions-compat",Kl="@firebase/installations",Wl="@firebase/installations-compat",ql="@firebase/messaging",zl="@firebase/messaging-compat",Gl="@firebase/performance",Jl="@firebase/performance-compat",Yl="@firebase/remote-config",Xl="@firebase/remote-config-compat",Zl="@firebase/storage",Ql="@firebase/storage-compat",ef="@firebase/firestore",tf="@firebase/ai",nf="@firebase/firestore-compat",sf="firebase";/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const ss="[DEFAULT]",rf={[ns]:"fire-core",[Pl]:"fire-core-compat",[Nl]:"fire-analytics",[Rl]:"fire-analytics-compat",[$l]:"fire-app-check",[Fl]:"fire-app-check-compat",[Bl]:"fire-auth",[kl]:"fire-auth-compat",[Ll]:"fire-rtdb",[Hl]:"fire-data-connect",[jl]:"fire-rtdb-compat",[Vl]:"fire-fn",[Ul]:"fire-fn-compat",[Kl]:"fire-iid",[Wl]:"fire-iid-compat",[ql]:"fire-fcm",[zl]:"fire-fcm-compat",[Gl]:"fire-perf",[Jl]:"fire-perf-compat",[Yl]:"fire-rc",[Xl]:"fire-rc-compat",[Zl]:"fire-gcs",[Ql]:"fire-gcs-compat",[ef]:"fire-fst",[nf]:"fire-fst-compat",[tf]:"fire-vertex","fire-js":"fire-js",[sf]:"fire-js-all"};/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const sn=new Map,of=new Map,rs=new Map;function Er(e,t){try{e.container.addComponent(t)}catch(n){Re.debug(`Component ${t.name} failed to register with FirebaseApp ${e.name}`,n)}}function nt(e){const t=e.name;if(rs.has(t))return Re.debug(`There were multiple attempts to register component ${t}.`),!1;rs.set(t,e);for(const n of sn.values())Er(n,e);for(const n of of.values())Er(n,e);return!0}function Ds(e,t){const n=e.container.getProvider("heartbeat").getImmediate({optional:!0});return n&&n.triggerHeartbeat(),e.container.getProvider(t)}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const af={"no-app":"No Firebase App '{$appName}' has been created - call initializeApp() first","bad-app-name":"Illegal App name: '{$appName}'","duplicate-app":"Firebase App named '{$appName}' already exists with different options or config","app-deleted":"Firebase App named '{$appName}' already deleted","server-app-deleted":"Firebase Server App has been deleted","no-options":"Need to provide options, when not being deployed to hosting via source.","invalid-app-argument":"firebase.{$appName}() takes either no argument or a Firebase App instance.","invalid-log-argument":"First argument to `onLog` must be null or a function.","idb-open":"Error thrown when opening IndexedDB. Original error: {$originalErrorMessage}.","idb-get":"Error thrown when reading from IndexedDB. Original error: {$originalErrorMessage}.","idb-set":"Error thrown when writing to IndexedDB. Original error: {$originalErrorMessage}.","idb-delete":"Error thrown when deleting from IndexedDB. Original error: {$originalErrorMessage}.","finalization-registry-not-supported":"FirebaseServerApp deleteOnDeref field defined but the JS runtime does not support FinalizationRegistry.","invalid-server-app-environment":"FirebaseServerApp is not for use in browser environments."},je=new pn("app","Firebase",af);/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class cf{constructor(t,n,s){this._isDeleted=!1,this._options={...t},this._config={...n},this._name=n.name,this._automaticDataCollectionEnabled=n.automaticDataCollectionEnabled,this._container=s,this.container.addComponent(new We("app",()=>this,"PUBLIC"))}get automaticDataCollectionEnabled(){return this.checkDestroyed(),this._automaticDataCollectionEnabled}set automaticDataCollectionEnabled(t){this.checkDestroyed(),this._automaticDataCollectionEnabled=t}get name(){return this.checkDestroyed(),this._name}get options(){return this.checkDestroyed(),this._options}get config(){return this.checkDestroyed(),this._config}get container(){return this._container}get isDeleted(){return this._isDeleted}set isDeleted(t){this._isDeleted=t}checkDestroyed(){if(this.isDeleted)throw je.create("app-deleted",{appName:this._name})}}function Wi(e,t={}){let n=e;typeof t!="object"&&(t={name:t});const s={name:ss,automaticDataCollectionEnabled:!0,...t},r=s.name;if(typeof r!="string"||!r)throw je.create("bad-app-name",{appName:String(r)});if(n||(n=Hi()),!n)throw je.create("no-options");const i=sn.get(r);if(i){if(Qn(n,i.options)&&Qn(s,i.config))return i;throw je.create("duplicate-app",{appName:r})}const o=new pl(r);for(const l of rs.values())o.addComponent(l);const a=new cf(n,s,o);return sn.set(r,a),a}function lf(e=ss){const t=sn.get(e);if(!t&&e===ss&&Hi())return Wi();if(!t)throw je.create("no-app",{appName:e});return t}function Ve(e,t,n){let s=rf[e]??e;n&&(s+=`-${n}`);const r=s.match(/\s|\//),i=t.match(/\s|\//);if(r||i){const o=[`Unable to register library "${s}" with version "${t}":`];r&&o.push(`library name "${s}" contains illegal characters (whitespace or "/")`),r&&i&&o.push("and"),i&&o.push(`version name "${t}" contains illegal characters (whitespace or "/")`),Re.warn(o.join(" "));return}nt(new We(`${s}-version`,()=>({library:s,version:t}),"VERSION"))}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const ff="firebase-heartbeat-database",uf=1,$t="firebase-heartbeat-store";let Fn=null;function qi(){return Fn||(Fn=gn(ff,uf,{upgrade:(e,t)=>{switch(t){case 0:try{e.createObjectStore($t)}catch(n){console.warn(n)}}}}).catch(e=>{throw je.create("idb-open",{originalErrorMessage:e.message})})),Fn}async function df(e){try{const n=(await qi()).transaction($t),s=await n.objectStore($t).get(zi(e));return await n.done,s}catch(t){if(t instanceof ht)Re.warn(t.message);else{const n=je.create("idb-get",{originalErrorMessage:t?.message});Re.warn(n.message)}}}async function Ir(e,t){try{const s=(await qi()).transaction($t,"readwrite");await s.objectStore($t).put(t,zi(e)),await s.done}catch(n){if(n instanceof ht)Re.warn(n.message);else{const s=je.create("idb-set",{originalErrorMessage:n?.message});Re.warn(s.message)}}}function zi(e){return`${e.name}!${e.options.appId}`}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const hf=1024,pf=30;class gf{constructor(t){this.container=t,this._heartbeatsCache=null;const n=this.container.getProvider("app").getImmediate();this._storage=new bf(n),this._heartbeatsCachePromise=this._storage.read().then(s=>(this._heartbeatsCache=s,s))}async triggerHeartbeat(){try{const n=this.container.getProvider("platform-logger").getImmediate().getPlatformInfoString(),s=Tr();if(this._heartbeatsCache?.heartbeats==null&&(this._heartbeatsCache=await this._heartbeatsCachePromise,this._heartbeatsCache?.heartbeats==null)||this._heartbeatsCache.lastSentHeartbeatDate===s||this._heartbeatsCache.heartbeats.some(r=>r.date===s))return;if(this._heartbeatsCache.heartbeats.push({date:s,agent:n}),this._heartbeatsCache.heartbeats.length>pf){const r=_f(this._heartbeatsCache.heartbeats);this._heartbeatsCache.heartbeats.splice(r,1)}return this._storage.overwrite(this._heartbeatsCache)}catch(t){Re.warn(t)}}async getHeartbeatsHeader(){try{if(this._heartbeatsCache===null&&await this._heartbeatsCachePromise,this._heartbeatsCache?.heartbeats==null||this._heartbeatsCache.heartbeats.length===0)return"";const t=Tr(),{heartbeatsToSend:n,unsentEntries:s}=mf(this._heartbeatsCache.heartbeats),r=Li(JSON.stringify({version:2,heartbeats:n}));return this._heartbeatsCache.lastSentHeartbeatDate=t,s.length>0?(this._heartbeatsCache.heartbeats=s,await this._storage.overwrite(this._heartbeatsCache)):(this._heartbeatsCache.heartbeats=[],this._storage.overwrite(this._heartbeatsCache)),r}catch(t){return Re.warn(t),""}}}function Tr(){return new Date().toISOString().substring(0,10)}function mf(e,t=hf){const n=[];let s=e.slice();for(const r of e){const i=n.find(o=>o.agent===r.agent);if(i){if(i.dates.push(r.date),Ar(n)>t){i.dates.pop();break}}else if(n.push({agent:r.agent,dates:[r.date]}),Ar(n)>t){n.pop();break}s=s.slice(1)}return{heartbeatsToSend:n,unsentEntries:s}}class bf{constructor(t){this.app=t,this._canUseIndexedDBPromise=this.runIndexedDBEnvironmentCheck()}async runIndexedDBEnvironmentCheck(){return ji()?Vi().then(()=>!0).catch(()=>!1):!1}async read(){if(await this._canUseIndexedDBPromise){const n=await df(this.app);return n?.heartbeats?n:{heartbeats:[]}}else return{heartbeats:[]}}async overwrite(t){if(await this._canUseIndexedDBPromise){const s=await this.read();return Ir(this.app,{lastSentHeartbeatDate:t.lastSentHeartbeatDate??s.lastSentHeartbeatDate,heartbeats:t.heartbeats})}else return}async add(t){if(await this._canUseIndexedDBPromise){const s=await this.read();return Ir(this.app,{lastSentHeartbeatDate:t.lastSentHeartbeatDate??s.lastSentHeartbeatDate,heartbeats:[...s.heartbeats,...t.heartbeats]})}else return}}function Ar(e){return Li(JSON.stringify({version:2,heartbeats:e})).length}function _f(e){if(e.length===0)return-1;let t=0,n=e[0].date;for(let s=1;s<e.length;s++)e[s].date<n&&(n=e[s].date,t=s);return t}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function yf(e){nt(new We("platform-logger",t=>new Ol(t),"PRIVATE")),nt(new We("heartbeat",t=>new gf(t),"PRIVATE")),Ve(ns,Sr,e),Ve(ns,Sr,"esm2020"),Ve("fire-js","")}yf("");var wf="firebase",vf="12.2.1";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */Ve(wf,vf,"app");const Gi="@firebase/installations",Os="0.6.19";/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Ji=1e4,Yi=`w:${Os}`,Xi="FIS_v2",Sf="https://firebaseinstallations.googleapis.com/v1",Ef=3600*1e3,If="installations",Tf="Installations";/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Af={"missing-app-config-values":'Missing App configuration value: "{$valueName}"',"not-registered":"Firebase Installation is not registered.","installation-not-found":"Firebase Installation not found.","request-failed":'{$requestName} request failed with error "{$serverCode} {$serverStatus}: {$serverMessage}"',"app-offline":"Could not process request. Application offline.","delete-pending-registration":"Can't delete installation while there is a pending registration request."},st=new pn(If,Tf,Af);function Zi(e){return e instanceof ht&&e.code.includes("request-failed")}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Qi({projectId:e}){return`${Sf}/projects/${e}/installations`}function eo(e){return{token:e.token,requestStatus:2,expiresIn:xf(e.expiresIn),creationTime:Date.now()}}async function to(e,t){const s=(await t.json()).error;return st.create("request-failed",{requestName:e,serverCode:s.code,serverMessage:s.message,serverStatus:s.status})}function no({apiKey:e}){return new Headers({"Content-Type":"application/json",Accept:"application/json","x-goog-api-key":e})}function Cf(e,{refreshToken:t}){const n=no(e);return n.append("Authorization",Df(t)),n}async function so(e){const t=await e();return t.status>=500&&t.status<600?e():t}function xf(e){return Number(e.replace("s","000"))}function Df(e){return`${Xi} ${e}`}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function Of({appConfig:e,heartbeatServiceProvider:t},{fid:n}){const s=Qi(e),r=no(e),i=t.getImmediate({optional:!0});if(i){const u=await i.getHeartbeatsHeader();u&&r.append("x-firebase-client",u)}const o={fid:n,authVersion:Xi,appId:e.appId,sdkVersion:Yi},a={method:"POST",headers:r,body:JSON.stringify(o)},l=await so(()=>fetch(s,a));if(l.ok){const u=await l.json();return{fid:u.fid||n,registrationStatus:2,refreshToken:u.refreshToken,authToken:eo(u.authToken)}}else throw await to("Create Installation",l)}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function ro(e){return new Promise(t=>{setTimeout(t,e)})}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Mf(e){return btoa(String.fromCharCode(...e)).replace(/\+/g,"-").replace(/\//g,"_")}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Pf=/^[cdef][\w-]{21}$/,is="";function Rf(){try{const e=new Uint8Array(17);(self.crypto||self.msCrypto).getRandomValues(e),e[0]=112+e[0]%16;const n=Nf(e);return Pf.test(n)?n:is}catch{return is}}function Nf(e){return Mf(e).substr(0,22)}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function mn(e){return`${e.appName}!${e.appId}`}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const io=new Map;function oo(e,t){const n=mn(e);ao(n,t),Ff(n,t)}function ao(e,t){const n=io.get(e);if(n)for(const s of n)s(t)}function Ff(e,t){const n=$f();n&&n.postMessage({key:e,fid:t}),Bf()}let Qe=null;function $f(){return!Qe&&"BroadcastChannel"in self&&(Qe=new BroadcastChannel("[Firebase] FID Change"),Qe.onmessage=e=>{ao(e.data.key,e.data.fid)}),Qe}function Bf(){io.size===0&&Qe&&(Qe.close(),Qe=null)}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const kf="firebase-installations-database",Lf=1,rt="firebase-installations-store";let $n=null;function Ms(){return $n||($n=gn(kf,Lf,{upgrade:(e,t)=>{switch(t){case 0:e.createObjectStore(rt)}}})),$n}async function rn(e,t){const n=mn(e),r=(await Ms()).transaction(rt,"readwrite"),i=r.objectStore(rt),o=await i.get(n);return await i.put(t,n),await r.done,(!o||o.fid!==t.fid)&&oo(e,t.fid),t}async function co(e){const t=mn(e),s=(await Ms()).transaction(rt,"readwrite");await s.objectStore(rt).delete(t),await s.done}async function bn(e,t){const n=mn(e),r=(await Ms()).transaction(rt,"readwrite"),i=r.objectStore(rt),o=await i.get(n),a=t(o);return a===void 0?await i.delete(n):await i.put(a,n),await r.done,a&&(!o||o.fid!==a.fid)&&oo(e,a.fid),a}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function Ps(e){let t;const n=await bn(e.appConfig,s=>{const r=Hf(s),i=jf(e,r);return t=i.registrationPromise,i.installationEntry});return n.fid===is?{installationEntry:await t}:{installationEntry:n,registrationPromise:t}}function Hf(e){const t=e||{fid:Rf(),registrationStatus:0};return lo(t)}function jf(e,t){if(t.registrationStatus===0){if(!navigator.onLine){const r=Promise.reject(st.create("app-offline"));return{installationEntry:t,registrationPromise:r}}const n={fid:t.fid,registrationStatus:1,registrationTime:Date.now()},s=Vf(e,n);return{installationEntry:n,registrationPromise:s}}else return t.registrationStatus===1?{installationEntry:t,registrationPromise:Uf(e)}:{installationEntry:t}}async function Vf(e,t){try{const n=await Of(e,t);return rn(e.appConfig,n)}catch(n){throw Zi(n)&&n.customData.serverCode===409?await co(e.appConfig):await rn(e.appConfig,{fid:t.fid,registrationStatus:0}),n}}async function Uf(e){let t=await Cr(e.appConfig);for(;t.registrationStatus===1;)await ro(100),t=await Cr(e.appConfig);if(t.registrationStatus===0){const{installationEntry:n,registrationPromise:s}=await Ps(e);return s||n}return t}function Cr(e){return bn(e,t=>{if(!t)throw st.create("installation-not-found");return lo(t)})}function lo(e){return Kf(e)?{fid:e.fid,registrationStatus:0}:e}function Kf(e){return e.registrationStatus===1&&e.registrationTime+Ji<Date.now()}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function Wf({appConfig:e,heartbeatServiceProvider:t},n){const s=qf(e,n),r=Cf(e,n),i=t.getImmediate({optional:!0});if(i){const u=await i.getHeartbeatsHeader();u&&r.append("x-firebase-client",u)}const o={installation:{sdkVersion:Yi,appId:e.appId}},a={method:"POST",headers:r,body:JSON.stringify(o)},l=await so(()=>fetch(s,a));if(l.ok){const u=await l.json();return eo(u)}else throw await to("Generate Auth Token",l)}function qf(e,{fid:t}){return`${Qi(e)}/${t}/authTokens:generate`}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function Rs(e,t=!1){let n;const s=await bn(e.appConfig,i=>{if(!fo(i))throw st.create("not-registered");const o=i.authToken;if(!t&&Jf(o))return i;if(o.requestStatus===1)return n=zf(e,t),i;{if(!navigator.onLine)throw st.create("app-offline");const a=Xf(i);return n=Gf(e,a),a}});return n?await n:s.authToken}async function zf(e,t){let n=await xr(e.appConfig);for(;n.authToken.requestStatus===1;)await ro(100),n=await xr(e.appConfig);const s=n.authToken;return s.requestStatus===0?Rs(e,t):s}function xr(e){return bn(e,t=>{if(!fo(t))throw st.create("not-registered");const n=t.authToken;return Zf(n)?{...t,authToken:{requestStatus:0}}:t})}async function Gf(e,t){try{const n=await Wf(e,t),s={...t,authToken:n};return await rn(e.appConfig,s),n}catch(n){if(Zi(n)&&(n.customData.serverCode===401||n.customData.serverCode===404))await co(e.appConfig);else{const s={...t,authToken:{requestStatus:0}};await rn(e.appConfig,s)}throw n}}function fo(e){return e!==void 0&&e.registrationStatus===2}function Jf(e){return e.requestStatus===2&&!Yf(e)}function Yf(e){const t=Date.now();return t<e.creationTime||e.creationTime+e.expiresIn<t+Ef}function Xf(e){const t={requestStatus:1,requestTime:Date.now()};return{...e,authToken:t}}function Zf(e){return e.requestStatus===1&&e.requestTime+Ji<Date.now()}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function Qf(e){const t=e,{installationEntry:n,registrationPromise:s}=await Ps(t);return s?s.catch(console.error):Rs(t).catch(console.error),n.fid}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function eu(e,t=!1){const n=e;return await tu(n),(await Rs(n,t)).token}async function tu(e){const{registrationPromise:t}=await Ps(e);t&&await t}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function nu(e){if(!e||!e.options)throw Bn("App Configuration");if(!e.name)throw Bn("App Name");const t=["projectId","apiKey","appId"];for(const n of t)if(!e.options[n])throw Bn(n);return{appName:e.name,projectId:e.options.projectId,apiKey:e.options.apiKey,appId:e.options.appId}}function Bn(e){return st.create("missing-app-config-values",{valueName:e})}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const uo="installations",su="installations-internal",ru=e=>{const t=e.getProvider("app").getImmediate(),n=nu(t),s=Ds(t,"heartbeat");return{app:t,appConfig:n,heartbeatServiceProvider:s,_delete:()=>Promise.resolve()}},iu=e=>{const t=e.getProvider("app").getImmediate(),n=Ds(t,uo).getImmediate();return{getId:()=>Qf(n),getToken:r=>eu(n,r)}};function ou(){nt(new We(uo,ru,"PUBLIC")),nt(new We(su,iu,"PRIVATE"))}ou();Ve(Gi,Os);Ve(Gi,Os,"esm2020");/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const au="/firebase-messaging-sw.js",cu="/firebase-cloud-messaging-push-scope",ho="BDOU99-h67HcA6JeFXHbSNMu7e2yNNu3RzoMj8TM4W88jITfq7ZmPvIM1Iv-4_l2LxQcYwhqby2xGpWwzjfAnG4",lu="https://fcmregistrations.googleapis.com/v1",po="google.c.a.c_id",fu="google.c.a.c_l",uu="google.c.a.ts",du="google.c.a.e",Dr=1e4;var Or;(function(e){e[e.DATA_MESSAGE=1]="DATA_MESSAGE",e[e.DISPLAY_NOTIFICATION=3]="DISPLAY_NOTIFICATION"})(Or||(Or={}));/**
 * @license
 * Copyright 2018 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License. You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the License
 * is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
 * or implied. See the License for the specific language governing permissions and limitations under
 * the License.
 */var Bt;(function(e){e.PUSH_RECEIVED="push-received",e.NOTIFICATION_CLICKED="notification-clicked"})(Bt||(Bt={}));/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Ae(e){const t=new Uint8Array(e);return btoa(String.fromCharCode(...t)).replace(/=/g,"").replace(/\+/g,"-").replace(/\//g,"_")}function hu(e){const t="=".repeat((4-e.length%4)%4),n=(e+t).replace(/\-/g,"+").replace(/_/g,"/"),s=atob(n),r=new Uint8Array(s.length);for(let i=0;i<s.length;++i)r[i]=s.charCodeAt(i);return r}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const kn="fcm_token_details_db",pu=5,Mr="fcm_token_object_Store";async function gu(e){if("databases"in indexedDB&&!(await indexedDB.databases()).map(i=>i.name).includes(kn))return null;let t=null;return(await gn(kn,pu,{upgrade:async(s,r,i,o)=>{if(r<2||!s.objectStoreNames.contains(Mr))return;const a=o.objectStore(Mr),l=await a.index("fcmSenderId").get(e);if(await a.clear(),!!l){if(r===2){const u=l;if(!u.auth||!u.p256dh||!u.endpoint)return;t={token:u.fcmToken,createTime:u.createTime??Date.now(),subscriptionOptions:{auth:u.auth,p256dh:u.p256dh,endpoint:u.endpoint,swScope:u.swScope,vapidKey:typeof u.vapidKey=="string"?u.vapidKey:Ae(u.vapidKey)}}}else if(r===3){const u=l;t={token:u.fcmToken,createTime:u.createTime,subscriptionOptions:{auth:Ae(u.auth),p256dh:Ae(u.p256dh),endpoint:u.endpoint,swScope:u.swScope,vapidKey:Ae(u.vapidKey)}}}else if(r===4){const u=l;t={token:u.fcmToken,createTime:u.createTime,subscriptionOptions:{auth:Ae(u.auth),p256dh:Ae(u.p256dh),endpoint:u.endpoint,swScope:u.swScope,vapidKey:Ae(u.vapidKey)}}}}}})).close(),await Rn(kn),await Rn("fcm_vapid_details_db"),await Rn("undefined"),mu(t)?t:null}function mu(e){if(!e||!e.subscriptionOptions)return!1;const{subscriptionOptions:t}=e;return typeof e.createTime=="number"&&e.createTime>0&&typeof e.token=="string"&&e.token.length>0&&typeof t.auth=="string"&&t.auth.length>0&&typeof t.p256dh=="string"&&t.p256dh.length>0&&typeof t.endpoint=="string"&&t.endpoint.length>0&&typeof t.swScope=="string"&&t.swScope.length>0&&typeof t.vapidKey=="string"&&t.vapidKey.length>0}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const bu="firebase-messaging-database",_u=1,kt="firebase-messaging-store";let Ln=null;function go(){return Ln||(Ln=gn(bu,_u,{upgrade:(e,t)=>{switch(t){case 0:e.createObjectStore(kt)}}})),Ln}async function yu(e){const t=mo(e),s=await(await go()).transaction(kt).objectStore(kt).get(t);if(s)return s;{const r=await gu(e.appConfig.senderId);if(r)return await Ns(e,r),r}}async function Ns(e,t){const n=mo(e),r=(await go()).transaction(kt,"readwrite");return await r.objectStore(kt).put(t,n),await r.done,t}function mo({appConfig:e}){return e.appId}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const wu={"missing-app-config-values":'Missing App configuration value: "{$valueName}"',"only-available-in-window":"This method is available in a Window context.","only-available-in-sw":"This method is available in a service worker context.","permission-default":"The notification permission was not granted and dismissed instead.","permission-blocked":"The notification permission was not granted and blocked instead.","unsupported-browser":"This browser doesn't support the API's required to use the Firebase SDK.","indexed-db-unsupported":"This browser doesn't support indexedDb.open() (ex. Safari iFrame, Firefox Private Browsing, etc)","failed-service-worker-registration":"We are unable to register the default service worker. {$browserErrorMessage}","token-subscribe-failed":"A problem occurred while subscribing the user to FCM: {$errorInfo}","token-subscribe-no-token":"FCM returned no token when subscribing the user to push.","token-unsubscribe-failed":"A problem occurred while unsubscribing the user from FCM: {$errorInfo}","token-update-failed":"A problem occurred while updating the user from FCM: {$errorInfo}","token-update-no-token":"FCM returned no token when updating the user to push.","use-sw-after-get-token":"The useServiceWorker() method may only be called once and must be called before calling getToken() to ensure your service worker is used.","invalid-sw-registration":"The input to useServiceWorker() must be a ServiceWorkerRegistration.","invalid-bg-handler":"The input to setBackgroundMessageHandler() must be a function.","invalid-vapid-key":"The public VAPID key must be a string.","use-vapid-key-after-get-token":"The usePublicVapidKey() method may only be called once and must be called before calling getToken() to ensure your VAPID key is used."},Z=new pn("messaging","Messaging",wu);/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function vu(e,t){const n=await $s(e),s=bo(t),r={method:"POST",headers:n,body:JSON.stringify(s)};let i;try{i=await(await fetch(Fs(e.appConfig),r)).json()}catch(o){throw Z.create("token-subscribe-failed",{errorInfo:o?.toString()})}if(i.error){const o=i.error.message;throw Z.create("token-subscribe-failed",{errorInfo:o})}if(!i.token)throw Z.create("token-subscribe-no-token");return i.token}async function Su(e,t){const n=await $s(e),s=bo(t.subscriptionOptions),r={method:"PATCH",headers:n,body:JSON.stringify(s)};let i;try{i=await(await fetch(`${Fs(e.appConfig)}/${t.token}`,r)).json()}catch(o){throw Z.create("token-update-failed",{errorInfo:o?.toString()})}if(i.error){const o=i.error.message;throw Z.create("token-update-failed",{errorInfo:o})}if(!i.token)throw Z.create("token-update-no-token");return i.token}async function Eu(e,t){const s={method:"DELETE",headers:await $s(e)};try{const i=await(await fetch(`${Fs(e.appConfig)}/${t}`,s)).json();if(i.error){const o=i.error.message;throw Z.create("token-unsubscribe-failed",{errorInfo:o})}}catch(r){throw Z.create("token-unsubscribe-failed",{errorInfo:r?.toString()})}}function Fs({projectId:e}){return`${lu}/projects/${e}/registrations`}async function $s({appConfig:e,installations:t}){const n=await t.getToken();return new Headers({"Content-Type":"application/json",Accept:"application/json","x-goog-api-key":e.apiKey,"x-goog-firebase-installations-auth":`FIS ${n}`})}function bo({p256dh:e,auth:t,endpoint:n,vapidKey:s}){const r={web:{endpoint:n,auth:t,p256dh:e}};return s!==ho&&(r.web.applicationPubKey=s),r}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Iu=10080*60*1e3;async function Tu(e){const t=await Cu(e.swRegistration,e.vapidKey),n={vapidKey:e.vapidKey,swScope:e.swRegistration.scope,endpoint:t.endpoint,auth:Ae(t.getKey("auth")),p256dh:Ae(t.getKey("p256dh"))},s=await yu(e.firebaseDependencies);if(s){if(xu(s.subscriptionOptions,n))return Date.now()>=s.createTime+Iu?Au(e,{token:s.token,createTime:Date.now(),subscriptionOptions:n}):s.token;try{await Eu(e.firebaseDependencies,s.token)}catch(r){console.warn(r)}return Pr(e.firebaseDependencies,n)}else return Pr(e.firebaseDependencies,n)}async function Au(e,t){try{const n=await Su(e.firebaseDependencies,t),s={...t,token:n,createTime:Date.now()};return await Ns(e.firebaseDependencies,s),n}catch(n){throw n}}async function Pr(e,t){const s={token:await vu(e,t),createTime:Date.now(),subscriptionOptions:t};return await Ns(e,s),s.token}async function Cu(e,t){const n=await e.pushManager.getSubscription();return n||e.pushManager.subscribe({userVisibleOnly:!0,applicationServerKey:hu(t)})}function xu(e,t){const n=t.vapidKey===e.vapidKey,s=t.endpoint===e.endpoint,r=t.auth===e.auth,i=t.p256dh===e.p256dh;return n&&s&&r&&i}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Rr(e){const t={from:e.from,collapseKey:e.collapse_key,messageId:e.fcmMessageId};return Du(t,e),Ou(t,e),Mu(t,e),t}function Du(e,t){if(!t.notification)return;e.notification={};const n=t.notification.title;n&&(e.notification.title=n);const s=t.notification.body;s&&(e.notification.body=s);const r=t.notification.image;r&&(e.notification.image=r);const i=t.notification.icon;i&&(e.notification.icon=i)}function Ou(e,t){t.data&&(e.data=t.data)}function Mu(e,t){if(!t.fcmOptions&&!t.notification?.click_action)return;e.fcmOptions={};const n=t.fcmOptions?.link??t.notification?.click_action;n&&(e.fcmOptions.link=n);const s=t.fcmOptions?.analytics_label;s&&(e.fcmOptions.analyticsLabel=s)}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Pu(e){return typeof e=="object"&&!!e&&po in e}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Ru(e){if(!e||!e.options)throw Hn("App Configuration Object");if(!e.name)throw Hn("App Name");const t=["projectId","apiKey","appId","messagingSenderId"],{options:n}=e;for(const s of t)if(!n[s])throw Hn(s);return{appName:e.name,projectId:n.projectId,apiKey:n.apiKey,appId:n.appId,senderId:n.messagingSenderId}}function Hn(e){return Z.create("missing-app-config-values",{valueName:e})}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Nu{constructor(t,n,s){this.deliveryMetricsExportedToBigQueryEnabled=!1,this.onBackgroundMessageHandler=null,this.onMessageHandler=null,this.logEvents=[],this.isLogServiceStarted=!1;const r=Ru(t);this.firebaseDependencies={app:t,appConfig:r,installations:n,analyticsProvider:s}}_delete(){return Promise.resolve()}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function Fu(e){try{e.swRegistration=await navigator.serviceWorker.register(au,{scope:cu}),e.swRegistration.update().catch(()=>{}),await $u(e.swRegistration)}catch(t){throw Z.create("failed-service-worker-registration",{browserErrorMessage:t?.message})}}async function $u(e){return new Promise((t,n)=>{const s=setTimeout(()=>n(new Error(`Service worker not registered after ${Dr} ms`)),Dr),r=e.installing||e.waiting;e.active?(clearTimeout(s),t()):r?r.onstatechange=i=>{i.target?.state==="activated"&&(r.onstatechange=null,clearTimeout(s),t())}:(clearTimeout(s),n(new Error("No incoming service worker found.")))})}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function Bu(e,t){if(!t&&!e.swRegistration&&await Fu(e),!(!t&&e.swRegistration)){if(!(t instanceof ServiceWorkerRegistration))throw Z.create("invalid-sw-registration");e.swRegistration=t}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function ku(e,t){t?e.vapidKey=t:e.vapidKey||(e.vapidKey=ho)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function _o(e,t){if(!navigator)throw Z.create("only-available-in-window");if(Notification.permission==="default"&&await Notification.requestPermission(),Notification.permission!=="granted")throw Z.create("permission-blocked");return await ku(e,t?.vapidKey),await Bu(e,t?.serviceWorkerRegistration),Tu(e)}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function Lu(e,t,n){const s=Hu(t);(await e.firebaseDependencies.analyticsProvider.get()).logEvent(s,{message_id:n[po],message_name:n[fu],message_time:n[uu],message_device_time:Math.floor(Date.now()/1e3)})}function Hu(e){switch(e){case Bt.NOTIFICATION_CLICKED:return"notification_open";case Bt.PUSH_RECEIVED:return"notification_foreground";default:throw new Error}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function ju(e,t){const n=t.data;if(!n.isFirebaseMessaging)return;e.onMessageHandler&&n.messageType===Bt.PUSH_RECEIVED&&(typeof e.onMessageHandler=="function"?e.onMessageHandler(Rr(n)):e.onMessageHandler.next(Rr(n)));const s=n.data;Pu(s)&&s[du]==="1"&&await Lu(e,n.messageType,s)}const Nr="@firebase/messaging",Fr="0.12.23";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Vu=e=>{const t=new Nu(e.getProvider("app").getImmediate(),e.getProvider("installations-internal").getImmediate(),e.getProvider("analytics-internal"));return navigator.serviceWorker.addEventListener("message",n=>ju(t,n)),t},Uu=e=>{const t=e.getProvider("messaging").getImmediate();return{getToken:s=>_o(t,s)}};function Ku(){nt(new We("messaging",Vu,"PUBLIC")),nt(new We("messaging-internal",Uu,"PRIVATE")),Ve(Nr,Fr),Ve(Nr,Fr,"esm2020")}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function Wu(){try{await Vi()}catch{return!1}return typeof window<"u"&&ji()&&al()&&"serviceWorker"in navigator&&"PushManager"in window&&"Notification"in window&&"fetch"in window&&ServiceWorkerRegistration.prototype.hasOwnProperty("showNotification")&&PushSubscription.prototype.hasOwnProperty("getKey")}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function qu(e,t){if(!navigator)throw Z.create("only-available-in-window");return e.onMessageHandler=t,()=>{e.onMessageHandler=null}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function zu(e=lf()){return Wu().then(t=>{if(!t)throw Z.create("unsupported-browser")},t=>{throw Z.create("indexed-db-unsupported")}),Ds(Cs(e),"messaging").getImmediate()}async function Gu(e,t){return e=Cs(e),_o(e,t)}function Ju(e,t){return e=Cs(e),qu(e,t)}Ku();const Yu={apiKey:"AIzaSyAGxR--Jx9ELN6IZ5hb1sCD67vreCJqm-k",authDomain:"gruandus.firebaseapp.com",projectId:"gruandus",storageBucket:"gruandus.firebasestorage.app",messagingSenderId:"104287336044",appId:"1:104287336044:web:c2065e0f2f6fb15ff64a49"},Xu=Wi(Yu),$r=zu(Xu),Zu={id:"app-container"},Qu={__name:"App",setup(e){const t=sa(!1);let n=null;const s=async()=>{try{const i=await Gu($r,{vapidKey:"BPACu3jz1Y3_bB4VPwO96LkPua-bJKVXBOioaf75Gc7xQQ-aqZ04a0qBSbxuX6ZW6KcPB1Lcv68zGP5qrM2q9dU"});i?(console.log("FCM Registration Token:",i),alert(`FCM Token: ${i}`)):console.log("No registration token available. Request permission.")}catch(i){console.error("An error occurred while retrieving token:",i)}};di(async()=>{Ju($r,i=>{console.log("Message received in the foreground:",i),i.notification?alert(`New Message: ${i.notification.title}`):console.log("Received a data-only message:",i.data)})}),window.addEventListener("beforeinstallprompt",i=>{i.preventDefault(),n=i,t.value=!0,console.log("PWA is installable!")}),window.addEventListener("appinstalled",()=>{t.value=!1,console.log("PWA was installed!")});const r=()=>{n&&(t.value=!1,n.prompt(),n.userChoice.then(i=>{i.outcome==="accepted"?console.log("User accepted the install prompt."):console.log("User dismissed the install prompt."),n=null}))};return(i,o)=>(Yn(),nr("div",Zu,[o[0]||(o[0]=Ot("h1",null,"Welcome to My PWA! 🚀",-1)),o[1]||(o[1]=Ot("p",null,"This app behaves like a native app when installed.",-1)),t.value?(Yn(),nr("button",{key:0,onClick:r},"Install App")):dc("",!0),Ot("button",{onClick:s},"Log Token")]))}};zc(Qu).mount("#app");
