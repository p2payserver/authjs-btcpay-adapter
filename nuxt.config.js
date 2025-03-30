export default defineNuxtConfig({
  
  runtimeConfig: {
    nextAuthSecret: process.env.NEXTAUTH_SECRET,
    marangadu: {
      marangaduUser: process.env.MARANGADU_USER,
      marangaduPassword: process.env.MARANGADU_PASSWORD,
      marangaduHost: process.env.MARANGADU_HOST,
      marangaduPort: process.env.MARANGADU_PORT,
      marangaduFrom: process.env.MARANGADU_FROM,
    },
    btcpay: {
      baseUrl: process.env.BTCPAY_BASE_URL,
      apiKey: process.env.BTCPAY_API_KEY,
      userStoreId: process.env.BTCPAY_USER_STORE_ID,
      sessionStoreId: process.env.BTCPAY_SESSION_STORE_ID,
      verificationTokenStoreId: process.env.BTCPAY_VERIFICATION_TOKEN_STORE_ID,
    },
    public: {
      deploymentDomain: process.env.AUTH_ORIGIN,
    },
  },

  modules: [
    '@sidebase/nuxt-auth'
  ],

  auth: {
    provider: {
      type: 'authjs',
      addDefaultCallbackUrl: true
    },
    // https://sidebase.io/nuxt-auth/v0.6/configuration/nuxt-auth-handler#nuxtauthhandler
    origin: process.env.AUTH_ORIGIN,
    // https://sidebase.io/nuxt-auth/v0.6/configuration/nuxt-config#module-nuxtconfigts
    baseUrl: `/api/auth`,
    addDefaultCallbackUrl: true,
    globalAppMiddleware: {
      isEnabled: true,
      allow404WithoutAuth: true,
      addDefaultCallbackUrl: true
    },
  }
});
