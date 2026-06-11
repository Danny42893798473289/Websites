#!/usr/bin/env node
const fs = require("node:fs")
const path = require("node:path")
const os = require("node:os")
const cp = require("node:child_process")

const workspaceRoot = path.resolve(__dirname, "..")
const appName = process.argv[2]

if (!appName) {
  console.error("Usage: node scripts/extract-device-bin.js <calculator|dice-game>")
  process.exit(1)
}

const appRoot = path.join(workspaceRoot, "apps", appName)
const appDistDir = path.join(appRoot, "dist")
const outputDir = path.join(workspaceRoot, "dist")
const outputFile = path.join(outputDir, `${appName}.bin`)

if (!fs.existsSync(appDistDir)) {
  console.error(`Build directory not found: ${appDistDir}`)
  console.error("Run zeus build in the app folder first.")
  process.exit(1)
}

const zabFile = fs
  .readdirSync(appDistDir)
  .filter((name) => name.endsWith(".zab"))
  .map((name) => path.join(appDistDir, name))
  .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0]

if (!zabFile) {
  console.error(`No .zab file found in ${appDistDir}`)
  process.exit(1)
}

const tempBase = fs.mkdtempSync(path.join(os.tmpdir(), `band8-${appName}-`))
const zabExtractDir = path.join(tempBase, "zab")
const zpkExtractDir = path.join(tempBase, "zpk")

fs.mkdirSync(zabExtractDir, { recursive: true })
fs.mkdirSync(zpkExtractDir, { recursive: true })

function expandArchive(archivePath, targetDir) {
  let archiveToExtract = archivePath
  let copiedArchive = null

  if (!archivePath.toLowerCase().endsWith(".zip")) {
    copiedArchive = path.join(
      path.dirname(archivePath),
      `${path.basename(archivePath)}.zip`
    )
    fs.copyFileSync(archivePath, copiedArchive)
    archiveToExtract = copiedArchive
  }

  try {
    cp.execFileSync(
      "powershell.exe",
      [
        "-NoProfile",
        "-Command",
        `Expand-Archive -LiteralPath ${JSON.stringify(archiveToExtract)} -DestinationPath ${JSON.stringify(targetDir)} -Force`
      ],
      { stdio: "pipe" }
    )
  } finally {
    if (copiedArchive && fs.existsSync(copiedArchive)) {
      fs.unlinkSync(copiedArchive)
    }
  }
}

function findFirstByExt(dir, ext) {
  const queue = [dir]
  while (queue.length > 0) {
    const current = queue.shift()
    const entries = fs.readdirSync(current, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name)
      if (entry.isDirectory()) {
        queue.push(fullPath)
        continue
      }
      if (entry.name.endsWith(ext)) {
        return fullPath
      }
    }
  }
  return null
}

try {
  expandArchive(zabFile, zabExtractDir)

  const zpkFile = findFirstByExt(zabExtractDir, ".zpk")
  if (!zpkFile) {
    throw new Error("No .zpk file found inside .zab")
  }

  expandArchive(zpkFile, zpkExtractDir)

  const deviceZip = findFirstByExt(zpkExtractDir, "device.zip")
  if (!deviceZip) {
    throw new Error("No device.zip found inside .zpk")
  }

  fs.mkdirSync(outputDir, { recursive: true })
  fs.copyFileSync(deviceZip, outputFile)

  console.log(`Extracted ${appName} package:`)
  console.log(outputFile)
} catch (error) {
  console.error(`Failed to extract ${appName}: ${error.message}`)
  process.exit(1)
} finally {
  fs.rmSync(tempBase, { recursive: true, force: true })
}
