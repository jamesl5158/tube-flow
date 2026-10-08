(() => {
  "use strict";
  const { key, defaults, normalize } = SampleCommentSettings;
  const samples = [
    "SAMPLE · Hello from the demo!",
    "SAMPLE · What a great moment",
    "SAMPLE · Three lanes, one video",
    "SAMPLE · These comments are fictional",
    "SAMPLE · Enjoy the video!",
    "SAMPLE · Try the speed control"
  ];
  let settings = { ...defaults };
  let attachment = null;
  let frame = 0;
  let lastTime = null;
  let sampleIndex = 0;
  let reconcileTimer;
  let pageComments = [];
  let staleComments = new Map();
  let navigating = false;

  function clearFlow() {
    stop();
    sampleIndex = 0;
    if (attachment) attachment.lanes.forEach(lane => {
      lane.items.forEach(item => item.node.remove());
      lane.items = [];
      lane.nextSpawn = performance.now();
    });
  }
  function rememberOldComments() {
    staleComments = new Map();
    for (const node of PageComments.nodes(document)) {
      staleComments.set(node, PageComments.clean(node.textContent));
    }
  }
  function refreshComments() {
    if (!attachment || navigating) return;
    const watch = document.querySelector("ytd-watch-flexy:not([hidden])");
    const owner = watch?.getAttribute("video-id");
    if (owner && owner !== attachment.videoId) return;
    const next = PageComments.read(document, staleComments);
    if (next.length !== pageComments.length || next.some((text, i) => text !== pageComments[i])) {
      pageComments = next;
      sync();
    }
  }

  function stop() {
    cancelAnimationFrame(frame);
    frame = 0;
    lastTime = null;
  }
  function canFlow() {
    return attachment && !navigating && (settings.source === "samples" || pageComments.length > 0) && settings.enabled && !document.hidden &&
      !attachment.video.paused && !attachment.video.ended &&
      !attachment.buffering && attachment.width > 0;
  }
  function sync() {
    if (attachment) {
      attachment.host.style.display = settings.enabled ? "block" : "none";
      attachment.host.style.opacity = String(settings.opacity);
    }
    if (canFlow()) {
      if (!frame) frame = requestAnimationFrame(tick);
    } else stop();
  }
  function tick(now) {
    frame = 0;
    if (!canFlow()) { stop(); return; }
    const elapsed = lastTime === null ? 0 : Math.min((now - lastTime) / 1000, 0.1);
    lastTime = now;
    const { lanes, width } = attachment;
    lanes.forEach((lane, index) => {
      for (const item of lane.items) {
        item.x -= settings.speed * elapsed;
        item.node.style.transform = `translateX(${item.x}px)`;
      }
      lane.items = lane.items.filter(item => {
        if (item.x + item.width < 0) { item.node.remove(); return false; }
        return true;
      });
      const tail = lane.items.at(-1);
      // A lane only emits when its last comment leaves enough room.
      if ((!tail || tail.x + tail.width < width - 56) && now >= lane.nextSpawn) {
        const node = document.createElement("span");
        node.className = "comment";
        const pool = settings.source === "samples" ? samples : pageComments;
        node.textContent = pool[sampleIndex++ % pool.length];
        lane.node.append(node);
        const item = { node, x: width, width: node.getBoundingClientRect().width };
        node.style.transform = `translateX(${width}px)`;
        lane.items.push(item);
        lane.nextSpawn = now + 1100 + index * 250;
      }
    });
    frame = requestAnimationFrame(tick);
  }
  function detach() {
    stop();
    if (!attachment) return;
    attachment.events.abort();
    attachment.resize.disconnect();
    attachment.host.remove();
    attachment = null;
  }
  function attach(player, video) {
    const host = document.createElement("div");
    host.setAttribute("data-sample-comment-flow", "");
    host.setAttribute("aria-hidden", "true");
    // The host and every shadow descendant pass all pointer events through.
    host.style.cssText = "position:absolute;inset:0;pointer-events:none!important;z-index:20;overflow:hidden;";
    const shadow = host.attachShadow({ mode: "closed" });
    const style = document.createElement("style");
    style.textContent = `
      :host, * { pointer-events: none !important; }
      .lanes { position:absolute; left:0; right:0; top:12px; height:clamp(78px, 25%, 108px); }
      .lane { position:relative; height:33.333%; overflow:hidden; }
      .comment { position:absolute; left:0; top:0; white-space:nowrap;
        font:600 clamp(10px, var(--sample-font, 14px), 16px)/1.35 system-ui,sans-serif;
        color:#fff; background:rgba(12,20,30,.8); border:1px solid rgba(160,231,220,.6);
        border-radius:999px; padding:3px 10px; box-sizing:border-box;
        text-shadow:0 1px 2px #000; will-change:transform; }
    `;
    const container = document.createElement("div");
    container.className = "lanes";
    const lanes = Array.from({ length: 3 }, (_, index) => {
      const node = document.createElement("div");
      node.className = "lane";
      container.append(node);
      return { node, items: [], nextSpawn: performance.now() + index * 650 };
    });
    shadow.append(style, container);
    player.append(host);
    const events = new AbortController();
    attachment = { player, video, host, lanes, events, videoId: new URLSearchParams(location.search).get("v"), width: 0, buffering: video.readyState < 3 };
    const resize = new ResizeObserver(() => {
      if (!attachment || attachment.host !== host) return;
      const rect = player.getBoundingClientRect();
      attachment.width = rect.width;
      host.style.setProperty("--sample-font", `${Math.max(10, Math.min(16, rect.height / 28))}px`);
      sync();
    });
    attachment.resize = resize;
    resize.observe(player);
    for (const name of ["pause", "ended", "play", "playing", "waiting", "stalled", "emptied", "canplay"]) {
      video.addEventListener(name, () => {
        if (!attachment || attachment.video !== video) return;
        if (["waiting", "emptied"].includes(name)) attachment.buffering = true;
        if (["playing", "canplay"].includes(name)) attachment.buffering = false;
        sync();
      }, { signal: events.signal });
    }
    sync();
  }
  function reconcile() {
    clearTimeout(reconcileTimer);
    reconcileTimer = null;
    if (navigating) return;
    const onWatch = location.pathname === "/watch" && new URLSearchParams(location.search).has("v");
    const player = onWatch ? document.querySelector("#movie_player") : null;
    const video = player?.querySelector("video.html5-main-video");
    const videoId = new URLSearchParams(location.search).get("v");
    if (attachment && attachment.videoId !== videoId) {
      const owner = document.querySelector("ytd-watch-flexy:not([hidden])")?.getAttribute("video-id");
      if (owner !== videoId) rememberOldComments();
      else staleComments = new Map();
      pageComments = [];
      sampleIndex = 0;
      detach();
    }
    if (attachment && (attachment.player !== player || attachment.video !== video || !attachment.host.isConnected)) detach();
    if (player && video && !attachment) attach(player, video);
    refreshComments();
  }
  function scheduleReconcile() {
    if (reconcileTimer) return;
    reconcileTimer = setTimeout(reconcile, 100);
  }
  // YouTube uses same-document navigation, including from home to /watch.
  new MutationObserver(scheduleReconcile).observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener("yt-navigate-start", () => {
    navigating = true;
    rememberOldComments();
    pageComments = [];
    clearFlow();
    detach();
  });
  document.addEventListener("yt-navigate-finish", () => {
    navigating = false;
    reconcile();
    sync();
  });
  window.addEventListener("popstate", reconcile);
  document.addEventListener("visibilitychange", sync);
  window.addEventListener("pagehide", detach);
  window.addEventListener("pageshow", reconcile);
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local" || !changes[key]) return;
    const previousSource = settings.source;
    settings = normalize(changes[key].newValue);
    if (settings.source !== previousSource) clearFlow();
    sync();
  });
  chrome.runtime.onMessage.addListener((message, sender, respond) => {
    if (message?.type !== "comment-flow-status" && message?.type !== "comment-flow-show-comments") return;
    reconcile();
    if (message.type === "comment-flow-show-comments" && attachment) {
      document.querySelector("ytd-watch-flexy:not([hidden]) ytd-comments#comments")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    respond({ onWatch: Boolean(attachment), count: pageComments.length, source: settings.source });
  });
  chrome.storage.local.get(key).then(result => {
    settings = normalize(result[key]);
    reconcile();
    sync();
  }).catch(() => { reconcile(); });
})();
