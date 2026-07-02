import type { CapacitorConfig } from '@capacitor/cli';

// Android wrapper around the mobile (end-user) app. The WebView loads the
// dist/mobile build; API/ML calls go to the server address configured on the
// login screen (cleartext enabled so plain http://<LAN-IP> works in demos).
const config: CapacitorConfig = {
  appId: 'il.ac.afeka.spotslot',
  appName: 'Spot&Slot',
  webDir: 'dist/mobile',
  server: {
    androidScheme: 'https',
    cleartext: true,
  },
};

export default config;
