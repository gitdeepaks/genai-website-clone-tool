# Website Clone Tool

A powerful AI-powered tool to clone any website with pixel-perfect matching using Puppeteer and OpenAI GPT-4. This tool leverages artificial intelligence to orchestrate the cloning process and handles modern web applications with complex JavaScript interactions.

## 🚀 Features

### AI-Powered Cloning Process

- **Intelligent Orchestration**: Uses OpenAI GPT-4 to manage the cloning workflow
- **Structured Processing**: Follows START → THINK → TOOL → OBSERVE → OUTPUT methodology
- **Error Handling**: AI-driven error recovery and decision making

### Enhanced Scraping with Puppeteer

- **JavaScript Rendering**: Uses Puppeteer to handle JavaScript-rendered content
- **Dynamic Content**: Captures content that loads after page load
- **Modern Browser**: Emulates Chrome with realistic user agent and viewport
- **Network Idle Detection**: Waits for all network requests to complete

### Comprehensive Asset Handling

- **All Image Types**: Downloads regular images, lazy-loaded images, background images, and SVG images
- **CSS Processing**: Extracts and downloads images referenced in CSS `url()` functions
- **Font Support**: Preserves Google Fonts and web fonts
- **JavaScript Files**: Downloads and localizes external JavaScript files
- **Relative Paths**: Converts all asset URLs to relative paths for offline use

### Code Quality Improvements

- **Beautified Output**: Uses js-beautify for clean, readable HTML and CSS
- **Error Handling**: Robust error handling with detailed logging
- **Progress Indicators**: Visual progress indicators for each step
- **Type Safety**: Full TypeScript support with proper type definitions

### Clean Output Format

- **HTML/CSS/JS**: Standalone HTML with all assets included
- **Offline Ready**: All assets downloaded locally for offline use
- **Clean Code**: Beautified and optimized HTML/CSS output
- **Auto-generated README**: Creates a README file for each cloned website

## 📦 Installation

```bash
# Clone the repository
git clone <repository-url>
cd webside-cloner

# Install dependencies
bun install

# Set up environment variables
cp env.example .env
# Edit .env and add your OpenAI API key
```

## 🔧 Environment Setup

Create a `.env` file with your OpenAI API key:

```env
# OpenAI API Key (required)
OPENAI_API_KEY=your_openai_api_key_here

# Optional: Custom OpenAI API endpoint (if using a different provider)
# OPENAI_API_BASE=https://api.openai.com/v1
```

## 🛠️ Usage

### Basic Usage

```bash
# Clone a website with default settings
bun run start https://example.com

# Clone with custom folder name
bun run start https://example.com my-website-clone

# Development mode with file watching
bun run dev https://example.com
```

### Command Line Arguments

```bash
# Format: bun run start <url> [folder-name]
bun run start https://example.com
bun run start https://example.com custom-folder-name
```

If no folder name is provided, it will automatically generate one based on the hostname (e.g., `cloned-example-com`).

## 📁 Output Structure

```
cloned-example-com/
├── index.html          # Main HTML file (beautified)
├── styles.css          # All CSS styles (beautified)
├── README.md           # Auto-generated documentation
├── script-0.js         # Downloaded JavaScript files
├── script-1.js         # (if any external scripts)
├── image-1.jpg         # Downloaded images
├── image-2.png         # (various formats supported)
├── bg-image.jpg        # Background images
└── font-file.woff2     # Web fonts (if any)
```

## ✨ Key Features

### 1. AI-Powered Workflow

The tool uses OpenAI GPT-4 to orchestrate the cloning process:

```typescript
// AI manages the entire workflow
const SYSTEM_PROMPT = `
  You are an AI assistant who works on START, THINK and OUTPUT format.
  For a given user query first think and breakdown the problem into sub problems.
  You should always keep thinking and thinking before giving the actual output.
`;
```

### 2. Advanced Puppeteer Integration

- **Realistic Browser**: Emulates Chrome with proper user agent and viewport
- **Network Handling**: Waits for network idle to ensure all content is loaded
- **Dynamic Scrolling**: Scrolls to bottom to trigger lazy-loaded content
- **Error Recovery**: Graceful handling of timeouts and network issues

```typescript
// Enhanced browser configuration
const browser = await puppeteer.launch({
  headless: true,
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-accelerated-2d-canvas',
    '--no-first-run',
    '--no-zygote',
    '--disable-gpu',
  ],
});
```

### 3. Comprehensive Image Processing

- **Multiple Sources**: Handles `src`, `data-src`, `data-lazy`, `data-original` attributes
- **Background Images**: Extracts from inline styles and CSS
- **SVG Support**: Proper handling of SVG images and references
- **CSS Images**: Downloads images referenced in CSS `url()` functions

```typescript
// Enhanced image source detection
let src =
  $(img).attr('src') ||
  $(img).attr('data-src') ||
  $(img).attr('data-lazy') ||
  $(img).attr('data-original') ||
  $(img).attr('data-srcset')?.split(' ')[0];
```

### 4. CSS Processing

- **External CSS**: Downloads and concatenates all external stylesheets
- **Inline Styles**: Preserves inline styles from the original page
- **Google Fonts**: Maintains Google Fonts links for proper font loading
- **URL Resolution**: Fixes relative URLs in CSS to work offline

### 5. JavaScript Handling

- **External Scripts**: Downloads and localizes external JavaScript files
- **Analytics Removal**: Automatically removes Google Analytics and tracking scripts
- **Clean Output**: Removes problematic meta tags and noscript elements

### 6. Code Beautification

- **Readable HTML**: Proper indentation and formatting
- **Clean CSS**: Organized and readable stylesheets
- **Professional Quality**: Production-ready code output

```typescript
// Beautified output
const beautifiedHtml = beautify.html($.html(), {
  indent_size: 2,
  wrap_line_length: 120,
  preserve_newlines: true,
});
```

## 🎯 Use Cases

### 1. Website Backup

```bash
# Create a complete backup of a website
bun run start https://mywebsite.com backup-$(date +%Y%m%d)
```

### 2. Development Reference

```bash
# Clone a reference website for development
bun run start https://inspiration-site.com reference
```

### 3. Content Migration

```bash
# Clone and modify for new platform
bun run start https://old-site.com migration
```

### 4. Quick Testing

```bash
# Clone a website for testing purposes
bun run start https://example.com test-clone
```

## 🔍 Technical Details

### Supported Asset Types

- ✅ Regular images (`<img>` tags)
- ✅ Lazy-loaded images (`data-src`, `data-lazy`)
- ✅ Background images (inline styles)
- ✅ CSS-referenced images (`url()` functions)
- ✅ SVG images (`<image>` tags)
- ✅ Web fonts and Google Fonts
- ✅ JavaScript files
- ✅ Favicons

### Browser Configuration

- **User Agent**: Chrome 120 on macOS
- **Viewport**: 1920x1080 for desktop rendering
- **Wait Strategy**: Network idle for complete loading
- **Timeout**: 30 seconds for page load

### Error Handling

- **Graceful Failures**: Continues processing even if some assets fail
- **Detailed Logging**: Clear progress indicators and error messages
- **Type Safety**: Full TypeScript support with proper error types

## 🚨 Limitations

- **Interactive Features**: JavaScript interactions may not work in the cloned version
- **API Dependencies**: External API calls will not function offline
- **Dynamic Content**: Content that requires server-side processing won't work
- **Authentication**: Protected content cannot be cloned
- **Rate Limiting**: Some websites may block rapid requests

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## ⚠️ Disclaimer

This tool is for educational and legitimate use only. Always respect website terms of service and robots.txt files. Do not use this tool to clone websites without permission or for malicious purposes.
