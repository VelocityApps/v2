/**
 * Popup Script
 * Handles UI interactions and AI chat
 */

let apiKey = '';
let model = 'gpt-3.5-turbo';
let conversationHistory = [];

// DOM elements
const messagesContainer = document.getElementById('messages');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const settingsBtn = document.getElementById('settings-btn');
const settingsPanel = document.getElementById('settings-panel');
const apiKeyInput = document.getElementById('api-key-input');
const modelSelect = document.getElementById('model-select');
const saveSettingsBtn = document.getElementById('save-settings');
const statusDiv = document.getElementById('status');

// Load settings on startup
chrome.storage.local.get(['apiKey', 'model'], (result) => {
  apiKey = result.apiKey || '';
  model = result.model || 'gpt-3.5-turbo';
  
  if (apiKey) {
    apiKeyInput.value = apiKey;
  }
  modelSelect.value = model;

  if (!apiKey) {
    showSettings();
    showStatus('Please configure your OpenAI API key', 'error');
  }
});

// Toggle settings panel
settingsBtn.addEventListener('click', () => {
  settingsPanel.classList.toggle('hidden');
});

// Save settings
saveSettingsBtn.addEventListener('click', () => {
  apiKey = apiKeyInput.value.trim();
  model = modelSelect.value;

  chrome.storage.local.set({ apiKey, model }, () => {
    showStatus('Settings saved!', 'success');
    setTimeout(() => {
      settingsPanel.classList.add('hidden');
      hideStatus();
    }, 1500);
  });
});

// Send message
sendBtn.addEventListener('click', sendMessage);
messageInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

async function sendMessage() {
  const message = messageInput.value.trim();
  if (!message) return;

  if (!apiKey) {
    showSettings();
    showStatus('Please configure your API key first', 'error');
    return;
  }

  // Add user message to UI
  addMessage('user', message);
  messageInput.value = '';

  // Show loading message
  const loadingId = addMessage('assistant', '', true);

  try {
    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: [
          ...conversationHistory,
          { role: 'user', content: message }
        ],
        max_tokens: 500
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'API request failed');
    }

    const data = await response.json();
    const assistantMessage = data.choices[0].message.content;

    // Update conversation history
    conversationHistory.push(
      { role: 'user', content: message },
      { role: 'assistant', content: assistantMessage }
    );

    // Keep only last 10 messages to avoid token limits
    if (conversationHistory.length > 20) {
      conversationHistory = conversationHistory.slice(-20);
    }

    // Update loading message with response
    updateMessage(loadingId, assistantMessage);
  } catch (error) {
    updateMessage(loadingId, `Error: ${error.message}`);
    showStatus(error.message, 'error');
  }
}

function addMessage(role, content, isLoading = false) {
  const messageDiv = document.createElement('div');
  const messageId = Date.now().toString();
  messageDiv.id = messageId;
  messageDiv.className = `message ${role}${isLoading ? ' loading' : ''}`;
  messageDiv.textContent = content;
  messagesContainer.appendChild(messageDiv);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
  return messageId;
}

function updateMessage(messageId, content) {
  const messageDiv = document.getElementById(messageId);
  if (messageDiv) {
    messageDiv.textContent = content;
    messageDiv.classList.remove('loading');
  }
}

function showSettings() {
  settingsPanel.classList.remove('hidden');
}

function showStatus(message, type = 'info') {
  statusDiv.textContent = message;
  statusDiv.className = `status ${type}`;
  statusDiv.classList.remove('hidden');
}

function hideStatus() {
  statusDiv.classList.add('hidden');
}

// Get page context (optional feature)
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  if (tabs[0]) {
    chrome.tabs.sendMessage(tabs[0].id, { action: 'getPageContent' }, (response) => {
      if (response && chrome.runtime.lastError === undefined) {
        // Could add context button here
      }
    });
  }
});

