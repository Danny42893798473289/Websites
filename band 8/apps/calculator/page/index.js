const SCREEN_WIDTH = 192
const SCREEN_HEIGHT = 490
const DISPLAY_X = 10
const DISPLAY_Y = 18
const DISPLAY_WIDTH = 172
const KEY_ROWS = [
  ["7", "8", "9", "C"],
  ["4", "5", "6", "/"],
  ["1", "2", "3", "*"],
  ["0", ".", "=", "-"],
  ["+", "+/-", "%", "AC"]
]

function formatNumber(value) {
  const text = `${value}`
  if (text.length <= 14) {
    return text
  }
  return Number(value).toExponential(6)
}

function calculate(a, b, op) {
  switch (op) {
    case "+":
      return a + b
    case "-":
      return a - b
    case "*":
      return a * b
    case "/":
      return b === 0 ? null : a / b
    default:
      return b
  }
}

Page({
  state: {
    buffer: "0",
    left: null,
    op: null,
    waitingForRight: false,
    preview: ""
  },

  updateDisplay() {
    hmUI.setProperty(this.outputLabel, hmUI.prop.MORE, {
      text: this.state.buffer
    })
    hmUI.setProperty(this.previewLabel, hmUI.prop.MORE, {
      text: this.state.preview
    })
  },

  setError(message) {
    this.state.buffer = message
    this.state.left = null
    this.state.op = null
    this.state.waitingForRight = false
    this.state.preview = ""
    this.updateDisplay()
  },

  inputDigit(char) {
    if (this.state.waitingForRight) {
      this.state.buffer = char === "." ? "0." : char
      this.state.waitingForRight = false
    } else if (char === ".") {
      if (!this.state.buffer.includes(".")) {
        this.state.buffer += "."
      }
    } else if (this.state.buffer === "0") {
      this.state.buffer = char
    } else {
      this.state.buffer += char
    }
    this.updateDisplay()
  },

  applyUnary(action) {
    const current = Number(this.state.buffer)
    if (Number.isNaN(current)) {
      this.setError("ERR")
      return
    }

    let nextValue = current
    if (action === "+/-") {
      nextValue = current * -1
    } else if (action === "%") {
      nextValue = current / 100
    }

    this.state.buffer = formatNumber(nextValue)
    this.updateDisplay()
  },

  clear(all) {
    this.state.buffer = "0"
    this.state.waitingForRight = false
    if (all) {
      this.state.left = null
      this.state.op = null
      this.state.preview = ""
    }
    this.updateDisplay()
  },

  setOperator(nextOp) {
    const current = Number(this.state.buffer)
    if (Number.isNaN(current)) {
      this.setError("ERR")
      return
    }

    if (this.state.left === null) {
      this.state.left = current
    } else if (!this.state.waitingForRight && this.state.op) {
      const result = calculate(this.state.left, current, this.state.op)
      if (result === null || !Number.isFinite(result)) {
        this.setError("DIV0")
        return
      }
      this.state.left = result
      this.state.buffer = formatNumber(result)
    }

    this.state.op = nextOp
    this.state.waitingForRight = true
    this.state.preview = `${formatNumber(this.state.left)} ${nextOp}`
    this.updateDisplay()
  },

  evaluate() {
    if (!this.state.op || this.state.left === null) {
      return
    }
    const right = Number(this.state.buffer)
    const result = calculate(this.state.left, right, this.state.op)
    if (result === null || !Number.isFinite(result)) {
      this.setError("DIV0")
      return
    }
    this.state.buffer = formatNumber(result)
    this.state.left = result
    this.state.preview = ""
    this.state.op = null
    this.state.waitingForRight = true
    this.updateDisplay()
  },

  handleKey(label) {
    if ((label >= "0" && label <= "9") || label === ".") {
      this.inputDigit(label)
      return
    }
    if (label === "C") {
      this.clear(false)
      return
    }
    if (label === "AC") {
      this.clear(true)
      return
    }
    if (label === "=") {
      this.evaluate()
      return
    }
    if (label === "+/-" || label === "%") {
      this.applyUnary(label)
      return
    }
    this.setOperator(label)
  },

  createKey(x, y, w, h, label) {
    hmUI.createWidget(hmUI.widget.FILL_RECT, {
      x,
      y,
      w,
      h,
      radius: 8,
      color: 0x2d2d2d
    })

    hmUI.createWidget(hmUI.widget.TEXT, {
      x,
      y: y + 10,
      w,
      h: 30,
      color: 0xffffff,
      text_size: 22,
      align_h: hmUI.align.CENTER_H,
      align_v: hmUI.align.CENTER_V,
      text: label
    })

    hmUI.createWidget(hmUI.widget.EMPTY_BTN, {
      x,
      y,
      w,
      h,
      press_color: 0x555555,
      click_func: () => this.handleKey(label)
    })
  },

  build() {
    hmUI.setStatusBarVisible(false)

    hmUI.createWidget(hmUI.widget.FILL_RECT, {
      x: 0,
      y: 0,
      w: SCREEN_WIDTH,
      h: SCREEN_HEIGHT,
      color: 0x000000
    })

    this.previewLabel = hmUI.createWidget(hmUI.widget.TEXT, {
      x: DISPLAY_X,
      y: DISPLAY_Y,
      w: DISPLAY_WIDTH,
      h: 28,
      text: "",
      color: 0x9a9a9a,
      text_size: 18,
      align_h: hmUI.align.RIGHT,
      align_v: hmUI.align.CENTER_V
    })

    this.outputLabel = hmUI.createWidget(hmUI.widget.TEXT, {
      x: DISPLAY_X,
      y: DISPLAY_Y + 26,
      w: DISPLAY_WIDTH,
      h: 46,
      text: this.state.buffer,
      color: 0xffffff,
      text_size: 34,
      align_h: hmUI.align.RIGHT,
      align_v: hmUI.align.CENTER_V
    })

    const keyWidth = 42
    const keyHeight = 52
    const gap = 6
    const startX = 6
    const startY = 110
    KEY_ROWS.forEach((row, rowIndex) => {
      row.forEach((label, colIndex) => {
        const x = startX + colIndex * (keyWidth + gap)
        const y = startY + rowIndex * (keyHeight + gap)
        this.createKey(x, y, keyWidth, keyHeight, label)
      })
    })

    this.updateDisplay()
  }
})
