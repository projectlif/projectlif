// Individual syllable learning page functionality

class SyllableLearning {
  constructor(syllableData) {
    this.syllableData = syllableData
    this.practiceCamera = null
    this.practiceStream = null
    this.isPracticing = false
    this.practiceResults = []

    this.initializeEventListeners()
    this.loadGifDemo()
  }

  initializeEventListeners() {
    // GIF demo controls
    const gifContainer = document.getElementById("pronunciationGif")
    const playBtn = document.getElementById("playGif")
    const pauseBtn = document.getElementById("pauseGif")
    const replayBtn = document.getElementById("replayGif")

    if (gifContainer) {
      gifContainer.addEventListener("click", () => this.playGifDemo())
    }

    if (playBtn) playBtn.addEventListener("click", () => this.playGifDemo())
    if (pauseBtn) pauseBtn.addEventListener("click", () => this.pauseGifDemo())
    if (replayBtn) replayBtn.addEventListener("click", () => this.replayGifDemo())

    // Practice controls
    const startPracticeBtn = document.getElementById("startPractice")
    const stopPracticeBtn = document.getElementById("stopPractice")

    if (startPracticeBtn) {
      startPracticeBtn.addEventListener("click", () => this.startPractice())
    }

    if (stopPracticeBtn) {
      stopPracticeBtn.addEventListener("click", () => this.stopPractice())
    }
  }

loadGifDemo() {
    const gifContainer = document.getElementById("pronunciationGif");
    if (gifContainer) {
        const img = document.createElement('img');
        img.src = this.syllableData.gif;
        img.alt = `Pronunciation demo for ${this.syllableData.syllable}`;
        img.className = 'img-fluid rounded';
        
        const restartGif = () => {
            const timestamp = new Date().getTime();
            img.src = `${this.syllableData.gif}?t=${timestamp}`;
        };
        
        // Initial load
        img.onload = () => {
            setTimeout(restartGif, 2500);
        };
        
        // Continuous restart
        setInterval(restartGif, 3000);
        
        gifContainer.innerHTML = `
            <div class="gif-loaded">
                <div class="gif-controls mt-3">
                    <button class="btn btn-primary me-2" id="replayGif">
                        <i class="fas fa-redo me-2"></i>Replay
                    </button>
                </div>
            </div>
        `;
        
        gifContainer.querySelector('.gif-loaded').insertBefore(img, gifContainer.querySelector('.gif-controls'));
        
        // Manual replay button
        document.getElementById("replayGif").onclick = restartGif;
    }
}

  playGifDemo() {
    const gifContainer = document.getElementById("pronunciationGif")
    const controls = document.querySelector(".gif-controls")

    if (gifContainer) {
      const overlay = gifContainer.querySelector(".gif-overlay")
      if (overlay) {
        overlay.style.display = "none"
      }
    }

    if (controls) {
      controls.style.display = "block"
    }

    // Simulate GIF playing
    window.LipLearn.showNotification(
      `Playing pronunciation demo for "${this.syllableData.syllable.toUpperCase()}"`,
      "info",
    )
  }

  pauseGifDemo() {
    window.LipLearn.showNotification("Demo paused", "info")
  }

  replayGifDemo() {
    this.playGifDemo()
    window.LipLearn.showNotification("Replaying demo", "info")
  }

async startPractice() {
    try {
        // Request camera access
        this.practiceStream = await navigator.mediaDevices.getUserMedia({
            video: {
                width: { ideal: 640 },
                height: { ideal: 480 },
                facingMode: "user",
            },
            audio: false,
        });

        const practiceCamera = document.getElementById("practiceCamera");
        const placeholder = document.getElementById("cameraPlaceholder");

        if (practiceCamera && placeholder) {
            practiceCamera.srcObject = this.practiceStream;
            practiceCamera.style.display = "block";
            placeholder.style.display = "none";
            
            // Wait for video to load before playing
            practiceCamera.onloadedmetadata = () => {
                practiceCamera.play();
            };
        }

        this.updatePracticeControls(true);
        this.startPracticeAnalysis();

        window.LipLearn.showNotification("Practice session started! Try pronouncing the syllable.", "success");
    } catch (error) {
        console.error("Error starting practice:", error);
        window.LipLearn.showNotification("Failed to start practice. Please check camera permissions.", "danger");
    }
}

  stopPractice() {
    if (this.practiceStream) {
      this.practiceStream.getTracks().forEach((track) => track.stop())
      this.practiceStream = null
    }

    const practiceCamera = document.getElementById("practiceCamera")
    const placeholder = document.getElementById("cameraPlaceholder")

    if (practiceCamera && placeholder) {
      practiceCamera.style.display = "none"
      placeholder.style.display = "flex"
      practiceCamera.srcObject = null
    }

    this.updatePracticeControls(false)
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

  startPracticeAnalysis() {
    // Simulate practice analysis
    this.practiceInterval = setInterval(() => {
      if (this.isPracticing) {
        this.analyzePracticeAttempt()
      }
    }, 3000)
  }

  analyzePracticeAttempt() {
    // Mock analysis - in real implementation, this would use ML
    const accuracy = Math.random() * 0.4 + 0.6 // 60-100% accuracy
    const isCorrect = accuracy > 0.75

    this.practiceResults.push({
      timestamp: Date.now(),
      accuracy: accuracy,
      correct: isCorrect,
      syllable: this.syllableData.syllable,
    })

    // Show real-time feedback
    const feedback = isCorrect
      ? `Great! ${Math.round(accuracy * 100)}% accuracy`
      : `Keep trying! ${Math.round(accuracy * 100)}% accuracy`

    this.showRealTimeFeedback(feedback, isCorrect)
  }

  showRealTimeFeedback(message, isCorrect) {
    // Create temporary feedback element
    const feedbackEl = document.createElement("div")
    feedbackEl.className = `practice-feedback-popup ${isCorrect ? "success" : "warning"}`
    feedbackEl.textContent = message
    feedbackEl.style.cssText = `
            position: absolute;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: ${isCorrect ? "var(--success-color)" : "var(--warning-color)"};
            color: white;
            padding: 0.5rem 1rem;
            border-radius: 20px;
            font-size: 0.9rem;
            z-index: 1000;
            animation: fadeInOut 2s ease-in-out;
        `

    const practiceArea = document.querySelector(".practice-area")
    if (practiceArea) {
      practiceArea.style.position = "relative"
      practiceArea.appendChild(feedbackEl)

      setTimeout(() => {
        if (feedbackEl.parentNode) {
          feedbackEl.remove()
        }
      }, 2000)
    }
  }

  showPracticeResults() {
    if (this.practiceInterval) {
      clearInterval(this.practiceInterval)
    }

    const feedbackContainer = document.getElementById("practiceFeedback")
    const resultsContainer = document.getElementById("practiceResults")

    if (feedbackContainer && resultsContainer && this.practiceResults.length > 0) {
      const totalAttempts = this.practiceResults.length
      const correctAttempts = this.practiceResults.filter((r) => r.correct).length
      const avgAccuracy = this.practiceResults.reduce((sum, r) => sum + r.accuracy, 0) / totalAttempts

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
                        <div class="result-label">Avg Accuracy</div>
                    </div>
                </div>
                <div class="practice-recommendation mt-3">
                    ${this.getPracticeRecommendation(avgAccuracy)}
                </div>
            `

      feedbackContainer.style.display = "block"

      // Save progress if performance is good
      if (avgAccuracy > 0.8) {
        this.markSyllableCompleted()
      }
    }

    // Reset results for next session
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
    // Mark syllable as completed in progress
    const progress = JSON.parse(localStorage.getItem("liplearn_progress") || '{"completed":[],"points":0}')

    if (!progress.completed.includes(this.syllableData.syllable)) {
      progress.completed.push(this.syllableData.syllable)
      progress.points += 100 // Award points for mastery
      localStorage.setItem("liplearn_progress", JSON.stringify(progress))

      window.LipLearn.showNotification(
        `🎉 Congratulations! You've mastered "${this.syllableData.syllable.toUpperCase()}" and earned 100 points!`,
        "success",
      )
    }
  }
}

// Initialize syllable learning when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  const syllableData = window.syllableData // Declare the variable before using it
  if (typeof syllableData !== "undefined") {
    new SyllableLearning(syllableData)
  }
})

// Add CSS for feedback popup animation
const style = document.createElement("style")
style.textContent = `
    @keyframes fadeInOut {
        0% { opacity: 0; transform: translateX(-50%) translateY(-10px); }
        20%, 80% { opacity: 1; transform: translateX(-50%) translateY(0); }
        100% { opacity: 0; transform: translateX(-50%) translateY(-10px); }
    }
    
    .results-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
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
