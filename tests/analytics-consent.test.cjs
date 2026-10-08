const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
function load({choice=null,lang='en',search='',hash='',host='numbers.fundamatics.com',storageFails=false,privateLanding=false,access=true}={}) {
  const stored=new Map(),listeners=new Map(),elements=[],scripts=[];let reloads=0;
  if(choice)stored.set('signed-numbers.analytics-consent',JSON.stringify({version:1,choice,expiresAt:Date.now()+10000}));
  class Element { constructor(tag){this.tag=tag;this.children=[];this.events={};elements.push(this);} setAttribute(){} append(...v){this.children.push(...v);} addEventListener(n,f){this.events[n]=f;} focus(){} }
  const localStorage={getItem:k=>{if(storageFails)throw Error();return stored.get(k)||null;},setItem:(k,v)=>{if(storageFails)throw Error();stored.set(k,v);}};
  const location={hostname:host,origin:'https://'+host,pathname:'/',search,hash,reload:()=>reloads++};
  const document={title:'Numbers',documentElement:{lang,dataset:{accessGranted:String(access)}},createElement:t=>new Element(t),head:{appendChild:s=>scripts.push(s)},body:new Element('body')};
  const window={location,localStorage,fundamaticsPrivateLanding:privateLanding,addEventListener:(n,f)=>{if(!listeners.has(n))listeners.set(n,[]);listeners.get(n).push(f);},dispatchEvent:e=>{for(const f of listeners.get(e.type)||[])f(e);}};
  const context=vm.createContext({window,document,location,localStorage,URLSearchParams,Date,Event});
  for(const file of ['analytics.js','consent.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../js',file),'utf8'),context);
  return {window,document,scripts,elements,stored,events:()=>window.dataLayer.map(a=>Array.from(a)).filter(a=>a[0]==='event'),configs:()=>window.dataLayer.map(a=>Array.from(a)).filter(a=>a[0]==='config'),choose:text=>elements.find(e=>e.tag==='button'&&e.textContent===text).events.click(),reloads:()=>reloads};
}
test('fresh and rejected state load no tag and send no app events',()=>{
 for(const choice of [null,'rejected']){const s=load({choice});s.window.signedNumbersAnalytics.firstInteraction('start','auto');assert.equal(s.scripts.length,0);assert.equal(s.events().length,0);}
});
test('explicit accept initializes once and keeps advertising denied',()=>{
 const s=load();s.choose('Accept analytics');s.choose('Accept analytics');assert.equal(s.scripts.length,1);assert.equal(s.configs().length,1);assert.equal(s.events().filter(a=>a[1]==='page_view').length,1);
 const update=s.window.dataLayer.map(a=>Array.from(a)).find(a=>a[0]==='consent'&&a[1]==='update')[2];assert.equal(update.analytics_storage,'granted');assert.equal(update.ad_storage,'denied');
});
test('accepted preference resumes, revoked preference blocks immediately and reloads',()=>{
 const s=load({choice:'accepted'});assert.equal(s.scripts.length,1);s.choose('Reject analytics');assert.equal(s.reloads(),1);const n=s.events().length;s.window.signedNumbersAnalytics.firstInteraction('start','auto');assert.equal(s.events().length,n);assert.equal(JSON.parse(s.stored.get('signed-numbers.analytics-consent')).choice,'rejected');
});
test('private, unknown query, denied access and preview origins never load Google',()=>{
 for(const options of [{hash:'#access=synthetic'},{privateLanding:true},{search:'?email=synthetic'},{host:'localhost'},{access:false}]){const s=load({...options,choice:'accepted'});assert.equal(s.scripts.length,0);assert.equal(s.events().length,0);}
});
test('pre-consent interaction is not replayed; first consented interaction sends once',()=>{
 const s=load();s.window.signedNumbersAnalytics.firstInteraction('start','auto');s.choose('Accept analytics');assert.equal(s.events().filter(a=>a[1]==='first_app_interaction').length,0);s.window.signedNumbersAnalytics.firstInteraction('start','auto');s.window.signedNumbersAnalytics.firstInteraction('start','auto');assert.equal(s.events().filter(a=>a[1]==='first_app_interaction').length,1);
});
test('a full consented traversal completes once; skipped steps do not',()=>{
 const s=load({choice:'accepted'}),api=s.window.signedNumbersAnalytics;api.newExercise();api.renderedStep(2,true,'auto');api.renderedStep(9,true,'auto');assert.equal(s.events().filter(a=>a[1]==='exercise_completed').length,0);api.newExercise();for(let i=0;i<=9;i++)api.renderedStep(i,true,'auto');api.renderedStep(9,true,'auto');assert.equal(s.events().filter(a=>a[1]==='exercise_completed').length,1);
});
test('a traversal begun before consent cannot be claimed as completed',()=>{
 const s=load(),api=s.window.signedNumbersAnalytics;api.renderedStep(1,true,'auto');s.choose('Accept analytics');for(let i=2;i<=9;i++)api.renderedStep(i,true,'auto');assert.equal(s.events().filter(a=>a[1]==='exercise_completed').length,0);
});
test('selected Arabic language is attached and consent UI updates',()=>{
 const s=load({lang:'ar',search:'?lang=ar'});s.choose('قبول التحليلات');assert.equal(s.events()[0][2].language,'ar');s.document.documentElement.lang='he';s.window.dispatchEvent(new Event('signed-numbers:localechange'));assert.ok(s.elements.some(e=>e.textContent==='העדפות עוגיות'));s.window.signedNumbersAnalytics.firstInteraction('start','auto');assert.equal(s.events().at(-1)[2].language,'he');
});
test('storage failure defaults denied but explicit choice works for this document',()=>{
 const s=load({storageFails:true});assert.equal(s.scripts.length,0);s.choose('Accept analytics');assert.equal(s.scripts.length,1);s.choose('Reject analytics');assert.equal(s.window.signedNumbersConsent.allowed(),false);
});
