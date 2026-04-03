function e(e,t,i,n){var a,r=arguments.length,o=r<3?t:null===n?n=Object.getOwnPropertyDescriptor(t,i):n;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)o=Reflect.decorate(e,t,i,n);else for(var s=e.length-1;s>=0;s--)(a=e[s])&&(o=(r<3?a(o):r>3?a(t,i,o):a(t,i))||o);return r>3&&o&&Object.defineProperty(t,i,o),o}"function"==typeof SuppressedError&&SuppressedError;
/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const t=globalThis,i=t.ShadowRoot&&(void 0===t.ShadyCSS||t.ShadyCSS.nativeShadow)&&"adoptedStyleSheets"in Document.prototype&&"replace"in CSSStyleSheet.prototype,n=Symbol(),a=new WeakMap;let r=class{constructor(e,t,i){if(this._$cssResult$=!0,i!==n)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=e,this.t=t}get styleSheet(){let e=this.o;const t=this.t;if(i&&void 0===e){const i=void 0!==t&&1===t.length;i&&(e=a.get(t)),void 0===e&&((this.o=e=new CSSStyleSheet).replaceSync(this.cssText),i&&a.set(t,e))}return e}toString(){return this.cssText}};const o=(e,...t)=>{const i=1===e.length?e[0]:t.reduce((t,i,n)=>t+(e=>{if(!0===e._$cssResult$)return e.cssText;if("number"==typeof e)return e;throw Error("Value passed to 'css' function must be a 'css' function result: "+e+". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.")})(i)+e[n+1],e[0]);return new r(i,e,n)},s=i?e=>e:e=>e instanceof CSSStyleSheet?(e=>{let t="";for(const i of e.cssRules)t+=i.cssText;return(e=>new r("string"==typeof e?e:e+"",void 0,n))(t)})(e):e,{is:l,defineProperty:c,getOwnPropertyDescriptor:d,getOwnPropertyNames:h,getOwnPropertySymbols:u,getPrototypeOf:g}=Object,m=globalThis,p=m.trustedTypes,f=p?p.emptyScript:"",_=m.reactiveElementPolyfillSupport,v=(e,t)=>e,b={toAttribute(e,t){switch(t){case Boolean:e=e?f:null;break;case Object:case Array:e=null==e?e:JSON.stringify(e)}return e},fromAttribute(e,t){let i=e;switch(t){case Boolean:i=null!==e;break;case Number:i=null===e?null:Number(e);break;case Object:case Array:try{i=JSON.parse(e)}catch(e){i=null}}return i}},y=(e,t)=>!l(e,t),$={attribute:!0,type:String,converter:b,reflect:!1,useDefault:!1,hasChanged:y};
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */Symbol.metadata??=Symbol("metadata"),m.litPropertyMetadata??=new WeakMap;let w=class extends HTMLElement{static addInitializer(e){this._$Ei(),(this.l??=[]).push(e)}static get observedAttributes(){return this.finalize(),this._$Eh&&[...this._$Eh.keys()]}static createProperty(e,t=$){if(t.state&&(t.attribute=!1),this._$Ei(),this.prototype.hasOwnProperty(e)&&((t=Object.create(t)).wrapped=!0),this.elementProperties.set(e,t),!t.noAccessor){const i=Symbol(),n=this.getPropertyDescriptor(e,i,t);void 0!==n&&c(this.prototype,e,n)}}static getPropertyDescriptor(e,t,i){const{get:n,set:a}=d(this.prototype,e)??{get(){return this[t]},set(e){this[t]=e}};return{get:n,set(t){const r=n?.call(this);a?.call(this,t),this.requestUpdate(e,r,i)},configurable:!0,enumerable:!0}}static getPropertyOptions(e){return this.elementProperties.get(e)??$}static _$Ei(){if(this.hasOwnProperty(v("elementProperties")))return;const e=g(this);e.finalize(),void 0!==e.l&&(this.l=[...e.l]),this.elementProperties=new Map(e.elementProperties)}static finalize(){if(this.hasOwnProperty(v("finalized")))return;if(this.finalized=!0,this._$Ei(),this.hasOwnProperty(v("properties"))){const e=this.properties,t=[...h(e),...u(e)];for(const i of t)this.createProperty(i,e[i])}const e=this[Symbol.metadata];if(null!==e){const t=litPropertyMetadata.get(e);if(void 0!==t)for(const[e,i]of t)this.elementProperties.set(e,i)}this._$Eh=new Map;for(const[e,t]of this.elementProperties){const i=this._$Eu(e,t);void 0!==i&&this._$Eh.set(i,e)}this.elementStyles=this.finalizeStyles(this.styles)}static finalizeStyles(e){const t=[];if(Array.isArray(e)){const i=new Set(e.flat(1/0).reverse());for(const e of i)t.unshift(s(e))}else void 0!==e&&t.push(s(e));return t}static _$Eu(e,t){const i=t.attribute;return!1===i?void 0:"string"==typeof i?i:"string"==typeof e?e.toLowerCase():void 0}constructor(){super(),this._$Ep=void 0,this.isUpdatePending=!1,this.hasUpdated=!1,this._$Em=null,this._$Ev()}_$Ev(){this._$ES=new Promise(e=>this.enableUpdating=e),this._$AL=new Map,this._$E_(),this.requestUpdate(),this.constructor.l?.forEach(e=>e(this))}addController(e){(this._$EO??=new Set).add(e),void 0!==this.renderRoot&&this.isConnected&&e.hostConnected?.()}removeController(e){this._$EO?.delete(e)}_$E_(){const e=new Map,t=this.constructor.elementProperties;for(const i of t.keys())this.hasOwnProperty(i)&&(e.set(i,this[i]),delete this[i]);e.size>0&&(this._$Ep=e)}createRenderRoot(){const e=this.shadowRoot??this.attachShadow(this.constructor.shadowRootOptions);return((e,n)=>{if(i)e.adoptedStyleSheets=n.map(e=>e instanceof CSSStyleSheet?e:e.styleSheet);else for(const i of n){const n=document.createElement("style"),a=t.litNonce;void 0!==a&&n.setAttribute("nonce",a),n.textContent=i.cssText,e.appendChild(n)}})(e,this.constructor.elementStyles),e}connectedCallback(){this.renderRoot??=this.createRenderRoot(),this.enableUpdating(!0),this._$EO?.forEach(e=>e.hostConnected?.())}enableUpdating(e){}disconnectedCallback(){this._$EO?.forEach(e=>e.hostDisconnected?.())}attributeChangedCallback(e,t,i){this._$AK(e,i)}_$ET(e,t){const i=this.constructor.elementProperties.get(e),n=this.constructor._$Eu(e,i);if(void 0!==n&&!0===i.reflect){const a=(void 0!==i.converter?.toAttribute?i.converter:b).toAttribute(t,i.type);this._$Em=e,null==a?this.removeAttribute(n):this.setAttribute(n,a),this._$Em=null}}_$AK(e,t){const i=this.constructor,n=i._$Eh.get(e);if(void 0!==n&&this._$Em!==n){const e=i.getPropertyOptions(n),a="function"==typeof e.converter?{fromAttribute:e.converter}:void 0!==e.converter?.fromAttribute?e.converter:b;this._$Em=n;const r=a.fromAttribute(t,e.type);this[n]=r??this._$Ej?.get(n)??r,this._$Em=null}}requestUpdate(e,t,i,n=!1,a){if(void 0!==e){const r=this.constructor;if(!1===n&&(a=this[e]),i??=r.getPropertyOptions(e),!((i.hasChanged??y)(a,t)||i.useDefault&&i.reflect&&a===this._$Ej?.get(e)&&!this.hasAttribute(r._$Eu(e,i))))return;this.C(e,t,i)}!1===this.isUpdatePending&&(this._$ES=this._$EP())}C(e,t,{useDefault:i,reflect:n,wrapped:a},r){i&&!(this._$Ej??=new Map).has(e)&&(this._$Ej.set(e,r??t??this[e]),!0!==a||void 0!==r)||(this._$AL.has(e)||(this.hasUpdated||i||(t=void 0),this._$AL.set(e,t)),!0===n&&this._$Em!==e&&(this._$Eq??=new Set).add(e))}async _$EP(){this.isUpdatePending=!0;try{await this._$ES}catch(e){Promise.reject(e)}const e=this.scheduleUpdate();return null!=e&&await e,!this.isUpdatePending}scheduleUpdate(){return this.performUpdate()}performUpdate(){if(!this.isUpdatePending)return;if(!this.hasUpdated){if(this.renderRoot??=this.createRenderRoot(),this._$Ep){for(const[e,t]of this._$Ep)this[e]=t;this._$Ep=void 0}const e=this.constructor.elementProperties;if(e.size>0)for(const[t,i]of e){const{wrapped:e}=i,n=this[t];!0!==e||this._$AL.has(t)||void 0===n||this.C(t,void 0,i,n)}}let e=!1;const t=this._$AL;try{e=this.shouldUpdate(t),e?(this.willUpdate(t),this._$EO?.forEach(e=>e.hostUpdate?.()),this.update(t)):this._$EM()}catch(t){throw e=!1,this._$EM(),t}e&&this._$AE(t)}willUpdate(e){}_$AE(e){this._$EO?.forEach(e=>e.hostUpdated?.()),this.hasUpdated||(this.hasUpdated=!0,this.firstUpdated(e)),this.updated(e)}_$EM(){this._$AL=new Map,this.isUpdatePending=!1}get updateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this._$ES}shouldUpdate(e){return!0}update(e){this._$Eq&&=this._$Eq.forEach(e=>this._$ET(e,this[e])),this._$EM()}updated(e){}firstUpdated(e){}};w.elementStyles=[],w.shadowRootOptions={mode:"open"},w[v("elementProperties")]=new Map,w[v("finalized")]=new Map,_?.({ReactiveElement:w}),(m.reactiveElementVersions??=[]).push("2.1.2");
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const C=globalThis,k=e=>e,x=C.trustedTypes,A=x?x.createPolicy("lit-html",{createHTML:e=>e}):void 0,S="$lit$",E=`lit$${Math.random().toFixed(9).slice(2)}$`,M="?"+E,L=`<${M}>`,I=document,O=()=>I.createComment(""),R=e=>null===e||"object"!=typeof e&&"function"!=typeof e,T=Array.isArray,P="[ \t\n\f\r]",H=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,U=/-->/g,z=/>/g,V=RegExp(`>|${P}(?:([^\\s"'>=/]+)(${P}*=${P}*(?:[^ \t\n\f\r"'\`<>=]|("|')|))|$)`,"g"),N=/'/g,D=/"/g,W=/^(?:script|style|textarea|title)$/i,j=(e=>(t,...i)=>({_$litType$:e,strings:t,values:i}))(1),B=Symbol.for("lit-noChange"),F=Symbol.for("lit-nothing"),Z=new WeakMap,J=I.createTreeWalker(I,129);function q(e,t){if(!T(e)||!e.hasOwnProperty("raw"))throw Error("invalid template strings array");return void 0!==A?A.createHTML(t):t}const K=(e,t)=>{const i=e.length-1,n=[];let a,r=2===t?"<svg>":3===t?"<math>":"",o=H;for(let t=0;t<i;t++){const i=e[t];let s,l,c=-1,d=0;for(;d<i.length&&(o.lastIndex=d,l=o.exec(i),null!==l);)d=o.lastIndex,o===H?"!--"===l[1]?o=U:void 0!==l[1]?o=z:void 0!==l[2]?(W.test(l[2])&&(a=RegExp("</"+l[2],"g")),o=V):void 0!==l[3]&&(o=V):o===V?">"===l[0]?(o=a??H,c=-1):void 0===l[1]?c=-2:(c=o.lastIndex-l[2].length,s=l[1],o=void 0===l[3]?V:'"'===l[3]?D:N):o===D||o===N?o=V:o===U||o===z?o=H:(o=V,a=void 0);const h=o===V&&e[t+1].startsWith("/>")?" ":"";r+=o===H?i+L:c>=0?(n.push(s),i.slice(0,c)+S+i.slice(c)+E+h):i+E+(-2===c?t:h)}return[q(e,r+(e[i]||"<?>")+(2===t?"</svg>":3===t?"</math>":"")),n]};class Y{constructor({strings:e,_$litType$:t},i){let n;this.parts=[];let a=0,r=0;const o=e.length-1,s=this.parts,[l,c]=K(e,t);if(this.el=Y.createElement(l,i),J.currentNode=this.el.content,2===t||3===t){const e=this.el.content.firstChild;e.replaceWith(...e.childNodes)}for(;null!==(n=J.nextNode())&&s.length<o;){if(1===n.nodeType){if(n.hasAttributes())for(const e of n.getAttributeNames())if(e.endsWith(S)){const t=c[r++],i=n.getAttribute(e).split(E),o=/([.?@])?(.*)/.exec(t);s.push({type:1,index:a,name:o[2],strings:i,ctor:"."===o[1]?te:"?"===o[1]?ie:"@"===o[1]?ne:ee}),n.removeAttribute(e)}else e.startsWith(E)&&(s.push({type:6,index:a}),n.removeAttribute(e));if(W.test(n.tagName)){const e=n.textContent.split(E),t=e.length-1;if(t>0){n.textContent=x?x.emptyScript:"";for(let i=0;i<t;i++)n.append(e[i],O()),J.nextNode(),s.push({type:2,index:++a});n.append(e[t],O())}}}else if(8===n.nodeType)if(n.data===M)s.push({type:2,index:a});else{let e=-1;for(;-1!==(e=n.data.indexOf(E,e+1));)s.push({type:7,index:a}),e+=E.length-1}a++}}static createElement(e,t){const i=I.createElement("template");return i.innerHTML=e,i}}function G(e,t,i=e,n){if(t===B)return t;let a=void 0!==n?i._$Co?.[n]:i._$Cl;const r=R(t)?void 0:t._$litDirective$;return a?.constructor!==r&&(a?._$AO?.(!1),void 0===r?a=void 0:(a=new r(e),a._$AT(e,i,n)),void 0!==n?(i._$Co??=[])[n]=a:i._$Cl=a),void 0!==a&&(t=G(e,a._$AS(e,t.values),a,n)),t}class Q{constructor(e,t){this._$AV=[],this._$AN=void 0,this._$AD=e,this._$AM=t}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(e){const{el:{content:t},parts:i}=this._$AD,n=(e?.creationScope??I).importNode(t,!0);J.currentNode=n;let a=J.nextNode(),r=0,o=0,s=i[0];for(;void 0!==s;){if(r===s.index){let t;2===s.type?t=new X(a,a.nextSibling,this,e):1===s.type?t=new s.ctor(a,s.name,s.strings,this,e):6===s.type&&(t=new ae(a,this,e)),this._$AV.push(t),s=i[++o]}r!==s?.index&&(a=J.nextNode(),r++)}return J.currentNode=I,n}p(e){let t=0;for(const i of this._$AV)void 0!==i&&(void 0!==i.strings?(i._$AI(e,i,t),t+=i.strings.length-2):i._$AI(e[t])),t++}}class X{get _$AU(){return this._$AM?._$AU??this._$Cv}constructor(e,t,i,n){this.type=2,this._$AH=F,this._$AN=void 0,this._$AA=e,this._$AB=t,this._$AM=i,this.options=n,this._$Cv=n?.isConnected??!0}get parentNode(){let e=this._$AA.parentNode;const t=this._$AM;return void 0!==t&&11===e?.nodeType&&(e=t.parentNode),e}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(e,t=this){e=G(this,e,t),R(e)?e===F||null==e||""===e?(this._$AH!==F&&this._$AR(),this._$AH=F):e!==this._$AH&&e!==B&&this._(e):void 0!==e._$litType$?this.$(e):void 0!==e.nodeType?this.T(e):(e=>T(e)||"function"==typeof e?.[Symbol.iterator])(e)?this.k(e):this._(e)}O(e){return this._$AA.parentNode.insertBefore(e,this._$AB)}T(e){this._$AH!==e&&(this._$AR(),this._$AH=this.O(e))}_(e){this._$AH!==F&&R(this._$AH)?this._$AA.nextSibling.data=e:this.T(I.createTextNode(e)),this._$AH=e}$(e){const{values:t,_$litType$:i}=e,n="number"==typeof i?this._$AC(e):(void 0===i.el&&(i.el=Y.createElement(q(i.h,i.h[0]),this.options)),i);if(this._$AH?._$AD===n)this._$AH.p(t);else{const e=new Q(n,this),i=e.u(this.options);e.p(t),this.T(i),this._$AH=e}}_$AC(e){let t=Z.get(e.strings);return void 0===t&&Z.set(e.strings,t=new Y(e)),t}k(e){T(this._$AH)||(this._$AH=[],this._$AR());const t=this._$AH;let i,n=0;for(const a of e)n===t.length?t.push(i=new X(this.O(O()),this.O(O()),this,this.options)):i=t[n],i._$AI(a),n++;n<t.length&&(this._$AR(i&&i._$AB.nextSibling,n),t.length=n)}_$AR(e=this._$AA.nextSibling,t){for(this._$AP?.(!1,!0,t);e!==this._$AB;){const t=k(e).nextSibling;k(e).remove(),e=t}}setConnected(e){void 0===this._$AM&&(this._$Cv=e,this._$AP?.(e))}}class ee{get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}constructor(e,t,i,n,a){this.type=1,this._$AH=F,this._$AN=void 0,this.element=e,this.name=t,this._$AM=n,this.options=a,i.length>2||""!==i[0]||""!==i[1]?(this._$AH=Array(i.length-1).fill(new String),this.strings=i):this._$AH=F}_$AI(e,t=this,i,n){const a=this.strings;let r=!1;if(void 0===a)e=G(this,e,t,0),r=!R(e)||e!==this._$AH&&e!==B,r&&(this._$AH=e);else{const n=e;let o,s;for(e=a[0],o=0;o<a.length-1;o++)s=G(this,n[i+o],t,o),s===B&&(s=this._$AH[o]),r||=!R(s)||s!==this._$AH[o],s===F?e=F:e!==F&&(e+=(s??"")+a[o+1]),this._$AH[o]=s}r&&!n&&this.j(e)}j(e){e===F?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,e??"")}}class te extends ee{constructor(){super(...arguments),this.type=3}j(e){this.element[this.name]=e===F?void 0:e}}class ie extends ee{constructor(){super(...arguments),this.type=4}j(e){this.element.toggleAttribute(this.name,!!e&&e!==F)}}class ne extends ee{constructor(e,t,i,n,a){super(e,t,i,n,a),this.type=5}_$AI(e,t=this){if((e=G(this,e,t,0)??F)===B)return;const i=this._$AH,n=e===F&&i!==F||e.capture!==i.capture||e.once!==i.once||e.passive!==i.passive,a=e!==F&&(i===F||n);n&&this.element.removeEventListener(this.name,this,i),a&&this.element.addEventListener(this.name,this,e),this._$AH=e}handleEvent(e){"function"==typeof this._$AH?this._$AH.call(this.options?.host??this.element,e):this._$AH.handleEvent(e)}}class ae{constructor(e,t,i){this.element=e,this.type=6,this._$AN=void 0,this._$AM=t,this.options=i}get _$AU(){return this._$AM._$AU}_$AI(e){G(this,e)}}const re=C.litHtmlPolyfillSupport;re?.(Y,X),(C.litHtmlVersions??=[]).push("3.3.2");const oe=globalThis;
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */class se extends w{constructor(){super(...arguments),this.renderOptions={host:this},this._$Do=void 0}createRenderRoot(){const e=super.createRenderRoot();return this.renderOptions.renderBefore??=e.firstChild,e}update(e){const t=this.render();this.hasUpdated||(this.renderOptions.isConnected=this.isConnected),super.update(e),this._$Do=((e,t,i)=>{const n=i?.renderBefore??t;let a=n._$litPart$;if(void 0===a){const e=i?.renderBefore??null;n._$litPart$=a=new X(t.insertBefore(O(),e),e,void 0,i??{})}return a._$AI(e),a})(t,this.renderRoot,this.renderOptions)}connectedCallback(){super.connectedCallback(),this._$Do?.setConnected(!0)}disconnectedCallback(){super.disconnectedCallback(),this._$Do?.setConnected(!1)}render(){return B}}se._$litElement$=!0,se.finalized=!0,oe.litElementHydrateSupport?.({LitElement:se});const le=oe.litElementPolyfillSupport;le?.({LitElement:se}),(oe.litElementVersions??=[]).push("4.2.2");
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const ce=e=>(t,i)=>{void 0!==i?i.addInitializer(()=>{customElements.define(e,t)}):customElements.define(e,t)},de={attribute:!0,type:String,converter:b,reflect:!1,hasChanged:y},he=(e=de,t,i)=>{const{kind:n,metadata:a}=i;let r=globalThis.litPropertyMetadata.get(a);if(void 0===r&&globalThis.litPropertyMetadata.set(a,r=new Map),"setter"===n&&((e=Object.create(e)).wrapped=!0),r.set(i.name,e),"accessor"===n){const{name:n}=i;return{set(i){const a=t.get.call(this);t.set.call(this,i),this.requestUpdate(n,a,e,!0,i)},init(t){return void 0!==t&&this.C(n,void 0,e,t),t}}}if("setter"===n){const{name:n}=i;return function(i){const a=this[n];t.call(this,i),this.requestUpdate(n,a,e,!0,i)}}throw Error("Unsupported decorator location: "+n)};
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */function ue(e){return(t,i)=>"object"==typeof i?he(e,t,i):((e,t,i)=>{const n=t.hasOwnProperty(i);return t.constructor.createProperty(i,e),n?Object.getOwnPropertyDescriptor(t,i):void 0})(e,t,i)}
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */function ge(e){return ue({...e,state:!0,attribute:!1})}var me,pe;!function(e){e.language="language",e.system="system",e.comma_decimal="comma_decimal",e.decimal_comma="decimal_comma",e.space_comma="space_comma",e.none="none"}(me||(me={})),function(e){e.language="language",e.system="system",e.am_pm="12",e.twenty_four="24"}(pe||(pe={}));var fe=function(e,t,i,n){n=n||{},i=null==i?{}:i;var a=new Event(t,{bubbles:void 0===n.bubbles||n.bubbles,cancelable:Boolean(n.cancelable),composed:void 0===n.composed||n.composed});return a.detail=i,e.dispatchEvent(a),a};let _e=class extends se{constructor(){super(...arguments),this._initialized=!1}setConfig(e){this._config=e,this.loadCardHelpers()}shouldUpdate(){return this._initialized||this._initialize(),!0}get _name(){var e;return(null===(e=this._config)||void 0===e?void 0:e.name)||""}get _entity(){var e;return(null===(e=this._config)||void 0===e?void 0:e.entity)||""}get _show_warning(){var e;return(null===(e=this._config)||void 0===e?void 0:e.show_warning)||!1}get _show_error(){var e;return(null===(e=this._config)||void 0===e?void 0:e.show_error)||!1}get _height(){var e;return(null===(e=this._config)||void 0===e?void 0:e.height)||""}get _width(){var e;return(null===(e=this._config)||void 0===e?void 0:e.width)||""}render(){var e;if(!this.hass||!this._helpers)return j``;let t;return t=this._config,j`
      <div class="values">
        <ha-textfield
            label="Card Title (optional)"
            .value=${t.card_title?t.card_title:""}
            .configValue=${"card_title"}
            @input=${this._valueChangedString}
        ></ha-textfield>
        <ha-textfield
            label="Height (optional)"
            .value=${t.height?t.height:""}
            .configValue=${"height"}
            @input=${this._valueChangedString}
            helper="e.g., 400px, 50vh"
        ></ha-textfield>
        <ha-textfield
            label="Width (optional)"
            .value=${t.width?t.width:""}
            .configValue=${"width"}
            @input=${this._valueChangedString}
            helper="e.g., 100%, 500px"
        ></ha-textfield>
        
        <div class="side-by-side">
          <ha-selector
            .hass=${this.hass}
            .selector=${{select:{options:[{value:"",label:"Default (Light)"},{value:"Light",label:"Light"},{value:"Voyager",label:"Voyager"},{value:"Satellite",label:"Satellite"},{value:"Dark",label:"Dark"}]}}}
            .value=${t.map_style||""}
            .label=${"Map Style (optional)"}
            .configValue=${"map_style"}
            @value-changed=${this._handleSelectorChanged}
          ></ha-selector>
          <ha-selector
            .hass=${this.hass}
            .selector=${{select:{options:[{value:"",label:"Default (5)"},{value:"4",label:"4"},{value:"5",label:"5"},{value:"6",label:"6"},{value:"7",label:"7"}]}}}
            .value=${(null===(e=t.zoom_level)||void 0===e?void 0:e.toString())||""}
            .label=${"Zoom Level (optional)"}
            .configValue=${"zoom_level"}
            @value-changed=${this._handleSelectorNumberChanged}
          ></ha-selector>
        </div>
        <ha-textfield
            label="Map Centre Latitude (optional)"
            .value=${this._formatCoordinateValue(t.center_latitude)}
            .configValue=${"center_latitude"}
            @input=${this._valueChangedCoordinate}
            helper="Number or entity ID (e.g., device_tracker.phone)"
        ></ha-textfield>
        <ha-textfield
            label="Map Centre Longitude (optional)"
            .value=${this._formatCoordinateValue(t.center_longitude)}
            .configValue=${"center_longitude"}
            @input=${this._valueChangedCoordinate}
            helper="Number or entity ID"
        ></ha-textfield>
        <ha-textfield
            label="Marker Latitude (optional)"
            .value=${this._formatCoordinateValue(t.marker_latitude)}
            .configValue=${"marker_latitude"}
            @input=${this._valueChangedCoordinate}
            helper="Number or entity ID"
        ></ha-textfield>
        <ha-textfield
            label="Marker Longitude (optional)"
            .value=${this._formatCoordinateValue(t.marker_longitude)}
            .configValue=${"marker_longitude"}
            @input=${this._valueChangedCoordinate}
            helper="Number or entity ID"
        ></ha-textfield>
        <h3>Mobile Device Overrides</h3>
        <p style="font-size: 0.9em; color: var(--secondary-text-color); margin: 0 0 10px 0;">
          When accessed from a mobile device, these coordinates will override the base coordinates above.
        </p>
        <ha-textfield
            label="Mobile Centre Latitude (optional)"
            .value=${this._formatCoordinateValue(t.mobile_center_latitude)}
            .configValue=${"mobile_center_latitude"}
            @input=${this._valueChangedCoordinate}
            helper="Mobile override (e.g., device_tracker.phone)"
        ></ha-textfield>
        <ha-textfield
            label="Mobile Centre Longitude (optional)"
            .value=${this._formatCoordinateValue(t.mobile_center_longitude)}
            .configValue=${"mobile_center_longitude"}
            @input=${this._valueChangedCoordinate}
            helper="Mobile override"
        ></ha-textfield>
        <ha-textfield
            label="Mobile Marker Latitude (optional)"
            .value=${this._formatCoordinateValue(t.mobile_marker_latitude)}
            .configValue=${"mobile_marker_latitude"}
            @input=${this._valueChangedCoordinate}
            helper="Mobile override"
        ></ha-textfield>
        <ha-textfield
            label="Mobile Marker Longitude (optional)"
            .value=${this._formatCoordinateValue(t.mobile_marker_longitude)}
            .configValue=${"mobile_marker_longitude"}
            @input=${this._valueChangedCoordinate}
            helper="Mobile override"
        ></ha-textfield>
        <div class="side-by-side">
          <ha-textfield
              label="Frame Count (optional)"
              .value=${t.frame_count?t.frame_count:""}
              .configValue=${"frame_count"}
              @input=${this._valueChangedNumber}
          ></ha-textfield>
          <ha-textfield
              label="Frame Delay(ms) (optional)"
              .value=${t.frame_delay?t.frame_delay:""}
              .configValue=${"frame_delay"}
              @input=${this._valueChangedNumber}
          ></ha-textfield>
          <ha-textfield
              label="Restart Delay(ms) (optional)"
              .value=${t.restart_delay?t.restart_delay:""}
              .configValue=${"restart_delay"}
              @input=${this._valueChangedNumber}
          ></ha-textfield>
        </div>
        <div class="side-by-side">
          <label>
            Static Map
            <ha-switch
              .checked=${!0===t.static_map}
              .configValue=${"static_map"}
              @change=${this._valueChangedSwitch}
            ></ha-switch>
          </label>
          <label>
            Show Zoom
            <ha-switch
              .checked=${!0===t.show_zoom}
              .configValue=${"show_zoom"}
              @change=${this._valueChangedSwitch}
            ></ha-switch>
          </label>
          <label>
            Square Map
            <ha-switch
              .checked=${!0===t.square_map}
              .configValue=${"square_map"}
              @change=${this._valueChangedSwitch}
            ></ha-switch>
          </label>
        </div>
        <div class="side-by-side">
          <label>
            Show Marker
            <ha-switch
              .checked=${!0===t.show_marker}
              .configValue=${"show_marker"}
              @change=${this._valueChangedSwitch}
            ></ha-switch>
          </label>
          <label>
            Show Playback
            <ha-switch
              .checked=${!0===t.show_playback}
              .configValue=${"show_playback"}
              @change=${this._valueChangedSwitch}
            ></ha-switch>
          </label>
          <label>
            Show Recenter
            <ha-switch
              .checked=${!0===t.show_recenter}
              .configValue=${"show_recenter"}
              @change=${this._valueChangedSwitch}
            ></ha-switch>
          </label>
        </div>
        ${!0===t.show_marker?j`
                <h3>Marker Icon</h3>
                <div class="side-by-side">
                  <ha-selector
                    .hass=${this.hass}
                    .selector=${{select:{options:[{value:"default",label:"Default (Home)"},{value:"entity_picture",label:"Entity Picture"},{value:"mdi:account",label:"MDI: Account"},{value:"mdi:account-circle",label:"MDI: Account Circle"},{value:"mdi:map-marker",label:"MDI: Map Marker"},{value:"mdi:home",label:"MDI: Home"},{value:"mdi:car",label:"MDI: Car"},{value:"mdi:cellphone",label:"MDI: Cellphone"}]}}}
                    .value=${t.marker_icon||"default"}
                    .label=${"Icon Type"}
                    .configValue=${"marker_icon"}
                    @value-changed=${this._handleSelectorChanged}
                  ></ha-selector>
                </div>
                ${"entity_picture"===t.marker_icon?j`
                      <ha-textfield
                        label="Icon Entity (optional)"
                        .value=${t.marker_icon_entity||""}
                        .configValue=${"marker_icon_entity"}
                        @input=${this._valueChangedString}
                        helper="Entity with picture (auto-detects from marker entity if empty)"
                      ></ha-textfield>
                    `:""}
                <h4>Mobile Icon Overrides</h4>
                <div class="side-by-side">
                  <ha-selector
                    .hass=${this.hass}
                    .selector=${{select:{options:[{value:"",label:"None"},{value:"default",label:"Default (Home)"},{value:"entity_picture",label:"Entity Picture"},{value:"mdi:account",label:"MDI: Account"},{value:"mdi:account-circle",label:"MDI: Account Circle"},{value:"mdi:map-marker",label:"MDI: Map Marker"},{value:"mdi:home",label:"MDI: Home"},{value:"mdi:car",label:"MDI: Car"},{value:"mdi:cellphone",label:"MDI: Cellphone"}]}}}
                    .value=${t.mobile_marker_icon||""}
                    .label=${"Mobile Icon Type (optional)"}
                    .configValue=${"mobile_marker_icon"}
                    @value-changed=${this._handleSelectorChanged}
                  ></ha-selector>
                </div>
                ${"entity_picture"===t.mobile_marker_icon?j`
                      <ha-textfield
                        label="Mobile Icon Entity (optional)"
                        .value=${t.mobile_marker_icon_entity||""}
                        .configValue=${"mobile_marker_icon_entity"}
                        @input=${this._valueChangedString}
                        helper="Mobile override for entity with picture"
                      ></ha-textfield>
                    `:""}
              `:""}
        <div class="side-by-side">
          <label>
            Show Scale
            <ha-switch
              .checked=${!0===t.show_scale}
              .configValue=${"show_scale"}
              @change=${this._valueChangedSwitch}
            ></ha-switch>
          </label>
          <label>
            Show Range
            <ha-switch
              .checked=${!0===t.show_range}
              .configValue=${"show_range"}
              @change=${this._valueChangedSwitch}
            ></ha-switch>
          </label>
          <label>
            Show Extra Labels
            <ha-switch
              .checked=${!0===t.extra_labels}
              .configValue=${"extra_labels"}
              @change=${this._valueChangedSwitch}
            ></ha-switch>
          </label>
        </div>
      </div>
    `}_initialize(){void 0!==this.hass&&void 0!==this._config&&void 0!==this._helpers&&(this._initialized=!0)}async loadCardHelpers(){this._helpers=await window.loadCardHelpers()}_handleSelectorChanged(e){const t=e.target.configValue,i=e.detail.value;if(this._config&&t&&this._config[t]!==i){if(""===i||null===i){const e=Object.assign({},this._config);delete e[t],this._config=e}else this._config=Object.assign(Object.assign({},this._config),{[t]:i});fe(this,"config-changed",{config:this._config})}}_handleSelectorNumberChanged(e){const t=e.target.configValue,i=e.detail.value;if(!this._config||!t)return;const n=""===i||null===i?null:Number(i);if(this._config[t]!==n){if(null===n){const e=Object.assign({},this._config);delete e[t],this._config=e}else this._config=Object.assign(Object.assign({},this._config),{[t]:n});fe(this,"config-changed",{config:this._config})}}_valueChangedSwitch(e){const t=e.target;this._config&&this.hass&&t&&(this._config=Object.assign(Object.assign({},this._config),{[t.configValue]:t.checked}),fe(this,"config-changed",{config:this._config}))}_valueChangedNumber(e){if(!this._config||!this.hass)return;const t=e.target,i=t.configValue,n=t.value;this._config[i]!==Number(n)&&(i&&(""===n||null===n?delete this._config[i]:this._config=Object.assign(Object.assign({},this._config),{[i]:Number(n)})),fe(this,"config-changed",{config:this._config}))}_valueChangedString(e){if(!this._config||!this.hass)return;const t=e.target,i=t.configValue,n=t.value;this._config[i]!==n&&(i&&(""===n?delete this._config[i]:this._config=Object.assign(Object.assign({},this._config),{[i]:n})),fe(this,"config-changed",{config:this._config}))}_formatCoordinateValue(e){return null==e?"":"number"==typeof e?e.toString():"string"==typeof e?e:"object"==typeof e&&"entity"in e?e.entity:""}_valueChangedCoordinate(e){var t;if(!this._config||!this.hass)return;const i=e.target;if(i.configValue){const e=null===(t=i.value)||void 0===t?void 0:t.trim();if(""===e||null===e)delete this._config[i.configValue];else{const t=parseFloat(e);isNaN(t)?e.includes(".")?this._config=Object.assign(Object.assign({},this._config),{[i.configValue]:e}):(console.warn(`Weather Radar Card Editor: '${e}' should be a number or entity ID (e.g., device_tracker.phone)`),this._config=Object.assign(Object.assign({},this._config),{[i.configValue]:e})):this._config=Object.assign(Object.assign({},this._config),{[i.configValue]:t})}}fe(this,"config-changed",{config:this._config})}};_e.styles=o`
    ha-select,
    ha-selector,
    ha-textfield {
      margin-bottom: 16px;
      display: block;
    }
    label {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 0;
    }
    ha-switch {
      padding: 16px 6px;
    }
    .side-by-side {
      display: flex;
    }
    .side-by-side > * {
      flex: 1;
      padding-right: 4px;
    }
    .values {
      padding-left: 16px;
      background: var(--secondary-background-color);
    }
  `,e([ue({attribute:!1})],_e.prototype,"hass",void 0),e([ge()],_e.prototype,"_config",void 0),e([ge()],_e.prototype,"_helpers",void 0),_e=e([ce("weather-radar-card-editor")],_e);var ve={version:"Version",invalid_configuration:"Invalid configuration",show_warning:"Show Warning"},be={common:ve},ye={version:"Versjon",invalid_configuration:"Ikke gyldig konfiguration",show_warning:"Vis advarsel"},$e={common:ye},we={version:"Verzia",invalid_configuration:"Neplatná konfigurácia",show_warning:"Zobraziť upozornenie"},Ce={common:we};const ke={en:Object.freeze({__proto__:null,common:ve,default:be}),nb:Object.freeze({__proto__:null,common:ye,default:$e}),sk:Object.freeze({__proto__:null,common:we,default:Ce})};function xe(e,t="",i=""){const n=(localStorage.getItem("selectedLanguage")||"en").replace(/['"]+/g,"").replace("-","_");let a;try{a=e.split(".").reduce((e,t)=>e[t],ke[n])}catch(t){a=e.split(".").reduce((e,t)=>e[t],ke.en)}return void 0===a&&(a=e.split(".").reduce((e,t)=>e[t],ke.en)),""!==t&&""!==i&&(a=a.replace(t,i)),a}var Ae;console.info(`%c  WEATHER-RADAR-CARD \n%c  ${xe("common.version")} 2.4.1    `,"color: orange; font-weight: bold; background: black","color: white; font-weight: bold; background: dimgray"),console.log("Weather Radar Card: Script loaded and registering..."),window.customCards=window.customCards||[],window.customCards.push({type:"weather-radar-card",name:"Weather Radar Card",description:"A rain radar card using the new tiled images from RainViewer"});let Se=Ae=class extends se{constructor(){super(...arguments),this.isPanel=!1}static async getConfigElement(){return document.createElement("weather-radar-card-editor")}static getStubConfig(){return{}}setConfig(e){e.height&&e.square_map&&console.warn("Weather Radar Card: Both 'height' and 'square_map' are configured. Custom height will take priority."),e.height&&!this._validateCssSize(e.height)&&console.warn(`Weather Radar Card: Invalid height value '${e.height}'. Must be a number followed by a CSS unit (px, %, em, rem, vh, vw). Using default height.`),e.width&&!this._validateCssSize(e.width)&&console.warn(`Weather Radar Card: Invalid width value '${e.width}'. Must be a number followed by a CSS unit (px, %, em, rem, vh, vw). Using default width.`),this._validateCoordinateConfig("center_latitude",e.center_latitude),this._validateCoordinateConfig("center_longitude",e.center_longitude),this._validateCoordinateConfig("marker_latitude",e.marker_latitude),this._validateCoordinateConfig("marker_longitude",e.marker_longitude),this._validateCoordinateConfig("mobile_center_latitude",e.mobile_center_latitude),this._validateCoordinateConfig("mobile_center_longitude",e.mobile_center_longitude),this._validateCoordinateConfig("mobile_marker_latitude",e.mobile_marker_latitude),this._validateCoordinateConfig("mobile_marker_longitude",e.mobile_marker_longitude),this._config=e}getCardSize(){return 10}shouldUpdate(e){return!!this._config&&(e.has("_config")||e.has("hass"))}_validateCoordinateConfig(e,t){if(null!=t&&"number"!=typeof t){if("string"!=typeof t)return"object"==typeof t?(t.entity&&"string"==typeof t.entity||console.warn(`Weather Radar Card: '${e}' entity config missing required 'entity' field`),t.latitude_attribute&&"string"!=typeof t.latitude_attribute&&console.warn(`Weather Radar Card: '${e}' latitude_attribute must be a string`),void(t.longitude_attribute&&"string"!=typeof t.longitude_attribute&&console.warn(`Weather Radar Card: '${e}' longitude_attribute must be a string`))):void console.warn(`Weather Radar Card: Invalid type for '${e}'. Expected number, entity ID string, or entity config object.`);t.includes(".")||console.warn(`Weather Radar Card: '${e}' value '${t}' does not look like a valid entity ID. Expected format: 'domain.entity_name'`)}}_isMobileDevice(){const e=navigator.userAgent.toLowerCase(),t=e.includes("home assistant"),i=/android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(e),n=window.innerWidth<=768;return t||n||i}_getCurrentUserInfo(){var e,t,i,n,a;const r=null===(t=null===(e=this.hass)||void 0===e?void 0:e.user)||void 0===t?void 0:t.id;if(!r)return null;for(const[e,t]of Object.entries((null===(i=this.hass)||void 0===i?void 0:i.states)||{}))if(e.startsWith("person.")&&(null===(n=t.attributes)||void 0===n?void 0:n.user_id)===r){let i;const n=null===(a=t.attributes)||void 0===a?void 0:a.device_trackers;return Array.isArray(n)&&n.length>0?i=n[0]:"string"==typeof n&&n&&(i=n.split(",")[0].trim()),{personEntity:e,deviceTracker:i}}return null}_getCoordinateConfig(e,t,i,n){return i&&void 0!==t?t:i&&!e&&n?n:e}_getCoordinateFromEntity(e,t,i){var n;const a=null===(n=this.hass)||void 0===n?void 0:n.states[e];if(!a)return console.warn(`Weather Radar Card: Entity '${e}' not found for ${t}. Using fallback.`),null;const r=a.attributes[i];if(null==r)return console.warn(`Weather Radar Card: Entity '${e}' has no attribute '${i}' for ${t}. Using fallback.`),null;const o="number"==typeof r?r:parseFloat(r);return isNaN(o)?(console.warn(`Weather Radar Card: Entity '${e}' attribute '${i}' is not a valid number ('${r}'). Using fallback.`),null):"latitude"===t&&(o<-90||o>90)?(console.warn(`Weather Radar Card: Invalid latitude value ${o} from entity '${e}'. Must be between -90 and 90. Using fallback.`),null):"longitude"===t&&(o<-180||o>180)?(console.warn(`Weather Radar Card: Invalid longitude value ${o} from entity '${e}'. Must be between -180 and 180. Using fallback.`),null):o}_resolveCoordinate(e,t,i){var n,a;if(null==e)return i;if("number"==typeof e)return e;if("string"==typeof e)return null!==(n=this._getCoordinateFromEntity(e,t,t))&&void 0!==n?n:i;if("object"==typeof e&&"entity"in e){const n="latitude"===t?e.latitude_attribute||"latitude":e.longitude_attribute||"longitude";return null!==(a=this._getCoordinateFromEntity(e.entity,t,n))&&void 0!==a?a:i}return i}_findPersonEntityForDeviceTracker(e){var t,i;for(const[n,a]of Object.entries((null===(t=this.hass)||void 0===t?void 0:t.states)||{})){if(!n.startsWith("person."))continue;const t=null===(i=a.attributes)||void 0===i?void 0:i.device_trackers;if(Array.isArray(t)&&t.includes(e))return n}}_resolveToPersonEntity(e){var t;return e.startsWith("device_tracker.")&&null!==(t=this._findPersonEntityForDeviceTracker(e))&&void 0!==t?t:e}_getMarkerIconConfig(e,t){var i,n,a;let r,o;if(r=e?null!==(i=this._config.mobile_marker_icon)&&void 0!==i?i:"entity_picture":this._config.marker_icon||"default",o=e?this._config.mobile_marker_icon_entity:this._config.marker_icon_entity,"entity_picture"===r&&!o){const i=e&&null!==(n=this._config.mobile_marker_latitude)&&void 0!==n?n:this._config.marker_latitude;if("string"==typeof i&&(o=this._resolveToPersonEntity(i)),!o){const t=e&&null!==(a=this._config.mobile_center_latitude)&&void 0!==a?a:this._config.center_latitude;"string"==typeof t&&(o=this._resolveToPersonEntity(t))}!o&&(null==t?void 0:t.personEntity)&&(o=t.personEntity)}return{type:r,entity:o}}_resolveEntityPicture(e){var t,i;if(!e)return null;const n=null===(t=this.hass)||void 0===t?void 0:t.states[e];return(null===(i=null==n?void 0:n.attributes)||void 0===i?void 0:i.entity_picture)?n.attributes.entity_picture:null}_generateMarkerIconCode(e,t){const i=this._getMarkerIconConfig(e,t),n=(this._config.map_style||"light").toLowerCase();if(!i.type||"default"===i.type)return"var myIcon = L.icon({\n        iconUrl: '/local/community/weather-radar-card/'+svg_icon,\n        iconSize: [16, 16],\n      });";if("entity_picture"===i.type){const e=this._resolveEntityPicture(i.entity);if(!e)return console.warn(`Weather Radar Card: Could not resolve entity_picture for '${i.entity}'. Using default icon.`),"var myIcon = L.icon({\n          iconUrl: '/local/community/weather-radar-card/'+svg_icon,\n          iconSize: [16, 16],\n        });";return`var myIcon = L.icon({\n        iconUrl: '${e.replace(/'/g,"\\'").replace(/"/g,'\\"')}',\n        iconSize: [32, 32],\n        className: 'marker-entity-picture'\n      });`}if(i.type.startsWith("mdi:")){const e=i.type.substring(4),t=Ae.MDI_PATHS[e];if(!t)return console.warn(`Weather Radar Card: MDI icon '${e}' not found in embedded icons. Using default. Available icons: ${Object.keys(Ae.MDI_PATHS).join(", ")}`),"var myIcon = L.icon({\n          iconUrl: '/local/community/weather-radar-card/'+svg_icon,\n          iconSize: [16, 16],\n        });";return`var myIcon = L.divIcon({\n        html: '<svg viewBox="0 0 24 24" width="24" height="24"><path fill="${"dark"===n||"satellite"===n?"#EEEEEE":"#333333"}" d="${t}"/></svg>',\n        iconSize: [24, 24],\n        className: 'marker-mdi-icon'\n      });`}return console.warn(`Weather Radar Card: Unknown marker_icon type '${i.type}'. Using default.`),"var myIcon = L.icon({\n      iconUrl: '/local/community/weather-radar-card/'+svg_icon,\n      iconSize: [16, 16],\n    });"}_resolveCoordinatePair(e,t,i,n){var a,r,o;if("string"==typeof e&&"string"==typeof t&&e===t){const t=null===(a=this.hass)||void 0===a?void 0:a.states[e];if((null===(r=null==t?void 0:t.attributes)||void 0===r?void 0:r.latitude)&&(null===(o=null==t?void 0:t.attributes)||void 0===o?void 0:o.longitude)){const e=parseFloat(t.attributes.latitude),i=parseFloat(t.attributes.longitude);if(!isNaN(e)&&!isNaN(i))return{lat:e,lon:i}}}return{lat:this._resolveCoordinate(e,"latitude",i),lon:this._resolveCoordinate(t,"longitude",n)}}render(){var e,t,i,n,a,r,o,s,l,c,d,h;if(this._config.show_warning)return this.showWarning(xe("common.show_warning"));const u=`\n      <!DOCTYPE html>\n      <html>\n        <head>\n          <title>Weather Radar Card</title>\n          <meta charset="utf-8" />\n          <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n          <link rel="stylesheet" href="/local/community/weather-radar-card/leaflet.css"/>\n          <link rel="stylesheet" href="/local/community/weather-radar-card/leaflet.toolbar.min.css"/>\n          <script src="/local/community/weather-radar-card/leaflet.js"><\/script>\n          <script src="/local/community/weather-radar-card/leaflet.toolbar.min.js"><\/script>\n          <style>\n            body {\n              margin: 0;\n              padding: 0;\n            }\n            .text-container {\n              font: 12px/1.5 'Helvetica Neue', Arial, Helvetica, sans-serif;\n              margin: 0px 2.5px 0px 10px;\n            }\n            .text-container-small {\n              font: 10px/1.5 'Helvetica Neue', Arial, Helvetica, sans-serif;\n              margin: 0px 10px 0px 2.5px;\n            }\n            .light-links a {\n              color: blue;\n            }\n            .dark-links a {\n              color: steelblue;\n            }\n            #timestamp {\n              font: 14px/1.5 'Helvetica Neue', Arial, Helvetica, sans-serif;\n              margin: 0px 0px;\n              padding-top: 5px;\n            }\n            #color-bar {\n              margin: 0px 0px;\n            }\n            /* Custom marker icon styles */\n            .marker-entity-picture {\n              border-radius: 50%;\n              border: 2px solid white;\n              box-shadow: 0 2px 4px rgba(0,0,0,0.3);\n            }\n            .marker-mdi-icon {\n              background: transparent;\n              border: none;\n            }\n          </style>\n        </head>\n        <body onresize="resizeWindow()">\n          <span>\n            <div id="color-bar" style="height: 8px;">\n              <img id="img-color-bar" height="8" style="vertical-align: top" />\n            </div>\n            <div id="mapid" style="height: ${this._calculateHeight()};"></div>\n            <div id="div-progress-bar" style="height: 8px; background-color: white;">\n              <div id="progress-bar" style="height:8px;width:0; background-color: #ccf2ff;"></div>\n            </div>\n            <div id="bottom-container" class="light-links" style="height: 32px; background-color: white;">\n              <div id="timestampid" class="text-container" style="width: 120px; height: 32px; float:left; position: absolute;">\n                <p id="timestamp"></p>\n              </div>\n              <div id="attribution" class="text-container-small" style="height: 32px; float:right;">\n                <span class="Map__Attribution-LjffR DKiFh" id="attribution"\n                  ></span\n                >\n              </div>\n            </div>\n            <script>\n              const tileSize = 256;\n              const maxZoom = 7;\n              const minZoom = 3;\n              var radarOpacity = 1.0;\n              var zoomLevel = ${JSON.stringify(void 0!==this._config.zoom_level?this._config.zoom_level:7)};\n              ${(()=>{var e,t,i,n,a,r,o,s,l,c,d,h;try{const o=this._isMobileDevice(),s=this._getCurrentUserInfo(),l=this._getCoordinateConfig(this._config.center_latitude,this._config.mobile_center_latitude,o,null==s?void 0:s.deviceTracker),c=this._getCoordinateConfig(this._config.center_longitude,this._config.mobile_center_longitude,o,null==s?void 0:s.deviceTracker),d=this._getCoordinateConfig(this._config.marker_latitude,this._config.mobile_marker_latitude,o,null==s?void 0:s.deviceTracker),h=this._getCoordinateConfig(this._config.marker_longitude,this._config.mobile_marker_longitude,o,null==s?void 0:s.deviceTracker),u=this._resolveCoordinatePair(l,c,null!==(i=null===(t=null===(e=this.hass)||void 0===e?void 0:e.config)||void 0===t?void 0:t.latitude)&&void 0!==i?i:0,null!==(r=null===(a=null===(n=this.hass)||void 0===n?void 0:n.config)||void 0===a?void 0:a.longitude)&&void 0!==r?r:0),g=this._resolveCoordinatePair(d,h,u.lat,u.lon);return`var centerLat = ${JSON.stringify(u.lat)};\n              var centerLon = ${JSON.stringify(u.lon)};\n              var markerLat = ${JSON.stringify(g.lat)};\n              var markerLon = ${JSON.stringify(g.lon)};`}catch(e){console.error("Weather Radar Card: Error resolving coordinates:",e);const t=null!==(l=null===(s=null===(o=this.hass)||void 0===o?void 0:o.config)||void 0===s?void 0:s.latitude)&&void 0!==l?l:0,i=null!==(h=null===(d=null===(c=this.hass)||void 0===c?void 0:c.config)||void 0===d?void 0:d.longitude)&&void 0!==h?h:0;return`var centerLat = ${JSON.stringify(t)};\n              var centerLon = ${JSON.stringify(i)};\n              var markerLat = ${JSON.stringify(t)};\n              var markerLon = ${JSON.stringify(i)};`}})()}\n              var timeout = ${JSON.stringify(void 0!==this._config.frame_delay?this._config.frame_delay:500)};\n              var restartDelay = ${JSON.stringify(void 0!==this._config.restart_delay?this._config.restart_delay:1e3)};\n              var frameCount = ${JSON.stringify(null!=this._config.frame_count?this._config.frame_count:5)}; \n              var tileURL = 'https://tilecache.rainviewer.com{path}/{tileSize}/{z}/{x}/{y}/2/1_0.png';\n              var radarAPIURL = 'https://api.rainviewer.com/public/weather-maps.json';\n              var radarPaths = [];\n              document.getElementById("img-color-bar").src = "/local/community/weather-radar-card/radar-colour-bar-universalblue.png";\n              var framePeriod = 300000;\n              var frameLag = 60000;\n\n              resizeWindow();\n              var labelSize = ${JSON.stringify(void 0!==this._config.extra_labels&&this._config.extra_labels?128:256)};\n              var labelZoom = ${JSON.stringify(void 0!==this._config.extra_labels&&this._config.extra_labels?1:0)};\n              var map_style = ${JSON.stringify(void 0!==this._config.map_style&&null!==this._config.map_style?this._config.map_style.toLowerCase():"light")};\n              switch (map_style) {\n                case "dark":\n                  var basemap_url = 'https://{s}.basemaps.cartocdn.com/{style}/{z}/{x}/{y}.png';\n                  var basemap_style = 'dark_nolabels';\n                  var label_url = 'https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}.png';\n                  var label_style = 'dark_only_labels';\n                  var svg_icon = 'home-circle-light.svg';\n                  var attribution = '<a href="https://leafletjs.com" title="A JS library for interactive maps" target="_blank">Leaflet</a> | &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> &copy; <a href="https://carto.com/attribution" target="_blank">CARTO</a><br>Radar data by <a href="https://rainviewer.com" target="_blank">RainViewer</a>';\n                  break;\n                case "voyager":\n                  var basemap_url = 'https://{s}.basemaps.cartocdn.com/{style}/{z}/{x}/{y}.png';\n                  var basemap_style = 'rastertiles/voyager_nolabels';\n                  var label_url = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}.png';\n                  var label_style = 'rastertiles/voyager_only_labels';\n                  var svg_icon = 'home-circle-dark.svg';\n                  var attribution = '<a href="https://leafletjs.com" title="A JS library for interactive maps" target="_blank">Leaflet</a> | &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> &copy; <a href="https://carto.com/attribution" target="_blank">CARTO</a><br>Radar data by <a href="https://rainviewer.com" target="_blank">RainViewer</a>';\n                  break;\n                case 'satellite':\n                  var basemap_url = 'https://server.arcgisonline.com/ArcGIS/rest/services/{style}/MapServer/tile/{z}/{y}/{x}';\n                  var basemap_style = 'World_Imagery';\n                  var label_url = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}.png';\n                  var label_style = 'proton_labels_std';\n                  var svg_icon = 'home-circle-dark.svg';\n                  var attribution = '<a href="https://leafletjs.com" title="A JS library for interactive maps" target="_blank">Leaflet</a> | &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> &copy; <a href="http://www.arcgis.com/home/item.html?id=10df2279f9684e4a9f6a7f08febac2a9" target="_blank">ESRI</a><br>Radar data by <a href="https://rainviewer.com" target="_blank">RainViewer</a>';\n                  break;\n                case "light":\n                default:\n                  var basemap_url = 'https://{s}.basemaps.cartocdn.com/{style}/{z}/{x}/{y}.png';\n                  var basemap_style = 'light_nolabels';\n                  var label_url = 'https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}.png';\n                  var label_style = 'light_only_labels';\n                  var svg_icon = 'home-circle-dark.svg';\n                  var attribution = '<a href="https://leafletjs.com" title="A JS library for interactive maps" target="_blank">Leaflet</a> | &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> &copy; <a href="https://carto.com/attribution" target="_blank">CARTO</a><br>Radar data by <a href="https://rainviewer.com" target="_blank">RainViewer</a>';\n              }\n\n              var idx = 0;\n              var run = true;\n              var doRadarUpdate = false;\n              var radarMap = L.map('mapid', {\n                zoomControl: ${!0===this._config.show_zoom&&!0!==this._config.static_map?"true":"false"},\n                ${!0===this._config.static_map?"scrollWheelZoom: false,                 doubleClickZoom: false,                 boxZoom: false,                 dragging: false,                 keyboard: false,                 touchZoom: false,":"wheelPxPerZoomLevel: 120,"}\n                attributionControl: false,\n                minZoom: minZoom,\n                maxZoom: maxZoom,\n              }).setView([centerLat, centerLon], zoomLevel);\n              var radarImage = [frameCount];\n              var radarTime = [frameCount];\n              var weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];\n              var month = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];\n              var d = new Date();\n              d.setTime(Math.trunc((d.valueOf() - frameLag) / framePeriod) * framePeriod - (frameCount - 1) * framePeriod);\n\n              document.getElementById("progress-bar").style.width = barSize+"px";\n              document.getElementById("attribution").innerHTML = attribution;\n\n              var t2actions = [];\n\n              if (${!0===this._config.show_recenter&&!0!==this._config.static_map}) {\n                var recenterAction = L.Toolbar2.Action.extend({\n                  options: {\n                      toolbarIcon: {\n                          html: '<img src="/local/community/weather-radar-card/recenter.png" width="24" height="24">',\n                          tooltip: 'Re-center'\n                      }\n                  },\n\n                  addHooks: function () {\n                    radarMap.setView([centerLat, centerLon], zoomLevel);\n                  }\n                });\n                t2actions.push(recenterAction);\n              }\n\n              if (${!0===this._config.show_playback}) {\n                var playAction = L.Toolbar2.Action.extend({\n                  options: {\n                      toolbarIcon: {\n                          html: '<img id="playButton" src="/local/community/weather-radar-card/pause.png" width="24" height="24">',\n                          tooltip: 'Pause'\n                      }\n                  },\n\n                  addHooks: function () {\n                    run = !run;\n                    if (run) {\n                      document.getElementById("playButton").src = "/local/community/weather-radar-card/pause.png"\n                    } else {\n                      document.getElementById("playButton").src = "/local/community/weather-radar-card/play.png"\n                    }\n                  }\n                });\n                t2actions.push(playAction);\n\n                var skipbackAction = L.Toolbar2.Action.extend({\n                  options: {\n                      toolbarIcon: {\n                          html: '<img src="/local/community/weather-radar-card/skip-back.png" width="24" height="24">',\n                          tooltip: 'Previous Frame'\n                      }\n                  },\n\n                  addHooks: function () {\n                    skipBack();\n                  }\n                });\n                t2actions.push(skipbackAction);\n\n                var skipnextAction = L.Toolbar2.Action.extend({\n                  options: {\n                      toolbarIcon: {\n                          html: '<img src="/local/community/weather-radar-card/skip-next.png" width="24" height="24">',\n                          tooltip: 'Next Frame'\n                      }\n                  },\n\n                  addHooks: function () {\n                    skipNext();\n                  }\n                });\n                t2actions.push(skipnextAction);\n              }\n\n              if (t2actions.length > 0) {\n                new L.Toolbar2.Control({\n                  position: 'bottomright',\n                  actions: t2actions\n                }).addTo(radarMap);\n              }\n\n              if (${!0===this._config.show_scale}) {\n                L.control.scale({\n                  position: 'bottomleft',\n                  metric: ${"km"===(null!==(n=null===(i=null===(t=null===(e=this.hass)||void 0===e?void 0:e.config)||void 0===t?void 0:t.unit_system)||void 0===i?void 0:i.length)&&void 0!==n?n:"km")},\n                  imperial: ${"mi"===(null!==(s=null===(o=null===(r=null===(a=this.hass)||void 0===a?void 0:a.config)||void 0===r?void 0:r.unit_system)||void 0===o?void 0:o.length)&&void 0!==s?s:"km")},\n                  maxWidth: 100,\n                }).addTo(radarMap);\n\n                if ((map_style === "dark") || (map_style == "satellite")) {\n                  var scaleDiv = this.document.getElementsByClassName("leaflet-control-scale-line")[0];\n                  scaleDiv.style.color = "#BBB";\n                  scaleDiv.style.borderColor = "#BBB";\n                  scaleDiv.style.background = "#00000080";\n                }\n              }\n\n              if ((map_style === "dark") || (map_style == "satellite")) {\n                this.document.getElementById("div-progress-bar").style.background = "#1C1C1C";\n                this.document.getElementById("progress-bar").style.background = "steelblue";\n                this.document.getElementById("bottom-container").style.background = "#1C1C1C";\n                this.document.getElementById("bottom-container").style.color = "#DDDDDD";\n                this.document.getElementById("bottom-container").className = "dark-links";\n              }\n\n              L.tileLayer(\n                basemap_url,\n                {\n                  style: basemap_style,\n                  subdomains: 'abcd',\n                  detectRetina: false,\n                  tileSize: tileSize,\n                  zoomOffset: 0,\n                },\n              ).addTo(radarMap);\n\n              async function fetchRadarPaths() {\n                var response = await fetch(radarAPIURL);\n                var data = await response.json();\n                return data.radar.past;\n              }\n\n              async function initRadar() {\n                var pastFrames = await fetchRadarPaths();\n                radarPaths = pastFrames.slice(-frameCount);\n                frameCount = radarPaths.length;\n\n                for (i = 0; i < frameCount; i++) {\n                  radarImage[i] = L.tileLayer(\n                    tileURL,\n                    {\n                      path: radarPaths[i].path,\n                      detectRetina: false,\n                      tileSize: tileSize,\n                      zoomOffset: 0,\n                      opacity: 0,\n                      frame: i,\n                    },\n                  );\n                  radarTime[i] = getRadarTimeString(radarPaths[i].time * 1000);\n                }\n\n                for (i = 0; i < (frameCount - 1); i++) {\n                  radarImage[i].on('load', function(e) {\n                    radarImage[e.target.options.frame + 1].addTo(radarMap);\n                  });\n                }\n\n                radarImage[0].addTo(radarMap);\n\n                radarImage[idx].setOpacity(radarOpacity);\n                document.getElementById('timestamp').innerHTML = radarTime[idx];\n\n                barSize = document.getElementById("div-progress-bar").offsetWidth / frameCount;\n                document.getElementById("progress-bar").style.width = barSize + "px";\n\n                radarReady = true;\n                workerTimeout(function() {\n                  nextFrame();\n                }, timeout, "frame");\n                setUpdateTimeout();\n              }\n\n              var radarReady = false;\n              initRadar();\n\n              townLayer = L.tileLayer(\n                label_url,\n                {\n                  subdomains: 'abcd',\n                  detectRetina: false,\n                  tileSize: labelSize,\n                  zoomOffset: labelZoom,\n                },\n              ).addTo(radarMap);\n              townLayer.setZIndex(2);\n\n              ${!0===this._config.show_marker?(()=>{const e=this._isMobileDevice(),t=this._getCurrentUserInfo();return`${this._generateMarkerIconCode(e,t)}\n                     L.marker([markerLat, markerLon], { icon: myIcon, interactive: false }).addTo(radarMap);`})():""}\n\n              ${!0===this._config.show_range?"km"===(null!==(h=null===(d=null===(c=null===(l=this.hass)||void 0===l?void 0:l.config)||void 0===c?void 0:c.unit_system)||void 0===d?void 0:d.length)&&void 0!==h?h:"km")?"L.circle([markerLat, markerLon], { radius: 50000, weight: 1, fill: false, opacity: 0.3, interactive: false }).addTo(radarMap);           L.circle([markerLat, markerLon], { radius: 100000, weight: 1, fill: false, opacity: 0.3, interactive: false }).addTo(radarMap);           L.circle([markerLat, markerLon], { radius: 200000, weight: 1, fill: false, opacity: 0.3, interactive: false }).addTo(radarMap);":"L.circle([markerLat, markerLon], { radius: 48280, weight: 1, fill: false, opacity: 0.3, interactive: false }).addTo(radarMap);           L.circle([markerLat, markerLon], { radius: 96561, weight: 1, fill: false, opacity: 0.3, interactive: false }).addTo(radarMap);           L.circle([markerLat, markerLon], { radius: 193121, weight: 1, fill: false, opacity: 0.3, interactive: false }).addTo(radarMap);":""}\n\n        // Use a Web Worker for timing to avoid Chromium iframe timer throttling\n        var workerBlob = new Blob([\n          'var timers = {};' +\n          'var nextId = 1;' +\n          'self.onmessage = function(e) {' +\n          '  if (e.data.cmd === "set") {' +\n          '    var id = nextId++;' +\n          '    timers[id] = setTimeout(function() { self.postMessage({id: id, tag: e.data.tag}); delete timers[id]; }, e.data.ms);' +\n          '    self.postMessage({id: id, tag: "ack"});' +\n          '  } else if (e.data.cmd === "clear") {' +\n          '    clearTimeout(timers[e.data.id]);' +\n          '    delete timers[e.data.id];' +\n          '  }' +\n          '};'\n        ], { type: 'application/javascript' });\n        var timerWorker = new Worker(URL.createObjectURL(workerBlob));\n        var workerCallbacks = {};\n        timerWorker.onmessage = function(e) {\n          if (e.data.tag && e.data.tag !== "ack" && workerCallbacks[e.data.tag]) {\n            workerCallbacks[e.data.tag]();\n          }\n        };\n        function workerTimeout(callback, ms, tag) {\n          workerCallbacks[tag] = callback;\n          timerWorker.postMessage({ cmd: "set", ms: ms, tag: tag });\n        }\n\n\n        function setUpdateTimeout() {\n          workerTimeout(triggerRadarUpdate, framePeriod + frameLag, "update");\n        }\n\n        function triggerRadarUpdate() {\n          doRadarUpdate = true;\n        }\n\n        async function updateRadar() {\n          var pastFrames = await fetchRadarPaths();\n          var latestFrame = pastFrames[pastFrames.length - 1];\n\n          newLayer = L.tileLayer(tileURL, {\n            path: latestFrame.path,\n            maxZoom: maxZoom,\n            tileSize: tileSize,\n            zoomOffset: 0,\n            opacity: 0,\n          });\n          newLayer.addTo(radarMap);\n          newTime = getRadarTimeString(latestFrame.time * 1000);\n\n          radarImage[0].remove();\n          for (i = 0; i < frameCount - 1; i++) {\n            radarImage[i] = radarImage[i + 1];\n            radarTime[i] = radarTime[i + 1];\n          }\n          radarImage[frameCount - 1] = newLayer;\n          radarTime[frameCount - 1] = newTime;\n          idx = 0;\n          doRadarUpdate = false;\n\n          setUpdateTimeout();\n        }\n\n        function getRadarTime(date) {\n          x = new Date(date);\n          return (\n            x.getUTCFullYear().toString() +\n            (x.getUTCMonth() + 1).toString().padStart(2, '0') +\n            x\n              .getUTCDate()\n              .toString()\n              .padStart(2, '0') +\n            x\n              .getUTCHours()\n              .toString()\n              .padStart(2, '0') +\n            x\n              .getUTCMinutes()\n              .toString()\n              .padStart(2, '0')\n          );\n        }\n\n        function getRadarTimeString(date) {\n          x = new Date(date);\n          return (\n            weekday[x.getDay()] +\n            ' ' +\n            month[x.getMonth()] +\n            ' ' +\n            x\n              .getDate()\n              .toString()\n              .padStart(2, '0') +\n            ' ' +\n            x\n              .getHours()\n              .toString()\n              .padStart(2, '0') +\n            ':' +\n            x\n              .getMinutes()\n              .toString()\n              .padStart(2, '0')\n          );\n        }\n\n        function nextFrame() {\n          if (run && radarReady) {\n            try { nextImage(); } catch(e) { console.warn('Weather Radar Card: frame error', e); }\n          }\n          workerTimeout(function() {\n            nextFrame();\n          }, (idx == frameCount) ? restartDelay : timeout, "frame");\n        }\n\n        function skipNext() {\n          if (idx == frameCount-1) {\n            idx += 1;\n          }\n          nextImage();\n        }\n\n        function skipBack() {\n          if (idx == frameCount) {\n            radarImage[frameCount - 1].setOpacity(0);\n            idx -= 1;\n          } else if (idx < frameCount) {\n            radarImage[idx].setOpacity(0);\n          }\n          idx -= 1;\n          if (doRadarUpdate && idx == 1) {\n            updateRadar();\n          }\n          if (idx < 0) {\n            idx = frameCount-1;\n          }\n          document.getElementById("progress-bar").style.width = (idx+1)*barSize+"px";\n          document.getElementById('timestamp').innerHTML = radarTime[idx];\n          radarImage[idx].setOpacity(radarOpacity);\n        }\n\n        function nextImage() {\n          if (idx == frameCount) {\n            radarImage[frameCount - 1].setOpacity(0);\n          } else if (idx < frameCount - 1) {\n            radarImage[idx].setOpacity(0);\n          }\n          idx += 1;\n          if (doRadarUpdate && idx == 1) {\n            updateRadar();\n          }\n          if (idx == frameCount + 1) {\n            idx = 0;\n          }\n          if (idx != frameCount + 1) {\n            document.getElementById("progress-bar").style.width = (idx+1)*barSize+"px";\n          }\n          if (idx < frameCount) {\n            document.getElementById('timestamp').innerHTML = radarTime[idx];\n            radarImage[idx].setOpacity(radarOpacity);\n          }\n        }\n\n        function resizeWindow() {\n          this.document.getElementById("color-bar").width = this.frameElement.offsetWidth;\n          this.document.getElementById("img-color-bar").width = this.frameElement.offsetWidth;\n          this.document.getElementById("mapid").width = this.frameElement.offsetWidth;\n          var calculatedHeight = "${this._calculateHeight()}";\n          if (calculatedHeight.endsWith("px")) {\n            this.document.getElementById("mapid").height = parseInt(calculatedHeight);\n          }\n          this.document.getElementById("div-progress-bar").width = this.frameElement.offsetWidth;\n          this.document.getElementById("bottom-container").width = this.frameElement.offsetWidth;\n          barSize = this.frameElement.offsetWidth/frameCount;\n        }\n        <\/script>\n            </span>\n        </body>\n      </html>\n    `,g=this._calculateHeight();let m="540px";if(g.endsWith("px")){m=`${parseInt(g)+48}px`}else this.isPanel&&this.offsetParent?m=this.offsetParent.clientHeight-2-(!0===this.editMode?59:0)+"px":this._config&&this._config.square_map&&(m=`${this.getBoundingClientRect().width+48}px`);const p=void 0!==this._config.card_title?j`<div id="card-title">${this._config.card_title}</div>`:"",f=this._calculateWidth();return j`
      <style>
        ${this.styles}
        ha-card {
          width: ${f};
        }
      </style>
      <ha-card class="type-iframe">
        ${p}
        <div id="root" style="padding-top: ${m}">
          <iframe srcdoc=${u} scrolling="no"></iframe>
        </div>
      </ha-card>
    `}showWarning(e){return j`
      <hui-warning>${e}</hui-warning>
    `}showError(e){const t=document.createElement("hui-error-card");return t.setConfig({type:"error",error:e,origConfig:this._config}),j`
      ${t}
    `}_validateCssSize(e){if(!e)return!0;return/^\d+(\.\d+)?(px|%|em|rem|vh|vw)$/.test(e.trim())}_calculateHeight(){return this._config?this._config.height&&this._validateCssSize(this._config.height)?this._config.height:this.isPanel?this.offsetParent?this.offsetParent.clientHeight-48-2-(!0===this.editMode?59:0)+"px":"540px":void 0!==this._config.square_map&&this._config.square_map?`${this.getBoundingClientRect().width}px`:"492px":"492px"}_calculateWidth(){return this._config&&this._config.width&&this._validateCssSize(this._config.width)?this._config.width:"100%"}get styles(){return o`
      .text-container {
        font: 12px/1.5 'Helvetica Neue', Arial, Helvetica, sans-serif;
      }
      #timestamp {
        margin: 2px 0px;
      }
      #color-bar {
        margin: 0px 0px;
      }
      ha-card {
        overflow: hidden;
      }
      #root {
        width: 100%;
        position: relative;
      }
      iframe {
        position: absolute;
        border: none;
        width: 100%;
        height: 100%;
        top: 0;
        left: 0;
      }
      #card-title {
        margin: 8px 0px 4px 8px;
        font-size: 1.5em;
      }
    `}};Se.MDI_PATHS={account:"M12,4A4,4 0 0,1 16,8A4,4 0 0,1 12,12A4,4 0 0,1 8,8A4,4 0 0,1 12,4M12,14C16.42,14 20,15.79 20,18V20H4V18C4,15.79 7.58,14 12,14Z","account-circle":"M12,19.2C9.5,19.2 7.29,17.92 6,16C6.03,14 10,12.9 12,12.9C14,12.9 17.97,14 18,16C16.71,17.92 14.5,19.2 12,19.2M12,5A3,3 0 0,1 15,8A3,3 0 0,1 12,11A3,3 0 0,1 9,8A3,3 0 0,1 12,5M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z","map-marker":"M12,11.5A2.5,2.5 0 0,1 9.5,9A2.5,2.5 0 0,1 12,6.5A2.5,2.5 0 0,1 14.5,9A2.5,2.5 0 0,1 12,11.5M12,2A7,7 0 0,0 5,9C5,14.25 12,22 12,22C12,22 19,14.25 19,9A7,7 0 0,0 12,2Z",home:"M10,20V14H14V20H19V12H22L12,3L2,12H5V20H10Z",car:"M5,11L6.5,6.5H17.5L19,11M17.5,16A1.5,1.5 0 0,1 16,14.5A1.5,1.5 0 0,1 17.5,13A1.5,1.5 0 0,1 19,14.5A1.5,1.5 0 0,1 17.5,16M6.5,16A1.5,1.5 0 0,1 5,14.5A1.5,1.5 0 0,1 6.5,13A1.5,1.5 0 0,1 8,14.5A1.5,1.5 0 0,1 6.5,16M18.92,6C18.72,5.42 18.16,5 17.5,5H6.5C5.84,5 5.28,5.42 5.08,6L3,12V20A1,1 0 0,0 4,21H5A1,1 0 0,0 6,20V19H18V20A1,1 0 0,0 19,21H20A1,1 0 0,0 21,20V12L18.92,6Z",cellphone:"M17,19H7V5H17M17,1H7C5.89,1 5,1.89 5,3V21A2,2 0 0,0 7,23H17A2,2 0 0,0 19,21V3C19,1.89 18.1,1 17,1Z","home-circle":"M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4M10,17V13H8L12,7L16,13H14V17H10Z"},e([ue({type:Boolean,reflect:!0})],Se.prototype,"isPanel",void 0),e([ue({attribute:!1})],Se.prototype,"hass",void 0),e([ue({attribute:!1})],Se.prototype,"_config",void 0),e([ue({attribute:!1})],Se.prototype,"editMode",void 0),Se=Ae=e([ce("weather-radar-card")],Se),customElements.get("weather-radar-card")||customElements.define("weather-radar-card",Se);export{Se as WeatherRadarCard};
