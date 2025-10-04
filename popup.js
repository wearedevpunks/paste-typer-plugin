// Storage keys
const STORAGE_KEY = 'pasteTyperSequences';
const ACTIVE_SEQUENCE_KEY = 'pasteTyperActiveSequence';
const LOG_KEY = 'pasteTyperLogs';

// State
let sequences = {};
let activeSequenceId = null;
let currentTextBlocks = [];
let logs = [];

// DOM Elements
const sequenceSelect = document.getElementById('sequenceSelect');
const newSequenceBtn = document.getElementById('newSequenceBtn');
const deleteSequenceBtn = document.getElementById('deleteSequenceBtn');
const textBlocksContainer = document.getElementById('textBlocksContainer');
const addBlockBtn = document.getElementById('addBlockBtn');
const resetBtn = document.getElementById('resetBtn');
const saveBtn = document.getElementById('saveBtn');
const logContainer = document.getElementById('logContainer');
const clearLogBtn = document.getElementById('clearLogBtn');
const testConnectionBtn = document.getElementById('testConnectionBtn');

// Initialize
async function init() {
  await loadSequences();
  await loadActiveSequence();
  await loadLogs();
  updateUI();
  attachEventListeners();
  setupLogListener();
}

// Load sequences from storage
async function loadSequences() {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  sequences = result[STORAGE_KEY] || {};

  // Create default sequence if none exist
  if (Object.keys(sequences).length === 0) {
    const defaultId = generateId();
    sequences[defaultId] = {
      id: defaultId,
      name: 'Default Sequence',
      blocks: ['']
    };
    await saveSequencesToStorage();
  }
}

// Load active sequence
async function loadActiveSequence() {
  const result = await chrome.storage.local.get(ACTIVE_SEQUENCE_KEY);
  activeSequenceId = result[ACTIVE_SEQUENCE_KEY];

  // Set to first sequence if no active sequence
  if (!activeSequenceId || !sequences[activeSequenceId]) {
    activeSequenceId = Object.keys(sequences)[0];
    await saveActiveSequence();
  }

  currentTextBlocks = [...sequences[activeSequenceId].blocks];
}

// Save sequences to storage
async function saveSequencesToStorage() {
  await chrome.storage.local.set({ [STORAGE_KEY]: sequences });
}

// Save active sequence
async function saveActiveSequence() {
  await chrome.storage.local.set({ [ACTIVE_SEQUENCE_KEY]: activeSequenceId });
}

// Update UI
function updateUI() {
  updateSequenceSelector();
  renderTextBlocks();
}

// Update sequence selector
function updateSequenceSelector() {
  sequenceSelect.innerHTML = '';

  Object.values(sequences).forEach(seq => {
    const option = document.createElement('option');
    option.value = seq.id;
    option.textContent = seq.name;
    if (seq.id === activeSequenceId) {
      option.selected = true;
    }
    sequenceSelect.appendChild(option);
  });
}

// Render text blocks
function renderTextBlocks() {
  textBlocksContainer.innerHTML = '';

  currentTextBlocks.forEach((text, index) => {
    const blockDiv = document.createElement('div');
    blockDiv.className = 'text-block';
    blockDiv.draggable = true;
    blockDiv.dataset.index = index;

    // Drag events
    blockDiv.addEventListener('dragstart', handleDragStart);
    blockDiv.addEventListener('dragend', handleDragEnd);
    blockDiv.addEventListener('dragover', handleDragOver);
    blockDiv.addEventListener('drop', handleDrop);
    blockDiv.addEventListener('dragleave', handleDragLeave);

    const header = document.createElement('div');
    header.className = 'text-block-header';

    const label = document.createElement('div');
    label.className = 'text-block-label';

    const dragHandle = document.createElement('span');
    dragHandle.className = 'drag-handle';
    dragHandle.textContent = '⋮⋮';
    dragHandle.title = 'Drag to reorder';

    const labelText = document.createElement('span');
    labelText.textContent = `Text Block ${index + 1}`;

    label.appendChild(dragHandle);
    label.appendChild(labelText);

    const removeBtn = document.createElement('button');
    removeBtn.className = 'btn-remove';
    removeBtn.textContent = 'Remove';
    removeBtn.onclick = () => removeBlock(index);

    header.appendChild(label);
    if (currentTextBlocks.length > 1) {
      header.appendChild(removeBtn);
    }

    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.placeholder = 'Enter text to type...';
    textarea.dataset.index = index;
    textarea.oninput = (e) => updateBlock(index, e.target.value);

    blockDiv.appendChild(header);
    blockDiv.appendChild(textarea);
    textBlocksContainer.appendChild(blockDiv);
  });
}

// Update block text
function updateBlock(index, text) {
  currentTextBlocks[index] = text;
}

// Add new block
function addBlock() {
  currentTextBlocks.push('');
  renderTextBlocks();
}

// Remove block
function removeBlock(index) {
  if (currentTextBlocks.length > 1) {
    currentTextBlocks.splice(index, 1);
    renderTextBlocks();
  }
}

// Save current sequence
async function saveCurrentSequence() {
  if (activeSequenceId && sequences[activeSequenceId]) {
    sequences[activeSequenceId].blocks = [...currentTextBlocks];
    await saveSequencesToStorage();

    // Notify content script to reload
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) {
      chrome.tabs.sendMessage(tab.id, { type: 'RELOAD_SEQUENCES' }).catch(() => {});
    }

    showSavedFeedback();
  }
}

// Show saved feedback
function showSavedFeedback() {
  const originalText = saveBtn.textContent;
  saveBtn.textContent = 'Saved!';
  saveBtn.style.background = '#4CAF50';
  setTimeout(() => {
    saveBtn.textContent = originalText;
    saveBtn.style.background = '';
  }, 1000);
}

// Create new sequence
async function createNewSequence() {
  const name = prompt('Enter sequence name:');
  if (name && name.trim()) {
    const newId = generateId();
    sequences[newId] = {
      id: newId,
      name: name.trim(),
      blocks: ['']
    };

    activeSequenceId = newId;
    currentTextBlocks = [''];

    await saveSequencesToStorage();
    await saveActiveSequence();
    updateUI();
  }
}

// Delete current sequence
async function deleteCurrentSequence() {
  if (Object.keys(sequences).length <= 1) {
    alert('Cannot delete the last sequence!');
    return;
  }

  const confirmed = confirm(`Delete sequence "${sequences[activeSequenceId].name}"?`);
  if (confirmed) {
    delete sequences[activeSequenceId];

    // Switch to first available sequence
    activeSequenceId = Object.keys(sequences)[0];
    currentTextBlocks = [...sequences[activeSequenceId].blocks];

    await saveSequencesToStorage();
    await saveActiveSequence();
    updateUI();
  }
}

// Switch sequence
async function switchSequence(sequenceId) {
  if (sequenceId && sequences[sequenceId]) {
    activeSequenceId = sequenceId;
    currentTextBlocks = [...sequences[activeSequenceId].blocks];
    await saveActiveSequence();
    renderTextBlocks();
  }
}

// Generate unique ID
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Drag and Drop functionality
let draggedIndex = null;

function handleDragStart(e) {
  draggedIndex = parseInt(e.currentTarget.dataset.index);
  e.currentTarget.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/html', e.currentTarget.innerHTML);
}

function handleDragEnd(e) {
  e.currentTarget.classList.remove('dragging');
  // Remove all drag-over classes
  document.querySelectorAll('.text-block').forEach(block => {
    block.classList.remove('drag-over');
  });
}

function handleDragOver(e) {
  if (e.preventDefault) {
    e.preventDefault();
  }
  e.dataTransfer.dropEffect = 'move';

  const targetIndex = parseInt(e.currentTarget.dataset.index);
  if (draggedIndex !== targetIndex) {
    e.currentTarget.classList.add('drag-over');
  }

  return false;
}

function handleDragLeave(e) {
  e.currentTarget.classList.remove('drag-over');
}

function handleDrop(e) {
  if (e.stopPropagation) {
    e.stopPropagation();
  }
  e.preventDefault();

  const targetIndex = parseInt(e.currentTarget.dataset.index);

  if (draggedIndex !== targetIndex && draggedIndex !== null) {
    // Reorder the array
    const draggedItem = currentTextBlocks[draggedIndex];
    currentTextBlocks.splice(draggedIndex, 1);
    currentTextBlocks.splice(targetIndex, 0, draggedItem);

    // Re-render
    renderTextBlocks();
  }

  return false;
}

// Logging functionality
async function loadLogs() {
  const result = await chrome.storage.local.get(LOG_KEY);
  logs = result[LOG_KEY] || [];
  renderLogs();
}

async function addLog(type, message, meta = {}) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    type,
    message,
    meta
  };

  logs.unshift(logEntry); // Add to beginning

  // Keep only last 100 logs
  if (logs.length > 100) {
    logs = logs.slice(0, 100);
  }

  await chrome.storage.local.set({ [LOG_KEY]: logs });
  renderLogs();
}

function renderLogs() {
  logContainer.innerHTML = '';

  logs.forEach(log => {
    const entry = document.createElement('div');
    entry.className = `log-entry ${log.type}`;

    const time = new Date(log.timestamp).toLocaleTimeString();
    const metaStr = Object.keys(log.meta).length > 0 ? JSON.stringify(log.meta) : '';

    entry.innerHTML = `
      <span class="log-time">[${time}]</span>
      <span class="log-type">${log.type.toUpperCase()}</span>
      <span class="log-message">${log.message}</span>
      ${metaStr ? `<span class="log-meta">${metaStr}</span>` : ''}
    `;

    logContainer.appendChild(entry);
  });

  // Auto-scroll to top (newest)
  logContainer.scrollTop = 0;
}

async function clearLogs() {
  logs = [];
  await chrome.storage.local.set({ [LOG_KEY]: logs });
  renderLogs();
}

// Setup listener for logs from content script
function setupLogListener() {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'LOG') {
      addLog(message.logType, message.message, message.meta || {});
    }
  });
}

// Reset sequence to start from first block
async function resetSequence() {
  addLog('info', 'Reset button clicked', { activeSequenceId });

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab) {
    addLog('info', 'Sending RESET_SEQUENCE message to tab', { tabId: tab.id });
    chrome.tabs.sendMessage(tab.id, { type: 'RESET_SEQUENCE' })
      .then(() => {
        addLog('success', 'RESET_SEQUENCE message sent successfully');
      })
      .catch((error) => {
        addLog('error', 'Failed to send RESET_SEQUENCE message', { error: error.message });
      });
  } else {
    addLog('error', 'No active tab found');
  }

  // Show feedback
  const originalText = resetBtn.textContent;
  resetBtn.textContent = 'Reset!';
  resetBtn.style.background = '#4CAF50';
  setTimeout(() => {
    resetBtn.textContent = originalText;
    resetBtn.style.background = '';
  }, 1000);
}

// Test connection to content script
async function testConnection() {
  addLog('info', 'Testing connection to content script...');

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) {
    addLog('error', 'No active tab found');
    return;
  }

  addLog('info', 'Active tab found', {
    tabId: tab.id,
    url: tab.url,
    title: tab.title
  });

  // Check if URL is allowed (chrome:// urls can't have content scripts)
  if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
    addLog('warning', 'Cannot inject content script on chrome:// or extension pages', {
      url: tab.url,
      suggestion: 'Navigate to a regular website (e.g., google.com) to test'
    });
    return;
  }

  try {
    // Try to ping the content script
    const response = await chrome.tabs.sendMessage(tab.id, { type: 'PING' });
    addLog('success', 'Content script responded', response);
  } catch (error) {
    addLog('error', 'Content script not responding', {
      error: error.message,
      suggestion: 'Reload the page and try again'
    });

    // Try to inject content script manually (if API is available)
    if (chrome.scripting && chrome.scripting.executeScript) {
      addLog('info', 'Attempting to inject content script manually...');
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content.js']
        });
        addLog('success', 'Content script injected manually - try the connection test again');
      } catch (injectError) {
        addLog('error', 'Failed to inject content script', {
          error: injectError.message,
          suggestion: 'Reload the page manually and reload the extension'
        });
      }
    } else {
      addLog('warning', 'Manual injection not available. Please reload the page.');
    }
  }
}

// Attach event listeners
function attachEventListeners() {
  addBlockBtn.addEventListener('click', addBlock);
  resetBtn.addEventListener('click', resetSequence);
  saveBtn.addEventListener('click', saveCurrentSequence);
  newSequenceBtn.addEventListener('click', createNewSequence);
  deleteSequenceBtn.addEventListener('click', deleteCurrentSequence);
  sequenceSelect.addEventListener('change', (e) => switchSequence(e.target.value));
  clearLogBtn.addEventListener('click', clearLogs);
  testConnectionBtn.addEventListener('click', testConnection);
}

// Initialize on load
init();
