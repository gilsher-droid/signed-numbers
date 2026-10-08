/* Optional app analytics. Consent is local to this origin, never inferred from a link. */
(function () {
  'use strict';
  const key = 'signed-numbers.analytics-consent';
  const lifetime = 180 * 24 * 60 * 60 * 1000;
  let choice = null;
  try {
    const record = JSON.parse(localStorage.getItem(key));
    if (record?.version === 1 && record.expiresAt > Date.now() && ['accepted', 'rejected'].includes(record.choice)) choice = record.choice;
  } catch (_) { /* Stay denied if storage is unavailable. */ }
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
  window.gtag('consent', 'default', {analytics_storage:'denied', ad_storage:'denied', ad_user_data:'denied', ad_personalization:'denied'});
  let loaded = false;
  const privateLanding = !!location.hash || !!window.fundamaticsPrivateLanding;
  function allowed() {
    if (location.hostname !== 'numbers.fundamatics.com' || !['/', '/index.html'].includes(location.pathname) || privateLanding || location.hash || document.documentElement.dataset.accessGranted !== 'true') return false;
    for (const [name, value] of new URLSearchParams(location.search)) {
      if (name === 'lang' && ['en','he','ar'].includes(value)) continue;
      if (['utm_source','utm_medium','utm_campaign','utm_content'].includes(name) && /^[a-z0-9_]{1,100}$/.test(value)) continue;
      return false;
    }
    return true;
  }
  window.signedNumbersConsent = { allowed: () => choice === 'accepted' && allowed() };
  function enable() {
    if (loaded || !window.signedNumbersConsent.allowed()) return;
    loaded = true;
    window.gtag('consent', 'update', {analytics_storage:'granted', ad_storage:'denied', ad_user_data:'denied', ad_personalization:'denied'});
    window.dispatchEvent(new Event('signed-numbers:analytics-enabled'));
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=G-EYHXB09T96';
    document.head.appendChild(script);
  }
  const copy = {
    en: {title:'Your privacy choices', body:'Optional analytics help us improve this app. You can use the app without accepting.', accept:'Accept analytics', reject:'Reject analytics', preferences:'Cookie preferences'},
    he: {title:'הבחירות שלך בנושא פרטיות', body:'מדידה אופציונלית עוזרת לנו לשפר את היישום. אפשר להשתמש בו גם ללא הסכמה למדידה.', accept:'אישור מדידה', reject:'דחיית מדידה', preferences:'העדפות עוגיות'},
    ar: {title:'خيارات الخصوصية', body:'تساعدنا التحليلات الاختيارية على تحسين هذا التطبيق. يمكنك استخدامه دون الموافقة.', accept:'قبول التحليلات', reject:'رفض التحليلات', preferences:'تفضيلات ملفات تعريف الارتباط'},
  };
  function setChoice(value) {
    choice = value;
    try { localStorage.setItem(key, JSON.stringify({version:1,choice,expiresAt:Date.now()+lifetime})); } catch (_) {}
    panel.hidden = true;
    if (choice === 'accepted') enable();
    else if (loaded) location.reload();
  }
  const panel = document.createElement('section');
  panel.className = 'analytics-consent-panel';
  panel.setAttribute('aria-labelledby', 'analytics-consent-title');
  const title = document.createElement('h2');title.id = 'analytics-consent-title';
  const body = document.createElement('p');
  const accept = document.createElement('button');accept.type = 'button';
  const reject = document.createElement('button');reject.type = 'button';
  const preferences = document.createElement('button');preferences.type = 'button';preferences.className = 'analytics-preferences';
  accept.addEventListener('click', () => setChoice('accepted'));
  reject.addEventListener('click', () => setChoice('rejected'));
  preferences.addEventListener('click', () => { panel.hidden = !panel.hidden; if (!panel.hidden) reject.focus(); });
  panel.append(title, body, accept, reject);
  document.body.append(preferences, panel);
  function translate() {
    const words = copy[document.documentElement.lang] || copy.en;
    title.textContent=words.title;body.textContent=words.body;accept.textContent=words.accept;reject.textContent=words.reject;preferences.textContent=words.preferences;
  }
  translate();panel.hidden = choice !== null;
  window.addEventListener('signed-numbers:localechange', translate);
  // analytics.js registers its listener before this script runs.
  enable();
})();
