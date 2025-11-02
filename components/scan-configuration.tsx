"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Zap, Shield, Clock, DollarSign, Settings, Info, ChevronDown, ChevronUp } from "lucide-react"
import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"

interface ScanConfig {
  model: "fast" | "deep"
  severity: string[]
  includeTests: boolean
  includeDependencies: boolean
  maxDepth: number
  customRules: boolean
}

interface ScanConfigurationProps {
  config: ScanConfig
  onConfigChange: (config: ScanConfig) => void
  onStartScan: () => void
  canScan: boolean
  isScanning: boolean
}

export function ScanConfiguration({
  config,
  onConfigChange,
  onStartScan,
  canScan,
  isScanning,
}: ScanConfigurationProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const updateConfig = (updates: Partial<ScanConfig>) => {
    const newConfig = { ...config, ...updates }
    console.log('🔧 Scan config updated:', newConfig)
    onConfigChange(newConfig)
  }

  const toggleSeverity = (severity: string) => {
    const newSeverities = config.severity.includes(severity)
      ? config.severity.filter((s) => s !== severity)
      : [...config.severity, severity]
    updateConfig({ severity: newSeverities })
  }

  const modelOptions = {
    fast: {
      name: "Fast Scan",
      description: "Critical vulnerabilities only (OWASP Top 10, Secrets) - Recommended for most projects",
      icon: Zap,
      time: "~2-3 min",
      cost: "Free",
      color: "text-green-400",
    },
    deep: {
      name: "Deep Analysis", 
      description: "Comprehensive security audit with all vulnerability types",
      icon: Shield,
      time: "~5-10 min",
      cost: "Premium",
      color: "text-blue-400",
    },
  }

  const severityOptions = [
    { id: "high", label: "High", color: "bg-red-500/10 text-red-400 border-red-500/20" },
    { id: "medium", label: "Medium", color: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" },
    { id: "low", label: "Low", color: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  ]

  return (
    <Card className="glassmorphism">
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Settings className="w-5 h-5 text-muted-foreground" />
            <h3 className="text-sm font-medium">Scan Configuration</h3>
            <span className="text-xs text-blue-400 bg-blue-400/10 px-2 py-1 rounded">
              {config.model.toUpperCase()}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-muted-foreground"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Model Selection */}
        <div className="space-y-3">
          <label className="text-sm font-medium">Analysis Model</label>
          <div className="grid grid-cols-1 gap-3">
            {Object.entries(modelOptions).map(([key, option]) => {
              const Icon = option.icon
              const isSelected = config.model === key

              return (
                <motion.div key={key} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Card
                    className={`cursor-pointer transition-all duration-200 ${
                      isSelected ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                    }`}
                    onClick={() => {
                      console.log(`🖱️ Clicked ${key} button, current model: ${config.model}`)
                      updateConfig({ model: key as "fast" | "deep" })
                    }}
                  >
                    <div className="p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <Icon className={`w-4 h-4 ${option.color}`} />
                          <span className="font-medium text-sm">{option.name}</span>
                        </div>
                        {isSelected && <div className="w-2 h-2 rounded-full bg-primary" />}
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">{option.description}</p>
                      <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                        <div className="flex items-center space-x-1">
                          <Clock className="w-3 h-3" />
                          <span>{option.time}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <DollarSign className="w-3 h-3" />
                          <span>{option.cost}</span>
                        </div>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        </div>

        {/* Advanced Options */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-4 pt-4 border-t border-border"
            >
              {/* Severity Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Severity Levels</label>
                <div className="flex flex-wrap gap-2">
                  {severityOptions.map((severity) => (
                    <Badge
                      key={severity.id}
                      className={`cursor-pointer transition-all ${
                        config.severity.includes(severity.id)
                          ? severity.color
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                      onClick={() => toggleSeverity(severity.id)}
                    >
                      {severity.label}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Scan Depth */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Scan Depth</label>
                  <span className="text-xs text-muted-foreground">{config.maxDepth} levels</span>
                </div>
                <Slider
                  value={[config.maxDepth]}
                  onValueChange={([value]) => updateConfig({ maxDepth: value })}
                  max={10}
                  min={1}
                  step={1}
                  className="w-full"
                />
              </div>

              {/* Additional Options */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <label className="text-sm font-medium">Include Test Files</label>
                    <Info className="w-3 h-3 text-muted-foreground" />
                  </div>
                  <Switch
                    checked={config.includeTests}
                    onCheckedChange={(checked) => updateConfig({ includeTests: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <label className="text-sm font-medium">Scan Dependencies</label>
                    <Info className="w-3 h-3 text-muted-foreground" />
                  </div>
                  <Switch
                    checked={config.includeDependencies}
                    onCheckedChange={(checked) => updateConfig({ includeDependencies: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <label className="text-sm font-medium">Custom Rules</label>
                    <Info className="w-3 h-3 text-muted-foreground" />
                  </div>
                  <Switch
                    checked={config.customRules}
                    onCheckedChange={(checked) => updateConfig({ customRules: checked })}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Start Scan Button */}
        <Button
          onClick={onStartScan}
          disabled={!canScan || isScanning}
          className="w-full bg-primary hover:bg-primary/90 group"
          size="lg"
        >
          {isScanning ? (
            <>
              <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2" />
              Scanning...
            </>
          ) : (
            <>
              <Shield className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
              Start Security Scan
            </>
          )}
        </Button>
      </div>
    </Card>
  )
}
