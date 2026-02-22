export const resources = {
  ar: {
    translation: {
      appName: 'NerdPOS',
      auth: {
        loginTitle: 'تسجيل الدخول',
        loginSubtitle: 'واجهة دخول تجريبية',
      },
      pos: {
        shellTitle: 'واجهة نقاط البيع',
        openSessionTitle: 'فتح جلسة',
      },
      dashboard: {
        shellTitle: 'لوحة التحكم',
      },
      kitchen: {
        shellTitle: 'المطبخ',
      },
      offline: {
        banner: 'أنت تعمل دون اتصال. بعض الميزات قد لا تعمل.',
      },
      actions: {
        switchToEnglish: 'English',
        switchToArabic: 'العربية',
      },
    },
  },
  en: {
    translation: {
      appName: 'NerdPOS',
      auth: {
        loginTitle: 'Login',
        loginSubtitle: 'Placeholder login screen',
      },
      pos: {
        shellTitle: 'POS Shell',
        openSessionTitle: 'Open Session',
      },
      dashboard: {
        shellTitle: 'Dashboard',
      },
      kitchen: {
        shellTitle: 'Kitchen KDS',
      },
      offline: {
        banner: 'You are offline. Some features may be unavailable.',
      },
      actions: {
        switchToEnglish: 'English',
        switchToArabic: 'Arabic',
      },
    },
  },
} as const;
