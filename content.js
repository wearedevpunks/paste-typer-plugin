// Storage keys
const STORAGE_KEY = 'pasteTyperSequences';
const ACTIVE_SEQUENCE_KEY = 'pasteTyperActiveSequence';

// State
let sequences = {};
let activeSequenceId = null;
let currentBlockIndex = 0;
let isTyping = false;

// Configuration
const TYPING_SPEED_MIN = 30; // milliseconds
const TYPING_SPEED_MAX = 80; // milliseconds

// Logging helper
function log(type, message, meta = {}) {
  chrome.runtime.sendMessage({
    type: 'LOG',
    logType: type,
    message,
    meta
  }).catch(() => {
    // Popup might not be open
    console.log(`[Paste Typer] ${type.toUpperCase()}: ${message}`, meta);
  });
}

// Initialize
async function init() {
  log('info', 'Content script initializing');
  await loadData();
  setupKeyboardListener();
  setupMessageListener();
  log('success', 'Content script initialized', {
    activeSequenceId,
    numSequences: Object.keys(sequences).length
  });
}

// Load sequences and active sequence
async function loadData() {
  const result = await chrome.storage.local.get([STORAGE_KEY, ACTIVE_SEQUENCE_KEY]);
  sequences = result[STORAGE_KEY] || {};
  activeSequenceId = result[ACTIVE_SEQUENCE_KEY];
  log('info', 'Data loaded from storage', {
    activeSequenceId,
    numSequences: Object.keys(sequences).length,
    currentBlockIndex
  });
}

// Setup keyboard listener for Ctrl+B or Cmd+B
function setupKeyboardListener() {
  log('info', 'Keyboard listener setup');
  document.addEventListener('keydown', async (e) => {
    // Check for Ctrl+B (Windows/Linux) or Cmd+B (Mac)
    const isTrigger = (e.ctrlKey || e.metaKey) && e.key === 'b';

    if (isTrigger) {
      log('info', 'Ctrl/Cmd+B pressed', {
        isTyping,
        ctrlKey: e.ctrlKey,
        metaKey: e.metaKey,
        key: e.key
      });

      if (!isTyping) {
        e.preventDefault();
        e.stopPropagation();
        await handlePasteTyping();
      } else {
        log('warning', 'Typing already in progress, ignoring keypress');
      }
    }
  }, true);
}

// Setup message listener for updates from popup
function setupMessageListener() {
  log('info', 'Message listener setup');
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    log('info', 'Message received from popup', { messageType: message.type });

    if (message.type === 'RELOAD_SEQUENCES') {
      loadData().then(() => {
        currentBlockIndex = 0; // Reset to first block when sequences are updated
        log('success', 'Sequences reloaded, index reset to 0');
      });
    } else if (message.type === 'RESET_SEQUENCE') {
      const oldIndex = currentBlockIndex;
      currentBlockIndex = 0; // Reset to first block
      log('success', 'Sequence reset to first block', {
        oldIndex,
        newIndex: currentBlockIndex
      });
    }
  });
}

// Handle paste typing
async function handlePasteTyping() {
  const activeElement = document.activeElement;

  log('info', 'handlePasteTyping called', {
    tagName: activeElement?.tagName,
    type: activeElement?.type,
    isContentEditable: activeElement?.isContentEditable
  });

  // Check if we have a valid input element
  if (!isValidInputElement(activeElement)) {
    log('warning', 'Active element is not a valid input', {
      tagName: activeElement?.tagName,
      type: activeElement?.type
    });
    return;
  }

  // Reload data to get latest sequences
  await loadData();

  // Get active sequence
  const activeSequence = sequences[activeSequenceId];
  if (!activeSequence || !activeSequence.blocks || activeSequence.blocks.length === 0) {
    log('error', 'No active sequence or blocks found', {
      activeSequenceId,
      hasSequence: !!activeSequence,
      numBlocks: activeSequence?.blocks?.length || 0
    });
    return;
  }

  // Get current text block
  const textBlocks = activeSequence.blocks.filter(block => block.trim() !== '');
  if (textBlocks.length === 0) {
    log('warning', 'No non-empty text blocks found');
    return;
  }

  const textToType = textBlocks[currentBlockIndex % textBlocks.length];

  log('info', 'Starting to type text block', {
    blockIndex: currentBlockIndex,
    totalBlocks: textBlocks.length,
    textLength: textToType.length,
    textPreview: textToType.substring(0, 30)
  });

  // Increment index for next paste
  const oldIndex = currentBlockIndex;
  currentBlockIndex = (currentBlockIndex + 1) % textBlocks.length;

  log('info', 'Block index incremented', {
    oldIndex,
    newIndex: currentBlockIndex
  });

  // Type the text
  await typeText(activeElement, textToType);

  log('success', 'Text typing completed');
}

// Check if element is a valid input element
function isValidInputElement(element) {
  if (!element) return false;

  const tagName = element.tagName.toLowerCase();
  const isInput = tagName === 'input' || tagName === 'textarea';
  const isContentEditable = element.isContentEditable;

  // For input elements, check if they accept text
  if (tagName === 'input') {
    const type = element.type.toLowerCase();
    const textTypes = ['text', 'email', 'search', 'url', 'tel', 'password'];
    return textTypes.includes(type);
  }

  return isInput || isContentEditable;
}

// Type text character by character with random delays
async function typeText(element, text) {
  if (!text) return;

  isTyping = true;

  const isContentEditable = element.isContentEditable;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (isContentEditable) {
      // For contenteditable elements
      insertTextAtCursor(char);
    } else {
      // For input/textarea elements
      const start = element.selectionStart || 0;
      const end = element.selectionEnd || 0;
      const currentValue = element.value;

      element.value = currentValue.substring(0, start) + char + currentValue.substring(end);
      element.selectionStart = element.selectionEnd = start + 1;

      // Trigger input event
      element.dispatchEvent(new Event('input', { bubbles: true }));
    }

    // Random delay to simulate human typing
    const delay = Math.random() * (TYPING_SPEED_MAX - TYPING_SPEED_MIN) + TYPING_SPEED_MIN;
    await sleep(delay);
  }

  // Trigger change event after typing is complete
  if (!isContentEditable) {
    element.dispatchEvent(new Event('change', { bubbles: true }));
  }

  isTyping = false;
}

// Insert text at cursor position in contenteditable
function insertTextAtCursor(text) {
  const selection = window.getSelection();
  if (!selection.rangeCount) return;

  const range = selection.getRangeAt(0);
  range.deleteContents();

  const textNode = document.createTextNode(text);
  range.insertNode(textNode);

  // Move cursor after inserted text
  range.setStartAfter(textNode);
  range.setEndAfter(textNode);
  selection.removeAllRanges();
  selection.addRange(range);

  // Trigger input event
  const event = new Event('input', { bubbles: true });
  range.commonAncestorContainer.dispatchEvent(event);
}

// Sleep utility
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Initialize
init();
