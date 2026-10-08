(() => {
  "use strict";
  const { key, normalize } = SampleCommentSettings;
  const enabled = document.getElementById("enabled");
  const speed = document.getElementById("speed");
  const opacity = document.getElementById("opacity");
  const status = document.getElementById("status");
  const source = document.getElementById("source");
  const pageStatus = document.getElementById("page-status");
  const showComments = document.getElementById("show-comments");
  const controls = [enabled, speed, opacity, source];
  controls.forEach(control => { control.disabled = true; });

  function render(settings) {
    enabled.checked = settings.enabled;
    source.value = settings.source;
    speed.value = settings.speed;
    opacity.value = Math.round(settings.opacity * 100);
    labels();
  }
  function labels() {
    document.getElementById("speed-value").value = `${speed.value} px/s`;
    document.getElementById("opacity-value").value = `${opacity.value}%`;
  }
  let saveTimer;
  let saveQueue = Promise.resolve();
  function save() {
    clearTimeout(saveTimer);
    const settings = normalize({ enabled: enabled.checked, speed: Number(speed.value), opacity: Number(opacity.value) / 100, source: source.value });
    // Serialize writes so an older slider update cannot overwrite a newer one.
    saveQueue = saveQueue.then(() => chrome.storage.local.set({ [key]: settings }))
      .then(() => { status.textContent = "Saved on this device"; })
      .catch(() => { status.textContent = "Could not save. Reopen the popup and try again."; });
  }
  controls.forEach(control => {
    control.addEventListener("input", () => {
      labels();
      clearTimeout(saveTimer);
      saveTimer = setTimeout(save, 80);
    });
    control.addEventListener("change", save);
  });
  async function pageMessage(type) {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) throw new Error("No active tab");
    return chrome.tabs.sendMessage(tab.id, { type });
  }
  async function checkPage() {
    try {
      const result = await pageMessage("comment-flow-status");
      showComments.disabled = !result.onWatch;
      pageStatus.textContent = !result.onWatch ? "Open a YouTube watch-page video." :
        result.source === "samples" ? "Demo mode: comments are fictional and labeled SAMPLE." :
        result.count ? `${result.count} real comments ready. They will repeat during playback.` :
        "No comments loaded yet. Scroll to the comments, wait for them to appear, then return to the video. Some videos have comments disabled.";
    } catch {
      showComments.disabled = true;
      pageStatus.textContent = "Open or refresh a YouTube watch page to connect the extension.";
    }
  }
  showComments.addEventListener("click", async () => {
    try { await pageMessage("comment-flow-show-comments"); await checkPage(); }
    catch { await checkPage(); }
  });
  checkPage();
  const pageTimer = setInterval(checkPage, 1000);
  window.addEventListener("pagehide", () => clearInterval(pageTimer));
  chrome.storage.local.get(key).then(result => {
    render(normalize(result[key]));
    controls.forEach(control => { control.disabled = false; });
    status.textContent = "Saved on this device";
  }).catch(() => { status.textContent = "Could not load settings. Reopen the popup."; });
})();
