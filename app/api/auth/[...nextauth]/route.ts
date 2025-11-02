import NextAuth, { AuthOptions, User, Account, Profile } from "next-auth"
import GitHubProvider from "next-auth/providers/github"
import GoogleProvider from "next-auth/providers/google"
import { JWT } from "next-auth/jwt"
import { Session } from "next-auth"
import { createClient } from "@supabase/supabase-js"
import jwt from "jsonwebtoken"

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export const authOptions: AuthOptions = {
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
      authorization: {
        params: {
          scope: "read:user user:email",
        },
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),
  ],
  session: {
    strategy: "jwt" as const,
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async signIn({ user, account, profile }: { user: User; account: Account | null; profile?: Profile }) {
      try {
        // Check if user exists in Supabase
        const { data: existingUser } = await supabase
          .from('UserProfile')
          .select('*')
          .eq('email', user.email)
          .single()

        if (!existingUser) {
          // Create user in Supabase
          await supabase
            .from('UserProfile')
            .insert({
              id: user.id,
              email: user.email,
              name: user.name,
              avatar: user.image,
              provider: account?.provider,
            })
        }

        return true
      } catch (error) {
        console.error('Error during sign in:', error)
        return true // Allow sign in even if Supabase sync fails
      }
    },
    async jwt({ token, user, account }: { token: JWT; user?: User; account?: Account | null }) {
      // Add user ID and other info to token
      if (user) {
        token.sub = user.id // Standard JWT claim for user ID
        token.userId = user.id
        token.email = user.email
        token.name = user.name
        token.picture = user.image
      }
      
      // Generate a custom JWT for backend API calls
      // This will be a standard JWT that backend can verify
      if (!token.apiToken) {
        const apiToken = jwt.sign(
          {
            sub: token.sub || token.userId,
            userId: token.userId,
            email: token.email,
            name: token.name,
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60), // 30 days
          },
          process.env.NEXTAUTH_SECRET!
        )
        token.apiToken = apiToken
      }
      
      // Try to get Supabase token for API calls (optional)
      if (account?.provider && !token.supabaseToken) {
        try {
          // Exchange OAuth token for Supabase JWT
          const { data, error } = await supabase.auth.signInWithIdToken({
            provider: account.provider as any,
            token: account.id_token || account.access_token!,
          })

          if (data?.session) {
            token.supabaseToken = data.session.access_token
          } else {
            // If Supabase token fails, we'll use our custom API token
            console.log('Using custom API token for backend calls')
          }
        } catch (error) {
          console.log('Supabase token exchange failed, using custom API token:', error instanceof Error ? error.message : 'Unknown error')
        }
      }

      return token
    },
    async session({ session, token }: { session: Session; token: JWT }) {
      // Add custom properties to session
      if (session.user) {
        session.user.id = token.userId as string
        // Expose the custom API token to the session
        session.apiToken = token.apiToken as string
        session.supabaseToken = token.supabaseToken as string
      }
      return session
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  debug: process.env.NODE_ENV === 'development',
  useSecureCookies: process.env.NODE_ENV === 'production',
  cookies: {
    sessionToken: {
      name: `${process.env.NODE_ENV === 'production' ? '__Secure-' : ''}next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },
}

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }
