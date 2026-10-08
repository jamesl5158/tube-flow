/* Reads rendered top-level comment text only. No requests or private page data. */
globalThis.PageComments = (() => {
  const limit = 200;
  function clean(text) {
    return String(text || "").replace(/[\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/g, " ")
      .replace(/\s+/g, " ").trim();
  }
  function nodes(document) {
    const root = document.querySelector("ytd-watch-flexy:not([hidden]) ytd-comments#comments");
    if (!root) return [];
    return Array.from(root.querySelectorAll("ytd-comment-thread-renderer"))
      .slice(0, limit).map(thread => {
        const comment = thread.querySelector("ytd-comment-view-model, ytd-comment-renderer");
        return comment?.querySelector("#content-text, #content");
      }).filter(Boolean);
  }
  function read(document, stale = new Map()) {
    const seen = new Set();
    return nodes(document).flatMap(node => {
      const fullText = clean(node.textContent);
      if (!fullText || stale.get(node) === fullText || seen.has(fullText)) return [];
      seen.add(fullText);
      const points = Array.from(fullText);
      return [points.length > 160 ? points.slice(0, 159).join("") + "…" : fullText];
    });
  }
  return { read, nodes, clean, limit };
})();
