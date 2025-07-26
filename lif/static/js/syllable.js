class SyllableLearning {
    constructor(syllableData) {
        this.syllableData = syllableData
        this.practiceStream = null
        this.isPracticing = false
        this.practiceResults = []
        this.analysisInterval = null
        
        this.initializeEventListeners()
        this.setupInfiniteGif()
    }

    initializeEventListeners() {
        const startPracticeBtn = document.getElementById("startPractice")
        const stopPracticeBtn = document.getElementById("stopPractice")

        if (startPracticeBtn) {
            startPracticeBtn.addEventListener("click", () => this.startPractice())
        }

        if (stopPracticeBtn) {
            stopPracticeBtn.addEventListener("click", () => this.stopPractice())
        }
    }

    setupInfiniteGif() {
        const gifImg = document.querySelector('.gif-demo')
        if (gifImg) {
            // Force GIF to loop infinitely
            const restartGif = () => {
                const currentSrc = gifImg.src.split('?')[0]
                const timestamp = new Date().getTime()
                gifImg.src = `${currentSrc}?t=${timestamp}`
            }
            
            // Restart GIF every 3 seconds (adjust based on your GIF duration)
            setInterval(restartGif, 3000)
        }
    }

    async startPractice() {
        try {
            // Request camera access - use main camera
            this.practiceStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    facingMode: "user"
                },
                audio: false
            })

            const practiceCamera = document.getElementById("practiceCamera")
            const placeholder = document.getElementById("cameraPlaceholder")
            const indicator = document.getElementById("recordingIndicator")

            if (practiceCamera && placeholder) {
                practiceCamera.srcObject = this.practiceStream
                
                practiceCamera.onloadedmetadata = () => {
                    practiceCamera.play()
                    placeholder.style.display = "none"
                    practiceCamera.style.display = "block"
                    
                    if (indicator) {
                        indicator.style.display = "block"
                    }
                }
            }

            this.updatePracticeControls(true)
            this.startRealTimeAnalysis()

            window.LipLearn.showNotification(
                `Practice started! Try saying "${this.syllableData.syllable.toUpperCase()}"`, 
                "success"
            )

        } catch (error) {
            console.error("Error starting practice:", error)
            window.LipLearn.showNotification(
                "Failed to access camera. Please check permissions.", 
                "danger"
            )
        }
    }

    stopPractice() {
        if (this.practiceStream) {
            this.practiceStream.getTracks().forEach(track => track.stop())
            this.practiceStream = null
        }

        const practiceCamera = document.getElementById("practiceCamera")
        const placeholder = document.getElementById("cameraPlaceholder")
        const indicator = document.getElementById("recordingIndicator")

        if (practiceCamera && placeholder) {
            practiceCamera.style.display = "none"
            placeholder.style.display = "flex"
            practiceCamera.srcObject = null
        }

        if (indicator) {
            indicator.style.display = "none"
        }

        this.updatePracticeControls(false)
        this.stopRealTimeAnalysis()
        this.showPracticeResults()

        window.LipLearn.showNotification("Practice session ended", "info")
    }

    updatePracticeControls(isPracticing) {
        const startBtn = document.getElementById("startPractice")
        const stopBtn = document.getElementById("stopPractice")

        if (startBtn && stopBtn) {
            if (isPracticing) {
                startBtn.style.display = "none"
                stopBtn.style.display = "inline-block"
            } else {
                startBtn.style.display = "inline-block"
                stopBtn.style.display = "none"
            }
        }

        this.isPracticing = isPracticing
    }

    startRealTimeAnalysis() {
        // Create canvas for capturing frames
        const canvas = document.getElementById("practiceCanvas") || this.createCanvas()
        
        // Analyze every 2 seconds
        this.analysisInterval = setInterval(() => {
            if (this.isPracticing) {
                this.captureAndAnalyze(canvas)
            }
        }, 2000)
    }

    createCanvas() {
        const canvas = document.createElement('canvas')
        canvas.id = 'practiceCanvas'
        canvas.style.display = 'none'
        document.body.appendChild(canvas)
        return canvas
    }

    stopRealTimeAnalysis() {
        if (this.analysisInterval) {
            clearInterval(this.analysisInterval)
            this.analysisInterval = null
        }
    }

    async captureAndAnalyze(canvas) {
        try {
            const video = document.getElementById("practiceCamera")
            const ctx = canvas.getContext("2d")

            if (video && ctx && video.videoWidth > 0) {
                // Set canvas size to match video
                canvas.width = video.videoWidth
                canvas.height = video.videoHeight
                
                // Draw current video frame to canvas
                ctx.drawImage(video, 0, 0)

                // Convert canvas to blob
                canvas.toBlob(async (blob) => {
                    if (blob) {
                        await this.sendFrameForAnalysis(blob)
                    }
                }, 'image/jpeg', 0.8)
            }
        } catch (error) {
            console.error("Error capturing frame:", error)
        }
    }

    async sendFrameForAnalysis(blob) {
        try {
            const formData = new FormData()
            formData.append('image', blob, 'frame.jpg')

            const response = await fetch(`/api/predict/syllable/${this.syllableData.syllable}`, {
                method: 'POST',
                body: formData
            })

            if (response.ok) {
                const data = await response.json()
                this.handleAnalysisResult(data)
            }
        } catch (error) {
            console.error("Error sending frame for analysis:", error)
        }
    }

    handleAnalysisResult(data) {
        if (data.detected) {
            // Store result
            this.practiceResults.push({
                timestamp: Date.now(),
                accuracy: data.accuracy,
                correct: data.is_correct,
                predicted: data.predicted_syllable,
                target: data.target_syllable,
                confidence: data.target_confidence
            })

            // Show real-time feedback
            const message = data.is_correct 
                ? `✓ Correct! ${Math.round(data.accuracy * 100)}%`
                : `✗ You said "${data.predicted_syllable.toUpperCase()}" - try "${data.target_syllable.toUpperCase()}"`

            this.showRealTimeFeedback(message, data.is_correct)
        } else {
            this.showRealTimeFeedback("👤 Position your face in view", false)
        }
    }

    showRealTimeFeedback(message, isCorrect) {
        // Remove existing feedback
        const existingFeedback = document.querySelector('.practice-feedback-popup')
        if (existingFeedback) {
            existingFeedback.remove()
        }

        // Create new feedback element
        const feedbackEl = document.createElement("div")
        feedbackEl.className = `practice-feedback-popup ${isCorrect ? "success" : "warning"}`
        feedbackEl.textContent = message
        
        feedbackEl.style.cssText = `
            position: absolute;
            top: 10px;
            left: 50%;
            transform: translateX(-50%);
            background: ${isCorrect ? "var(--success-color)" : "var(--warning-color)"};
            color: white;
            padding: 0.5rem 1rem;
            border-radius: 20px;
            font-size: 0.9rem;
            z-index: 1000;
            animation: fadeInOut 3s ease-in-out;
            white-space: nowrap;
        `

        const practiceContainer = document.querySelector(".practice-camera-container")
        if (practiceContainer) {
            practiceContainer.style.position = "relative"
            practiceContainer.appendChild(feedbackEl)

            // Remove after animation
            setTimeout(() => {
                if (feedbackEl.parentNode) {
                    feedbackEl.remove()
                }
            }, 3000)
        }
    }

    showPracticeResults() {
        this.stopRealTimeAnalysis()

        const feedbackContainer = document.getElementById("practiceFeedback")
        const resultsContainer = document.getElementById("practiceResults")

        if (feedbackContainer && resultsContainer && this.practiceResults.length > 0) {
            const totalAttempts = this.practiceResults.length
            const correctAttempts = this.practiceResults.filter(r => r.correct).length
            const avgAccuracy = this.practiceResults.reduce((sum, r) => sum + r.accuracy, 0) / totalAttempts
            const avgConfidence = this.practiceResults.reduce((sum, r) => sum + r.confidence, 0) / totalAttempts

            resultsContainer.innerHTML = `
                <div class="results-grid">
                    <div class="result-stat">
                        <div class="result-value">${totalAttempts}</div>
                        <div class="result-label">Attempts</div>
                    </div>
                    <div class="result-stat">
                        <div class="result-value">${correctAttempts}</div>
                        <div class="result-label">Correct</div>
                    </div>
                    <div class="result-stat">
                        <div class="result-value">${Math.round(avgAccuracy * 100)}%</div>
                        <div class="result-label">Accuracy</div>
                    </div>
                    <div class="result-stat">
                        <div class="result-value">${Math.round(avgConfidence * 100)}%</div>
                        <div class="result-label">Confidence</div>
                    </div>
                </div>
                <div class="detailed-feedback mt-3">
                    <p class="text-light"><strong>Target:</strong> ${this.syllableData.syllable.toUpperCase()}</p>
                    <p class="text-light"><strong>Success Rate:</strong> ${Math.round((correctAttempts/totalAttempts)*100)}%</p>
                </div>
                <div class="practice-recommendation mt-3">
                    ${this.getPracticeRecommendation(avgAccuracy)}
                </div>
            `

            feedbackContainer.style.display = "block"

            // Mark as completed if good performance
            if (avgAccuracy > 0.75 && correctAttempts >= 3) {
                this.markSyllableCompleted()
            }
        } else if (this.practiceResults.length === 0) {
            resultsContainer.innerHTML = `
                <p class="text-muted text-center">No analysis results. Make sure your face is visible and try speaking the syllable clearly.</p>
            `
            feedbackContainer.style.display = "block"
        }

        // Reset for next session
        this.practiceResults = []
    }

    getPracticeRecommendation(accuracy) {
        if (accuracy > 0.9) {
            return '<p class="text-success"><i class="fas fa-star me-2"></i>Excellent! You\'ve mastered this syllable!</p>'
        } else if (accuracy > 0.8) {
            return '<p class="text-success"><i class="fas fa-thumbs-up me-2"></i>Great job! Keep practicing to perfect it.</p>'
        } else if (accuracy > 0.7) {
            return '<p class="text-warning"><i class="fas fa-lightbulb me-2"></i>Good progress! Focus on mouth shape and timing.</p>'
        } else {
            return '<p class="text-info"><i class="fas fa-redo me-2"></i>Keep practicing! Watch the demo again and try to match the mouth movements.</p>'
        }
    }

    markSyllableCompleted() {
        const progress = JSON.parse(localStorage.getItem("liplearn_progress") || '{"completed":[],"points":0}')
        
        if (!progress.completed.includes(this.syllableData.syllable)) {
            progress.completed.push(this.syllableData.syllable)
            progress.points += 100
            localStorage.setItem("liplearn_progress", JSON.stringify(progress))

            window.LipLearn.showNotification(
                `🎉 Congratulations! You've mastered "${this.syllableData.syllable.toUpperCase()}" and earned 100 points!`,
                "success"
            )
        }
    }
}

// Initialize when DOM loads
document.addEventListener("DOMContentLoaded", () => {
    const syllableData = window.syllableData
    if (typeof syllableData !== "undefined") {
        new SyllableLearning(syllableData)
    }
})

// Add required CSS
const style = document.createElement("style")
style.textContent = `
    @keyframes fadeInOut {
        0% { opacity: 0; transform: translateX(-50%) translateY(-10px); }
        20%, 80% { opacity: 1; transform: translateX(-50%) translateY(0); }
        100% { opacity: 0; transform: translateX(-50%) translateY(-10px); }
    }

    .practice-camera-container {
        position: relative;
        max-width: 400px;
        margin: 0 auto;
        aspect-ratio: 4/3;
        border-radius: 20px;
        background: var(--dark-bg);
        border: 2px solid var(--dark-border);
        overflow: hidden;
    }

    .practice-camera, .camera-placeholder {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        border-radius: 18px;
    }

    .practice-camera {
        object-fit: cover;
        z-index: 1;
    }

    .camera-placeholder {
        z-index: 2;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        background: rgba(0,0,0,0.4);
        transition: opacity 0.3s ease;
    }

    .camera-overlay {
        position: absolute;
        top: 10px;
        right: 10px;
        z-index: 10;
    }

    .recording-indicator {
        background: rgba(0, 0, 0, 0.7);
        padding: 0.5rem 1rem;
        border-radius: 25px;
        color: white;
        font-size: 0.9rem;
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    .gif-demo {
        width: 100%;
        height: 100%;
        object-fit: contain;
        border-radius: 20px;
    }

    .results-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 1rem;
        margin-bottom: 1rem;
    }

    .result-stat {
        text-align: center;
        padding: 1rem;
        background: rgba(99, 102, 241, 0.1);
        border-radius: 10px;
        border: 1px solid var(--primary-color);
    }

    .result-value {
        font-size: 1.5rem;
        font-weight: bold;
        color: var(--text-light);
        margin-bottom: 0.25rem;
    }

    .result-label {
        font-size: 0.8rem;
        color: var(--text-muted);
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }
`
document.head.appendChild(style)