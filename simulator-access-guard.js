(function () {
  "use strict";

  const simulatorByHost = {
    "linear.fundamatics.com": "linear",
    "numbers.fundamatics.com": "numbers",
    "balance.fundamatics.com": "balance",
    "geometry.fundamatics.com": "geometry",
    "fisherman.fundamatics.com": "fisherman",
    "asymptote.fundamatics.com": "asymptote",
  };
  const simulatorId = simulatorByHost[window.location.hostname];
  if (!simulatorId) return;

  const endpoint = "https://fundamatics.com/api/simulator-access";
  const storageKey = `fundamatics-access-${simulatorId}`;
  const isHebrew = (document.documentElement.lang || "he").toLowerCase().startsWith("he");
  const copy = isHebrew
    ? {
        title: "נדרש קוד כניסה",
        body: "היישום הזה זמין באמצעות קוד אישי שניתן מראש.",
        label: "קוד כניסה",
        button: "כניסה ליישום",
        checking: "בודקים…",
        error: "הקוד אינו תקין, אינו פעיל או שפג תוקפו.",
        home: "חזרה ליישומים",
      }
    : {
        title: "Access code required",
        body: "This app is available with a personal code issued in advance.",
        label: "Access code",
        button: "Open app",
        checking: "Checking…",
        error: "The code is invalid, inactive, or expired.",
        home: "Back to apps",
      };

  document.documentElement.classList.add("fm-access-pending");
  const style = document.createElement("style");
  style.textContent = `
    html.fm-access-pending body > :not(#fundamatics-access-gate) { visibility: hidden !important; }
    #fundamatics-access-gate { position: fixed; inset: 0; z-index: 2147483647; display: grid; place-items: center; padding: 20px; background: #fffbe7; color: #0b1e3a; font-family: Manrope, Arial, sans-serif; direction: ${isHebrew ? "rtl" : "ltr"}; }
    #fundamatics-access-gate * { box-sizing: border-box; }
    .fm-access-card { width: min(440px, 100%); padding: 32px; border: 3px solid #0b3a8a; border-radius: 24px; background: #fff; box-shadow: 8px 8px 0 #0b3a8a; text-align: ${isHebrew ? "right" : "left"}; }
    .fm-access-brand { margin: 0 0 24px; color: #0b3a8a; font: 800 16px/1 Montserrat, Arial, sans-serif; letter-spacing: .08em; }
    .fm-access-card h1 { margin: 0; color: #0b1e3a; font: 800 28px/1.2 Montserrat, Arial, sans-serif; }
    .fm-access-card p { margin: 12px 0 24px; color: #536273; line-height: 1.55; }
    .fm-access-card label { display: block; margin-bottom: 8px; font-weight: 700; }
    .fm-access-card input { width: 100%; padding: 13px 15px; border: 1px solid #b9c1ca; border-radius: 12px; color: #0b1e3a; background: #fff; font: 700 16px/1 monospace; letter-spacing: .06em; text-transform: uppercase; }
    .fm-access-card button { width: 100%; margin-top: 14px; padding: 13px 18px; border: 0; border-radius: 999px; background: #cf4245; color: #fff; font: 700 15px/1 Manrope, Arial, sans-serif; cursor: pointer; }
    .fm-access-card button:disabled { cursor: wait; opacity: .65; }
    .fm-access-error { min-height: 22px; margin: 12px 0 0 !important; color: #a52227 !important; font-size: 14px; font-weight: 700; }
    .fm-access-home { display: inline-block; margin-top: 22px; color: #0b3a8a; font-size: 14px; font-weight: 700; }
  `;
  document.head.appendChild(style);

  async function request(payload) {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, simulatorId }),
    });
    if (!response.ok) throw new Error("Access denied");
    return response.json();
  }

  function unlock() {
    document.getElementById("fundamatics-access-gate")?.remove();
    document.documentElement.classList.remove("fm-access-pending");
    document.documentElement.dataset.accessGranted = "true";
  }

  function tokenFromFragment() {
    const params = new URLSearchParams(window.location.hash.slice(1));
    const token = params.get("access");
    if (!token) return "";
    params.delete("access");
    const rest = params.toString();
    history.replaceState(
      null,
      "",
      `${location.pathname}${location.search}${rest ? `#${rest}` : ""}`,
    );
    return token;
  }

  function showGate() {
    const gate = document.createElement("div");
    gate.id = "fundamatics-access-gate";
    gate.innerHTML = `
      <div class="fm-access-card">
        <div class="fm-access-brand">FUNDAMATICS</div>
        <h1>${copy.title}</h1>
        <p>${copy.body}</p>
        <form>
          <label for="fm-access-code">${copy.label}</label>
          <input id="fm-access-code" name="code" autocomplete="off" placeholder="FM-XXXX-XXXX-XXXX" required />
          <div class="fm-access-error" role="alert"></div>
          <button type="submit">${copy.button}</button>
        </form>
        <a class="fm-access-home" href="https://fundamatics.com/simulators">${copy.home}</a>
      </div>`;
    document.body.appendChild(gate);
    const form = gate.querySelector("form");
    const input = gate.querySelector("input");
    const button = gate.querySelector("button");
    const error = gate.querySelector(".fm-access-error");
    input.focus();
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      button.disabled = true;
      button.textContent = copy.checking;
      error.textContent = "";
      try {
        const result = await request({ action: "redeem", code: input.value });
        window.localStorage.setItem(storageKey, result.sessionToken);
        unlock();
      } catch {
        window.localStorage.removeItem(storageKey);
        error.textContent = copy.error;
        button.disabled = false;
        button.textContent = copy.button;
      }
    });
  }

  async function start() {
    const token = tokenFromFragment() || window.localStorage.getItem(storageKey) || "";
    if (token) {
      try {
        const result = await request({ action: "validate", sessionToken: token });
        if (result.valid) {
          window.localStorage.setItem(storageKey, token);
          unlock();
          return;
        }
      } catch {
        window.localStorage.removeItem(storageKey);
      }
    }
    showGate();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
