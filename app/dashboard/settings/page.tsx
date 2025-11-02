"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { SettingsSection } from "@/components/settings-section"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Zap,
  Shield,
  User,
  Bell,
  CreditCard,
  Key,
  Database,
  AlertTriangle,
  CheckCircle,
  Save,
  RefreshCw,
} from "lucide-react"
import { useState } from "react"
import { motion } from "framer-motion"

interface SettingsData {
  // AI Model Settings
  defaultModel: "fast" | "accurate"
  autoScanEnabled: boolean
  maxConcurrentScans: number

  // Security & Privacy
  storeCodeOnServer: boolean
  dataRetentionDays: number
  encryptReports: boolean
  allowTelemetry: boolean

  // Account Settings
  displayName: string
  email: string
  timezone: string

  // Notifications
  emailNotifications: boolean
  scanCompleteNotifications: boolean
  weeklyReports: boolean
  securityAlerts: boolean

  // API Settings
  apiKeyEnabled: boolean
  webhookUrl: string
  rateLimitPerHour: number
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsData>({
    defaultModel: "fast",
    autoScanEnabled: false,
    maxConcurrentScans: 3,
    storeCodeOnServer: false,
    dataRetentionDays: 30,
    encryptReports: true,
    allowTelemetry: true,
    displayName: "John Doe",
    email: "john@company.com",
    timezone: "UTC-8",
    emailNotifications: true,
    scanCompleteNotifications: true,
    weeklyReports: false,
    securityAlerts: true,
    apiKeyEnabled: false,
    webhookUrl: "",
    rateLimitPerHour: 100,
  })

  const [hasChanges, setHasChanges] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const updateSetting = <K extends keyof SettingsData>(key: K, value: SettingsData[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
    setHasChanges(true)
  }

  const handleSave = async () => {
    setIsSaving(true)
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000))
    setIsSaving(false)
    setHasChanges(false)
  }

  const handleReset = () => {
    // Reset to default values
    setHasChanges(false)
  }

  // Mock usage data
  const usageData = {
    tokensUsed: 45000,
    tokensLimit: 100000,
    scansThisMonth: 23,
    scansLimit: 50,
    storageUsed: 2.4, // GB
    storageLimit: 10, // GB
  }

  const modelOptions = {
    fast: {
      name: "Fast Scan",
      description: "Quick analysis with basic security checks",
      cost: "$0.02 per scan",
      avgTime: "2-3 minutes",
    },
    accurate: {
      name: "Deep Analysis",
      description: "Comprehensive AI-powered security audit",
      cost: "$0.08 per scan",
      avgTime: "8-12 minutes",
    },
  }

  return (
    <DashboardLayout>
      <div className="flex flex-1 flex-col p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Settings</h1>
            <p className="text-muted-foreground mt-1">Manage your AI Security Auditor preferences</p>
          </div>
          <div className="flex items-center space-x-2">
            {hasChanges && (
              <Button variant="outline" onClick={handleReset} className="bg-transparent">
                <RefreshCw className="w-4 h-4 mr-2" />
                Reset
              </Button>
            )}
            <Button onClick={handleSave} disabled={!hasChanges || isSaving} className="bg-primary hover:bg-primary/90">
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Settings */}
          <div className="lg:col-span-2 space-y-6">
            {/* AI Model Configuration */}
            <SettingsSection
              icon={<Zap className="w-5 h-5 text-primary" />}
              title="AI Model Configuration"
              description="Configure your default scanning model and behavior"
            >
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium mb-3 block">Default Scanning Model</Label>
                  <div className="grid grid-cols-1 gap-3">
                    {Object.entries(modelOptions).map(([key, option]) => (
                      <motion.div key={key} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                        <Card
                          className={`cursor-pointer transition-all duration-200 ${
                            settings.defaultModel === key
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-primary/50"
                          }`}
                          onClick={() => updateSetting("defaultModel", key as "fast" | "accurate")}
                        >
                          <div className="p-4">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center space-x-2">
                                <span className="font-medium">{option.name}</span>
                                {settings.defaultModel === key && <CheckCircle className="w-4 h-4 text-primary" />}
                              </div>
                              <Badge variant="secondary" className="text-xs">
                                {option.cost}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">{option.description}</p>
                            <p className="text-xs text-muted-foreground">Average time: {option.avgTime}</p>
                          </div>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm font-medium">Auto-scan on upload</Label>
                      <p className="text-xs text-muted-foreground">
                        Automatically start scanning when files are uploaded
                      </p>
                    </div>
                    <Switch
                      checked={settings.autoScanEnabled}
                      onCheckedChange={(checked) => updateSetting("autoScanEnabled", checked)}
                    />
                  </div>

                  <div>
                    <Label className="text-sm font-medium mb-2 block">Max concurrent scans</Label>
                    <Select
                      value={settings.maxConcurrentScans.toString()}
                      onValueChange={(value) => updateSetting("maxConcurrentScans", Number.parseInt(value))}
                    >
                      <SelectTrigger className="bg-transparent">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="glassmorphism">
                        <SelectItem value="1">1 scan</SelectItem>
                        <SelectItem value="3">3 scans</SelectItem>
                        <SelectItem value="5">5 scans</SelectItem>
                        <SelectItem value="10">10 scans</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </SettingsSection>

            {/* Security & Privacy */}
            <SettingsSection
              icon={<Shield className="w-5 h-5 text-green-400" />}
              title="Security & Privacy"
              description="Control how your data is stored and processed"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">Store code on server</Label>
                    <p className="text-xs text-muted-foreground">Keep uploaded code files for faster re-scanning</p>
                  </div>
                  <Switch
                    checked={settings.storeCodeOnServer}
                    onCheckedChange={(checked) => updateSetting("storeCodeOnServer", checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">Encrypt reports</Label>
                    <p className="text-xs text-muted-foreground">Use end-to-end encryption for generated reports</p>
                  </div>
                  <Switch
                    checked={settings.encryptReports}
                    onCheckedChange={(checked) => updateSetting("encryptReports", checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">Allow telemetry</Label>
                    <p className="text-xs text-muted-foreground">Help improve our service with anonymous usage data</p>
                  </div>
                  <Switch
                    checked={settings.allowTelemetry}
                    onCheckedChange={(checked) => updateSetting("allowTelemetry", checked)}
                  />
                </div>

                <div>
                  <Label className="text-sm font-medium mb-2 block">Data retention period</Label>
                  <Select
                    value={settings.dataRetentionDays.toString()}
                    onValueChange={(value) => updateSetting("dataRetentionDays", Number.parseInt(value))}
                  >
                    <SelectTrigger className="bg-transparent">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="glassmorphism">
                      <SelectItem value="7">7 days</SelectItem>
                      <SelectItem value="30">30 days</SelectItem>
                      <SelectItem value="90">90 days</SelectItem>
                      <SelectItem value="365">1 year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </SettingsSection>

            {/* Account Settings */}
            <SettingsSection
              icon={<User className="w-5 h-5 text-blue-400" />}
              title="Account Settings"
              description="Manage your profile and account preferences"
            >
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Display name</Label>
                    <Input
                      value={settings.displayName}
                      onChange={(e) => updateSetting("displayName", e.target.value)}
                      className="bg-transparent"
                    />
                  </div>

                  <div>
                    <Label className="text-sm font-medium mb-2 block">Email address</Label>
                    <Input
                      type="email"
                      value={settings.email}
                      onChange={(e) => updateSetting("email", e.target.value)}
                      className="bg-transparent"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium mb-2 block">Timezone</Label>
                  <Select value={settings.timezone} onValueChange={(value) => updateSetting("timezone", value)}>
                    <SelectTrigger className="bg-transparent">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="glassmorphism">
                      <SelectItem value="UTC-8">Pacific Time (UTC-8)</SelectItem>
                      <SelectItem value="UTC-5">Eastern Time (UTC-5)</SelectItem>
                      <SelectItem value="UTC+0">UTC</SelectItem>
                      <SelectItem value="UTC+1">Central European Time (UTC+1)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </SettingsSection>

            {/* Notifications */}
            <SettingsSection
              icon={<Bell className="w-5 h-5 text-yellow-400" />}
              title="Notifications"
              description="Choose what notifications you want to receive"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">Email notifications</Label>
                    <p className="text-xs text-muted-foreground">Receive notifications via email</p>
                  </div>
                  <Switch
                    checked={settings.emailNotifications}
                    onCheckedChange={(checked) => updateSetting("emailNotifications", checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">Scan completion</Label>
                    <p className="text-xs text-muted-foreground">Notify when security scans are complete</p>
                  </div>
                  <Switch
                    checked={settings.scanCompleteNotifications}
                    onCheckedChange={(checked) => updateSetting("scanCompleteNotifications", checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">Weekly reports</Label>
                    <p className="text-xs text-muted-foreground">Receive weekly security summaries</p>
                  </div>
                  <Switch
                    checked={settings.weeklyReports}
                    onCheckedChange={(checked) => updateSetting("weeklyReports", checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">Security alerts</Label>
                    <p className="text-xs text-muted-foreground">Critical security findings notifications</p>
                  </div>
                  <Switch
                    checked={settings.securityAlerts}
                    onCheckedChange={(checked) => updateSetting("securityAlerts", checked)}
                  />
                </div>
              </div>
            </SettingsSection>

            {/* API & Integrations */}
            <SettingsSection
              icon={<Key className="w-5 h-5 text-purple-400" />}
              title="API & Integrations"
              description="Configure API access and webhook integrations"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">Enable API access</Label>
                    <p className="text-xs text-muted-foreground">Allow programmatic access to your account</p>
                  </div>
                  <Switch
                    checked={settings.apiKeyEnabled}
                    onCheckedChange={(checked) => updateSetting("apiKeyEnabled", checked)}
                  />
                </div>

                {settings.apiKeyEnabled && (
                  <>
                    <div>
                      <Label className="text-sm font-medium mb-2 block">Webhook URL</Label>
                      <Input
                        placeholder="https://your-app.com/webhook"
                        value={settings.webhookUrl}
                        onChange={(e) => updateSetting("webhookUrl", e.target.value)}
                        className="bg-transparent"
                      />
                    </div>

                    <div>
                      <Label className="text-sm font-medium mb-2 block">Rate limit (requests per hour)</Label>
                      <Select
                        value={settings.rateLimitPerHour.toString()}
                        onValueChange={(value) => updateSetting("rateLimitPerHour", Number.parseInt(value))}
                      >
                        <SelectTrigger className="bg-transparent">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="glassmorphism">
                          <SelectItem value="50">50 requests/hour</SelectItem>
                          <SelectItem value="100">100 requests/hour</SelectItem>
                          <SelectItem value="500">500 requests/hour</SelectItem>
                          <SelectItem value="1000">1000 requests/hour</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}
              </div>
            </SettingsSection>
          </div>

          {/* Usage & Billing Sidebar */}
          <div className="space-y-6">
            {/* Token Usage */}
            <Card className="glassmorphism p-6">
              <div className="flex items-center space-x-2 mb-4">
                <Database className="w-5 h-5 text-accent" />
                <h3 className="font-semibold">Token Usage</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">AI Tokens</span>
                    <span className="text-sm font-medium">
                      {usageData.tokensUsed.toLocaleString()} / {usageData.tokensLimit.toLocaleString()}
                    </span>
                  </div>
                  <Progress value={(usageData.tokensUsed / usageData.tokensLimit) * 100} className="h-2" />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Scans this month</span>
                    <span className="text-sm font-medium">
                      {usageData.scansThisMonth} / {usageData.scansLimit}
                    </span>
                  </div>
                  <Progress value={(usageData.scansThisMonth / usageData.scansLimit) * 100} className="h-2" />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Storage used</span>
                    <span className="text-sm font-medium">
                      {usageData.storageUsed} GB / {usageData.storageLimit} GB
                    </span>
                  </div>
                  <Progress value={(usageData.storageUsed / usageData.storageLimit) * 100} className="h-2" />
                </div>
              </div>

              <Button variant="outline" size="sm" className="w-full mt-4 bg-transparent">
                <CreditCard className="w-4 h-4 mr-2" />
                Upgrade Plan
              </Button>
            </Card>

            {/* Quick Actions */}
            <Card className="glassmorphism p-6">
              <h3 className="font-semibold mb-4">Quick Actions</h3>
              <div className="space-y-2">
                <Button variant="outline" size="sm" className="w-full justify-start bg-transparent">
                  <Key className="w-4 h-4 mr-2" />
                  Generate API Key
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start bg-transparent">
                  <Database className="w-4 h-4 mr-2" />
                  Export Data
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start bg-transparent">
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Delete Account
                </Button>
              </div>
            </Card>

            {/* Support */}
            <Card className="glassmorphism p-6">
              <h3 className="font-semibold mb-4">Need Help?</h3>
              <div className="space-y-3 text-sm">
                <p className="text-muted-foreground">Check our documentation or contact support for assistance.</p>
                <div className="space-y-2">
                  <Button variant="outline" size="sm" className="w-full justify-start bg-transparent">
                    Documentation
                  </Button>
                  <Button variant="outline" size="sm" className="w-full justify-start bg-transparent">
                    Contact Support
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
