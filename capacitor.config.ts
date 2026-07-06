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
    contentInset: 'automatic',
    backgroundColor: '#0f172a',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: '#0f172a',
      showSpinner: false,
    },
  },
};

export default config;
