"use client""use client"



import { useState } from "react"import { DashboardLayout } from "@/components/dashboard-layout"

import { useSession } from "next-auth/react"import { SettingsSection } from "@/components/settings-section"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"import { Card } from "@/components/ui/card"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"import { Button } from "@/components/ui/button"

import { Label } from "@/components/ui/label"import { Switch } from "@/components/ui/switch"

import { Input } from "@/components/ui/input"import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

import { Button } from "@/components/ui/button"import { Input } from "@/components/ui/input"

import { Switch } from "@/components/ui/switch"import { Label } from "@/components/ui/label"

import { Separator } from "@/components/ui/separator"import { Progress } from "@/components/ui/progress"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"import { Badge } from "@/components/ui/badge"

import { Badge } from "@/components/ui/badge"import { Separator } from "@/components/ui/separator"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"import {

import {   Zap,

  User,   Shield,

  Bell,   User,

  Shield,   Bell,

  Key,   CreditCard,

  Save,   Key,

  Upload,  Database,

  Mail,  AlertTriangle,

  Github,  CheckCircle,

  Zap,  Save,

  AlertCircle,  RefreshCw,

  CheckCircle2} from "lucide-react"

} from "lucide-react"import { useState } from "react"

import { Alert, AlertDescription } from "@/components/ui/alert"import { motion } from "framer-motion"



export default function SettingsPage() {interface SettingsData {

  const { data: session } = useSession()  // AI Model Settings

  const [saveSuccess, setSaveSuccess] = useState(false)  defaultModel: "fast" | "accurate"

    autoScanEnabled: boolean

  // User Profile State  maxConcurrentScans: number

  const [displayName, setDisplayName] = useState(session?.user?.name || "")

  const [email, setEmail] = useState(session?.user?.email || "")  // Security & Privacy

    storeCodeOnServer: boolean

  // Scan Preferences State  dataRetentionDays: number

  const [autoScan, setAutoScan] = useState(true)  encryptReports: boolean

  const [minSeverity, setMinSeverity] = useState("medium")  allowTelemetry: boolean

  const [maxFileSize, setMaxFileSize] = useState("50")

  const [scanTimeout, setScanTimeout] = useState("30")  // Account Settings

    displayName: string

  // Notification Settings State  email: string

  const [emailNotifications, setEmailNotifications] = useState(true)  timezone: string

  const [scanCompleteEmail, setScanCompleteEmail] = useState(true)

  const [highSeverityEmail, setHighSeverityEmail] = useState(true)  // Notifications

  const [weeklyReport, setWeeklyReport] = useState(false)  emailNotifications: boolean

    scanCompleteNotifications: boolean

  // API Keys State  weeklyReports: boolean

  const [githubToken, setGithubToken] = useState("")  securityAlerts: boolean

  const [showGithubToken, setShowGithubToken] = useState(false)

  // API Settings

  const handleSaveProfile = async () => {  apiKeyEnabled: boolean

    try {  webhookUrl: string

      // TODO: Implement API call to update user profile  rateLimitPerHour: number

      console.log("Saving profile:", { displayName, email })}

      setSaveSuccess(true)

      setTimeout(() => setSaveSuccess(false), 3000)export default function SettingsPage() {

    } catch (error) {  const [settings, setSettings] = useState<SettingsData>({

      console.error("Failed to save profile:", error)    defaultModel: "fast",

    }    autoScanEnabled: false,

  }    maxConcurrentScans: 3,

    storeCodeOnServer: false,

  const handleSavePreferences = async () => {    dataRetentionDays: 30,

    try {    encryptReports: true,

      // TODO: Implement API call to save scan preferences    allowTelemetry: true,

      console.log("Saving preferences:", { autoScan, minSeverity, maxFileSize, scanTimeout })    displayName: "John Doe",

      setSaveSuccess(true)    email: "john@company.com",

      setTimeout(() => setSaveSuccess(false), 3000)    timezone: "UTC-8",

    } catch (error) {    emailNotifications: true,

      console.error("Failed to save preferences:", error)    scanCompleteNotifications: true,

    }    weeklyReports: false,

  }    securityAlerts: true,

    apiKeyEnabled: false,

  const handleSaveNotifications = async () => {    webhookUrl: "",

    try {    rateLimitPerHour: 100,

      // TODO: Implement API call to save notification settings  })

      console.log("Saving notifications:", { 

        emailNotifications,   const [hasChanges, setHasChanges] = useState(false)

        scanCompleteEmail,   const [isSaving, setIsSaving] = useState(false)

        highSeverityEmail, 

        weeklyReport   const updateSetting = <K extends keyof SettingsData>(key: K, value: SettingsData[K]) => {

      })    setSettings((prev) => ({ ...prev, [key]: value }))

      setSaveSuccess(true)    setHasChanges(true)

      setTimeout(() => setSaveSuccess(false), 3000)  }

    } catch (error) {

      console.error("Failed to save notifications:", error)  const handleSave = async () => {

    }    setIsSaving(true)

  }    // Simulate API call

    await new Promise((resolve) => setTimeout(resolve, 1000))

  const handleSaveApiKeys = async () => {    setIsSaving(false)

    try {    setHasChanges(false)

      // TODO: Implement API call to save API keys  }

      console.log("Saving API keys")

      setSaveSuccess(true)  const handleReset = () => {

      setTimeout(() => setSaveSuccess(false), 3000)    // Reset to default values

    } catch (error) {    setHasChanges(false)

      console.error("Failed to save API keys:", error)  }

    }

  }  // Mock usage data

  const usageData = {

  return (    tokensUsed: 45000,

    <div className="space-y-6">    tokensLimit: 100000,

      <div>    scansThisMonth: 23,

        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>    scansLimit: 50,

        <p className="text-muted-foreground mt-2">    storageUsed: 2.4, // GB

          Manage your account settings and preferences    storageLimit: 10, // GB

        </p>  }

      </div>

  const modelOptions = {

      {saveSuccess && (    fast: {

        <Alert className="bg-green-500/10 border-green-500/20">      name: "Fast Scan",

          <CheckCircle2 className="h-4 w-4 text-green-500" />      description: "Quick analysis with basic security checks",

          <AlertDescription className="text-green-500">      cost: "$0.02 per scan",

            Settings saved successfully!      avgTime: "2-3 minutes",

          </AlertDescription>    },

        </Alert>    accurate: {

      )}      name: "Deep Analysis",

      description: "Comprehensive AI-powered security audit",

      <Tabs defaultValue="profile" className="w-full">      cost: "$0.08 per scan",

        <TabsList className="grid w-full grid-cols-4 lg:w-[500px]">      avgTime: "8-12 minutes",

          <TabsTrigger value="profile">    },

            <User className="h-4 w-4 mr-2" />  }

            Profile

          </TabsTrigger>  return (

          <TabsTrigger value="preferences">    <DashboardLayout>

            <Shield className="h-4 w-4 mr-2" />      <div className="flex flex-1 flex-col p-6 space-y-6">

            Scans        {/* Header */}

          </TabsTrigger>        <div className="flex items-center justify-between">

          <TabsTrigger value="notifications">          <div>

            <Bell className="h-4 w-4 mr-2" />            <h1 className="text-3xl font-bold text-foreground">Settings</h1>

            Alerts            <p className="text-muted-foreground mt-1">Manage your AI Security Auditor preferences</p>

          </TabsTrigger>          </div>

          <TabsTrigger value="api">          <div className="flex items-center space-x-2">

            <Key className="h-4 w-4 mr-2" />            {hasChanges && (

            API              <Button variant="outline" onClick={handleReset} className="bg-transparent">

          </TabsTrigger>                <RefreshCw className="w-4 h-4 mr-2" />

        </TabsList>                Reset

              </Button>

        {/* Profile Tab */}            )}

        <TabsContent value="profile" className="space-y-4">            <Button onClick={handleSave} disabled={!hasChanges || isSaving} className="bg-primary hover:bg-primary/90">

          <Card>              {isSaving ? (

            <CardHeader>                <>

              <CardTitle>User Profile</CardTitle>                  <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2" />

              <CardDescription>                  Saving...

                Update your personal information and profile picture                </>

              </CardDescription>              ) : (

            </CardHeader>                <>

            <CardContent className="space-y-6">                  <Save className="w-4 h-4 mr-2" />

              {/* Avatar Section */}                  Save Changes

              <div className="flex items-center gap-4">                </>

                <Avatar className="h-20 w-20">              )}

                  <AvatarImage src={session?.user?.image || ""} />            </Button>

                  <AvatarFallback className="text-xl">          </div>

                    {session?.user?.name?.charAt(0).toUpperCase() || "U"}        </div>

                  </AvatarFallback>

                </Avatar>        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                <div className="space-y-1">          {/* Main Settings */}

                  <Button variant="outline" size="sm">          <div className="lg:col-span-2 space-y-6">

                    <Upload className="h-4 w-4 mr-2" />            {/* AI Model Configuration */}

                    Change Avatar            <SettingsSection

                  </Button>              icon={<Zap className="w-5 h-5 text-primary" />}

                  <p className="text-xs text-muted-foreground">              title="AI Model Configuration"

                    JPG, PNG or GIF. Max size 2MB.              description="Configure your default scanning model and behavior"

                  </p>            >

                </div>              <div className="space-y-4">

              </div>                <div>

                  <Label className="text-sm font-medium mb-3 block">Default Scanning Model</Label>

              <Separator />                  <div className="grid grid-cols-1 gap-3">

                    {Object.entries(modelOptions).map(([key, option]) => (

              {/* Profile Fields */}                      <motion.div key={key} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>

              <div className="space-y-4">                        <Card

                <div className="space-y-2">                          className={`cursor-pointer transition-all duration-200 ${

                  <Label htmlFor="displayName">Display Name</Label>                            settings.defaultModel === key

                  <Input                              ? "border-primary bg-primary/5"

                    id="displayName"                              : "border-border hover:border-primary/50"

                    value={displayName}                          }`}

                    onChange={(e) => setDisplayName(e.target.value)}                          onClick={() => updateSetting("defaultModel", key as "fast" | "accurate")}

                    placeholder="Your name"                        >

                  />                          <div className="p-4">

                </div>                            <div className="flex items-center justify-between mb-2">

                              <div className="flex items-center space-x-2">

                <div className="space-y-2">                                <span className="font-medium">{option.name}</span>

                  <Label htmlFor="email">Email Address</Label>                                {settings.defaultModel === key && <CheckCircle className="w-4 h-4 text-primary" />}

                  <div className="flex gap-2 items-center">                              </div>

                    <Input                              <Badge variant="secondary" className="text-xs">

                      id="email"                                {option.cost}

                      type="email"                              </Badge>

                      value={email}                            </div>

                      onChange={(e) => setEmail(e.target.value)}                            <p className="text-sm text-muted-foreground mb-2">{option.description}</p>

                      placeholder="your.email@example.com"                            <p className="text-xs text-muted-foreground">Average time: {option.avgTime}</p>

                      disabled                          </div>

                    />                        </Card>

                    <Badge variant="secondary">                      </motion.div>

                      {session?.user?.email ? "Verified" : "Unverified"}                    ))}

                    </Badge>                  </div>

                  </div>                </div>

                  <p className="text-xs text-muted-foreground">

                    Email is managed by your OAuth provider                <Separator />

                  </p>

                </div>                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                  <div className="flex items-center justify-between">

                <div className="space-y-2">                    <div>

                  <Label>Connected Accounts</Label>                      <Label className="text-sm font-medium">Auto-scan on upload</Label>

                  <div className="flex items-center gap-2 p-3 border rounded-lg">                      <p className="text-xs text-muted-foreground">

                    <Github className="h-5 w-5" />                        Automatically start scanning when files are uploaded

                    <span className="flex-1 text-sm">GitHub</span>                      </p>

                    <Badge variant="outline" className="text-green-500 border-green-500">                    </div>

                      Connected                    <Switch

                    </Badge>                      checked={settings.autoScanEnabled}

                  </div>                      onCheckedChange={(checked) => updateSetting("autoScanEnabled", checked)}

                </div>                    />

              </div>                  </div>



              <Separator />                  <div>

                    <Label className="text-sm font-medium mb-2 block">Max concurrent scans</Label>

              <Button onClick={handleSaveProfile} className="w-full sm:w-auto">                    <Select

                <Save className="h-4 w-4 mr-2" />                      value={settings.maxConcurrentScans.toString()}

                Save Profile                      onValueChange={(value) => updateSetting("maxConcurrentScans", Number.parseInt(value))}

              </Button>                    >

            </CardContent>                      <SelectTrigger className="bg-transparent">

          </Card>                        <SelectValue />

        </TabsContent>                      </SelectTrigger>

                      <SelectContent className="glassmorphism">

        {/* Scan Preferences Tab */}                        <SelectItem value="1">1 scan</SelectItem>

        <TabsContent value="preferences" className="space-y-4">                        <SelectItem value="3">3 scans</SelectItem>

          <Card>                        <SelectItem value="5">5 scans</SelectItem>

            <CardHeader>                        <SelectItem value="10">10 scans</SelectItem>

              <CardTitle>Scan Preferences</CardTitle>                      </SelectContent>

              <CardDescription>                    </Select>

                Configure default settings for security scans                  </div>

              </CardDescription>                </div>

            </CardHeader>              </div>

            <CardContent className="space-y-6">            </SettingsSection>

              {/* Auto Scan */}

              <div className="flex items-center justify-between">            {/* Security & Privacy */}

                <div className="space-y-0.5">            <SettingsSection

                  <Label>Auto-scan on upload</Label>              icon={<Shield className="w-5 h-5 text-green-400" />}

                  <p className="text-sm text-muted-foreground">              title="Security & Privacy"

                    Automatically start scanning when files are uploaded              description="Control how your data is stored and processed"

                  </p>            >

                </div>              <div className="space-y-4">

                <Switch checked={autoScan} onCheckedChange={setAutoScan} />                <div className="flex items-center justify-between">

              </div>                  <div>

                    <Label className="text-sm font-medium">Store code on server</Label>

              <Separator />                    <p className="text-xs text-muted-foreground">Keep uploaded code files for faster re-scanning</p>

                  </div>

              {/* Minimum Severity */}                  <Switch

              <div className="space-y-2">                    checked={settings.storeCodeOnServer}

                <Label htmlFor="minSeverity">Minimum Severity Level</Label>                    onCheckedChange={(checked) => updateSetting("storeCodeOnServer", checked)}

                <Select value={minSeverity} onValueChange={setMinSeverity}>                  />

                  <SelectTrigger id="minSeverity">                </div>

                    <SelectValue />

                  </SelectTrigger>                <div className="flex items-center justify-between">

                  <SelectContent>                  <div>

                    <SelectItem value="low">Low - Show all findings</SelectItem>                    <Label className="text-sm font-medium">Encrypt reports</Label>

                    <SelectItem value="medium">Medium - Filter low severity</SelectItem>                    <p className="text-xs text-muted-foreground">Use end-to-end encryption for generated reports</p>

                    <SelectItem value="high">High - Only critical issues</SelectItem>                  </div>

                    <SelectItem value="critical">Critical - Only critical</SelectItem>                  <Switch

                  </SelectContent>                    checked={settings.encryptReports}

                </Select>                    onCheckedChange={(checked) => updateSetting("encryptReports", checked)}

                <p className="text-xs text-muted-foreground">                  />

                  Only show vulnerabilities at or above this severity level                </div>

                </p>

              </div>                <div className="flex items-center justify-between">

                  <div>

              {/* Max File Size */}                    <Label className="text-sm font-medium">Allow telemetry</Label>

              <div className="space-y-2">                    <p className="text-xs text-muted-foreground">Help improve our service with anonymous usage data</p>

                <Label htmlFor="maxFileSize">Maximum File Size (MB)</Label>                  </div>

                <Input                  <Switch

                  id="maxFileSize"                    checked={settings.allowTelemetry}

                  type="number"                    onCheckedChange={(checked) => updateSetting("allowTelemetry", checked)}

                  value={maxFileSize}                  />

                  onChange={(e) => setMaxFileSize(e.target.value)}                </div>

                  min="1"

                  max="500"                <div>

                />                  <Label className="text-sm font-medium mb-2 block">Data retention period</Label>

                <p className="text-xs text-muted-foreground">                  <Select

                  Files larger than this will be rejected                    value={settings.dataRetentionDays.toString()}

                </p>                    onValueChange={(value) => updateSetting("dataRetentionDays", Number.parseInt(value))}

              </div>                  >

                    <SelectTrigger className="bg-transparent">

              {/* Scan Timeout */}                      <SelectValue />

              <div className="space-y-2">                    </SelectTrigger>

                <Label htmlFor="scanTimeout">Scan Timeout (minutes)</Label>                    <SelectContent className="glassmorphism">

                <Input                      <SelectItem value="7">7 days</SelectItem>

                  id="scanTimeout"                      <SelectItem value="30">30 days</SelectItem>

                  type="number"                      <SelectItem value="90">90 days</SelectItem>

                  value={scanTimeout}                      <SelectItem value="365">1 year</SelectItem>

                  onChange={(e) => setScanTimeout(e.target.value)}                    </SelectContent>

                  min="5"                  </Select>

                  max="60"                </div>

                />              </div>

                <p className="text-xs text-muted-foreground">            </SettingsSection>

                  Maximum time allowed for a single scan

                </p>            {/* Account Settings */}

              </div>            <SettingsSection

              icon={<User className="w-5 h-5 text-blue-400" />}

              <Separator />              title="Account Settings"

              description="Manage your profile and account preferences"

              <Button onClick={handleSavePreferences} className="w-full sm:w-auto">            >

                <Save className="h-4 w-4 mr-2" />              <div className="space-y-4">

                Save Preferences                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              </Button>                  <div>

            </CardContent>                    <Label className="text-sm font-medium mb-2 block">Display name</Label>

          </Card>                    <Input

        </TabsContent>                      value={settings.displayName}

                      onChange={(e) => updateSetting("displayName", e.target.value)}

        {/* Notifications Tab */}                      className="bg-transparent"

        <TabsContent value="notifications" className="space-y-4">                    />

          <Card>                  </div>

            <CardHeader>

              <CardTitle>Notification Settings</CardTitle>                  <div>

              <CardDescription>                    <Label className="text-sm font-medium mb-2 block">Email address</Label>

                Manage how you receive alerts and updates                    <Input

              </CardDescription>                      type="email"

            </CardHeader>                      value={settings.email}

            <CardContent className="space-y-6">                      onChange={(e) => updateSetting("email", e.target.value)}

              {/* Email Notifications */}                      className="bg-transparent"

              <div className="flex items-center justify-between">                    />

                <div className="space-y-0.5">                  </div>

                  <Label className="flex items-center gap-2">                </div>

                    <Mail className="h-4 w-4" />

                    Email Notifications                <div>

                  </Label>                  <Label className="text-sm font-medium mb-2 block">Timezone</Label>

                  <p className="text-sm text-muted-foreground">                  <Select value={settings.timezone} onValueChange={(value) => updateSetting("timezone", value)}>

                    Receive notifications via email                    <SelectTrigger className="bg-transparent">

                  </p>                      <SelectValue />

                </div>                    </SelectTrigger>

                <Switch                     <SelectContent className="glassmorphism">

                  checked={emailNotifications}                       <SelectItem value="UTC-8">Pacific Time (UTC-8)</SelectItem>

                  onCheckedChange={setEmailNotifications}                       <SelectItem value="UTC-5">Eastern Time (UTC-5)</SelectItem>

                />                      <SelectItem value="UTC+0">UTC</SelectItem>

              </div>                      <SelectItem value="UTC+1">Central European Time (UTC+1)</SelectItem>

                    </SelectContent>

              <Separator />                  </Select>

                </div>

              {/* Individual Settings */}              </div>

              <div className="space-y-4 opacity-100" style={{ opacity: emailNotifications ? 1 : 0.5 }}>            </SettingsSection>

                <div className="flex items-center justify-between">

                  <div className="space-y-0.5">            {/* Notifications */}

                    <Label>Scan Complete</Label>            <SettingsSection

                    <p className="text-sm text-muted-foreground">              icon={<Bell className="w-5 h-5 text-yellow-400" />}

                      Notify when a scan finishes              title="Notifications"

                    </p>              description="Choose what notifications you want to receive"

                  </div>            >

                  <Switch               <div className="space-y-4">

                    checked={scanCompleteEmail}                 <div className="flex items-center justify-between">

                    onCheckedChange={setScanCompleteEmail}                  <div>

                    disabled={!emailNotifications}                    <Label className="text-sm font-medium">Email notifications</Label>

                  />                    <p className="text-xs text-muted-foreground">Receive notifications via email</p>

                </div>                  </div>

                  <Switch

                <div className="flex items-center justify-between">                    checked={settings.emailNotifications}

                  <div className="space-y-0.5">                    onCheckedChange={(checked) => updateSetting("emailNotifications", checked)}

                    <Label className="flex items-center gap-2">                  />

                      <AlertCircle className="h-4 w-4 text-red-500" />                </div>

                      High Severity Findings

                    </Label>                <div className="flex items-center justify-between">

                    <p className="text-sm text-muted-foreground">                  <div>

                      Alert for critical or high severity vulnerabilities                    <Label className="text-sm font-medium">Scan completion</Label>

                    </p>                    <p className="text-xs text-muted-foreground">Notify when security scans are complete</p>

                  </div>                  </div>

                  <Switch                   <Switch

                    checked={highSeverityEmail}                     checked={settings.scanCompleteNotifications}

                    onCheckedChange={setHighSeverityEmail}                    onCheckedChange={(checked) => updateSetting("scanCompleteNotifications", checked)}

                    disabled={!emailNotifications}                  />

                  />                </div>

                </div>

                <div className="flex items-center justify-between">

                <div className="flex items-center justify-between">                  <div>

                  <div className="space-y-0.5">                    <Label className="text-sm font-medium">Weekly reports</Label>

                    <Label className="flex items-center gap-2">                    <p className="text-xs text-muted-foreground">Receive weekly security summaries</p>

                      <Zap className="h-4 w-4 text-blue-500" />                  </div>

                      Weekly Summary Report                  <Switch

                    </Label>                    checked={settings.weeklyReports}

                    <p className="text-sm text-muted-foreground">                    onCheckedChange={(checked) => updateSetting("weeklyReports", checked)}

                      Receive a weekly digest of all scans                  />

                    </p>                </div>

                  </div>

                  <Switch                 <div className="flex items-center justify-between">

                    checked={weeklyReport}                   <div>

                    onCheckedChange={setWeeklyReport}                    <Label className="text-sm font-medium">Security alerts</Label>

                    disabled={!emailNotifications}                    <p className="text-xs text-muted-foreground">Critical security findings notifications</p>

                  />                  </div>

                </div>                  <Switch

              </div>                    checked={settings.securityAlerts}

                    onCheckedChange={(checked) => updateSetting("securityAlerts", checked)}

              <Separator />                  />

                </div>

              <Button onClick={handleSaveNotifications} className="w-full sm:w-auto">              </div>

                <Save className="h-4 w-4 mr-2" />            </SettingsSection>

                Save Notifications

              </Button>            {/* API & Integrations */}

            </CardContent>            <SettingsSection

          </Card>              icon={<Key className="w-5 h-5 text-purple-400" />}

        </TabsContent>              title="API & Integrations"

              description="Configure API access and webhook integrations"

        {/* API Keys Tab */}            >

        <TabsContent value="api" className="space-y-4">              <div className="space-y-4">

          <Card>                <div className="flex items-center justify-between">

            <CardHeader>                  <div>

              <CardTitle>API Configuration</CardTitle>                    <Label className="text-sm font-medium">Enable API access</Label>

              <CardDescription>                    <p className="text-xs text-muted-foreground">Allow programmatic access to your account</p>

                Manage API keys and integrations                  </div>

              </CardDescription>                  <Switch

            </CardHeader>                    checked={settings.apiKeyEnabled}

            <CardContent className="space-y-6">                    onCheckedChange={(checked) => updateSetting("apiKeyEnabled", checked)}

              {/* GitHub Token */}                  />

              <div className="space-y-2">                </div>

                <Label htmlFor="githubToken" className="flex items-center gap-2">

                  <Github className="h-4 w-4" />                {settings.apiKeyEnabled && (

                  GitHub Personal Access Token                  <>

                </Label>                    <div>

                <div className="flex gap-2">                      <Label className="text-sm font-medium mb-2 block">Webhook URL</Label>

                  <Input                      <Input

                    id="githubToken"                        placeholder="https://your-app.com/webhook"

                    type={showGithubToken ? "text" : "password"}                        value={settings.webhookUrl}

                    value={githubToken}                        onChange={(e) => updateSetting("webhookUrl", e.target.value)}

                    onChange={(e) => setGithubToken(e.target.value)}                        className="bg-transparent"

                    placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"                      />

                  />                    </div>

                  <Button

                    variant="outline"                    <div>

                    onClick={() => setShowGithubToken(!showGithubToken)}                      <Label className="text-sm font-medium mb-2 block">Rate limit (requests per hour)</Label>

                  >                      <Select

                    {showGithubToken ? "Hide" : "Show"}                        value={settings.rateLimitPerHour.toString()}

                  </Button>                        onValueChange={(value) => updateSetting("rateLimitPerHour", Number.parseInt(value))}

                </div>                      >

                <p className="text-xs text-muted-foreground">                        <SelectTrigger className="bg-transparent">

                  Required for scanning private GitHub repositories.                           <SelectValue />

                  <a href="https://github.com/settings/tokens" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline ml-1">                        </SelectTrigger>

                    Generate token →                        <SelectContent className="glassmorphism">

                  </a>                          <SelectItem value="50">50 requests/hour</SelectItem>

                </p>                          <SelectItem value="100">100 requests/hour</SelectItem>

              </div>                          <SelectItem value="500">500 requests/hour</SelectItem>

                          <SelectItem value="1000">1000 requests/hour</SelectItem>

              <Alert>                        </SelectContent>

                <Key className="h-4 w-4" />                      </Select>

                <AlertDescription>                    </div>

                  Your API keys are encrypted and stored securely. They are only used for authorized scans.                  </>

                </AlertDescription>                )}

              </Alert>              </div>

            </SettingsSection>

              <Separator />          </div>



              <Button onClick={handleSaveApiKeys} className="w-full sm:w-auto">          {/* Usage & Billing Sidebar */}

                <Save className="h-4 w-4 mr-2" />          <div className="space-y-6">

                Save API Keys            {/* Token Usage */}

              </Button>            <Card className="glassmorphism p-6">

            </CardContent>              <div className="flex items-center space-x-2 mb-4">

          </Card>                <Database className="w-5 h-5 text-accent" />

                <h3 className="font-semibold">Token Usage</h3>

          {/* API Usage Stats */}              </div>

          <Card>

            <CardHeader>              <div className="space-y-4">

              <CardTitle>API Usage</CardTitle>                <div>

              <CardDescription>                  <div className="flex items-center justify-between mb-2">

                Your current usage statistics                    <span className="text-sm text-muted-foreground">AI Tokens</span>

              </CardDescription>                    <span className="text-sm font-medium">

            </CardHeader>                      {usageData.tokensUsed.toLocaleString()} / {usageData.tokensLimit.toLocaleString()}

            <CardContent>                    </span>

              <div className="space-y-4">                  </div>

                <div className="flex justify-between items-center">                  <Progress value={(usageData.tokensUsed / usageData.tokensLimit) * 100} className="h-2" />

                  <span className="text-sm text-muted-foreground">Scans this month</span>                </div>

                  <Badge variant="secondary">0 / 100</Badge>

                </div>                <div>

                <div className="flex justify-between items-center">                  <div className="flex items-center justify-between mb-2">

                  <span className="text-sm text-muted-foreground">Storage used</span>                    <span className="text-sm text-muted-foreground">Scans this month</span>

                  <Badge variant="secondary">0 MB / 1 GB</Badge>                    <span className="text-sm font-medium">

                </div>                      {usageData.scansThisMonth} / {usageData.scansLimit}

                <div className="flex justify-between items-center">                    </span>

                  <span className="text-sm text-muted-foreground">API calls today</span>                  </div>

                  <Badge variant="secondary">0 / 1000</Badge>                  <Progress value={(usageData.scansThisMonth / usageData.scansLimit) * 100} className="h-2" />

                </div>                </div>

              </div>

            </CardContent>                <div>

          </Card>                  <div className="flex items-center justify-between mb-2">

        </TabsContent>                    <span className="text-sm text-muted-foreground">Storage used</span>

      </Tabs>                    <span className="text-sm font-medium">

    </div>                      {usageData.storageUsed} GB / {usageData.storageLimit} GB

  )                    </span>

}                  </div>

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
