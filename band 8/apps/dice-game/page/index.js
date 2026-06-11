const SCREEN_WIDTH = 192
const SCREEN_HEIGHT = 490
const DICE_VALUE_MIN = 1
const DICE_VALUE_MAX = 6

function randomDice() {
  return Math.floor(Math.random() * DICE_VALUE_MAX) + DICE_VALUE_MIN
}

Page({
  state: {
    value: 1,
    rolling: false,
    rolls: 0
  },

  updateDice() {
    hmUI.setProperty(this.valueLabel, hmUI.prop.MORE, {
      text: `${this.state.value}`
    })
    hmUI.setProperty(this.rollCountLabel, hmUI.prop.MORE, {
      text: `Rolls: ${this.state.rolls}`
    })
  },

  rollDice() {
    if (this.state.rolling) {
      return
    }
    this.state.rolling = true
    let frame = 0
    const animate = () => {
      this.state.value = randomDice()
      this.updateDice()
      frame += 1
      if (frame < 8) {
        setTimeout(animate, 55)
        return
      }
      this.state.rolling = false
      this.state.rolls += 1
      this.updateDice()
    }
    animate()
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

    hmUI.createWidget(hmUI.widget.TEXT, {
      x: 0,
      y: 42,
      w: SCREEN_WIDTH,
      h: 36,
      text: "Dice Roller",
      color: 0xffffff,
      text_size: 28,
      align_h: hmUI.align.CENTER_H,
      align_v: hmUI.align.CENTER_V
    })

    hmUI.createWidget(hmUI.widget.FILL_RECT, {
      x: 26,
      y: 114,
      w: 140,
      h: 140,
      radius: 16,
      color: 0x2d2d2d
    })

    this.valueLabel = hmUI.createWidget(hmUI.widget.TEXT, {
      x: 26,
      y: 130,
      w: 140,
      h: 110,
      text: "1",
      color: 0xffffff,
      text_size: 76,
      align_h: hmUI.align.CENTER_H,
      align_v: hmUI.align.CENTER_V
    })

    this.rollCountLabel = hmUI.createWidget(hmUI.widget.TEXT, {
      x: 0,
      y: 272,
      w: SCREEN_WIDTH,
      h: 28,
      text: "Rolls: 0",
      color: 0xa0a0a0,
      text_size: 22,
      align_h: hmUI.align.CENTER_H,
      align_v: hmUI.align.CENTER_V
    })

    hmUI.createWidget(hmUI.widget.FILL_RECT, {
      x: 22,
      y: 334,
      w: 148,
      h: 58,
      radius: 12,
      color: 0x1e90ff
    })

    hmUI.createWidget(hmUI.widget.TEXT, {
      x: 22,
      y: 350,
      w: 148,
      h: 28,
      text: "ROLL",
      color: 0xffffff,
      text_size: 24,
      align_h: hmUI.align.CENTER_H,
      align_v: hmUI.align.CENTER_V
    })

    hmUI.createWidget(hmUI.widget.TEXT, {
      x: 0,
      y: 414,
      w: SCREEN_WIDTH,
      h: 24,
      text: "Tap button or anywhere",
      color: 0x757575,
      text_size: 17,
      align_h: hmUI.align.CENTER_H,
      align_v: hmUI.align.CENTER_V
    })

    hmUI.createWidget(hmUI.widget.EMPTY_BTN, {
      x: 0,
      y: 0,
      w: SCREEN_WIDTH,
      h: SCREEN_HEIGHT,
      press_color: 0x202020,
      click_func: () => this.rollDice()
    })

    hmUI.createWidget(hmUI.widget.EMPTY_BTN, {
      x: 22,
      y: 334,
      w: 148,
      h: 58,
      press_color: 0x166fca,
      click_func: () => this.rollDice()
    })

    this.updateDice()
  }
})
