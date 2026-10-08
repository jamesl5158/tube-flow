const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const source = name => fs.readFileSync(path.join(__dirname, "..", name), "utf8");

class Target {
  listeners = new Map();
  addEventListener(name, listener, options = {}) {
    const listeners = this.listeners.get(name) || new Set();
    listeners.add(listener);
    this.listeners.set(name, listeners);
    options.signal?.addEventListener("abort", () => listeners.delete(listener));
  }
  emit(name) { for (const fn of this.listeners.get(name) || []) fn(); }
}
class Element extends Target {
  children = [];
  isConnected = true;
  style = { setProperty(key, value) { this[key] = value; } };
  textContent = "";
  append(...children) {
    children.forEach(child => { child.parent = this; this.children.push(child); });
  }
  remove() {
    this.isConnected = false;
    if (this.parent) this.parent.children = this.parent.children.filter(child => child !== this);
  }
  setAttribute() {}
  attachShadow() { this.shadow = new Element(); return this.shadow; }
  getBoundingClientRect() {
    return { width: this.className === "comment" ? this.textContent.length * 7 + 22 : 960, height: 540 };
  }
  querySelector() { return this.video; }
}
async function setup(onWatch = true, sourceMode = "samples") {
  const document = new Target();
  document.documentElement = new Element();
  document.hidden = false;
  document.createElement = () => new Element();
  const player = new Element();
  const video = new Element();
  Object.assign(video, { paused: false, ended: false, readyState: 4 });
  player.video = video;
  let texts = [];
  const root = {
    querySelectorAll: () => texts.map(node => ({ querySelector: () => ({ querySelector: () => node }) })),
    scrollIntoView() {}
  };
  const watch = { getAttribute: () => new URLSearchParams(context.location.search).get("v") };
  document.querySelector = selector => selector === "#movie_player" ? player :
    selector.includes("ytd-comments") ? root : selector.includes("ytd-watch-flexy") ? watch : null;
  const frames = new Map();
  let nextFrame = 1;
  let now = 0;
  let storageListener;
  let messageListener;
  const context = vm.createContext({
    document, window: new Target(), AbortController, URLSearchParams,
    location: { pathname: onWatch ? "/watch" : "/", search: onWatch ? "?v=demo" : "" },
    performance: { now: () => now },
    setTimeout, clearTimeout,
    requestAnimationFrame(fn) { const id = nextFrame++; frames.set(id, fn); return id; },
    cancelAnimationFrame(id) { frames.delete(id); },
    MutationObserver: class { observe() {} },
    ResizeObserver: class {
      constructor(fn) { this.fn = fn; }
      observe() { queueMicrotask(this.fn); }
      disconnect() {}
    },
    chrome: { runtime: { onMessage: { addListener(fn) { messageListener = fn; } } }, storage: {
      local: { get: async () => ({ sampleCommentSettings: { source: sourceMode } }) },
      onChanged: { addListener(fn) { storageListener = fn; } }
    } }
  });
  vm.runInContext(source("settings.js"), context);
  vm.runInContext(source("comments.js"), context);
  vm.runInContext(source("content.js"), context);
  await new Promise(resolve => setImmediate(resolve));
  return {
    context, document, player, video, frames,
    tick(ms = 16) {
      now += ms;
      const callbacks = [...frames.values()];
      frames.clear();
      callbacks.forEach(fn => fn(now));
    },
    settings(value) { storageListener({ sampleCommentSettings: { newValue: { source: sourceMode, ...value } } }, "local"); },
    loadComments(values) { texts = values.map(textContent => ({ textContent })); document.emit("yt-navigate-finish"); },
    message(type) { let result; messageListener({ type }, {}, value => { result = value; }); return result; },
    host: () => player.children[0],
    comments: () => player.children[0]?.shadow.children[1].children.flatMap(lane => lane.children) || []
  };
}

test("labels samples, moves left, freezes on pause/buffering/hidden, resumes without jump", async () => {
  const env = await setup();
  env.tick();
  const comment = env.comments()[0];
  assert.match(comment.textContent, /^SAMPLE · /);
  assert.equal(comment.style.transform, "translateX(960px)");
  env.tick(100);
  assert.equal(comment.style.transform, "translateX(950px)");
  env.video.paused = true;
  env.video.emit("pause");
  assert.equal(env.frames.size, 0);
  env.tick(5000);
  assert.equal(comment.style.transform, "translateX(950px)");
  env.video.paused = false;
  env.video.emit("playing");
  env.tick();
  assert.equal(comment.style.transform, "translateX(950px)");
  env.tick(100);
  assert.equal(comment.style.transform, "translateX(940px)");
  env.video.emit("waiting");
  assert.equal(env.frames.size, 0);
  env.video.emit("playing");
  assert.equal(env.frames.size, 1);
  env.document.hidden = true;
  env.document.emit("visibilitychange");
  assert.equal(env.frames.size, 0);
  env.document.hidden = false;
  env.document.emit("visibilitychange");
  assert.equal(env.frames.size, 1);
  env.video.ended = true;
  env.video.emit("ended");
  assert.equal(env.frames.size, 0);
});

test("live settings hide the overlay, change opacity and change existing comment speed", async () => {
  const env = await setup();
  env.tick();
  const comment = env.comments()[0];
  env.settings({ enabled: false, speed: 240, opacity: 0.2 });
  assert.equal(env.host().style.display, "none");
  assert.equal(env.host().style.opacity, "0.2");
  assert.equal(env.frames.size, 0);
  env.settings({ enabled: true, speed: 240, opacity: 1 });
  assert.equal(env.host().style.display, "block");
  env.tick();
  env.tick(100);
  assert.equal(comment.style.transform, "translateX(936px)");
  assert.match(env.host().style.cssText, /pointer-events:none!important/);
});

test("same-document navigation attaches once and cleans up replaced videos and non-watch routes", async () => {
  const env = await setup(false);
  assert.equal(env.player.children.length, 0);
  env.context.location.pathname = "/watch";
  env.context.location.search = "?v=demo";
  env.document.emit("yt-navigate-finish");
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(env.player.children.length, 1);
  env.document.emit("yt-navigate-finish");
  assert.equal(env.player.children.length, 1);
  const oldHost = env.host();
  const replacement = new Element();
  Object.assign(replacement, { paused: true, ended: false, readyState: 4 });
  env.player.video = replacement;
  env.document.emit("yt-navigate-finish");
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(oldHost.isConnected, false);
  assert.equal(env.player.children.length, 1);
  assert.equal(env.frames.size, 0);
  env.context.location.pathname = "/shorts/demo";
  env.document.emit("yt-navigate-finish");
  assert.equal(env.player.children.length, 0);
  env.video.emit("playing");
  assert.equal(env.frames.size, 0);
});

test("lanes recycle comments, stay bounded and keep a gap over sustained animation", async () => {
  const env = await setup();
  env.settings({ enabled: true, speed: 240, opacity: 1 });
  for (let i = 0; i < 1200; i++) {
    env.tick(100);
    const lanes = env.host().shadow.children[1].children;
    for (const lane of lanes) {
      assert.ok(lane.children.length <= 5);
      const positions = lane.children.map(node => ({
        x: Number(node.style.transform.match(/translateX\(([^p]+)px\)/)[1]),
        width: node.getBoundingClientRect().width
      }));
      for (let j = 1; j < positions.length; j++) {
        assert.ok(positions[j].x - (positions[j - 1].x + positions[j - 1].width) >= 56);
      }
    }
  }
  assert.equal(env.frames.size, 1);
});

test("stored settings are bounded and invalid values fall back to defaults", () => {
  const context = vm.createContext({});
  vm.runInContext(source("settings.js"), context);
  const normalize = context.SampleCommentSettings.normalize;
  assert.deepEqual({ ...normalize({ enabled: false, speed: 999, opacity: -1 }) }, { enabled: false, speed: 240, opacity: 0.2, source: "page" });
  assert.deepEqual({ ...normalize({ speed: NaN, opacity: "0.2" }) }, { enabled: true, speed: 100, opacity: 0.8, source: "page" });
  assert.deepEqual({ ...normalize(null) }, { enabled: true, speed: 100, opacity: 0.8, source: "page" });
});

test("real mode waits for comments, reports count and inserts plain text without samples", async () => {
  const env = await setup(true, "page");
  assert.equal(env.frames.size, 0);
  assert.equal(env.message("comment-flow-status").count, 0);
  env.loadComments(["A real comment", "A real comment", "<img src=x onerror=alert(1)>"]);
  assert.equal(env.message("comment-flow-status").count, 2);
  env.tick();
  assert.equal(env.comments()[0].textContent, "A real comment");
  assert.ok(env.comments().every(node => !node.textContent.startsWith("SAMPLE")));
  env.settings({ source: "samples" });
  assert.equal(env.comments().length, 0);
  env.tick();
  assert.match(env.comments()[0].textContent, /^SAMPLE/);
});

test("navigation clears the old video queue even if the player is reused", async () => {
  const env = await setup(true, "page");
  env.loadComments(["Old video comment"]);
  env.tick();
  const oldHost = env.host();
  env.document.emit("yt-navigate-start");
  assert.equal(env.frames.size, 0);
  assert.equal(oldHost.isConnected, false);
  env.context.location.search = "?v=another-video";
  env.document.emit("yt-navigate-finish");
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(env.message("comment-flow-status").count, 0);
  env.loadComments(["New video comment"]);
  assert.equal(env.message("comment-flow-status").count, 1);
  env.tick();
  assert.equal(env.comments()[0].textContent, "New video comment");
});

test("comment reader normalizes whitespace, bounds text and handles missing comments", () => {
  const context = vm.createContext({});
  vm.runInContext(source("comments.js"), context);
  const reader = context.PageComments;
  assert.equal(reader.clean(" Hello\n  world\u202e "), "Hello world");
  assert.equal(reader.read({ querySelector: () => null }).length, 0);
  const node = { textContent: "🙂".repeat(200) };
  const document = { querySelector: () => ({ querySelectorAll: () => [
    { querySelector: () => ({ querySelector: () => node }) },
    { querySelector: () => null }
  ] }) };
  const result = reader.read(document);
  assert.equal(Array.from(result[0]).length, 160);
  assert.ok(result[0].endsWith("…"));
  assert.equal(reader.read(document, new Map([[node, node.textContent]])).length, 0);
});
