import { NuxtAuthHandler } from '#auth';
import { useNitroApp } from '#nitro';
import EmailProvider from 'next-auth/providers/email';

const {
  nextAuthSecret,
  marangadu: {
    marangaduUser,
    marangaduPassword,
    marangaduHost,
    marangaduPort,
    marangaduFrom,
  },
  btcpay: {
    baseUrl,
    apiKey,
    userStoreId,
    sessionStoreId,
    verificationTokenStoreId
  }
} = useRuntimeConfig();

const nitroApp = useNitroApp();
const { BTCPayClient, BTCPayAdapter } = nitroApp;

const client = new BTCPayClient({
  baseUrl,
  apiKey,
  userStoreId,
  sessionStoreId,
  verificationTokenStoreId
});

export default NuxtAuthHandler({
  debug: true,
  secret: nextAuthSecret,
  pages: {
    signIn: `/auth/login`,
    verifyRequest: `/auth/verify`,
  },
  providers: [
    EmailProvider.default({
      id: 'magic-link',
      name: 'send magic link by email',
      type: 'email',
      server: {
        host: marangaduHost,
        port: marangaduPort,
        auth: {
          user: marangaduUser,
          pass: marangaduPassword,
        },
      },
      from: marangaduFrom,
      maxAge: 60 * 60,
    }),
  ],
  adapter: BTCPayAdapter(client, {
    storeIds: {
      Users: userStoreId,
      Sessions: sessionStoreId,
      VerificationTokens: verificationTokenStoreId,
    },
  })
});
