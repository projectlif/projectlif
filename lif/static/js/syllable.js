// Simple GIF control functionality for syllable learning

class GifController {
  constructor() {
    this.gif = document.getElementById("syllableGif")
    this.playBtn = document.getElementById("playGifBtn")
    this.loopBtn = document.getElementById("loopGifBtn")
    this.status = document.getElementById("gifStatus")

    if (!this.gif) {
      console.error("GIF element not found")
      return
    }

    this.originalSrc = this.gif.src
    this.isLooping = false
    this.loopInterval = null

    this.initializeEventListeners()
    this.updateStatus("Ready to play")
  }

  initializeEventListeners() {
    if (this.playBtn) {
      this.playBtn.addEventListener("click", () => {
        this.playGif()
      })
    }

    if (this.loopBtn) {
      this.loopBtn.addEventListener("click", () => {
        this.toggleLoop()
      })
    }

    if (this.gif) {
      this.gif.addEventListener("click", () => {
        this.playGif()
      })
    }
  }

  playGif() {
    if (!this.gif) return

    // Force GIF to restart by adding timestamp
    const timestamp = new Date().getTime()
    this.gif.src = `${this.originalSrc}?t=${timestamp}`

    this.updateStatus("Playing GIF...")
    console.log("GIF restarted!")

    // Update button text
    if (this.playBtn) {
      this.playBtn.innerHTML = '<i class="fas fa-redo me-2"></i>Restart GIF'
    }
  }

  toggleLoop() {
    if (this.isLooping) {
      this.stopLoop()
    } else {
      this.startLoop()
    }
  }

  startLoop() {
    this.isLooping = true
    this.updateStatus("Looping GIF every 3 seconds...")

    // Start the GIF first
    this.playGif()

    // Set up loop interval
    this.loopInterval = setInterval(() => {
      this.playGif()
    }, 3000) // Loop every 3 seconds

    // Update button
    if (this.loopBtn) {
      this.loopBtn.innerHTML = '<i class="fas fa-stop me-2"></i>Stop Loop'
      this.loopBtn.classList.remove("btn-outline-primary")
      this.loopBtn.classList.add("btn-warning")
    }

    console.log("GIF looping started!")
  }

  stopLoop() {
    this.isLooping = false

    if (this.loopInterval) {
      clearInterval(this.loopInterval)
      this.loopInterval = null
    }

    this.updateStatus("Loop stopped")

    // Update button
    if (this.loopBtn) {
      this.loopBtn.innerHTML = '<i class="fas fa-redo me-2"></i>Loop GIF'
      this.loopBtn.classList.remove("btn-warning")
      this.loopBtn.classList.add("btn-outline-primary")
    }

    console.log("GIF looping stopped")
  }

  updateStatus(message) {
    if (this.status) {
      this.status.textContent = message
    }
  }
}

// Initialize when DOM loads
document.addEventListener("DOMContentLoaded", () => {
  console.log("GIF controller loading...")

  // Initialize GIF controller
  window.gifController = new GifController()
  console.log("GIF controller initialized")

  // Simple keyboard shortcuts
  document.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      if (window.gifController) {
        window.gifController.playGif()
      }
    } else if (e.key === "l" || e.key === "L") {
      e.preventDefault()
      if (window.gifController) {
        window.gifController.toggleLoop()
      }
    }
  })
})
