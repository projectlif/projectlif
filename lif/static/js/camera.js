// Camera functionality for LipLearn

class CameraManager {
  constructor() {
    this.video = document.getElementById("cameraFeed")
    this.canvas = document.getElementById("cameraCanvas")
    this.ctx = this.canvas ? this.canvas.getContext("2d") : null
    this.stream = null
    this.isRecording = false
    this.predictionInterval = null
    this.sessionStats = {
      totalPredictions: 0,
      confidenceSum: 0,
      startTime: null,
      syllableCounts: {},
    }

    this.initializeEventListeners()
  }

  initializeEventListeners() {
    const startBtn = document.getElementById("startCamera")
    const stopBtn = document.getElementById("stopCamera")

    if (startBtn) {
      startBtn.addEventListener("click", () => this.startCamera())
    }

    if (stopBtn) {
      stopBtn.addEventListener("click", () => this.stopCamera())
    }
  }

  async startCamera() {
    try {
      // Request camera permission
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user",
        },
        audio: false,
      })

      if (this.video) {
        this.video.srcObject = this.stream
        this.video.play()
      }

      // Update UI
      this.updateCameraControls(true)
      this.startPredictions()
      this.startSessionTimer()

      // Show recording indicator
      const indicator = document.getElementById("recordingIndicator")
      if (indicator) {
        indicator.style.display = "flex"
      }

      window.LipLearn.showNotification("Camera started successfully!", "success")
    } catch (error) {
      console.error("Error accessing camera:", error)
      window.LipLearn.showNotification("Failed to access camera. Please check permissions.", "danger")
    }
  }

  stopCamera() {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop())
      this.stream = null
    }

    if (this.video) {
      this.video.srcObject = null
    }

    this.stopPredictions()
    this.updateCameraControls(false)

    // Hide recording indicator
    const indicator = document.getElementById("recordingIndicator")
    if (indicator) {
      indicator.style.display = "none"
    }

    window.LipLearn.showNotification("Camera stopped", "info")
  }

  updateCameraControls(isActive) {
    const startBtn = document.getElementById("startCamera")
    const stopBtn = document.getElementById("stopCamera")

    if (startBtn && stopBtn) {
      if (isActive) {
        startBtn.style.display = "none"
        stopBtn.style.display = "inline-block"
      } else {
        startBtn.style.display = "inline-block"
        stopBtn.style.display = "none"
      }
    }

    this.isRecording = isActive
  }

  startPredictions() {
    // Start making predictions every 2 seconds
    this.predictionInterval = setInterval(() => {
      this.makePrediction()
    }, 2000)
  }

  stopPredictions() {
    if (this.predictionInterval) {
      clearInterval(this.predictionInterval)
      this.predictionInterval = null
    }
  }

  async makePrediction() {
    if (!this.isRecording) return

    try {
      // Capture frame from video
      if (this.video && this.canvas && this.ctx) {
        this.canvas.width = this.video.videoWidth
        this.canvas.height = this.video.videoHeight
        this.ctx.drawImage(this.video, 0, 0)

        // Convert to blob and send to server
        this.canvas.toBlob(
          async (blob) => {
            const formData = new FormData()
            formData.append("image", blob)

            const response = await fetch("/api/predict", {
              method: "POST",
              body: formData,
            })

            if (response.ok) {
              const data = await response.json()
              this.displayPredictions(data.predictions)
              this.updateSessionStats(data.predictions)
            }
          },
          "image/jpeg",
          0.8,
        )
      }
    } catch (error) {
      console.error("Error making prediction:", error)
    }
  }

  displayPredictions(predictions) {
    const predictionsList = document.getElementById("predictionsList")
    if (!predictionsList) return

    // Clear existing predictions
    predictionsList.innerHTML = ""

    // Add new predictions
    predictions.forEach((prediction, index) => {
      const predictionElement = document.createElement("div")
      predictionElement.className = "prediction-item"
      predictionElement.style.animationDelay = `${index * 0.1}s`
      predictionElement.innerHTML = `
                <span class="syllable">${prediction.syllable.toUpperCase()}</span>
                <span class="confidence">${Math.round(prediction.confidence * 100)}%</span>
            `
      predictionsList.appendChild(predictionElement)
    })
  }

  updateSessionStats(predictions) {
    if (predictions.length === 0) return

    this.sessionStats.totalPredictions++

    // Update confidence sum
    const avgConfidence = predictions.reduce((sum, p) => sum + p.confidence, 0) / predictions.length
    this.sessionStats.confidenceSum += avgConfidence

    // Update syllable counts
    const topPrediction = predictions[0]
    if (this.sessionStats.syllableCounts[topPrediction.syllable]) {
      this.sessionStats.syllableCounts[topPrediction.syllable]++
    } else {
      this.sessionStats.syllableCounts[topPrediction.syllable] = 1
    }

    // Update UI
    this.updateStatsDisplay()
  }

  updateStatsDisplay() {
    const totalPredictionsEl = document.getElementById("totalPredictions")
    const avgConfidenceEl = document.getElementById("avgConfidence")
    const topSyllableEl = document.getElementById("topSyllable")

    if (totalPredictionsEl) {
      totalPredictionsEl.textContent = this.sessionStats.totalPredictions
    }

    if (avgConfidenceEl && this.sessionStats.totalPredictions > 0) {
      const avgConfidence = (this.sessionStats.confidenceSum / this.sessionStats.totalPredictions) * 100
      avgConfidenceEl.textContent = `${Math.round(avgConfidence)}%`
    }

    if (topSyllableEl) {
      const topSyllable = Object.keys(this.sessionStats.syllableCounts).reduce(
        (a, b) => (this.sessionStats.syllableCounts[a] > this.sessionStats.syllableCounts[b] ? a : b),
        "-",
      )
      topSyllableEl.textContent = topSyllable.toUpperCase()
    }
  }

  startSessionTimer() {
    this.sessionStats.startTime = Date.now()

    setInterval(() => {
      if (this.sessionStats.startTime && this.isRecording) {
        const elapsed = Math.floor((Date.now() - this.sessionStats.startTime) / 1000)
        const sessionTimeEl = document.getElementById("sessionTime")
        if (sessionTimeEl) {
          sessionTimeEl.textContent = window.LipLearn.formatTime(elapsed)
        }
      }
    }, 1000)
  }
}

// Initialize camera manager when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  new CameraManager()
})
