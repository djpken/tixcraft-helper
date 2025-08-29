# Tixcraft Assistant - Tampermonkey Script

A comprehensive Tampermonkey script that enhances the Tixcraft ticket purchasing experience by automating various tasks and improving the user interface.

## Features

### 🎯 **Instant Purchase Navigation**
- Automatically detects and navigates to "Instant Purchase" buttons on activity/game pages
- Supports multiple button selection with configurable index (defaults to first button)
- Automatic redirection from detail pages to game pages
- Real-time monitoring for dynamically loaded purchase buttons

### 🔒 **Confirm Dialog Interception**
- Automatically intercepts and accepts all confirm dialogs site-wide
- Prevents accidental cancellation of ticket purchases
- Robust protection system that maintains interception even if other scripts try to override
- Advanced watchdog system with frequency adjustment (high frequency for first minute, then low frequency)
- Iframe protection to ensure confirm interception works across all page elements

### 🎫 **Ticket Page Automation**
- **Auto-select quantity**: Automatically selects 2 tickets (or maximum available)
- **Auto-agree terms**: Automatically checks the agreement checkbox
- **Auto-focus verification**: Instantly focuses on captcha/verification input fields
- **Smart verification filling**: Auto-fills verification codes from stored values

### 🪑 **Seat Selection Automation**
- Configurable seat area selection (e.g., "C1", "A2", etc.)
- Real-time seat search and selection on area pages
- Dynamic monitoring for seats that load after page initialization
- Intelligent seat availability checking (opacity-based validation)

### 🤖 **Auto-Refresh System**
- Smart auto-refresh on game pages synchronized to the top of each minute
- Automatically stops refresh when navigating away from game pages
- Prevents unnecessary server load while maintaining optimal timing

### 🖥️ **Enhanced UI Components**
- **Floating Assistant Panel**: Minimizable control panel with all settings
- **Button Selection**: Choose which purchase button to click (1st, 2nd, 3rd, etc.)
- **Verification Code Management**: 
  - Separate inputs for verify codes and captura codes
  - Persistent storage across page reloads
  - Visual captcha display from current or previous pages
- **Seat Selection Interface**: Easy input for preferred seat areas

### 🧹 **Page Cleanup**
- Automatically removes unnecessary page elements (headers, footers, ad banners, event banners)
- Dynamic monitoring and removal of elements that load after page initialization
- Improved page performance and reduced distractions

### 🛡️ **Error Handling & Stability**
- Comprehensive error interception for GTM (Google Tag Manager) related issues
- Graceful handling of cross-origin iframe restrictions
- Silent error management to prevent script interruption
- Advanced mutation observer for dynamic content handling

### 🔧 **Debug & Testing Functions**
- `listAllSeats()`: Lists all available seats with their status
- `testSeatSearch(seatValue)`: Tests seat search functionality
- `testConfirm()`: Tests confirm dialog interception
- All functions exposed to browser console for manual testing

## Installation

1. Install [Tampermonkey](https://www.tampermonkey.net/) browser extension
2. Create a new script in Tampermonkey
3. Copy and paste the script content
4. Save and enable the script

## Usage

### Basic Setup
1. The script automatically activates on all Tixcraft pages
2. A floating "Tixcraft Assistant" panel appears in the bottom-left corner
3. Configure your preferences in the panel:
   - **Button Selection**: Choose which purchase button to prioritize
   - **Seat Selection**: Enter preferred seat area (e.g., "C1")
   - **Verification Codes**: Pre-fill verification codes for faster submission

### Page-Specific Behavior

#### **Game/Activity Pages**
- Auto-refreshes every minute at the exact top of the minute
- Monitors for "Instant Purchase" buttons and auto-clicks based on your selection
- Automatically redirects from detail pages to game pages

#### **Area Selection Pages**
- Displays stored captcha from previous pages
- Automatically attempts to select your preferred seat area
- Monitors for dynamically loaded seats and retries selection

#### **Ticket Purchase Pages**
- Immediately selects ticket quantity (2 or maximum available)
- Auto-checks agreement terms
- Focuses on verification code input
- Auto-fills stored verification codes
- Displays current page captcha

#### **Verify Pages**
- Auto-fills verification codes if available
- Immediately submits form when verification code is entered
- Focuses on verification input for quick entry

## Configuration

### Button Selection
Use the dropdown in the assistant panel to choose which purchase button to click:
- Show 1: First available button
- Show 2: Second available button
- etc.

### Seat Selection
Enter your preferred seat area in the "Seat Selection" field:
- Format: Area + Number (e.g., "C1", "A15", "B3")
- Case insensitive
- Automatically retries if seats load dynamically

### Verification Codes
- **Verify**: Code for verification pages
- **Captura**: Code for ticket purchase pages
- Values are automatically saved and restored across page loads

## Technical Features

### Performance Optimizations
- Immediate DOM cleanup on page load
- Efficient mutation observers with automatic cleanup
- Smart timing for auto-refresh synchronized to minute boundaries
- Lazy loading of UI components

### Cross-Page Data Persistence
- LocalStorage for user preferences and verification codes
- Captcha URL storage with 30-minute expiration
- Automatic cleanup of expired data

### Advanced Error Handling
- GTM error interception to prevent script conflicts
- Promise rejection handling
- Cross-origin iframe error management
- Graceful degradation when features are unavailable

## Browser Compatibility

- Chrome (Recommended)
- Firefox
- Edge
- Safari (with Tampermonkey support)

## Security & Privacy

- All data stored locally in browser
- No external server communication
- Only operates on Tixcraft domains
- Respects CORS policies and security restrictions

## Support

This script is designed to work with the current Tixcraft website structure. If you encounter issues:

1. Check browser console for error messages
2. Verify Tampermonkey is up to date
3. Ensure script is enabled and running
4. Test individual functions using the debug tools

## Version History

- **v3.0**: Current version with comprehensive automation features
- Enhanced confirm interception system
- Advanced seat selection with dynamic monitoring
- Improved UI with floating assistant panel
- Robust error handling and performance optimizations

---

**Disclaimer**: This script is for educational purposes and to improve user experience. Users are responsible for complying with Tixcraft's terms of service and applicable laws.
