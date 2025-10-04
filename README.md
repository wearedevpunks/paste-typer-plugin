# Paste Typer Chrome Extension

A Chrome extension that emulates manual typing when pasting text with custom shortcuts.

## Features

- **Typing Simulation**: Paste text with realistic typing animation (Ctrl+B or Cmd+B)
- **Multiple Text Blocks**: Create sequences of text blocks that cycle through on each paste
- **Multiple Sequences**: Manage multiple text sequences with custom names
- **Persistent Storage**: All text sequences are saved locally in Chrome storage
- **Customizable**: Add, edit, and remove text blocks and sequences

## Installation

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top-right corner)
3. Click "Load unpacked"
4. Select the `paste-typer-plugin` folder
5. The extension icon should appear in your toolbar

## Creating Icons (Required for Installation)

Since the extension needs icon files, you can create simple placeholder icons:

1. Create three PNG files named `icon16.png`, `icon48.png`, and `icon128.png` in the extension folder
2. You can use any image editor or online tool to create simple 16x16, 48x48, and 128x128 pixel images
3. Suggested colors: Green background (#4CAF50) with white "PT" text

Alternatively, you can remove the icon references from `manifest.json` if you don't need icons.

## Usage

1. Click the extension icon to open the popup
2. Create or select a text sequence
3. Add text blocks (each block will be pasted in order)
4. Save your changes
5. Focus on any text input field on a webpage
6. Press **Ctrl+B** (Windows/Linux) or **Cmd+B** (Mac) to paste with typing effect
7. Each subsequent press cycles through your text blocks

## How It Works

- **Keyboard Shortcut**: Ctrl+B (Cmd+B on Mac) triggers the paste-with-typing action
- **Sequential Pasting**: Each time you use the shortcut, it types the next text block in your sequence
- **Realistic Typing**: Characters appear one by one with random delays (30-80ms) to simulate human typing
- **Multiple Sequences**: Switch between different text sequences for different use cases

## Files

- `manifest.json` - Extension configuration
- `popup.html` - UI for managing text sequences
- `popup.js` - Logic for the popup interface and storage
- `content.js` - Typing simulation and keyboard shortcut handling
- `icon*.png` - Extension icons (need to be created)

## Notes

- The extension works on all websites
- Text sequences are stored locally using Chrome's storage API
- The current block index resets to 0 when you update sequences
- Typing speed varies randomly between 30-80ms per character for natural appearance
