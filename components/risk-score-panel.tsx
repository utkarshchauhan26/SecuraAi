"use client"

import { Card } from "@/components/ui/card"
import { AlertTriangle, Shield, Info } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { useEffect, useState } from "react"

interface RiskScore {
  overall: number
  high: number
  medium: number
  low: number
}

interface RiskScorePanelProps {
  score: RiskScore | null
  isLoading?: boolean
}

export function RiskScorePanel({ score, isLoading }: RiskScorePanelProps) {
  const [animatedScore, setAnimatedScore] = useState(0)

  useEffect(() => {
    if (score) {
      const timer = setTimeout(() => {
        setAnimatedScore(score.overall)
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [score])

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-400"
    if (score >= 60) return "text-yellow-400"
    return "text-red-400"
  }

  const getScoreGradient = (score: number) => {
    if (score >= 80) return "from-green-400 to-emerald-500"
    if (score >= 60) return "from-yellow-400 to-orange-500"
    return "from-red-400 to-red-600"
  }

  return (
    <Card className="glassmorphism p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Risk Assessment</h3>
        <Shield className="w-5 h-5 text-muted-foreground" />
      </div>

      {/* Circular Risk Score */}
      <div className="flex flex-col items-center space-y-4">
        <div className="relative w-32 h-32">
          {/* Background Circle */}
          <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="50" fill="none" stroke="oklch(0.25 0.02 240 / 0.3)" strokeWidth="8" />
            <AnimatePresence>
              {score && (
                <motion.circle
                  cx="60"
                  cy="60"
                  r="50"
                  fill="none"
                  stroke="url(#scoreGradient)"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 50}`}
                  initial={{ strokeDashoffset: 2 * Math.PI * 50 }}
                  animate={{
                    strokeDashoffset: 2 * Math.PI * 50 * (1 - animatedScore / 100),
                  }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                />
              )}
            </AnimatePresence>
            <defs>
              <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="oklch(0.488 0.243 264.376)" />
                <stop offset="50%" stopColor="oklch(0.696 0.17 162.48)" />
                <stop offset="100%" stopColor="oklch(0.627 0.265 303.9)" />
              </linearGradient>
            </defs>
          </svg>

          {/* Score Text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <AnimatePresence mode="wait">
              {isLoading ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-center"
                >
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mb-1" />
                  <span className="text-xs text-muted-foreground">Analyzing</span>
                </motion.div>
              ) : score ? (
                <motion.div
                  key="score"
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                  className="text-center"
                >
                  <motion.span
                    className={`text-3xl font-bold ${getScoreColor(animatedScore)}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                  >
                    {Math.round(animatedScore)}
                  </motion.span>
                  <div className="text-xs text-muted-foreground">Security Score</div>
                </motion.div>
              ) : (
                <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
                  <span className="text-2xl text-muted-foreground">--</span>
                  <div className="text-xs text-muted-foreground">No scan yet</div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <AnimatePresence>
          {score && (
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="text-sm text-center text-muted-foreground"
            >
              {score.overall >= 80
                ? "Excellent security posture"
                : score.overall >= 60
                  ? "Good with room for improvement"
                  : "Needs immediate attention"}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* Issue Breakdown */}
      <AnimatePresence>
        {score && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ delay: 0.3 }}
            className="space-y-4"
          >
            <h4 className="text-sm font-medium text-muted-foreground">Issue Breakdown</h4>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                  <span className="text-sm">High Risk</span>
                </div>
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="text-sm font-medium text-red-400"
                >
                  {score.high}
                </motion.span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-400" />
                  <span className="text-sm">Medium Risk</span>
                </div>
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className="text-sm font-medium text-yellow-400"
                >
                  {score.medium}
                </motion.span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Info className="w-4 h-4 text-blue-400" />
                  <span className="text-sm">Low Risk</span>
                </div>
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.7 }}
                  className="text-sm font-medium text-blue-400"
                >
                  {score.low}
                </motion.span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  )
}
