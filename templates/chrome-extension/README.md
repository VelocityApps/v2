# Chrome Extension + AI Template

A complete Chrome Extension template with AI chat integration using OpenAI.

## Features

- ✅ Manifest V3 compliant
- ✅ Background service worker for API calls
- ✅ Content script for page interaction
- ✅ Beautiful popup UI with AI chat
- ✅ OpenAI API integration
- ✅ Settings panel for API key configuration
- ✅ Context menu integration
- ✅ Page content analysis

## Setup Instructions

### 1. Create Extension Folder
Create a new folder for your extension and copy all template files.

### 2. Add Icons
Create an `icons/` folder and add three PNG icons:
- `icon16.png` (16x16 pixels)
- `icon48.png` (48x48 pixels)
- `icon128.png` (128x128 pixels)

You can use any icon generator or create simple colored squares for testing.

### 3. Get OpenAI API Key
1. Go to https://platform.openai.com/api-keys
2. Create a new API key
3. Copy the key (starts with `sk-`)

### 4. Load Extension in Chrome
1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select your extension folder
5. The extension icon should appear in your toolbar

### 5. Configure API Key
1. Click the extension icon
2. Click the settings (⚙️) button
3. Enter your OpenAI API key
4. Select your preferred model
5. Click "Save Settings"

## Usage

### Popup Chat
- Click the extension icon to open the chat popup
- Type your question and press Enter or click Send
- The AI will respond in the chat

### Content Script Features
- Select text on any webpage
- Right-click and choose "Ask AI Assistant"
- A chat bubble will appear with AI analysis

### Floating Button
- A floating "🤖 AI" button appears on web pages
- Click it to open the popup chat

## Customization

### Change AI Model
Edit `popup.js` and modify the model selection or default model.

### Customize Styling
- `popup.css` - Popup UI styles
- `content.css` - Content script bubble styles

### Add Features
- Modify `background.js` for additional API integrations
- Update `content.js` for more page interaction features
- Enhance `popup.js` for additional UI features

## Security Notes

- API keys are stored locally in Chrome storage
- Never commit API keys to version control
- Consider adding API key validation
- Implement rate limiting for production use

## Troubleshooting

**Extension not loading:**
- Check manifest.json for syntax errors
- Ensure all files are in the correct location
- Check Chrome console for errors

**API calls failing:**
- Verify API key is correct
- Check OpenAI account has credits
- Review network tab in DevTools

**Popup not opening:**
- Check popup.html exists
- Verify manifest.json action configuration
- Reload the extension

## Next Steps

- Add conversation history persistence
- Implement streaming responses
- Add more AI providers (Anthropic, etc.)
- Create custom prompts for specific use cases
- Add export/import functionality

