import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.torq.renomargin',
  appName: 'RenoMargin',
  // The iOS shell loads the live production web app. Web deploys ship
  // instantly to the app without an App Store review cycle.
  server: {
    url: 'https://renovation-projection-job-costing.vercel.app',
    allowNavigation: [
      'renovation-projection-job-costing.vercel.app',
      '*.supabase.co',
    ],
  },
  // webDir is unused in live-server mode but required by the CLI.
  webDir: 'public',
  ios: {
    // 'never': the web view is moved below the status bar by the StatusBar
    // plugin (overlaysWebView false), so UIKit must not add its own scroll
    // inset on top. 'automatic' added a top inset that WebKit's initial
    // scroll offset ignores, which put page tops under the clock.
    contentInset: 'never',
    backgroundColor: '#0f172a',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: '#0f172a',
      showSpinner: false,
    },
    // Applied natively on every viewDidAppear, before any web code runs:
    // solid white strip behind the clock, dark status-bar text, and the web
    // view laid out below the status bar on every page.
    StatusBar: {
      overlaysWebView: false,
      style: 'LIGHT',
      backgroundColor: '#ffffff',
    },
  },
};

export default config;
