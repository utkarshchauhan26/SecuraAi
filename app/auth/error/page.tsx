"use client"

import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertCircle, ArrowLeft, RefreshCw } from "lucide-react"
import Link from "next/link"
import { motion } from "framer-motion"

const errorMessages: Record<string, { title: string; description: string; solution: string }> = {
  Configuration: {
    title: "OAuth Configuration Error",
    description: "There was a problem with the authentication configuration.",
    solution: "Please contact support or try again later."
  },
  AccessDenied: {
    title: "Access Denied",
    description: "You denied access to your account.",
    solution: "Please try signing in again and grant the necessary permissions."
  },
  Verification: {
    title: "Verification Error",
    description: "The verification token has expired or has already been used.",
    solution: "Please request a new verification link."
  },
  OAuthSignin: {
    title: "OAuth Sign In Error",
    description: "Error in constructing an authorization URL.",
    solution: "Please check the OAuth configuration and try again."
  },
  OAuthCallback: {
    title: "OAuth Callback Error",
    description: "Error in handling the response from the OAuth provider.",
    solution: "This might be a temporary issue. Please try signing in again."
  },
  OAuthCreateAccount: {
    title: "OAuth Create Account Error",
    description: "Could not create an OAuth provider user in the database.",
    solution: "Please try a different sign-in method or contact support."
  },
  EmailCreateAccount: {
    title: "Email Create Account Error",
    description: "Could not create an email provider user in the database.",
    solution: "Please try again or contact support."
  },
  Callback: {
    title: "Callback Error",
    description: "Error in the OAuth callback handler route.",
    solution: "Please try signing in again."
  },
  OAuthAccountNotLinked: {
    title: "Account Already Exists",
    description: "This email is already associated with another account.",
    solution: "Please sign in using the original method you used to create your account."
  },
  EmailSignin: {
    title: "Email Sign In Error",
    description: "Error sending the verification email.",
    solution: "Please check your email address and try again."
  },
  CredentialsSignin: {
    title: "Sign In Error",
    description: "The credentials you provided are incorrect.",
    solution: "Please check your credentials and try again."
  },
  SessionRequired: {
    title: "Session Required",
    description: "You must be signed in to access this page.",
    solution: "Please sign in to continue."
  },
  Default: {
    title: "Authentication Error",
    description: "An unexpected error occurred during authentication.",
    solution: "Please try again. If the problem persists, contact support."
  },
}

export default function AuthErrorPage() {
  const searchParams = useSearchParams()
  const error = searchParams.get("error") || "Default"
  
  const errorInfo = errorMessages[error] || errorMessages.Default

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-500/10 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 w-full max-w-md mx-4"
      >
        <Card className="border-red-900/20 bg-slate-900/80 backdrop-blur-xl shadow-2xl">
          <CardHeader className="space-y-4 text-center pb-6">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ 
                type: "spring",
                stiffness: 260,
                damping: 20,
                delay: 0.1 
              }}
              className="flex justify-center"
            >
              <div className="relative">
                <motion.div
                  className="absolute inset-0 bg-red-500/30 rounded-full blur-xl"
                  animate={{
                    scale: [1, 1.1, 1],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />
                <div className="relative w-16 h-16 bg-red-500/20 border-2 border-red-500/50 rounded-full flex items-center justify-center">
                  <AlertCircle className="w-8 h-8 text-red-400" strokeWidth={2.5} />
                </div>
              </div>
            </motion.div>

            <div>
              <CardTitle className="text-2xl font-bold text-red-400 mb-2">
                {errorInfo.title}
              </CardTitle>
              <CardDescription className="text-slate-400">
                {errorInfo.description}
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-4 px-6 pb-8">
            <div className="p-4 bg-slate-800/50 border border-slate-700/50 rounded-lg">
              <h3 className="text-sm font-semibold text-slate-300 mb-2">💡 Solution</h3>
              <p className="text-sm text-slate-400">{errorInfo.solution}</p>
            </div>

            <div className="flex gap-3">
              <Button
                asChild
                variant="outline"
                className="flex-1 bg-slate-800/50 border-slate-700 hover:bg-slate-800 hover:border-slate-600"
              >
                <Link href="/auth/signin">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Try Again
                </Link>
              </Button>
              
              <Button
                asChild
                variant="outline"
                className="flex-1 bg-slate-800/50 border-slate-700 hover:bg-slate-800 hover:border-slate-600"
              >
                <Link href="/">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Go Home
                </Link>
              </Button>
            </div>

            {error && (
              <div className="pt-2">
                <details className="text-xs">
                  <summary className="cursor-pointer text-slate-500 hover:text-slate-400">
                    Technical Details
                  </summary>
                  <div className="mt-2 p-3 bg-slate-950/50 border border-slate-800 rounded font-mono text-slate-400">
                    Error Code: <span className="text-red-400">{error}</span>
                  </div>
                </details>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
