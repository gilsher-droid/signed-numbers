/* Direct GA4 integration; state lasts for this document visit only. */
(function () {
  "use strict";
  if (window.signedNumbersAnalytics) return;

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
  const measurementId = "G-EYHXB09T96";
  const pageLocation = () => location.origin + location.pathname + location.search;
  const pageReferrer = () => { try { return new URL(document.referrer).origin + '/'; } catch (_) { return ''; } };
  const campaign = () => {
    const fields = {utm_source:'campaign_source',utm_medium:'campaign_medium',utm_campaign:'campaign_name',utm_content:'campaign_content'};
    const result = {};
    for (const [key, value] of new URLSearchParams(location.search)) {
      if (fields[key] && /^[a-z0-9_]{1,100}$/.test(value)) result[fields[key]] = value;
    }
    return result;
  };
  let initialized = false;
  function send(name, parameters) {
    if (!initialized || !window.signedNumbersConsent?.allowed()) return false;
    try {
      window.gtag("event", name, { send_to: measurementId, page_location: pageLocation(), page_referrer: pageReferrer(), app_id: "signed_numbers", language: document.documentElement.lang, ...parameters });
      return true;
    } catch (_) {
      // Measurement must not interrupt the teaching experience.
      return false;
    }
  }
  let firstInteractionSent = false;
  let lastCompletedStep = 0;
  let completionSent = false;

  window.signedNumbersAnalytics = {
    firstInteraction(interactionType, mode) {
      if (firstInteractionSent) return;
      firstInteractionSent = send("first_app_interaction", { interaction_type: interactionType, mode });
    },
    newExercise() {
      lastCompletedStep = 0;
      completionSent = false;
    },
    renderedStep(step, animated, mode) {
      if (!window.signedNumbersConsent?.allowed()) { lastCompletedStep = -1; return; }
      if (step === 0) {
        lastCompletedStep = 0;
        return;
      }
      // Only an uninterrupted traversal through the intended steps qualifies.
      // Scrubbing, going backwards or skipping steps invalidates this traversal.
      if (!animated || step !== lastCompletedStep + 1) {
        lastCompletedStep = -1;
        return;
      }
      lastCompletedStep = step;
      if (step === 9 && !completionSent) {
        completionSent = send("exercise_completed", { mode });
      }
    }
  };

  window.addEventListener('signed-numbers:analytics-enabled', () => {
    if (initialized || !window.signedNumbersConsent?.allowed()) return;
    initialized = true;
    window.gtag("js", new Date());
    window.gtag("config", measurementId, { send_page_view: false, page_location: pageLocation(), page_referrer: pageReferrer(), ...campaign(), language: document.documentElement.lang });
    send("page_view", { page_location: pageLocation(), page_title: document.title });
  });
})();
