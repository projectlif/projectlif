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
    const img = gifContainer.querySelector('img');
    if (img) {
        // Force infinite loop by restarting GIF
        const restartGif = () => {
            const timestamp = new Date().getTime();
            const baseSrc = img.src.split('?')[0]; // Remove existing timestamp
            img.src = `${baseSrc}?t=${timestamp}`;
        };
        
        // Start the loop immediately
        restartGif();
        
        // Restart every 3 seconds (adjust based on your GIF duration)
        setInterval(restartGif, 3000);
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
                practiceCamera.style.display = "block";
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
    // Real-time analysis using the model
    this.practiceInterval = setInterval(() => {
        if (this.isPracticing) {
            this.analyzePracticeAttempt();
        }
    }, 2000); // Check every 2 seconds
}

async analyzePracticeAttempt() {
    try {
        const video = document.getElementById("practiceCamera");
        const canvas = document.getElementById("cameraCanvas");
        const ctx = canvas.getContext("2d");
        
        if (video && canvas && ctx) {
            // Capture frame from video
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            ctx.drawImage(video, 0, 0);
            
            // Convert to blob and send to server
            canvas.toBlob(async (blob) => {
                const formData = new FormData();
                formData.append("image", blob, "practice.jpg");
                
                const response = await fetch(`/api/predict/syllable/${this.syllableData.syllable}`, {
                    method: "POST",
                    body: formData,
                });
                
                if (response.ok) {
                    const data = await response.json();
                    
                    if (data.detected) {
                        // Store real results
                        this.practiceResults.push({
                            timestamp: Date.now(),
                            accuracy: data.accuracy,
                            correct: data.is_correct,
                            predicted: data.predicted_syllable,
                            target: data.target_syllable,
                            confidence: data.target_confidence
                        });
                        
                        // Show real-time feedback
                        const feedback = data.is_correct 
                            ? `Great! ${Math.round(data.accuracy * 100)}% confidence`
                            : `You said "${data.predicted_syllable}" - try "${data.target_syllable}"`;
                            
                        this.showRealTimeFeedback(feedback, data.is_correct);
                    } else {
                        this.showRealTimeFeedback("No face detected", false);
                    }
                }
            }, "image/jpeg", 0.8);
        }
    } catch (error) {
        console.error("Error analyzing practice:", error);
    }
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
        clearInterval(this.practiceInterval);
    }
    
    const feedbackContainer = document.getElementById("practiceFeedback");
    const resultsContainer = document.getElementById("practiceResults");
    
    if (feedbackContainer && resultsContainer && this.practiceResults.length > 0) {
        const totalAttempts = this.practiceResults.length;
        const correctAttempts = this.practiceResults.filter((r) => r.correct).length;
        const avgAccuracy = this.practiceResults.reduce((sum, r) => sum + r.accuracy, 0) / totalAttempts;
        const avgConfidence = this.practiceResults.reduce((sum, r) => sum + r.confidence, 0) / totalAttempts;
        
        // Get most common incorrect prediction
        const incorrectPredictions = this.practiceResults
            .filter(r => !r.correct)
            .map(r => r.predicted);
        const mostCommonError = incorrectPredictions.length > 0 
            ? incorrectPredictions.reduce((a, b, i, arr) => 
                arr.filter(v => v === a).length >= arr.filter(v => v === b).length ? a : b
            ) : 'None';
        
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
                <div class="result-stat">
                    <div class="result-value">${Math.round(avgConfidence * 100)}%</div>
                    <div class="result-label">Confidence</div>
                </div>
            </div>
            <div class="detailed-feedback mt-3">
                <p class="text-light"><strong>Target:</strong> ${this.syllableData.syllable.toUpperCase()}</p>
                <p class="text-light"><strong>Success Rate:</strong> ${Math.round((correctAttempts/totalAttempts)*100)}%</p>
                ${incorrectPredictions.length > 0 ? 
                    `<p class="text-warning"><strong>Most Common Error:</strong> Saying "${mostCommonError.toUpperCase()}" instead</p>` 
                    : ''}
            </div>
            <div class="practice-recommendation mt-3">
                ${this.getPracticeRecommendation(avgAccuracy)}
            </div>
        `;
        
        feedbackContainer.style.display = "block";
        
        // Save progress if performance is good
        if (avgAccuracy > 0.7 && correctAttempts >= 3) {
            this.markSyllableCompleted();
        }
    }
    
    // Reset results for next session
    this.practiceResults = [];
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

function playPreview(syllable) {
    const modal = document.createElement('div');
    modal.className = 'gif-modal';
    
    const img = document.createElement('img');
    img.src = `/static/gifs/${syllable}.gif`;
    img.alt = `Pronunciation of ${syllable.toUpperCase()}`;
    
    const restartGif = () => {
        const timestamp = new Date().getTime();
        img.src = `/static/gifs/${syllable}.gif?t=${timestamp}`;
    };
    
    img.onload = () => {
        setTimeout(restartGif, 2500);
    };
    
    const intervalId = setInterval(restartGif, 3000);
    
    modal.innerHTML = `
        <div class="gif-modal-content">
            <span class="gif-modal-close">&times;</span>
            <h4 class="text-light mt-3">${syllable.toUpperCase()}</h4>
            <button class="btn btn-primary mt-2" onclick="replayModalGif(this)">
                <i class="fas fa-redo me-2"></i>Replay
            </button>
        </div>
    `;
    
    modal.querySelector('.gif-modal-content').insertBefore(img, modal.querySelector('h4'));
    
    document.body.appendChild(modal);
    
    // Close modal and clear interval
    const closeModal = () => {
        clearInterval(intervalId);
        modal.remove();
    };
    
    modal.querySelector('.gif-modal-close').onclick = closeModal;
    modal.onclick = (e) => {
        if (e.target === modal) closeModal();
    };
}

function replayModalGif(button) {
    const img = button.parentElement.querySelector('img');
    const syllable = button.parentElement.querySelector('h4').textContent.toLowerCase();
    const timestamp = new Date().getTime();
    img.src = `/static/gifs/${syllable}.gif?t=${timestamp}`;
}
function replayModalGif(button) {
    const img = button.parentElement.querySelector('img');
    const currentSrc = img.src.split('?')[0];
    const newTimestamp = new Date().getTime();
    img.src = `${currentSrc}?t=${newTimestamp}`;
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
console.log("syllable.js working")