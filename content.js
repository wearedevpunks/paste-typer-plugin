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

// Initialize
async function init() {
  await loadData();
  setupKeyboardListener();
  setupMessageListener();
}

// Load sequences and active sequence
async function loadData() {
  const result = await chrome.storage.local.get([STORAGE_KEY, ACTIVE_SEQUENCE_KEY]);
  sequences = result[STORAGE_KEY] || {};
  activeSequenceId = result[ACTIVE_SEQUENCE_KEY];
}

// Setup keyboard listener for Ctrl+B or Cmd+B
function setupKeyboardListener() {
  document.addEventListener('keydown', async (e) => {
    // Check for Ctrl+B (Windows/Linux) or Cmd+B (Mac)
    const isTrigger = (e.ctrlKey || e.metaKey) && e.key === 'b';

    if (isTrigger && !isTyping) {
      e.preventDefault();
      e.stopPropagation();
      await handlePasteTyping();
    }
  }, true);
}

// Setup message listener for updates from popup
function setupMessageListener() {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'RELOAD_SEQUENCES') {
      loadData().then(() => {
        currentBlockIndex = 0; // Reset to first block when sequences are updated
      });
    } else if (message.type === 'RESET_SEQUENCE') {
      currentBlockIndex = 0; // Reset to first block
    }
  });
}

// Handle paste typing
async function handlePasteTyping() {
  const activeElement = document.activeElement;

  // Check if we have a valid input element
  if (!isValidInputElement(activeElement)) {
    return;
  }

  // Reload data to get latest sequences
  await loadData();

  // Get active sequence
  const activeSequence = sequences[activeSequenceId];
  if (!activeSequence || !activeSequence.blocks || activeSequence.blocks.length === 0) {
    return;
  }

  // Get current text block
  const textBlocks = activeSequence.blocks.filter(block => block.trim() !== '');
  if (textBlocks.length === 0) {
    return;
  }

  const textToType = textBlocks[currentBlockIndex % textBlocks.length];

  // Increment index for next paste
  currentBlockIndex = (currentBlockIndex + 1) % textBlocks.length;

  // Type the text
  await typeText(activeElement, textToType);
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
