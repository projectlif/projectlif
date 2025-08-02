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

      this.updateCameraControls(true)
      this.startPredictions()
      this.startSessionTimer()

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
        if (this.video && this.canvas && this.ctx) {
            this.canvas.width = this.video.videoWidth
            this.canvas.height = this.video.videoHeight
            this.ctx.drawImage(this.video, 0, 0)

            this.canvas.toBlob(
                async (blob) => {
                    const formData = new FormData()
                    formData.append("image", blob, "frame.jpg")

                    const response = await fetch("/api/predict", {
                        method: "POST",
                        body: formData,
                    })

                    if (response.ok) {
                        const data = await response.json()
                        if (data.predictions && data.predictions.length > 0) {
                            this.displayPredictions(data.predictions)
                            this.updateSessionStats(data.predictions)
                        } else {
                            this.displayNoFaceMessage()
                        }
                    } else {
                        console.error('Prediction failed:', response.statusText)
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

displayNoFaceMessage() {
    const predictionsList = document.getElementById("predictionsList")
    if (!predictionsList) return

    predictionsList.innerHTML = `
        <div class="prediction-placeholder text-center text-muted py-4">
            <i class="fas fa-user-slash fa-2x mb-3"></i>
            <p>No face detected. Please position your face in front of the camera.</p>
        </div>
    `
}

  displayPredictions(predictions) {
    const predictionsList = document.getElementById("predictionsList")
    if (!predictionsList) return

    predictionsList.innerHTML = ""

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

    const avgConfidence = predictions.reduce((sum, p) => sum + p.confidence, 0) / predictions.length
    this.sessionStats.confidenceSum += avgConfidence

    const topPrediction = predictions[0]
    if (this.sessionStats.syllableCounts[topPrediction.syllable]) {
      this.sessionStats.syllableCounts[topPrediction.syllable]++
    } else {
      this.sessionStats.syllableCounts[topPrediction.syllable] = 1
    }

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

document.addEventListener("DOMContentLoaded", () => {
  new CameraManager()
})
