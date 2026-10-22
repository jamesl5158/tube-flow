# TubeFlow

**Bilibili-style scrolling comments for YouTube.** Watch a video and read comments at the same time, without scrolling away from the player.

TubeFlow is a free Chrome extension for desktop YouTube. It shows comments from the video's comment section moving across the video. No extra account, API key, or software installation is needed beyond Chrome.

## Install

1. On [this project's GitHub page](https://github.com/jamesl5158/tube-flow), click **Code → Download ZIP**.
2. Extract the ZIP and keep the folder on your computer.
3. Open Chrome and go to `chrome://extensions`.
4. Turn on **Developer mode** in the top-right corner.
5. Click **Load unpacked** and select the folder containing `manifest.json`.
6. Open Chrome's Extensions menu (the puzzle-piece icon) and pin **TubeFlow**.
7. Open a YouTube video, or refresh any YouTube tabs already open.

Select the extracted folder, not the ZIP file. TubeFlow is installed from this folder, not the Chrome Web Store.

## Use it

1. Open a YouTube video and scroll down until the comments load. You can also click **Go to comments** in TubeFlow.
2. Scroll back to the video and press play. Comments will move across the top of the video.
3. Click the TubeFlow icon to turn comments on or off, change their speed, or adjust their opacity (how see-through they are).

Scroll farther down the comment section to load more comments. To try the effect without loading real comments, choose **Sample comments (demo)** in the popup.

Comments pause with the video. You can still click the player controls, and the flow works in theater and fullscreen modes. Your settings are saved and apply to all open YouTube tabs.

## What to expect

- **Comments are not synced to video timestamps.** Unlike Bilibili's timed comments, TubeFlow repeats comments from the YouTube comment section in order.
- You need to load the comment section for each video. TubeFlow does not download comments for you.
- It uses up to 200 loaded comments, skips duplicate text, and shortens long comments. Authors and replies are not shown.
- Videos with comments turned off have no real comments to display. Demo comments are clearly marked `SAMPLE`.
- It works on regular video pages, not Shorts or Chrome's separate picture-in-picture window. Comments may also appear during ads.

## No comments showing?

- Refresh the YouTube tab after installing or reloading TubeFlow.
- Check that **Show comments** is on and **Real comments loaded on this page** is selected.
- Scroll down until YouTube's comments appear, then return to the video and press play.
- Try **Sample comments (demo)** to check whether the scrolling effect works.

YouTube changes its website from time to time, which can stop comment loading from working.

## Privacy

Comments stay in the current tab and are not saved or sent anywhere by TubeFlow. Only your settings are saved locally. The extension runs on YouTube and does not post, like, or change comments.

## Update or remove

After changing or downloading updated files, click **Reload** on TubeFlow's card at `chrome://extensions`, then refresh your YouTube tabs. Keep using the same folder to update your installation.

To uninstall, click **Remove** on its extension card.

## For contributors

No build step or package installation is needed. Edit the files, reload the extension, and refresh YouTube to try your changes.

- `manifest.json`: extension name, permissions, and files to load.
- `comments.js`: reads comments from the page.
- `content.js`: shows and animates comments over the video.
- `settings.js`: default settings and allowed values.
- `popup.html`, `popup.css`, `popup.js`: popup controls.

With Node.js installed, run the tests from the project folder:

```sh
node --test tests/content.test.cjs
```

The tests check comment handling, animation, settings, and switching videos. They do not check YouTube's live website; test that manually in Chrome.

### Commit messages

Use `type: short description`, with a clear description of what changed:

- `feat: add comment size control`
- `fix: clear comments when switching videos`
- `docs: simplify installation steps`
- `test: cover videos with comments disabled`
- `refactor: simplify comment loading`
- `chore: update extension metadata`

Use `feat:` for new features rather than `add:`. Keep unrelated changes in separate commits.
