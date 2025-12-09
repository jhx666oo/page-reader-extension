# Changelog

All notable changes to this project will be documented in this file.

## [1.0.0] - 2025-12-09

### 🎉 Initial Release

#### Features
- **Page Content Extraction**
  - Full page text extraction with smart filtering
  - Image detection with alt text and dimensions
  - Automatic removal of navigation, headers, footers, scripts

- **AI Integration**
  - Support for multiple AI models (GPT-5, Claude, Gemini, DeepSeek, Grok, etc.)
  - Customizable system prompt with template support
  - Pre-built SEO/GEO product blog template

- **Configuration Options**
  - Output language selection (12 languages)
  - Output format (Markdown, HTML, JSON, Plain Text)
  - Reasoning effort levels (Low/Medium/High)
  - Web search toggle

- **Result Rendering**
  - Enhanced Markdown renderer (headers, lists, code blocks, links, etc.)
  - HTML renderer with sanitization
  - JSON renderer with syntax highlighting
  - Plain text renderer with heading detection

- **User Interface**
  - Modern dark theme UI
  - 4-step workflow (Read → Edit → Config → Result)
  - Side panel interface
  - Image selection with thumbnails
  - Copy and download functionality

#### Technical
- Built with React 18 + TypeScript
- Vite + CRXJS build system
- Tailwind CSS styling
- Chrome Manifest V3

