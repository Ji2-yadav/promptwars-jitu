const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID || "";

export function configureTelemetry() {
  if (!measurementId || typeof window === "undefined" || window.gtag) return;

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    window.dataLayer.push(arguments);
  };
  window.gtag("js", new Date());
  window.gtag("config", measurementId, { anonymize_ip: true });

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
  document.head.appendChild(script);
}

export function trackTelemetryEvent(eventName, params = {}) {
  if (!measurementId || typeof window === "undefined" || !window.gtag) return;
  window.gtag("event", eventName, params);
}

export function isTelemetryConfigured() {
  return Boolean(measurementId);
}
