import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

const translations = {
  'START': 'Home',
  'GAMES': 'Browse Games',
  'LIBRARY': 'My Library',
  'DEV_CONSOLE': 'Developer Dashboard',
  'OPTIONS': 'Settings',
  'PROFILE': 'Profile',
  'ADMIN': 'Admin Dashboard',
  'LOGOUT': 'Log out',
  'SEARCH_DATABASE...': 'Search games...',
  'SEARCH_MANIFEST...': 'Search library...',
  'FEATURED_PROTOCOL.EXE': 'Featured Games',
  'TRENDING_MATRIX': 'Trending Now',
  'MEMORY_BANKS': 'Recent Games',
  'NETWORK_STATUS': 'System Stats',
  'ACTIVE_CONNECTIONS.LOG': 'Connection Info',
  'HOST_NOW': 'Play Now',
  'EXECUTE_PLAY': 'Play',
  'CLAIM_FREE': 'Claim Free',
  'VIEW_OFFER': 'View Offer',
  'RESUME': 'Resume',
  'NO_GAMES_IN_LIBRARY': 'No games in your library.',
  'BROWSE_CATALOG': 'Browse games',
  'SYSTEM_OPTIONS': 'Settings',
  'PRIMARY_COLOR_CALIBRATION': 'UI Mode',
  'ACCENT_COLOR_CALIBRATION': 'Theme Customization',
  'PRESET_PALETTES': 'Color Presets',
  'ACCENT_PRESETS': 'Accent Presets',
  'MANUAL_PICKER': 'Color Picker',
  'RETURN_TO_DASHBOARD': 'Return to Home',
  'LOADING_FEATURED_PROTOCOL...': 'Loading featured games...',
  'NO_FEATURED_GAMES_FOUND': 'No featured games found',
  'LAST_SYNC': 'Last played',
  'NEVER_PLAYED': 'Never played',
  'FEATURED_GAMES': 'Featured Games',
  'LIBRARY_SIZE': 'Library size',
  'BACKEND': 'Server Connection',
  'CONNECTING...': 'Connecting...',
  'ONLINE': 'Connected',
  'ERROR': 'Error',
  'NO_RESULTS_FOUND': 'No games found',
  'TRY_ADJUSTING_YOUR_SEARCH_FILTERS': 'Try adjusting your search filters',
  'SORT:': 'Sort by:',
  'FEATURED_HOSTS': 'Featured',
  'NEWEST_ENTRIES': 'Newest',
  'PRICE_ASC': 'Price: Low to High',
  'PRICE_DESC': 'Price: High to Low',
  'TOP_RATED': 'Top Rated',
  'GENRES': 'Genres',
  'TAGS': 'Tags',
  'CLEAR_FILTERS': 'Clear Filters',
  'FREE_TO_PLAY': 'Free',
  'DETAILS': 'Details',
  'ACCESS_LIBRARY': 'Go to Library',
  'COMM_LINK_ESTABLISHED': 'User Reviews',
  'USER_FEEDBACK': 'User Feedback',
  'RATING': 'Rating',
  'SEND_DATA': 'Submit Review',
  'TRANSMITTING...': 'Submitting...',
  'NO_TRANSMISSIONS_FOUND': 'No reviews yet.',
  'FRIEND_ACTIVITY': 'Friend Activity',
  'LAUNCHER_DOWNLOAD_MODULE': 'Download Desktop Client',
  'DOWNLOAD_LAUNCHER': 'Download Client',
  'GET_LAUNCHER': 'Get Desktop Client',
  'READY': 'Ready',
  'LOADING_GAME_DATA...': 'Loading game details...',
  'CLAIM_FAILED': 'Failed to add game to library',
  'FAILED_TO_LOAD_GAME': 'Failed to load game details',
  'GAME_NOT_FOUND': 'Game not found',
  'PLAY_NOW': 'Play Now',
  'ADD_TO_LIBRARY': 'Add to Library',
  'CLAIM_FREE_GAME': 'Get Game',
  'IN_LIBRARY': 'In Library',
  'USER_ARCHIVE // LIBRARY': 'My Library',
  'SYNCHRONIZING...': 'Loading library...',
  'CORE_LIBRARY_EMPTY': 'Your library is empty.',
  'ACCESS_DISCOVERY': 'Explore Games',
  'NO_MATCHING_SIGNALS': 'No matching games found.',
  'LOGGED': 'hours played',
  'INITIALIZING...': 'Not played yet',
  'LAST_PLAYED': 'Last played',
  'GET_LAUNCHER_BTN': 'Download Desktop Client',
  'DOWNLOAD_CLIENT_DESC': 'Get the full desktop application for the best gaming experience.',
  'SYSTEM_LOGIN_SECTOR': 'Log In',
  'ENTER_CREDENTIALS': 'Enter your credentials to access your account.',
  'IDENTITY': 'Username or Email',
  'SECURITY_KEY': 'Password',
  'INITIATE_AUTH_SESSION': 'Log In',
  'ESTABLISH_NEW_IDENTITY': 'Create an Account',
  'REGISTER_SECTOR': 'Register',
  'CREATE_PROFILE_DETAILS': 'Create your new profile.',
  'DISPLAY_NAME': 'Display Name',
  'CONFIRM_SECURITY_KEY': 'Confirm Password',
  'REGISTER_BTN': 'Create Account',
  'HAVE_IDENTITY': 'Already have an account? Log In',
  'RETURN_TO_LOGIN': 'Back to Login',
  'PROFILE_REGISTRY': 'User Profile',
  'DEVELOPER_WORKSPACE': 'Developer Dashboard',
  'DEV_CONSOLE_LOGS': 'Developer Controls',
  'CREATE_NEW_APP': 'Register New Game',
  'GAME_TITLE': 'Game Title',
  'GAME_PRICE': 'Price (INR)',
  'GAME_PLATFORMS': 'Platforms',
  'GAME_DESCRIPTION': 'Description',
  'SAVE_GAME_DATA': 'Save Game Details',
  'ADMIN_MAINFRAME': 'Admin Mainframe',
  'USER_MANAGEMENT': 'User Management',
  'GAME_MANAGEMENT': 'Game Management',
  'PURCHASE_SUCCESSFUL! Game added to your library.': 'Purchase successful! Game added to your library.',
  'GAME_ADDED_TO_LIBRARY!': 'Game added to library!',
  'REVIEW_SUBMITTED': 'Review submitted!',
  'REVIEW_BODY_REQUIRED': 'Review text is required.',
  'REVIEW_SUBMIT_FAILED': 'Failed to submit review.',
  'PURCHASE': 'Buy Now',
  'GET_FOR_FREE': 'Get for Free',
  'PROCESSING...': 'Processing...',
  'RECENT_REVIEWS:': 'Recent Reviews:',
  'RELEASE_DATE:': 'Release Date:',
  'DEVELOPER:': 'Developer:',
  'PUBLISHER:': 'Publisher:',
  'UNKNOWN_DEV': 'Unknown Developer',
  'LAZPLAY_STUDIOS': 'LazPlay Studios',
  'DEMO / FREE': 'Demo / Free',
  'SYSTEM_FAILURE:': 'Error:',
  'OVERWHELMINGLY_POSITIVE': 'Overwhelmingly Positive',
  'POSITIVE': 'Positive',
  'MIXED': 'Mixed',
  'NEGATIVE': 'Negative',
  'OVERWHELMINGLY_NEGATIVE': 'Overwhelmingly Negative',
};

export function ThemeProvider({ children }) {
  const [uiModeState, setUiModeState] = useState('standard');

  const [colorTheme, setColorTheme] = useState(() => {
    return localStorage.getItem('lazplay-color-theme') || 'system';
  });

  const setUiMode = () => {
    setUiModeState('standard');
  };

  // Apply UI mode class and Dark/Light mode class
  useEffect(() => {
    const root = document.documentElement;

    root.classList.remove('ui-cyber');
    root.classList.add('ui-standard');

    localStorage.setItem('lazplay-ui-mode', 'standard');
    if (window.notifyThemeChange) {
      window.notifyThemeChange();
    }
  }, []);

  // Apply Color Theme (Light / Dark)
  useEffect(() => {
    const root = document.documentElement;
    
    const applyDark = () => {
      root.classList.remove('light');
      root.classList.add('dark');
    };
    const applyLight = () => {
      root.classList.remove('dark');
      root.classList.add('light');
    };

    if (colorTheme === 'dark') {
      applyDark();
    } else if (colorTheme === 'light') {
      applyLight();
    } else {
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (systemPrefersDark) {
        applyDark();
      } else {
        applyLight();
      }
    }

    localStorage.setItem('lazplay-color-theme', colorTheme);
  }, [colorTheme]);

  // Listen to system theme changes if set to system
  useEffect(() => {
    if (colorTheme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e) => {
      const root = document.documentElement;
      if (e.matches) {
        root.classList.remove('light');
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
        root.classList.add('light');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [colorTheme]);

  // Helper to translate keys
  const t = (key) => {
    if (uiModeState !== 'standard') return key;

    // Standard translation
    if (translations[key]) return translations[key];

    // Format cleaner fallback for dynamically generated cyber terms
    let cleanKey = key;
    if (cleanKey.startsWith('> ')) {
      cleanKey = cleanKey.substring(2);
    }
    if (translations[cleanKey]) return translations[cleanKey];

    if (cleanKey.includes('_')) {
      // Replace underscores with spaces and map to standard title casing
      return cleanKey
        .split('_')
        .map(word => {
          if (!word) return '';
          return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        })
        .join(' ');
    }

    return cleanKey;
  };

  const isStandard = uiModeState === 'standard';

  return (
    <ThemeContext.Provider value={{ uiMode: uiModeState, setUiMode, colorTheme, setColorTheme, t, isStandard }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
