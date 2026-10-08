/* Shared by the popup and the isolated content script. */
globalThis.SampleCommentSettings = (() => {
  const key = "sampleCommentSettings";
  const defaults = Object.freeze({ enabled: true, speed: 100, opacity: 0.8, source: "page" });
  function normalize(value = {}) {
    const clamp = (number, min, max, fallback) =>
      typeof number === "number" && Number.isFinite(number)
        ? Math.min(max, Math.max(min, number)) : fallback;
    return {
      enabled: typeof value?.enabled === "boolean" ? value.enabled : defaults.enabled,
      source: value?.source === "samples" ? "samples" : "page",
      speed: clamp(value?.speed, 40, 240, defaults.speed),
      opacity: clamp(value?.opacity, 0.2, 1, defaults.opacity)
    };
  }
  return { key, defaults, normalize };
})();
