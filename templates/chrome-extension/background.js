/**
 * Background Service Worker
 * Handles extension lifecycle and message passing
 */

// Install event
chrome.runtime.onInstalled.addListener((details) => {
  console.log('Extension installed:', details.reason);
  
  if (details.reason === 'install') {
    // Set default settings
    chrome.storage.local.set({
      apiKey: '',
      model: 'gpt-3.5-turbo',
      theme: 'dark'
    });
  }
});

// Message handler from content script or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getApiKey') {
    chrome.storage.local.get(['apiKey'], (result) => {
      sendResponse({ apiKey: result.apiKey || '' });
    });
    return true; // Keep channel open for async response
  }

  if (request.action === 'saveApiKey') {
    chrome.storage.local.set({ apiKey: request.apiKey }, () => {
      sendResponse({ success: true });
    });
    return true;
  }

  if (request.action === 'callOpenAI') {
    callOpenAI(request.prompt, request.apiKey)
      .then(response => sendResponse({ success: true, data: response }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
});

/**
 * Call OpenAI API
 */
async function callOpenAI(prompt, apiKey) {
  if (!apiKey) {
    throw new Error('API key not configured');
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 500
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'OpenAI API error');
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

// Context menu (optional)
chrome.contextMenus.create({
  id: 'ai-assistant',
  title: 'Ask AI Assistant',
  contexts: ['selection']
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'ai-assistant' && info.selectionText) {
    chrome.tabs.sendMessage(tab.id, {
      action: 'showAIChat',
      text: info.selectionText
    });
  }
});

