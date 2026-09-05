/* Direct GA4 integration; state lasts for this document visit only. */
(function () {
  "use strict";
  if (window.signedNumbersAnalytics) return;

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
  const measurementId = "G-EYHXB09T96";
  // Keep campaign parameters; never send access tokens from URL fragments.
  const pageLocation = location.origin + location.pathname + location.search;
  function send(name, parameters) {
    try {
      window.gtag("event", name, { send_to: measurementId, app_id: "signed_numbers", ...parameters });
    } catch (_) {
      // Measurement must not interrupt the teaching experience.
    }
  }
  let firstInteractionSent = false;
  let lastCompletedStep = 0;
  let completionSent = false;

  window.signedNumbersAnalytics = {
    firstInteraction(interactionType, mode) {
      if (firstInteractionSent) return;
      firstInteractionSent = true;
      send("first_app_interaction", { interaction_type: interactionType, mode });
    },
    newExercise() {
      lastCompletedStep = 0;
      completionSent = false;
    },
    renderedStep(step, animated, mode) {
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
        completionSent = true;
        send("exercise_completed", { mode });
      }
    }
  };

  window.gtag("js", new Date());
  window.gtag("config", measurementId, { send_page_view: false, page_location: pageLocation });
  send("page_view", { page_location: pageLocation, page_title: document.title });
})();
