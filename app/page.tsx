"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Shield, Zap, FileText, Sparkles, Upload, Eye, ArrowRight } from "lucide-react"
import { motion } from "framer-motion"
import Link from "next/link"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 floating-dots opacity-30" />
      <div className="absolute inset-0 gradient-shimmer opacity-5" />

      {/* Navigation */}
      <nav className="relative z-10 flex items-center justify-between p-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="flex items-center space-x-2"
        >
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Shield className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold text-foreground">SecuraAI</span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="flex items-center space-x-4"
        >
          <Button className="bg-primary hover:bg-primary/90" asChild>
            <Link href="/auth/signin">Get Started</Link>
          </Button>
        </motion.div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 flex flex-col items-center justify-center min-h-[80vh] px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="max-w-4xl mx-auto"
        >
          <div className="flex items-center justify-center mb-6">
            <div className="flex items-center space-x-2 px-4 py-2 rounded-full glassmorphism">
              <Sparkles className="w-4 h-4 text-accent" />
              <span className="text-sm text-muted-foreground">Powered by AI</span>
            </div>
          </div>

          <h1 className="text-5xl lg:text-7xl font-bold text-balance mb-6">
            <span className="text-foreground">Scan your code.</span>
            <br />
            <span className="bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
              Fix vulnerabilities.
            </span>
            <br />
            <span className="text-foreground">Build securely.</span>
          </h1>

          <p className="text-xl text-muted-foreground text-balance mb-8 max-w-2xl mx-auto">
            AI-powered security auditing that identifies vulnerabilities, explains them in plain English, and provides
            actionable fixes to secure your codebase.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <Button
              size="lg"
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-4 text-lg group"
              asChild
            >
              <Link href="/auth/signin">
                <Upload className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
                Upload Project
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-border hover:bg-muted px-8 py-4 text-lg group bg-transparent"
              asChild
            >
              <Link href="/auth/signin">
                <Eye className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
                Try Demo Report
              </Link>
            </Button>
          </div>
        </motion.div>

        {/* Trust Signals */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto"
        >
          <Card className="glassmorphism p-6 text-center group hover:scale-105 transition-transform duration-300">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/20 transition-colors">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Enterprise Security</h3>
            <p className="text-muted-foreground text-sm">Bank-grade encryption and zero data retention policies</p>
          </Card>

          <Card className="glassmorphism p-6 text-center group hover:scale-105 transition-transform duration-300">
            <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4 group-hover:bg-accent/20 transition-colors">
              <Zap className="w-6 h-6 text-accent" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Lightning Fast</h3>
            <p className="text-muted-foreground text-sm">Scan thousands of files in seconds with AI acceleration</p>
          </Card>

          <Card className="glassmorphism p-6 text-center group hover:scale-105 transition-transform duration-300">
            <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center mx-auto mb-4 group-hover:bg-secondary/20 transition-colors">
              <FileText className="w-6 h-6 text-secondary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Detailed Reports</h3>
            <p className="text-muted-foreground text-sm">Export comprehensive PDF reports for compliance</p>
          </Card>
        </motion.div>
      </main>

      {/* How It Works Section */}
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.8 }}
        className="relative z-10 py-20 px-6"
      >
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
              Process
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">How SecuraAI Works</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Our AI-powered security platform simplifies the process of finding and fixing vulnerabilities in your code.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="relative">
              <div className="absolute top-0 left-12 w-px h-full bg-border hidden md:block"></div>
              <div className="flex flex-col items-center text-center relative z-10">
                <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-6 relative">
                  <span className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold">1</span>
                  <Upload className="w-10 h-10 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Upload Your Code</h3>
                <p className="text-muted-foreground">
                  Upload your files or connect your GitHub repository to start scanning for vulnerabilities.
                </p>
              </div>
            </div>

            <div className="relative">
              <div className="absolute top-0 left-12 w-px h-full bg-border hidden md:block"></div>
              <div className="flex flex-col items-center text-center relative z-10">
                <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-6 relative">
                  <span className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold">2</span>
                  <Zap className="w-10 h-10 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-3">AI-Powered Analysis</h3>
                <p className="text-muted-foreground">
                  Our advanced AI scans your code for security vulnerabilities, identifying SQL injection, XSS, and more.
                </p>
              </div>
            </div>

            <div className="relative">
              <div className="flex flex-col items-center text-center relative z-10">
                <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-6 relative">
                  <span className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold">3</span>
                  <FileText className="w-10 h-10 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Get Actionable Results</h3>
                <p className="text-muted-foreground">
                  Receive detailed explanations and fix suggestions for each vulnerability, all in plain English.
                </p>
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      {/* Documentation Section */}
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 1.0 }}
        className="relative z-10 py-20 px-6 bg-muted/30"
      >
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
              Documentation
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Learn How to Secure Your Code</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Our comprehensive documentation helps you understand security vulnerabilities and best practices.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="glassmorphism p-6 hover:shadow-lg transition-shadow">
              <h3 className="text-xl font-semibold mb-3 flex items-center">
                <Shield className="w-5 h-5 text-primary mr-2" />
                Security Basics
              </h3>
              <p className="text-muted-foreground mb-4">
                Learn the fundamentals of application security and common vulnerability types.
              </p>
              <Button variant="outline" className="w-full" asChild>
                <Link href="/dashboard">
                  Read Guide
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            </Card>

            <Card className="glassmorphism p-6 hover:shadow-lg transition-shadow">
              <h3 className="text-xl font-semibold mb-3 flex items-center">
                <Zap className="w-5 h-5 text-primary mr-2" />
                API Documentation
              </h3>
              <p className="text-muted-foreground mb-4">
                Integrate SecuraAI into your CI/CD pipeline with our comprehensive API.
              </p>
              <Button variant="outline" className="w-full" asChild>
                <Link href="/dashboard">
                  View API Docs
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            </Card>

            <Card className="glassmorphism p-6 hover:shadow-lg transition-shadow">
              <h3 className="text-xl font-semibold mb-3 flex items-center">
                <FileText className="w-5 h-5 text-primary mr-2" />
                Remediation Guides
              </h3>
              <p className="text-muted-foreground mb-4">
                Step-by-step guides to fix common vulnerabilities in different programming languages.
              </p>
              <Button variant="outline" className="w-full" asChild>
                <Link href="/dashboard">
                  Browse Guides
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            </Card>
          </div>
        </div>
      </motion.section>

      {/* Footer */}
      <footer className="relative z-10 py-12 px-6 bg-background border-t border-border">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                  <Shield className="w-5 h-5 text-primary-foreground" />
                </div>
                <span className="text-xl font-bold text-foreground">SecuraAI</span>
              </div>
              <p className="text-muted-foreground max-w-md">
                AI-powered security auditing that helps developers build more secure applications.
              </p>
            </div>
            <div className="flex flex-col md:items-end">
              <p className="text-muted-foreground">
                Developed by <span className="font-medium text-foreground">Utkarsh Chauhan</span>
              </p>
              <a href="mailto:chauhanutkarsh54@gmail.com" className="text-primary hover:underline">
                chauhanutkarsh54@gmail.com
              </a>
              <div className="mt-4 flex space-x-4">
                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" asChild>
                  <a href="https://github.com/utkarshchauhan26" target="_blank" rel="noopener noreferrer">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" fill="currentColor"/>
                    </svg>
                  </a>
                </Button>
                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" asChild>
                  <a href="https://twitter.com" target="_blank" rel="noopener noreferrer">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" fill="currentColor"/>
                    </svg>
                  </a>
                </Button>
                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" asChild>
                  <a href="https://www.linkedin.com/in/utkarshchauhan26" target="_blank" rel="noopener noreferrer">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667h-3.554v-11.452h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zm-15.11-13.019c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019h-3.564v-11.452h3.564v11.452zm15.106-20.452h-20.454c-.979 0-1.771.774-1.771 1.729v20.542c0 .956.792 1.729 1.771 1.729h20.451c.978 0 1.778-.773 1.778-1.729v-20.542c0-.955-.8-1.729-1.778-1.729z" fill="currentColor"/>
                    </svg>
                  </a>
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-4">
                © {new Date().getFullYear()} SecuraAI. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
