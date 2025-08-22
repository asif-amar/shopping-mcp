# shopAI Installation Guide

## Quick Setup

### Option 1: Automated Setup (Recommended)

1. **Run the setup script:**
   ```bash
   ./setup.sh
   ```

2. **Follow the prompts** - this will install Node.js and all dependencies automatically.

### Option 2: Manual Setup

If you prefer to install manually:

1. **Install Node.js:**
   - Visit [nodejs.org](https://nodejs.org/) and download the LTS version
   - Or use Homebrew: `brew install node`

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Build the extension:**
   ```bash
   npm run build
   ```

## Loading the Extension

1. **Open Chrome** and navigate to `chrome://extensions/`

2. **Enable Developer mode** (toggle in top-right corner)

3. **Click "Load unpacked"** and select the `dist` folder from this project

4. **Pin the extension** to your toolbar for easy access

## Configuration

1. **Get an OpenAI API key:**
   - Visit [OpenAI Platform](https://platform.openai.com/)
   - Create an account and get an API key

2. **Configure the extension:**
   - Click the shopAI icon in your toolbar
   - Click "Settings"
   - Enter your OpenAI API key
   - Set your shopping preferences
   - Save settings

## Usage

### On Shopping Pages
- Navigate to Amazon, eBay, Walmart, etc.
- Look for the floating "AI" button
- Click for instant product analysis

### Using the Popup
- Click the extension icon
- Ask questions about products or shopping
- Get AI-powered advice

## Troubleshooting

### Extension won't load
- Make sure you selected the `dist` folder (not the project root)
- Check that all files are present in the `dist` folder
- Verify manifest.json is valid

### AI not responding
- Check your OpenAI API key is correct
- Ensure you have credits in your OpenAI account
- Verify internet connection

### Product detection issues
- Make sure you're on a supported shopping site
- Wait for the page to fully load
- Check browser console for errors

## Development

For development and testing:

```bash
# Watch mode (rebuilds on changes)
npm run dev

# Type checking
npm run typecheck

# Linting
npm run lint

# Fix linting issues
npm run lint:fix
```

## Profile Management

### Changing User Profile/Preferences

The shopAI extension stores user preferences locally. To change your profile:

1. **Open Settings:**
   - Click the extension icon
   - Click "Settings" button

2. **Update Preferences:**
   - **Budget**: Set your monthly shopping budget
   - **Priorities**: Add/remove shopping priorities (quality, price, brand, etc.)
   - **Brands**: Add/remove preferred brands
   - **Notifications**: Toggle notification preferences

3. **Save Changes:**
   - Click "Save Settings"
   - Your preferences will be applied to future AI recommendations

### Multiple Profiles

Currently, the extension supports one profile per browser. For multiple profiles:

1. **Use different Chrome profiles:**
   - Create separate Chrome user profiles
   - Install the extension in each profile
   - Configure different preferences per profile

2. **Export/Import settings:**
   - Settings are stored in Chrome's local storage
   - You can manually export/import via Chrome DevTools

### Resetting Profile

To reset your profile to defaults:

1. **Clear extension data:**
   - Go to `chrome://extensions/`
   - Find shopAI extension
   - Click "Details"
   - Click "Clear data"

2. **Or reset specific settings:**
   - Open extension settings
   - Clear individual fields
   - Save changes

## Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review the browser console for error messages
3. Ensure all dependencies are properly installed
4. Verify your OpenAI API key is valid

For additional help, refer to the main README.md file. 