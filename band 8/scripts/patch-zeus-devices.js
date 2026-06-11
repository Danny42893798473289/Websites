#!/usr/bin/env node
const fs = require("node:fs")
const path = require("node:path")
const os = require("node:os")

const DEVICE_CACHE = path.join(os.homedir(), ".zepp", ".zeus_devices")
const MI_BAND_SOURCES = [260, 261, 262, 263, 264, 265, 266]

function createMiBandDevice(deviceSource) {
  return {
    settingName: "meta",
    deviceSource,
    productName: "Xiaomi Smart Band 7",
    code: "smart-band-7",
    value: {
      os: {
        name: "ZeppOS",
        version: "1.0",
        apiLevel: "1.0",
        apiLevelLimitMax: "1.0",
        apiLevelLimitMin: "1.0"
      },
      nfc: deviceSource % 2 === 1,
      chip: {
        type: "MCU",
        manufacturer: "DIALOG"
      },
      code: "smart-band-7",
      brand: "Xiaomi",
      model: "M2129B1",
      shape: "bar",
      voice: false,
      nfcExt: {},
      screen: {
        size: "192*490",
        rAngle: "25",
        previewSize: "152*384",
        iconSize: 96
      },
      series: "Band手环",
      bluetooth: "Xiaomi Smart Band 7",
      productId: 118,
      thumbnail: "",
      deviceType: 0,
      productLine: "青春",
      productName: "Xiaomi Smart Band 7",
      supportDiff: true,
      capabilities: [],
      productNameEN: "Xiaomi Smart Band 7",
      productVersion: 260,
      exemptBindCheck: true,
      pixelDensity: "m"
    },
    createTime: "2022-03-18 03:44:10",
    updateTime: "2026-06-01 00:00:00"
  }
}

function main() {
  if (!fs.existsSync(DEVICE_CACHE)) {
    console.error(`Device cache not found: ${DEVICE_CACHE}`)
    console.error("Run 'zeus build' once so Zeus can download its device list, then retry.")
    process.exit(1)
  }

  const cache = JSON.parse(fs.readFileSync(DEVICE_CACHE, "utf8"))
  const devices = Array.isArray(cache.devices) ? cache.devices : []
  const existingSources = new Set(devices.map((item) => item.deviceSource))
  const added = []

  for (const source of MI_BAND_SOURCES) {
    if (existingSources.has(source)) {
      continue
    }
    devices.push(createMiBandDevice(source))
    added.push(source)
  }

  if (added.length === 0) {
    console.log("Mi Band device sources already present in Zeus cache.")
    return
  }

  cache.devices = devices
  fs.mkdirSync(path.dirname(DEVICE_CACHE), { recursive: true })
  fs.writeFileSync(DEVICE_CACHE, JSON.stringify(cache))

  console.log(`Added Mi Band device sources to Zeus cache: ${added.join(", ")}`)
}

main()
