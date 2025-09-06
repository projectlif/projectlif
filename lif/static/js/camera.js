// Camera functionality for LipLearn

class CameraManager {
  constructor() {
    this.video = document.getElementById("cameraFeed")
    this.canvas = document.getElementById("cameraCanvas")
    this.ctx = this.canvas ? this.canvas.getContext("2d") : null
    this.overlayCanvas = document.getElementById("landmarksCanvas")
    this.overlayCtx = this.overlayCanvas ? this.overlayCanvas.getContext("2d") : null
    this.stream = null
    this.isRecording = false
    this.recordingFrames = []
    this.currentMode = "syllable"
    this.currentCategory = "vowels"
    this.targetFrames = 22
    this.frameInterval = null
    this.recordingStartTime = null
    this.landmarksInterval = null
    this.timerInterval = null

    this.sessionStats = {
      totalPredictions: 0,
      accuracySum: 0,
      startTime: null,
      predictions: [],
    }

    this.initializeEventListeners()
    this.initializeCamera()
  }

  initializeEventListeners() {
    const startBtn = document.getElementById("startRecording")
    const stopBtn = document.getElementById("stopRecording")
    const syllableModeBtn = document.getElementById("syllableMode")
    const wordModeBtn = document.getElementById("wordMode")
    const categorySelect = document.getElementById("categorySelect")

    if (startBtn) startBtn.addEventListener("click", () => this.startRecording())
    if (stopBtn) stopBtn.addEventListener("click", () => this.stopRecording())
    if (syllableModeBtn) syllableModeBtn.addEventListener("change", () => this.switchMode("syllable"))
    if (wordModeBtn) wordModeBtn.addEventListener("change", () => this.switchMode("word"))
    if (categorySelect) {
      categorySelect.addEventListener("change", (e) => {
        this.currentCategory = e.target.value
        this.updateUI()
      })
    }

    window.addEventListener("resize", () => this.syncOverlayCanvasSize())
  }

  async initializeCamera() {
    try {
      this.updateCameraStatus("Requesting camera access...")

      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
        audio: false,
      })

      if (this.video) {
        this.video.srcObject = this.stream
        this.video.play()

        this.video.addEventListener("loadedmetadata", () => {
          if (this.canvas) {
            this.canvas.width = this.video.videoWidth
            this.canvas.height = this.video.videoHeight
          }
          this.syncOverlayCanvasSize()
          this.updateCameraStatus("Camera ready - Position your face in frame")
          this.enableRecordingButton()
          this.startSessionTimer()
          this.startLandmarksLoop()
        })
      }

      window.LipLearn?.showNotification?.("Camera initialized successfully!", "success")
    } catch (error) {
      console.error("Error accessing camera:", error)
      this.updateCameraStatus("Failed to access camera")
      window.LipLearn?.showNotification?.("Failed to access camera. Please check permissions.", "danger")
    }
  }

  syncOverlayCanvasSize() {
    if (!this.overlayCanvas || !this.video) return
    this.overlayCanvas.width = this.video.videoWidth || this.video.clientWidth || 0
    this.overlayCanvas.height = this.video.videoHeight || this.video.clientHeight || 0
    this.overlayCanvas.style.width = `${this.video.clientWidth}px`
    this.overlayCanvas.style.height = `${this.video.clientHeight}px`
  }

  startLandmarksLoop() {
    if (this.landmarksInterval) return
    this.landmarksInterval = setInterval(() => this.requestAndDrawLandmarks(), 200)
  }

  stopLandmarksLoop() {
    if (this.landmarksInterval) {
      clearInterval(this.landmarksInterval)
      this.landmarksInterval = null
    }
  }

  async requestAndDrawLandmarks() {
    try {
      if (!this.video || !this.canvas || !this.ctx) return

      this.ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height)

      const blob = await new Promise((resolve) => this.canvas.toBlob(resolve, "image/jpeg", 0.7))
      if (!blob) return

      const formData = new FormData()
      formData.append("frame", blob, "frame.jpg")

      const resp = await fetch("/api/detect/landmarks", { method: "POST", body: formData })
      if (!resp.ok) throw new Error(`Landmarks HTTP ${resp.status}`)
      const data = await resp.json()

      this.clearOverlay()

      // ✅ Draw only mouth bounding box
      if (data.success && data.landmarks?.mouth_box && this.overlayCtx) {
        const box = data.landmarks.mouth_box
        this.overlayCtx.save()
        this.overlayCtx.strokeStyle = "rgba(0, 255, 0, 0.95)"
        this.overlayCtx.lineWidth = 2
        this.overlayCtx.strokeRect(box.x, box.y, box.w, box.h)
        this.overlayCtx.restore()
      }
    } catch (e) {
      // Ignore transient errors
    }
  }

  clearOverlay() {
    if (this.overlayCtx && this.overlayCanvas) {
      this.overlayCtx.clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height)
    }
  }

  drawCircle(x, y, r) {
    this.overlayCtx.beginPath()
    this.overlayCtx.arc(x, y, r, 0, Math.PI * 2)
    this.overlayCtx.closePath()
    this.overlayCtx.fill()
  }

  clearOverlay() {
    if (this.overlayCtx && this.overlayCanvas) {
      this.overlayCtx.clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height)
    }
  }

  switchMode(mode) {
    this.currentMode = mode
    this.targetFrames = mode === "word" ? 44 : 22

    const syllableCategory = document.getElementById("syllableCategory")
    const wordCategory = document.getElementById("wordCategory")
    const frameCount = document.getElementById("frameCount")
    const estimatedTime = document.getElementById("estimatedTime")
    const currentModeEl = document.getElementById("currentMode")

    if (mode === "syllable") {
      syllableCategory.style.display = "block"
      wordCategory.style.display = "none"
      frameCount.textContent = "22"
      estimatedTime.textContent = "~1 second"
      currentModeEl.textContent = "Syllables"
    } else {
      syllableCategory.style.display = "none"
      wordCategory.style.display = "block"
      frameCount.textContent = "44"
      estimatedTime.textContent = "~2 seconds"
      currentModeEl.textContent = "Words"
    }

    this.updateClockNumbers()
  }

  updateClockNumbers() {
    const clockNumbers = document.querySelectorAll(".clock-number")
    if (this.targetFrames === 22) {
      const numbers = ["22", "18", "14", "10", "6", "2"]
      clockNumbers.forEach((el, i) => {
        el.textContent = numbers[i]
      })
    } else {
      const numbers = ["44", "36", "28", "20", "12", "4"]
      clockNumbers.forEach((el, i) => {
        el.textContent = numbers[i]
      })
    }
  }

  updateCameraStatus(status) {
    const statusEl = document.getElementById("cameraStatus")
    if (statusEl) {
      statusEl.textContent = status
    }
  }

  enableRecordingButton() {
    const startBtn = document.getElementById("startRecording")
    if (startBtn) {
      startBtn.disabled = false
    }
  }

  async startRecording() {
    if (this.isRecording) return

    this.isRecording = true
    this.recordingFrames = []
    this.recordingStartTime = Date.now()

    this.updateRecordingControls(true)
    this.showRecordingProgress()
    this.startRecordingTimer()

    const indicator = document.getElementById("recordingIndicator")
    if (indicator) {
      indicator.style.display = "flex"
    }

    this.updateCameraStatus("Recording in progress...")

    this.frameInterval = setInterval(() => {
      this.captureFrame()
    }, 33)

    window.LipLearn?.showNotification?.("Recording started!", "info")
  }

  captureFrame() {
    if (!this.isRecording || !this.video || !this.canvas) return

    this.ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height)

    this.canvas.toBlob(
      (blob) => {
        if (blob && this.isRecording) {
          this.recordingFrames.push(blob)
          this.updateRecordingProgress()

          if (this.recordingFrames.length >= this.targetFrames) {
            this.stopRecording()
          }
        }
      },
      "image/jpeg",
      0.8
    )
  }

  stopRecording() {
    if (!this.isRecording) return

    this.isRecording = false

    if (this.frameInterval) {
      clearInterval(this.frameInterval)
      this.frameInterval = null
    }

    this.updateRecordingControls(false)
    this.hideRecordingProgress()
    this.stopRecordingTimer()

    const indicator = document.getElementById("recordingIndicator")
    if (indicator) {
      indicator.style.display = "none"
    }

    this.updateCameraStatus("Processing frames...")

    if (this.recordingFrames.length > 0) {
      this.processRecording()
    } else {
      window.LipLearn?.showNotification?.("No frames captured. Please try again.", "warning")
      this.updateCameraStatus("Camera ready - Position your face in frame")
    }
  }

  async processRecording() {
    try {
      const formData = new FormData()

      this.recordingFrames.forEach((blob, index) => {
        formData.append("frames", blob, `frame_${index}.jpg`)
      })

      formData.append("mode", this.currentMode)
      formData.append("category", this.currentCategory)
      formData.append("frame_count", this.recordingFrames.length.toString())

      let endpoint = "/api/predict/frames"
      if (this.currentMode === "syllable") {
        endpoint = `/api/predict/syllable/${this.currentCategory}`
      } else {
        endpoint = "/api/predict/words"
      }

      const response = await fetch(endpoint, {
        method: "POST",
        body: formData,
      })

      if (response.ok) {
        const data = await response.json()
        this.displayPredictionResults(data)
        this.updateSessionStats(data)
        this.updateCameraStatus("Prediction complete - Ready for next recording")
      } else {
        throw new Error(`Server error: ${response.status}`)
      }
    } catch (error) {
      console.error("Error processing recording:", error)
      window.LipLearn?.showNotification?.("Error processing recording. Please try again.", "danger")
      this.updateCameraStatus("Error occurred - Ready to try again")
    }
  }

  displayPredictionResults(data) {
    const resultsContainer = document.getElementById("predictionResults")
    if (!resultsContainer) return

    resultsContainer.innerHTML = ""

    if (this.currentMode === "word") {
      if (data.predictions && data.predictions.length > 0) {
        data.predictions.forEach((prediction, index) => {
          const resultElement = document.createElement("div")
          resultElement.className = "prediction-item"
          resultElement.style.animationDelay = `${index * 0.1}s`
          resultElement.innerHTML = `
            <div class="d-flex justify-content-between align-items-center">
              <span class="prediction-word text-light">${prediction.word.toUpperCase()}</span>
              <span class="prediction-confidence text-light">${Math.round(prediction.confidence * 100)}%</span>
            </div>
            <div class="prediction-rank">Rank ${index + 1}</div>
          `
          resultsContainer.appendChild(resultElement)
        })
      }
    } else {
      if (data.predicted_syllable) {
        const resultElement = document.createElement("div")
        resultElement.className = "prediction-item primary-result"
        resultElement.innerHTML = `
          <div class="prediction-main">
            <div class="predicted-syllable text-light">${data.predicted_syllable.toUpperCase()}</div>
            <div class="prediction-accuracy  text-light">${Math.round(data.accuracy * 100)}% Accuracy</div>
          </div>
          <div class="prediction-category  text-light">Category: ${this.currentCategory.toUpperCase()}</div>
        `
        resultsContainer.appendChild(resultElement)
      }
    }
  }

  updateRecordingControls(isRecording) {
    const startBtn = document.getElementById("startRecording")
    const stopBtn = document.getElementById("stopRecording")

    if (startBtn && stopBtn) {
      if (isRecording) {
        startBtn.style.display = "none"
        stopBtn.style.display = "inline-block"
        stopBtn.disabled = false
      } else {
        startBtn.style.display = "inline-block"
        stopBtn.style.display = "none"
        startBtn.disabled = false
      }
    }
  }

  showRecordingProgress() {
    const progressContainer = document.getElementById("recordingProgress")
    if (progressContainer) {
      progressContainer.style.display = "block"
    }
  }

  hideRecordingProgress() {
    const progressContainer = document.getElementById("recordingProgress")
    if (progressContainer) {
      progressContainer.style.display = "none"
    }
  }

  updateRecordingProgress() {
    const progressBar = document.getElementById("frameProgressBar")
    const progressText = document.getElementById("frameProgressText")

    if (progressBar && progressText) {
      const progress = (this.recordingFrames.length / this.targetFrames) * 100
      progressBar.style.width = `${progress}%`
      progressText.textContent = `Collecting frames: ${this.recordingFrames.length}/${this.targetFrames}`
    }
  }

  startRecordingTimer() {
    const clockHand = document.getElementById("clockHand")
    const timerText = document.getElementById("timerText")
    const timerStatus = document.getElementById("timerStatus")

    if (clockHand) {
      clockHand.style.animation = `rotate-hand ${this.targetFrames / 30}s linear`
    }

    if (timerStatus) {
      timerStatus.textContent = "Recording in progress..."
    }

    let frameCount = 0
    this.timerInterval = setInterval(() => {
      frameCount++
      if (timerText) {
        timerText.textContent = `${frameCount}/${this.targetFrames}`
      }

      if (frameCount >= this.targetFrames) {
        this.stopRecordingTimer()
      }
    }, 33)
  }

  stopRecordingTimer() {
    const clockHand = document.getElementById("clockHand")
    const timerText = document.getElementById("timerText")
    const timerStatus = document.getElementById("timerStatus")

    if (this.timerInterval) {
      clearInterval(this.timerInterval)
      this.timerInterval = null
    }

    if (clockHand) {
      clockHand.style.animation = ""
    }

    if (timerText) {
      timerText.textContent = "Complete"
    }

    if (timerStatus) {
      timerStatus.textContent = "Processing results..."
    }

    setTimeout(() => {
      if (timerText) timerText.textContent = "Ready"
      if (timerStatus) timerStatus.textContent = "Click Start Recording to begin"
    }, 3000)
  }

  updateSessionStats(data) {
    this.sessionStats.totalPredictions++

    if (data.accuracy) {
      this.sessionStats.accuracySum += data.accuracy
    }

    this.sessionStats.predictions.push({
      mode: this.currentMode,
      category: this.currentCategory,
      result: data.predicted_syllable || data.predictions?.[0]?.word,
      accuracy: data.accuracy || data.predictions?.[0]?.confidence,
      timestamp: new Date(),
    })

    this.updateStatsDisplay()
  }

  updateStatsDisplay() {
    const totalPredictionsEl = document.getElementById("totalPredictions")
    const avgAccuracyEl = document.getElementById("avgAccuracy")

    if (totalPredictionsEl) {
      totalPredictionsEl.textContent = this.sessionStats.totalPredictions
    }

    if (avgAccuracyEl && this.sessionStats.totalPredictions > 0) {
      const avgAccuracy = (this.sessionStats.accuracySum / this.sessionStats.totalPredictions) * 100
      avgAccuracyEl.textContent = `${Math.round(avgAccuracy)}%`
    }
  }

  startSessionTimer() {
    this.sessionStats.startTime = Date.now()

    setInterval(() => {
      if (this.sessionStats.startTime) {
        const elapsed = Math.floor((Date.now() - this.sessionStats.startTime) / 1000)
        const sessionTimeEl = document.getElementById("sessionTime")
        if (sessionTimeEl) {
          sessionTimeEl.textContent = window.LipLearn.formatTime(elapsed)
        }
      }
    }, 1000)
  }

  updateUI() {
    const currentModeEl = document.getElementById("currentMode")
    if (currentModeEl) {
      currentModeEl.textContent = this.currentMode === "syllable" ? "Syllables" : "Words"
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new CameraManager()
})