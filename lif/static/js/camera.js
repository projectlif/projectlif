// Camera functionality for LipLearn

class CameraManager {
  constructor() {
    this.video = document.getElementById("cameraFeed")
    this.canvas = document.getElementById("cameraCanvas")
    this.ctx = this.canvas ? this.canvas.getContext("2d") : null
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
    this.renderReq = null

    this.sourceWidth = 0
    this.sourceHeight = 0
    this.lastMouthPoints = null

    // ✅ countdown state
    this.countdownInterval = null
    this.isCountdownActive = false

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
    if (stopBtn) stopBtn.addEventListener("click", () => this.stopRecording(true))
    if (syllableModeBtn) syllableModeBtn.addEventListener("change", () => this.switchMode("syllable"))
    if (wordModeBtn) wordModeBtn.addEventListener("change", () => this.switchMode("word"))
    if (categorySelect) {
      categorySelect.addEventListener("change", (e) => {
        this.currentCategory = e.target.value
        this.updateUI()
      })
    }
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
          this.sourceWidth = this.video.videoWidth || 0
          this.sourceHeight = this.video.videoHeight || 0

          if (this.canvas) {
            this.canvas.width = this.sourceWidth
            this.canvas.height = this.sourceHeight
          }

          this.updateCameraStatus("Camera ready - Position your face in frame")
          this.enableRecordingButton()
          this.startSessionTimer()

          this.startLandmarksLoop()
          this.startRenderLoop()
        })
      }

      window.LipLearn?.showNotification?.("Camera initialized successfully!", "success")
    } catch (error) {
      this.updateCameraStatus("Failed to access camera")
      window.LipLearn?.showNotification?.("Failed to access camera. Please check permissions.", "danger")
    }
  }

  startRenderLoop() {
    const draw = () => {
      if (!this.ctx || !this.video) {
        this.renderReq = requestAnimationFrame(draw)
        return
      }

      // Draw mirrored video
      this.ctx.save()
      this.ctx.scale(-1, 1)
      this.ctx.drawImage(this.video, -this.canvas.width, 0, this.canvas.width, this.canvas.height)
      this.ctx.restore()

      // Draw landmarks (also mirrored)
      if (this.lastMouthPoints && this.lastMouthPoints.length) {
        this.ctx.save()
        this.ctx.fillStyle = "rgba(0, 255, 0, 0.95)"
        const r = 3
        for (const pt of this.lastMouthPoints) {
          this.ctx.beginPath()
          this.ctx.arc(this.canvas.width - pt.x, pt.y, r, 0, Math.PI * 2)
          this.ctx.closePath()
          this.ctx.fill()
        }
        this.ctx.restore()
      }

      this.renderReq = requestAnimationFrame(draw)
    }
    if (!this.renderReq) this.renderReq = requestAnimationFrame(draw)
  }

  stopRenderLoop() {
    if (this.renderReq) {
      cancelAnimationFrame(this.renderReq)
      this.renderReq = null
    }
  }

  startLandmarksLoop() {
    if (this.landmarksInterval) return
    this.landmarksInterval = setInterval(() => this.requestLandmarks(), 200)
  }

  stopLandmarksLoop() {
    if (this.landmarksInterval) {
      clearInterval(this.landmarksInterval)
      this.landmarksInterval = null
    }
  }

  async requestLandmarks() {
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

      if (data.success && data.landmarks?.mouth_points) {
        this.lastMouthPoints = data.landmarks.mouth_points
      } else {
        this.lastMouthPoints = null
      }
    } catch {
      // ignore transient errors
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
      estimatedTime.textContent = "~30 seconds"
      currentModeEl.textContent = "Syllables"
    } else {
      syllableCategory.style.display = "none"
      wordCategory.style.display = "block"
      frameCount.textContent = "44"
      estimatedTime.textContent = "~2 minutes"
      currentModeEl.textContent = "Words"
    }

    this.updateClockNumbers()
  }

  updateClockNumbers() {
    const clockNumbers = document.querySelectorAll(".clock-number")
    if (this.targetFrames === 22) {
      const numbers = ["22", "18", "14", "10", "6", "2"]
      clockNumbers.forEach((el, i) => { el.textContent = numbers[i] })
    } else {
      const numbers = ["44", "36", "28", "20", "12", "4"]
      clockNumbers.forEach((el, i) => { el.textContent = numbers[i] })
    }
  }

  updateCameraStatus(status) {
    const statusEl = document.getElementById("cameraStatus")
    if (statusEl) statusEl.textContent = status
  }

  enableRecordingButton() {
    const startBtn = document.getElementById("startRecording")
    if (startBtn) startBtn.disabled = false
  }

  // ✅ Countdown before recording
  async startRecording() {
    if (this.isRecording || this.isCountdownActive) return

    const startBtn = document.getElementById("startRecording")
    const stopBtn = document.getElementById("stopRecording")

    if (startBtn) startBtn.style.display = "none"
    if (stopBtn) {
      stopBtn.style.display = "inline-block"
      stopBtn.disabled = false
    }

    this.updateCameraStatus("Get ready...")
    this.startCountdownAndRecord()
  }

  async startCountdownAndRecord() {
    const container = document.querySelector(".camera-feed-container")
    if (!container) return

    const countdownEl = document.createElement("div")
    countdownEl.id = "countdownOverlay"
    Object.assign(countdownEl.style, {
      position: "absolute",
      inset: "0",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: "4rem",
      fontWeight: "bold",
      color: "#fff",
      background: "rgba(0,0,0,0.6)",
      zIndex: "50"
    })
    container.appendChild(countdownEl)

    let count = 3
    this.isCountdownActive = true
    countdownEl.textContent = count
    this.playBeep()

    this.countdownInterval = setInterval(() => {
      if (!this.isCountdownActive) {
        clearInterval(this.countdownInterval)
        if (countdownEl) countdownEl.remove()
        return
      }

      count--
      if (count > 0) {
        countdownEl.textContent = count
        this.playBeep()
      } else {
        clearInterval(this.countdownInterval)
        this.isCountdownActive = false
        countdownEl.remove()
        this.startRecordingNow()
        this.playBeep(true)
      }
    }, 1000)
  }

  playBeep(final = false) {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const oscillator = ctx.createOscillator()
    const gain = ctx.createGain()

    oscillator.type = "sine"
    oscillator.frequency.value = final ? 880 : 440
    gain.gain.value = 0.2

    oscillator.connect(gain)
    gain.connect(ctx.destination)

    oscillator.start()
    oscillator.stop(ctx.currentTime + 0.2)
  }

  async startRecordingNow() {
    this.isRecording = true
    const cancelMsg = document.getElementById("cancelMessage")
    if (cancelMsg) cancelMsg.style.display = "none"

    this.recordingFrames = []
    this.recordingStartTime = Date.now()

    this.updateRecordingControls(true)
    this.showRecordingProgress()
    this.startRecordingTimer()

    const indicator = document.getElementById("recordingIndicator")
    if (indicator) indicator.style.display = "flex"

    this.updateCameraStatus("Lip Reading in progress...")

    this.frameInterval = setInterval(() => { this.captureFrame() }, 33)
    window.LipLearn?.showNotification?.("Recording started!", "info")
  }

  captureFrame() {
    if (!this.isRecording || !this.canvas) return

    this.canvas.toBlob(
      (blob) => {
        if (blob && this.isRecording) {
          this.recordingFrames.push(blob)
          this.updateRecordingProgress()
          if (this.recordingFrames.length >= this.targetFrames) this.stopRecording()
        }
      },
      "image/jpeg",
      0.8
    )
  }

  stopRecording(userCancelled = false) {
    // ✅ Cancel countdown first
    if (this.isCountdownActive) {
      this.isCountdownActive = false
      clearInterval(this.countdownInterval)
      this.countdownInterval = null
      const countdownEl = document.getElementById("countdownOverlay")
      if (countdownEl) countdownEl.remove()
    }

    if (!this.isRecording && !userCancelled) return
    this.isRecording = false

    if (this.frameInterval) {
      clearInterval(this.frameInterval)
      this.frameInterval = null
    }

    this.updateRecordingControls(false)
    this.hideRecordingProgress()
    this.stopRecordingTimer()

    const indicator = document.getElementById("recordingIndicator")
    if (indicator) indicator.style.display = "none"

    const cancelMsg = document.getElementById("cancelMessage")
    if (userCancelled && cancelMsg) {
      cancelMsg.style.display = "block"
      cancelMsg.textContent = "Lip reading cancelled"
      setTimeout(() => { cancelMsg.style.display = "none" }, 1500)
    }

    if (userCancelled) {
      this.updateCameraStatus("Lip reading cancelled – Ready to try again")

      const startBtn = document.getElementById("startRecording")
      if (startBtn) {
        startBtn.disabled = false
        startBtn.style.display = "inline-block"
      }
      const stopBtn = document.getElementById("stopRecording")
      if (stopBtn) stopBtn.style.display = "none"
      return
    }

    this.updateCameraStatus("Analyzing your lip movements…")

    const resultsContainer = document.getElementById("predictionResults")
    if (resultsContainer) resultsContainer.innerHTML = "" // ✅ clear predictions

    if (this.recordingFrames.length > 0) {
      this.processRecording()
    } else {
      window.LipLearn?.showNotification?.("No frames captured. Please try again.", "warning")
      this.updateCameraStatus("Camera ready - Position your face in frame")
    }
  }

  async processRecording() {
    const startBtn = document.getElementById("startRecording")
    try {
      const formData = new FormData()
      this.recordingFrames.forEach((blob, index) => {
        formData.append("frames", blob, `frame_${index}.jpg`)
      })
      formData.append("mode", this.currentMode)
      formData.append("category", this.currentCategory)
      formData.append("frame_count", this.recordingFrames.length.toString())

      let endpoint = "/api/predict/frames"
      if (this.currentMode === "syllable") endpoint = `/api/predict/syllable/${this.currentCategory}`
      else endpoint = "/api/predict/words"

      const response = await fetch(endpoint, { method: "POST", body: formData })
      if (response.ok) {
        const data = await response.json()
        this.displayPredictionResults(data)
        this.updateSessionStats(data)
        this.updateCameraStatus("Prediction complete - Ready for next recording")
      } else {
        throw new Error(`Server error: ${response.status}`)
      }
    } catch (error) {
      window.LipLearn?.showNotification?.("Error processing recording. Please try again.", "danger")
      this.updateCameraStatus("Error occurred - Ready to try again")
    } finally {
      if (startBtn) startBtn.disabled = false
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
              <div>
                <span class="prediction-word text-light">${prediction.word.toUpperCase()}&nbsp;</span>
                <span class="prediction-confidence text-light">${Math.round(prediction.confidence * 100)}%</span>
              </div>
            </div>
            <div class="prediction-rank text-light">Rank ${index + 1}</div>
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
            <div class="prediction-accuracy text-light">${Math.round(data.accuracy * 100)}% Accuracy</div>
          </div>
          <div class="prediction-category text-light">Category: ${this.currentCategory.toUpperCase()}</div>
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
        startBtn.disabled = true
      }
    }
  }

  showRecordingProgress() {
    const progressContainer = document.getElementById("recordingProgress")
    if (progressContainer) progressContainer.style.display = "block"
  }

  hideRecordingProgress() {
    const progressContainer = document.getElementById("recordingProgress")
    if (progressContainer) progressContainer.style.display = "none"
  }

  updateRecordingProgress() {
    const progressBar = document.getElementById("frameProgressBar")
    const progressText = document.getElementById("frameProgressText")

    if (progressBar && progressText) {
      const progress = (this.recordingFrames.length / this.targetFrames) * 100
      progressBar.style.width = `${progress}%`

      const elapsed = ((Date.now() - this.recordingStartTime) / 1000).toFixed(1)
      progressText.textContent = `Analyzing... ${elapsed}s`
    }
  }

  startRecordingTimer() {
    const clockHand = document.getElementById("clockHand")
    const timerText = document.getElementById("timerText")
    const timerStatus = document.getElementById("timerStatus")

    if (clockHand) clockHand.style.animation = `rotate-hand ${this.targetFrames / 30}s linear`
    if (timerStatus) timerStatus.textContent = "Recording in progress..."

    let start = Date.now()
    this.timerInterval = setInterval(() => {
      const elapsed = ((Date.now() - start) / 1000).toFixed(1)
      if (timerText) timerText.textContent = `${elapsed}s`
    }, 100)
  }

  stopRecordingTimer() {
    const clockHand = document.getElementById("clockHand")
    const timerText = document.getElementById("timerText")
    const timerStatus = document.getElementById("timerStatus")

    if (this.timerInterval) {
      clearInterval(this.timerInterval)
      this.timerInterval = null
    }

    if (clockHand) clockHand.style.animation = ""
    if (timerText) timerText.textContent = "Complete"
    if (timerStatus) timerStatus.textContent = "Processing results..."

    setTimeout(() => {
      if (timerText) timerText.textContent = "Ready"
      if (timerStatus) timerStatus.textContent = "Click Start Recording to begin"
    }, 3000)
  }

  updateSessionStats(data) {
    this.sessionStats.totalPredictions++
    if (data.accuracy) this.sessionStats.accuracySum += data.accuracy
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
    if (totalPredictionsEl) totalPredictionsEl.textContent = this.sessionStats.totalPredictions
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
        if (sessionTimeEl) sessionTimeEl.textContent = window.LipLearn.formatTime(elapsed)
      }
    }, 1000)
  }

  updateUI() {
    const currentModeEl = document.getElementById("currentMode")
    if (currentModeEl) currentModeEl.textContent = this.currentMode === "syllable" ? "Syllables" : "Words"
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new CameraManager()
})
