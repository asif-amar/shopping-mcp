# shopAI Chrome Extension

An AI-powered shopping assistant Chrome extension that helps you make better purchase decisions by analyzing products, prices, and providing personalized recommendations.

## Features

- 🤖 **AI-Powered Analysis**: Get instant insights about products and pricing
- 🛒 **Shopping Page Detection**: Automatically detects products on major e-commerce sites
- 💰 **Price Analysis**: Understand if a price represents good value
- 🎯 **Personalized Recommendations**: Get suggestions based on your preferences
- ⚙️ **Customizable Settings**: Configure AI provider and shopping preferences
- 🔒 **Privacy-First**: All data stays local, no tracking or data collection

## Supported Sites

- Amazon (all regions)
- eBay (all regions)
- Walmart
- Target
- Best Buy
- Newegg
- Etsy
- Shopify stores

## Tech Stack

- **Manifest V3**: Latest Chrome extension standard
- **TypeScript**: Type-safe development
- **React**: Modern UI components
- **Vite**: Fast build tooling
- **OpenAI API**: AI provider (easily extensible to other providers)

## Project Structure

```
shopAI/
├── src/
│   ├── background/          # Service worker
│   ├── content/            # Content scripts
│   ├── ui/                 # React components
│   │   ├── popup/         # Extension popup
│   │   └── options/       # Settings page
│   ├── lib/               # Shared utilities
│   │   └── ai/           # AI provider implementations
│   └── types/            # TypeScript type definitions
├── public/               # Static assets
│   ├── manifest.json     # Extension manifest
│   ├── popup.html       # Popup HTML
│   ├── options.html     # Options HTML
│   └── icons/           # Extension icons
└── dist/                # Built extension (generated)
```

## Getting Started

### Prerequisites

- Node.js 16+ 
- npm or yarn
- Chrome browser
- OpenAI API key

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd shopAI
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
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `dist` folder

### Development

```bash
# Start development mode with watch
npm run dev

# Type checking
npm run typecheck

# Linting
npm run lint

# Fix linting issues
npm run lint:fix

# Run tests
npm run test
```

## Configuration

### AI Provider Setup

1. Get an OpenAI API key from [OpenAI Platform](https://platform.openai.com/)
2. Click the extension icon and go to "Settings"
3. Enter your API key and preferred model
4. Save settings

### User Preferences

Configure your shopping preferences in the settings:
- Monthly budget
- Shopping priorities (quality, price, brand, etc.)
- Preferred brands
- Notification preferences

## Usage

### On Shopping Pages

1. Navigate to a supported shopping site
2. Look for the floating "AI" button in the bottom-right corner
3. Click to get instant product analysis and recommendations

### Using the Popup

1. Click the extension icon in your browser toolbar
2. Ask questions about products, pricing, or shopping advice
3. Get AI-powered responses and recommendations

## Development Guidelines

### Code Style

- Use TypeScript strict mode
- Follow ESLint and Prettier configurations
- Write JSDoc comments for public functions
- Keep functions under 40 lines
- Use async/await for asynchronous operations

### Architecture

- **Provider-agnostic AI**: All AI calls go through the `AIProvider` interface
- **Message-based communication**: Use typed messages between content and background
- **Security-first**: No eval, minimal permissions, local storage only
- **Error handling**: Use Result types and proper error boundaries

### Adding New Features

1. **AI Features**: Extend `/lib/ai` with new providers or prompts
2. **UI Components**: Add React components in `/src/ui`
3. **Message Types**: Update `/src/types/messages.ts`
4. **Content Scripts**: Extend product detection in `/src/content`

## Security & Privacy

- **No data collection**: All data stays on your device
- **Local storage**: Settings stored via Chrome's storage API
- **Minimal permissions**: Only requests necessary permissions
- **No tracking**: No analytics or telemetry
- **API key security**: Stored locally, never transmitted to third parties

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

### Commit Guidelines

- Use conventional commits
- Include what changed and why
- Mention if manifest/permissions changed
- Add test notes for new features

## Troubleshooting

### Common Issues

**Extension not loading**
- Check that all files are in the `dist` folder
- Verify manifest.json is valid
- Check Chrome's extension error console

**AI not responding**
- Verify API key is correct
- Check OpenAI account has credits
- Ensure internet connection is stable

**Product detection not working**
- Check if the site is in the supported list
- Verify page has loaded completely
- Check browser console for errors

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
- Check the troubleshooting section
- Review the code documentation
- Open an issue on GitHub

---

Built with ❤️ for smarter shopping decisions 