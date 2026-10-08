# YouTube Comment Flow

A shareable, local Chrome Manifest V3 extension written in plain JavaScript, HTML, and CSS. Real comments already loaded on a YouTube watch page move right to left in three lanes across the top of its player. Everyone who downloads this project can use the same method: **no API key, server, extra account, or package installation is required.**

## Install on your computer

1. Download the project ZIP and extract it into a permanent folder, or download/clone the project source.
2. Open desktop Google Chrome and visit `chrome://extensions`.
3. Turn on **Developer mode** in the upper-right corner.
4. Click **Load unpacked** and select the extracted folder containing `manifest.json`. If your download has nested folders, open them until you find that file. Select the folder, not the ZIP or the JSON file.
5. Open Chrome's Extensions menu (puzzle-piece icon) and pin **YouTube Comment Flow**.
6. Open or refresh a YouTube watch-page video. Refresh existing YouTube tabs after installing or reloading the extension.

These instructions use the downloaded folder on each person's own computer; no path or credentials from the original developer are needed. Keep the folder in place while the extension is installed. Managed computers may restrict developer mode. This project is distributed as an unpacked extension, not a Chrome Web Store installation.

If you already installed the earlier sample version, click **Reload** on its card at `chrome://extensions`, refresh your YouTube tabs, and select **Real comments loaded on this page** in the popup. The existing speed, opacity, and on/off preferences are preserved.

## Use real comments

1. Open a normal YouTube watch page and scroll down until its comment text appears. You can also open the extension popup and click **Go to comments**.
2. Wait for YouTube to load comments, then scroll back to the video and start playback.
3. Open the popup to see how many real comments are ready. Scroll farther into the comments section to load more; the extension automatically notices them.
4. Adjust **Show comments**, **Speed** (40–240 pixels per second), and **Opacity** (20–100%). Settings persist locally and apply to open YouTube tabs.

Real-comment mode never substitutes fictional comments when none are available. If comments are disabled, unavailable, or not loaded, no comment flow appears. Select **Sample comments (demo)** to test the overlay independently; every fictional comment starts with `SAMPLE ·`.

Flow freezes when playback pauses, ends, buffers, or the tab is hidden. Turning it off hides it and stops animation; turning it back on resumes when the video plays. The overlay passes all pointer events through to YouTube. Controls are in the toolbar popup, outside the player. Theater and fullscreen modes use the same overlay. It does not appear in Chrome's separate Picture-in-Picture window.

## What this method can do

The extension reads rendered top-level comment text from the current watch page. It does not fetch comments itself, automatically scroll, expand replies, log in, like, post, use private YouTube endpoints, or call an API. Reading loaded comments is DOM scraping. Comment text stays in the current tab's memory and is not saved or sent anywhere; only control settings are stored locally.

It reads up to 200 rendered top-level comments, removes duplicate text, and limits each overlay message to 160 Unicode characters. It repeats available comments in sequence, without authors or replies. Comments are not tied to playback timestamps. Switching videos clears the old comment flow.

YouTube loads comments lazily, so users must load the section at least once per video. This cannot guarantee access to every comment. YouTube's markup can change; the selectors in `comments.js` may need updating. Videos with disabled comments have no real comments to display. Ads use the same player, so flow may also appear during ads.

The extension requests only the `storage` API permission. Content scripts are limited to `https://www.youtube.com/*` to support navigation from home/search into watch pages. The overlay attaches only to `/watch` pages with a video ID. No background service worker or build step is required.

## Share the project

Share the ZIP or the complete source folder. Each recipient extracts it and follows the installation steps above. Do not include personal Chrome profile data; it is not needed. Publishing to the Chrome Web Store is a separate future distribution step.

## Manual test checklist

- [ ] Install from a fresh extraction on another computer or Chrome profile. No API key, developer-specific path, or additional account is requested.
- [ ] Refresh a watch page, choose real comments, and open the popup. Before comments load, it explains how to load them; it does not show samples.
- [ ] Click **Go to comments**, wait for comment text to appear, and return to the video. The popup shows a nonzero count; actual page comments move right to left in three lanes.
- [ ] Scroll farther into the comments. The available pool updates, bounded at 200 rendered comments. Long comments are shortened.
- [ ] Pause using the player button and keyboard. Comments freeze and resume from their frozen positions without a large jump.
- [ ] Scrub/buffer the video and switch away from the tab. Flow stops while waiting/hidden and resumes without a catch-up burst. At the video end, it stops.
- [ ] Switch on/off and test the speed/opacity extremes. Existing comments respond; comments within a lane stay spaced.
- [ ] Close/reopen the popup and refresh. Settings persist. Changes also apply to another open YouTube tab.
- [ ] Switch between real and sample modes. Old messages clear; samples carry the SAMPLE label. Switching back uses only loaded real comments.
- [ ] Navigate between two videos without refreshing. Comments from the first video do not carry over. Load the second video's comments and verify its flow appears.
- [ ] Navigate home, to search, or to Shorts; no overlay remains. Use Back/Forward and return to a watch video; only one overlay attaches.
- [ ] Click directly through an overlay message. Player clicks, seeking, volume, captions, settings menus, keyboard shortcuts, and fullscreen still work.
- [ ] Resize the window and switch theater/fullscreen. Three lanes stay near the player top with no duplicates. In fullscreen, use previously saved settings if Chrome's toolbar is unavailable.
- [ ] Test a video with disabled comments: real mode shows no flow; demo mode still works.
- [ ] Check the extension's Errors panel at `chrome://extensions` and the watch page's DevTools console for extension errors.

After editing files, reload the extension at `chrome://extensions` and refresh YouTube tabs. To uninstall, click **Remove** on its extension card.

## Files and verification

- `manifest.json`: MV3 declaration and YouTube-only injection.
- `settings.js`: shared defaults, source selection, and bounded values.
- `comments.js`: rendered comment selectors, normalization, deduplication, and length limits.
- `content.js`: overlay animation, comment queue, playback/navigation lifecycle, and popup messages.
- `popup.html`, `popup.css`, `popup.js`: controls, comment count, and the Go to comments button.
- `tests/content.test.cjs`: dependency-free tests exercising the scripts with a mocked DOM and animation clock.

Run `node --test tests/content.test.cjs` from this folder. Automated tests cover sample animation, pause/buffering/tab visibility, settings, navigation cleanup, real-comment loading, plain-text insertion, deduplication, and length limits. They do not validate YouTube's current live markup; complete the manual checks in Chrome too.

Chrome references: [load an unpacked extension](https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world#load-unpacked), [content scripts](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts), [local storage](https://developer.chrome.com/docs/extensions/reference/api/storage).
