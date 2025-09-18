"use client"

import { Card } from "@/components/ui/card"
import type { ReactNode } from "react"

interface SettingsSectionProps {
  icon: ReactNode
  title: string
  description: string
  children: ReactNode
}

export function SettingsSection({ icon, title, description, children }: SettingsSectionProps) {
  return (
    <Card className="glassmorphism p-6">
      <div className="flex items-center space-x-3 mb-4">
        {icon}
        <div>
          <h3 className="text-lg font-semibold">{title}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      {children}
    </Card>
  )
}
