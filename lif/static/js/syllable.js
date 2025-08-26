// Fixed GIF control functionality for syllable learning

class GifController {
  constructor() {
    this.gif = document.getElementById("syllableGif")
    this.playBtn = document.getElementById("playGifBtn")
    this.loopBtn = document.getElementById("loopGifBtn")

    if (!this.gif) {
      console.error("GIF element not found")
      return
    }

    this.originalSrc = this.gif.src.split("?")[0] // Remove any existing query params
    this.isLooping = false
    this.isProcessing = false // Prevent overlapping operations
    this.loopInterval = null

    this.initializeEventListeners()
    this.updateButtons()
  }

  initializeEventListeners() {
    if (this.playBtn) {
      this.playBtn.addEventListener("click", (e) => {
        e.preventDefault()
        this.playOnce()
      })
    }

    if (this.loopBtn) {
      this.loopBtn.addEventListener("click", (e) => {
        e.preventDefault()
        this.toggleLoop()
      })
    }

    // Remove click handler from GIF to prevent conflicts
    if (this.gif) {
      this.gif.style.cursor = "default"
      this.gif.removeAttribute("title")
    }
  }

  playOnce() {
    if (this.isProcessing) {
      console.log("Already processing, ignoring click")
      return
    }

    this.isProcessing = true

    // If currently looping, stop it first
    if (this.isLooping) {
      this.stopLoop()
    }

    // Play GIF once by forcing reload
    const timestamp = new Date().getTime()
    this.gif.src = `${this.originalSrc}?play=${timestamp}`

    console.log("Playing GIF once")

    // Reset processing flag after a short delay
    setTimeout(() => {
      this.isProcessing = false
    }, 500)
  }

  toggleLoop() {
    if (this.isProcessing) {
      console.log("Already processing, ignoring click")
      return
    }

    if (this.isLooping) {
      this.stopLoop()
    } else {
      this.startLoop()
    }
  }

  startLoop() {
    if (this.isLooping) return

    this.isProcessing = true
    this.isLooping = true

    console.log("Starting GIF loop")

    // Start the GIF first
    this.playOnce()

    // Set up loop interval (restart every 3 seconds)
    this.loopInterval = setInterval(() => {
      if (this.isLooping) {
        const timestamp = new Date().getTime()
        this.gif.src = `${this.originalSrc}?loop=${timestamp}`
      }
    }, 3000)

    this.updateButtons()

    setTimeout(() => {
      this.isProcessing = false
    }, 500)
  }

  stopLoop() {
    if (!this.isLooping) return

    this.isProcessing = true
    this.isLooping = false

    if (this.loopInterval) {
      clearInterval(this.loopInterval)
      this.loopInterval = null
    }

    console.log("Stopping GIF loop")

    this.updateButtons()

    setTimeout(() => {
      this.isProcessing = false
    }, 500)
  }

  updateButtons() {
    if (this.loopBtn) {
      if (this.isLooping) {
        this.loopBtn.innerHTML = '<i class="fas fa-stop me-2"></i>Stop Loop'
        this.loopBtn.classList.remove("btn-outline-primary")
        this.loopBtn.classList.add("btn-warning")
      } else {
        this.loopBtn.innerHTML = '<i class="fas fa-redo me-2"></i>Loop'
        this.loopBtn.classList.remove("btn-warning")
        this.loopBtn.classList.add("btn-outline-primary")
      }
    }

    // Play button always stays the same
    if (this.playBtn) {
      this.playBtn.innerHTML = '<i class="fas fa-play me-2"></i>Play'
    }
  }

  // Public methods
  getCurrentState() {
    return {
      isLooping: this.isLooping,
      isProcessing: this.isProcessing,
    }
  }

  forceStop() {
    this.stopLoop()
  }
}

// Initialize when DOM loads
document.addEventListener("DOMContentLoaded", () => {
  console.log("GIF controller loading...")

  // Initialize GIF controller
  window.gifController = new GifController()
  console.log("GIF controller initialized")

  // Simplified keyboard shortcuts (no notification)
  document.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      if (window.gifController && !window.gifController.getCurrentState().isProcessing) {
        window.gifController.playOnce()
      }
    } else if (e.key === "l" || e.key === "L") {
      e.preventDefault()
      if (window.gifController && !window.gifController.getCurrentState().isProcessing) {
        window.gifController.toggleLoop()
      }
    }
  })

  // Show tips only once, after a longer delay, and only if no interaction yet
  let hasInteracted = false

  document.addEventListener("click", () => {
    hasInteracted = true
  })
})
