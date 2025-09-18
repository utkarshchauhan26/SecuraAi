"use client"

import type React from "react"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Upload, File, X, AlertCircle, CheckCircle, Folder, Archive } from "lucide-react"
import { useState, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"

interface UploadedFile {
  name: string
  size: number
  type: string
  status: "uploading" | "ready" | "error"
  error?: string
}

interface UploadZoneProps {
  onFilesUpload: (files: UploadedFile[]) => void
  uploadedFiles: UploadedFile[]
  maxFiles?: number
  maxFileSize?: number // in MB
}

const SUPPORTED_EXTENSIONS = [
  ".zip",
  ".tar",
  ".gz",
  ".7z",
  ".rar",
  ".js",
  ".ts",
  ".jsx",
  ".tsx",
  ".vue",
  ".svelte",
  ".py",
  ".java",
  ".cpp",
  ".c",
  ".cs",
  ".php",
  ".rb",
  ".go",
  ".rs",
  ".html",
  ".css",
  ".scss",
  ".sass",
  ".less",
  ".json",
  ".xml",
  ".yaml",
  ".yml",
  ".toml",
  ".md",
  ".txt",
  ".env",
]

export function UploadZone({ onFilesUpload, uploadedFiles, maxFiles = 10, maxFileSize = 100 }: UploadZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [errors, setErrors] = useState<string[]>([])

  const validateFile = (file: File): { valid: boolean; error?: string } => {
    // Check file size
    if (file.size > maxFileSize * 1024 * 1024) {
      return { valid: false, error: `File too large (max ${maxFileSize}MB)` }
    }

    // Check file extension
    const extension = "." + file.name.split(".").pop()?.toLowerCase()
    if (!SUPPORTED_EXTENSIONS.includes(extension)) {
      return { valid: false, error: "Unsupported file type" }
    }

    return { valid: true }
  }

  const processFiles = useCallback(
    (files: FileList | File[]) => {
      const fileArray = Array.from(files)
      const newErrors: string[] = []
      const validFiles: UploadedFile[] = []

      // Check total file limit
      if (uploadedFiles.length + fileArray.length > maxFiles) {
        newErrors.push(`Maximum ${maxFiles} files allowed`)
        setErrors(newErrors)
        return
      }

      fileArray.forEach((file) => {
        const validation = validateFile(file)

        if (validation.valid) {
          validFiles.push({
            name: file.name,
            size: file.size,
            type: file.type || "application/octet-stream",
            status: "ready",
          })
        } else {
          newErrors.push(`${file.name}: ${validation.error}`)
        }
      })

      setErrors(newErrors)

      if (validFiles.length > 0) {
        onFilesUpload([...uploadedFiles, ...validFiles])
      }
    },
    [uploadedFiles, onFilesUpload, maxFiles, maxFileSize],
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragOver(false)
      processFiles(e.dataTransfer.files)
    },
    [processFiles],
  )

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        processFiles(e.target.files)
      }
    },
    [processFiles],
  )

  const removeFile = useCallback(
    (index: number) => {
      const newFiles = uploadedFiles.filter((_, i) => i !== index)
      onFilesUpload(newFiles)
    },
    [uploadedFiles, onFilesUpload],
  )

  const clearAllFiles = useCallback(() => {
    onFilesUpload([])
    setErrors([])
  }, [onFilesUpload])

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split(".").pop()?.toLowerCase()

    if (["zip", "tar", "gz", "7z", "rar"].includes(extension || "")) {
      return <Archive className="w-5 h-5 text-accent" />
    }
    if (["js", "ts", "jsx", "tsx", "py", "java", "cpp", "c", "cs", "php", "rb", "go", "rs"].includes(extension || "")) {
      return <File className="w-5 h-5 text-primary" />
    }
    return <Folder className="w-5 h-5 text-muted-foreground" />
  }

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <motion.div
        animate={{
          scale: isDragOver ? 1.02 : 1,
          borderColor: isDragOver ? "oklch(0.488 0.243 264.376)" : "oklch(0.25 0.02 240 / 0.3)",
        }}
        transition={{ duration: 0.2 }}
      >
        <Card
          className={`glassmorphism border-2 border-dashed transition-all duration-200 ${
            isDragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <label className="flex flex-col items-center justify-center p-8 cursor-pointer">
            <input
              type="file"
              className="hidden"
              accept={SUPPORTED_EXTENSIONS.join(",")}
              onChange={handleFileSelect}
              multiple
            />

            <motion.div
              animate={{
                y: isDragOver ? -5 : 0,
                scale: isDragOver ? 1.1 : 1,
              }}
              transition={{ duration: 0.2 }}
              className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4"
            >
              <Upload
                className={`w-8 h-8 transition-colors ${isDragOver ? "text-primary" : "text-muted-foreground"}`}
              />
            </motion.div>

            <h3 className="text-lg font-semibold mb-2">
              {isDragOver ? "Drop your files here" : "Upload your project"}
            </h3>

            <p className="text-muted-foreground text-center text-sm mb-4">
              Drag and drop your code files or repository archives
              <br />
              <span className="text-xs">
                Supports source code, archives, and config files • Max {maxFileSize}MB per file • Up to {maxFiles} files
              </span>
            </p>

            <div className="flex flex-wrap gap-1 justify-center">
              {SUPPORTED_EXTENSIONS.slice(0, 8).map((ext) => (
                <Badge key={ext} variant="secondary" className="text-xs bg-muted/50">
                  {ext}
                </Badge>
              ))}
              <Badge variant="secondary" className="text-xs bg-muted/50">
                +{SUPPORTED_EXTENSIONS.length - 8} more
              </Badge>
            </div>
          </label>
        </Card>
      </motion.div>

      {/* Error Messages */}
      <AnimatePresence>
        {errors.length > 0 && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <Card className="glassmorphism border-destructive/20 bg-destructive/5 p-4">
              <div className="flex items-start space-x-2">
                <AlertCircle className="w-5 h-5 text-destructive mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-destructive mb-1">Upload Errors</h4>
                  <ul className="text-xs text-destructive/80 space-y-1">
                    {errors.map((error, index) => (
                      <li key={index}>• {error}</li>
                    ))}
                  </ul>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setErrors([])}
                  className="text-destructive hover:text-destructive"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Uploaded Files List */}
      <AnimatePresence>
        {uploadedFiles.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <Card className="glassmorphism">
              <div className="p-4 border-b border-border">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">
                    Uploaded Files ({uploadedFiles.length}/{maxFiles})
                  </h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearAllFiles}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    Clear All
                  </Button>
                </div>
              </div>

              <div className="divide-y divide-border max-h-60 overflow-y-auto">
                {uploadedFiles.map((file, index) => (
                  <motion.div
                    key={`${file.name}-${index}`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: index * 0.05 }}
                    className="p-3 hover:bg-muted/20 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                          {getFileIcon(file.name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{file.name}</p>
                          <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                            <span>{formatFileSize(file.size)}</span>
                            <span>•</span>
                            <div className="flex items-center space-x-1">
                              {file.status === "ready" && (
                                <>
                                  <CheckCircle className="w-3 h-3 text-green-400" />
                                  <span className="text-green-400">Ready</span>
                                </>
                              )}
                              {file.status === "error" && (
                                <>
                                  <AlertCircle className="w-3 h-3 text-destructive" />
                                  <span className="text-destructive">{file.error}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(index)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
