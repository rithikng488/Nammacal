import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.nammacal.app',
  appName: 'NammaCal',
  webDir: 'public',
  server: {
    androidScheme: 'https',
  },
};

export default config;
