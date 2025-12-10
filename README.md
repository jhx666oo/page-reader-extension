# 📄 Page Reader - AI-Powered Content Analyzer

<p align="center">
  <img src="public/icons/icon.svg" alt="Page Reader Logo" width="128" height="128">
</p>

<p align="center">
  <strong>A Chrome extension that extracts webpage content and generates SEO/GEO-optimized blog posts using AI.</strong>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#installation">Installation</a> •
  <a href="#usage">Usage</a> •
  <a href="#configuration">Configuration</a> •
  <a href="#tech-stack">Tech Stack</a>
</p>

---

## ✨ Features

### 📖 Content Extraction
- **Full Page Reading** - Extract text content from any webpage
- **Image Detection** - Identify and select images with alt text and dimensions
- **Smart Filtering** - Automatically removes navigation, headers, footers, and scripts

### 🤖 AI Processing
- **Multiple AI Models** - Support for GPT-5, Claude, Gemini, DeepSeek, Grok, and more
- **Customizable System Prompt** - Full control over AI instructions
- **Output Language** - 12 languages supported (English, 中文, 日本語, etc.)
- **Output Format** - Markdown, HTML, JSON, or Plain Text

### ⚙️ Configuration Options
- **Reasoning Effort** - Low/Medium/High for controlling response depth
- **Web Search** - Enable AI to search for additional context
- **Template System** - Pre-built SEO/GEO product blog template

### 📊 Result Rendering
- **Markdown Renderer** - Headers, lists, code blocks, blockquotes, links
- **HTML Renderer** - Safe HTML rendering with sanitization
- **JSON Renderer** - Syntax-highlighted, collapsible JSON view
- **Plain Text** - Clean text with heading detection

## 📥 Installation

### From Source (Developer)

1. **Clone the repository**
   ```bash
   git clone https://github.com/fql9/page-reader-extension.git
   cd page-reader-extension
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Build the extension**
```bash
npm run build
```

4. **Load in Chrome**
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `dist` folder

### From Release

1. Download the latest release `.zip` file
2. Extract to a folder
3. Load in Chrome as above

## 🚀 Usage

### Step 1: Read Page
Click the extension icon or use `Ctrl+Shift+Y` to open the side panel, then click **Read Page** to extract content.

### Step 2: Edit Content
- **Text Tab** - Edit the extracted text
- **Images Tab** - Select/deselect images to include

### Step 3: Configure AI
- Choose **Output Language** (Auto, English, 中文, etc.)
- Select **Output Format** (Markdown, HTML, JSON, Plain)
- Adjust **Reasoning Effort** (Low/Medium/High)
- Toggle **Web Search** if needed
- Preview the generated **System Prompt**

### Step 4: Generate & Export
- View **Rendered** or **Raw** output
- **Copy** to clipboard
- **Download** as file

## ⚙️ Configuration

### API Setup

1. Click the ⚙️ settings icon in the header
2. Enter your **API Key** (e.g., from Poe, OpenAI, etc.)
3. Set **Base URL** (default: `https://api.poe.com/v1`)
4. Choose your preferred **Model**

### Supported Models (2025)

| Provider | Models |
|----------|--------|
| **OpenAI** | GPT-5.1, GPT-5, GPT-5-mini, o3 |
| **Anthropic** | Claude-Opus-4.5, Claude-4.5-Sonnet |
| **Google** | Gemini-3-Pro-Preview, Gemini-2.5-Pro |
| **xAI** | Grok-4, Grok-4.1-Fast |
| **DeepSeek** | DeepSeek-V3.2, DeepSeek-R1 |
| **Others** | Kimi-K2, Qwen3-235B, MiniMax-M2 |

## 🛠️ Tech Stack

- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite + CRXJS
- **Styling**: Tailwind CSS
- **Chrome APIs**: Manifest V3, Side Panel, Scripting

## 📁 Project Structure

```
src/
├── background/       # Service Worker
├── content/          # Content Script (page extraction)
├── popup/            # Popup UI
├── sidepanel/        # Side Panel UI (main interface)
├── hooks/            # React Hooks
├── services/         # AI API service
├── types/            # TypeScript types
└── utils/            # Utilities & templates
```

## 🔐 Permissions

| Permission | Purpose |
|------------|---------|
| `activeTab` | Access current tab content |
| `storage` | Save settings locally |
| `sidePanel` | Display side panel UI |
| `scripting` | Inject content script |

## 📝 License

MIT License - feel free to use and modify.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📮 Support

If you encounter any issues, please [open an issue](https://github.com/fql9/page-reader-extension/issues) on GitHub.

---

<p align="center">
  Made with ❤️ for content creators and marketers
</p>
