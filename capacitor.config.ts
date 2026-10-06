import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'uz.chorvahisob.app',
  appName: 'Chorva Hisob',
  webDir: 'dist',
  android: {
    backgroundColor: '#f5f5f4',
  },
  plugins: {
    LocalNotifications: {
      iconColor: '#027a48',
    },
  },
}

export default config
