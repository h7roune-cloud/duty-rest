import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ayoub.conges',
  appName: 'Gestion Congés',
  webDir: 'dist-spa',
  server: {
    androidScheme: 'https',
  },
};

export default config;
