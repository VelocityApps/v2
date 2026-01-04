/**
 * Content Script
 * Injected into web pages to interact with page content
 */

// Listen for messages from background or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'showAIChat') {
    showAIChatBubble(request.text);
  }

  if (request.action === 'getPageContent') {
    sendResponse({
      title: document.title,
      url: window.location.href,
      text: document.body.innerText.substring(0, 1000)
    });
  }

  return true;
});

/**
 * Show AI chat bubble on page
 */
function showAIChatBubble(selectedText) {
  // Remove existing bubble if any
  const existing = document.getElementById('ai-chat-bubble');
  if (existing) {
    existing.remove();
  }

  const bubble = document.createElement('div');
  bubble.id = 'ai-chat-bubble';
  bubble.innerHTML = `
    <div class="ai-chat-header">
      <span>AI Assistant</span>
      <button class="ai-chat-close">×</button>
    </div>
    <div class="ai-chat-content">
      <div class="ai-chat-message">Analyzing: "${selectedText.substring(0, 50)}..."</div>
      <div class="ai-chat-loading">Thinking...</div>
    </div>
  `;

  document.body.appendChild(bubble);

  // Close button
  bubble.querySelector('.ai-chat-close').addEventListener('click', () => {
    bubble.remove();
  });

  // Call AI API
  chrome.runtime.sendMessage(
    {
      action: 'callOpenAI',
      prompt: `Please provide a brief analysis or explanation of: ${selectedText}`
    },
    (response) => {
      if (response.success) {
        bubble.querySelector('.ai-chat-loading').textContent = response.data;
        bubble.querySelector('.ai-chat-loading').classList.remove('ai-chat-loading');
      } else {
        bubble.querySelector('.ai-chat-loading').textContent = `Error: ${response.error}`;
        bubble.querySelector('.ai-chat-loading').classList.add('ai-chat-error');
      }
    }
  );
}

// Inject AI button into page (optional)
function injectAIButton() {
  const button = document.createElement('button');
  button.id = 'ai-assistant-button';
  button.innerHTML = '🤖 AI';
  button.title = 'Open AI Assistant';
  button.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 10000;
    padding: 12px 20px;
    background: #4CAF50;
    color: white;
    border: none;
    border-radius: 25px;
    cursor: pointer;
    font-size: 14px;
    font-weight: bold;
    box-shadow: 0 4px 6px rgba(0,0,0,0.3);
  `;

  button.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'openPopup' });
  });

  document.body.appendChild(button);
}

// Inject button after page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', injectAIButton);
} else {
  injectAIButton();
}

