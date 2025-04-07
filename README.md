# Custom Whisper Dictation Extension

**NOTICE: Not Actively Developed - Using Windows Dictation Instead**  
This extension was built to record audio and send it to a custom Whisper server (`llama.cpp`) for transcription, but Windows dictation (local, universal, activated with Win + H) has taken over as the go-to. It’s faster, works in any text field, and doesn’t need a server. This project’s on hold unless Groove-specific needs pop up again.

## Overview

A browser extension for Chrome, Firefox, Edge, and Brave that adds a dictation button to `textarea` elements. Records audio, sends it to a custom Whisper endpoint (e.g., `https://yourserver.com/v1/audio/transcriptions`), and inserts transcriptions in real-time. Built with Groove (xAI) in mind, but Windows dictation’s broader compatibility won out.

## Features

- Circular button (mic/stop icons) at `10px` top/right in `textarea`.
- Real-time transcription via 5-second audio chunks.
- Configurable endpoint URL, API key, and model in the popup.
- Sexy popup UI with gradients and dark/light mode support.

## Setup

1. **Install**: Clone this repo, `npm install`, `npm run build`.
2. **Load**: Unpacked in Chrome (`dist/chrome/`), Firefox (`dist/firefox/`), etc.
3. **Config**: Open popup, set your Whisper server URL, API key, and model.
4. **Use**: Click the mic button in any `textarea`, talk, click to stop.

## Why It’s Paused

Windows dictation (Win + H) runs locally, works in all text fields, and doesn’t need a server or extension. It’s a better fit for general use—faster, simpler, and universal. This extension’s Groove-specific and server-dependent, so it’s sidelined unless server-side Whisper needs resurface.

## Future

- Could tweak for local `llama.cpp` on desktop (vs. server), but Windows dictation’s got it covered for now.
- Open to PRs if someone wants to revive it!
