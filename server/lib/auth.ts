import { betterAuth } from 'better-auth'
import { Pool } from 'pg'

export const auth = betterAuth({
  database: new Pool({ connectionString: process.env.NUXT_DATABASE_URL }),
  secret: process.env.NUXT_BETTER_AUTH_SECRET,
  baseURL: process.env.NUXT_BETTER_AUTH_URL,
  socialProviders: {
    google: {
      clientId: process.env.NUXT_GOOGLE_CLIENT_ID!,
      clientSecret: process.env.NUXT_GOOGLE_CLIENT_SECRET!,
    },
    github: {
      clientId: process.env.NUXT_GITHUB_CLIENT_ID!,
      clientSecret: process.env.NUXT_GITHUB_CLIENT_SECRET!,
    },
    discord: {
      clientId: process.env.NUXT_DISCORD_CLIENT_ID!,
      clientSecret: process.env.NUXT_DISCORD_CLIENT_SECRET!,
    },
    twitter: {
      clientId: process.env.NUXT_TWITTER_CLIENT_ID!,
      clientSecret: process.env.NUXT_TWITTER_CLIENT_SECRET!,
    },
  },
  trustedOrigins: [process.env.NUXT_BETTER_AUTH_URL!],
})
