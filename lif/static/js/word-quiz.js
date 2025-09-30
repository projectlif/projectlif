// Quiz functionality for LipLearn

class QuizManager {
  constructor() {
    this.currentQuestion = 0
    this.score = 0
    this.streak = 0
    this.bestStreak = 0
    this.questions = []
    this.timeLeft = 30
    this.timer = null
    this.totalQuestions = 10
    this.correctAnswers = 0
    this.userAnswers = []
    this.startTime = null
    this.endTime = null
    this.gifController = null

    this.initializeEventListeners()
    this.initializeSidebarVisibility()
  }

  initializeEventListeners() {
    const startBtn = document.getElementById("startQuiz")
    if (startBtn) {
      startBtn.addEventListener("click", () => this.startQuiz())
    }

    const playAgainBtn = document.getElementById("playAgain")
    if (playAgainBtn) {
      playAgainBtn.addEventListener("click", () => this.resetQuiz())
    }
  }

  initializeSidebarVisibility() {
    // Starting state: only tips visible
    this.showTipsOnly()
  }

  showTipsOnly() {
    const timerCard = document.getElementById("timerCard")
    const tipsCard = document.getElementById("tipsCard")
    const analysisCard = document.getElementById("analysisCard")

    if (timerCard) timerCard.style.display = "none"
    if (tipsCard) tipsCard.style.display = "block"
    if (analysisCard) analysisCard.style.display = "none"
  }

  showClockAndTips() {
    const timerCard = document.getElementById("timerCard")
    const tipsCard = document.getElementById("tipsCard")
    const analysisCard = document.getElementById("analysisCard")

    if (timerCard) timerCard.style.display = "block"
    if (tipsCard) tipsCard.style.display = "block"
    if (analysisCard) analysisCard.style.display = "none"
  }

  showTipsAndAnalysis() {
    const timerCard = document.getElementById("timerCard")
    const tipsCard = document.getElementById("tipsCard")
    const analysisCard = document.getElementById("analysisCard")

    if (timerCard) timerCard.style.display = "none"
    if (tipsCard) tipsCard.style.display = "block"
    if (analysisCard) analysisCard.style.display = "block"
  }

  async startQuiz() {
    try {
      // Show loading
      this.showLoading("Loading quiz questions...")

      // Hide start screen, show game screen and stats
      document.getElementById("startScreen").style.display = "none"
      document.getElementById("gameScreen").style.display = "block"
      document.getElementById("statsBar").style.display = "block"

      // Show clock and tips during quiz
      this.showClockAndTips()

      // Reset quiz state
      this.currentQuestion = 0
      this.score = 0
      this.streak = 0
      this.correctAnswers = 0
      this.userAnswers = []
      this.startTime = Date.now()

      // Load questions
      await this.loadQuestions()

      if (this.questions.length === 0) {
        throw new Error("No questions loaded")
      }

      // Start first question
      this.showQuestion()

    } catch (error) {
      console.error("Error starting quiz:", error)
      this.resetToStart()
    }
  }

  async loadQuestions() {
    try {
      const response = await fetch("/api/word-quiz/questions", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      this.questions = data.questions || []

      console.log(`Loaded ${this.questions.length} questions`)
    } catch (error) {
      console.error("Error loading questions:", error)
      throw error
    }
  }

showQuestion() {
  if (this.currentQuestion >= this.questions.length) {
    this.endQuiz()
    return
  }

  // clear any previous timer before starting a new one
  this.stopTimer()

  const question = this.questions[this.currentQuestion]
  this.updateProgress()
  document.getElementById("questionNumber").textContent = this.currentQuestion + 1
  this.displayQuestionGif(question)
  this.displayAnswerOptions(question)

  // start a fresh timer
  this.startTimer()

  document.getElementById("answerFeedback").style.display = "none"
}


  displayQuestionGif(question) {
    const gifContainer = document.getElementById("questionGif")
    const gifControls = document.getElementById("gifControls")

    if (gifContainer) {
      gifContainer.innerHTML = `
        <img id="quizGif" 
             src="${question.gif}" 
             alt="Pronunciation of ${question.word}" 
             class="img-fluid rounded quiz-gif">
      `

      // Show GIF controls
      if (gifControls) {
        gifControls.style.display = "block"
      }

      // Initialize GIF controller for this question
      setTimeout(() => {
        this.initializeQuizGifController()
      }, 100)
    }
  }

  initializeQuizGifController() {
    const gif = document.getElementById("quizGif")
    const playBtn = document.getElementById("playGifBtn")
    const loopBtn = document.getElementById("loopGifBtn")

    if (!gif) return

    // Create a simple GIF controller for quiz
    this.gifController = {
      gif: gif,
      originalSrc: gif.src.split("?")[0],
      isLooping: false,
      loopInterval: null,

      playOnce: function () {
        const timestamp = new Date().getTime()
        this.gif.src = `${this.originalSrc}?play=${timestamp}`
      },

      toggleLoop: function () {
        if (this.isLooping) {
          this.stopLoop()
        } else {
          this.startLoop()
        }
      },

      startLoop: function () {
        this.isLooping = true
        this.playOnce()

        this.loopInterval = setInterval(() => {
          if (this.isLooping) {
            const timestamp = new Date().getTime()
            this.gif.src = `${this.originalSrc}?loop=${timestamp}`
          }
        }, 3000)

        // Update button
        if (loopBtn) {
          loopBtn.innerHTML = '<i class="fas fa-stop me-1"></i>Stop'
          loopBtn.classList.remove("btn-outline-primary")
          loopBtn.classList.add("btn-warning")
        }
      },

      stopLoop: function () {
        this.isLooping = false

        if (this.loopInterval) {
          clearInterval(this.loopInterval)
          this.loopInterval = null
        }

        // Update button
        if (loopBtn) {
          loopBtn.innerHTML = '<i class="fas fa-redo me-1"></i>Loop'
          loopBtn.classList.remove("btn-warning")
          loopBtn.classList.add("btn-outline-primary")
        }
      },
    }

    // Add event listeners
    if (playBtn) {
      playBtn.onclick = () => this.gifController.playOnce()
    }

    if (loopBtn) {
      loopBtn.onclick = () => this.gifController.toggleLoop()
    }
  }

  displayAnswerOptions(question) {
    const optionsContainer = document.getElementById("answerOptions")
    if (!optionsContainer) return

    optionsContainer.innerHTML = ""

    question.options.forEach((option, index) => {
      const optionButton = document.createElement("button")
      optionButton.className = "answer-option"
      optionButton.textContent = option.toUpperCase()
      optionButton.dataset.answer = option

      optionButton.addEventListener("click", () => {
        this.selectAnswer(option, question.word, question)
      })

      optionsContainer.appendChild(optionButton)
    })
  }

  selectAnswer(selectedAnswer, correctAnswer, question) {
    // Stop timer
    this.stopTimer()

    // Stop GIF loop if active
    if (this.gifController && this.gifController.isLooping) {
      this.gifController.stopLoop()
    }

    // Disable all options
    document.querySelectorAll(".answer-option").forEach((btn) => {
      btn.disabled = true
      if (btn.dataset.answer === correctAnswer) {
        btn.classList.add("correct") // Highlight correct answer in green
      } else if (btn.dataset.answer === selectedAnswer && selectedAnswer !== correctAnswer) {
        btn.classList.add("incorrect")
      }
    })

    // Record answer
    const answerRecord = {
      question: this.currentQuestion + 1,
      syllable: correctAnswer,
      userAnswer: selectedAnswer,
      correct: selectedAnswer === correctAnswer,
      timeSpent: 30 - this.timeLeft,
      options: question.options,
      gif: question.gif, // Store GIF URL for results
    }
    this.userAnswers.push(answerRecord)

    // Check if answer is correct
    const isCorrect = selectedAnswer === correctAnswer

    if (isCorrect) {
      this.handleCorrectAnswer()
    } else {
      this.handleIncorrectAnswer()
    }

    // Show feedback
    this.showAnswerFeedback(isCorrect, correctAnswer, selectedAnswer)

    // Move to next question after delay
    setTimeout(() => {
      this.currentQuestion++
      this.showQuestion()
    }, 2500)
  }

  handleCorrectAnswer() {
    const points = this.calculatePoints()
    this.score += points
    this.streak++
    this.correctAnswers++

    if (this.streak > this.bestStreak) {
      this.bestStreak = this.streak
    }

    this.updateScoreDisplay()
  }

  handleIncorrectAnswer() {
    this.streak = 0
    this.updateScoreDisplay()
  }

  calculatePoints() {
    let basePoints = 10

    // Speed bonus
    if (this.timeLeft > 20) basePoints += 5
    else if (this.timeLeft > 10) basePoints += 3

    // Streak bonus
    if (this.streak >= 5) basePoints += 10
    else if (this.streak >= 3) basePoints += 5

    return basePoints
  }

  showAnswerFeedback(isCorrect, correctAnswer, selectedAnswer) {
    const feedbackContainer = document.getElementById("answerFeedback")
    if (!feedbackContainer) return

    const feedbackClass = isCorrect ? "correct" : "incorrect"
    const icon = isCorrect ? "fa-check-circle text-success" : "fa-times-circle text-danger"
    const title = isCorrect ? "Tama!" : "Mali!"
    const message = isCorrect
      ? `Magaling! Nakakuha ka ng ${this.calculatePoints()} points.`
      : `Ang tamang sagot ay "${correctAnswer.toUpperCase()}".`

    feedbackContainer.className = `answer-feedback ${feedbackClass}`
    feedbackContainer.innerHTML = `
      <div class="feedback-content">
        <div class="feedback-icon">
          <i class="fas ${icon}"></i>
        </div>
        <div class="feedback-text">
          <h5 class="text-light">${title}</h5>
          <p class="text-light">${message}</p>
        </div>
      </div>
    `

    feedbackContainer.style.display = "block"
  }
  startTimer() {
    this.duration = 30 * 1000; // 30 seconds in ms
    this.startTime = Date.now();
    this.timeLeft = 30; // match duration

    // clear old timer if exists
    if (this.timer) clearInterval(this.timer);

    // ✅ immediately update so UI shows 30 and hand at 0deg
    this.updateTimerDisplay();

    this.timer = setInterval(() => {
      const elapsed = Date.now() - this.startTime;
      const remaining = Math.ceil((this.duration - elapsed) / 1000);

      this.timeLeft = Math.max(remaining, 0);

      this.updateTimerDisplay();

      if (this.timeLeft <= 0) {
        this.stopTimer();
        this.selectAnswer(
          "",
          this.questions[this.currentQuestion].word,
          this.questions[this.currentQuestion]
        );
      }
    }, 100);
  }

  stopTimer() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  updateTimerDisplay() {
    const timerText = document.getElementById("timerText");
    const clockHand = document.getElementById("clockHand");
    const animatedClock = document.getElementById("animatedClock");

    if (timerText) {
      timerText.textContent = this.timeLeft;
    }

    // Update clock hand rotation (360° over 30s)
    if (clockHand && this.startTime) {
      const elapsed = Date.now() - this.startTime;
      const progress = Math.min(elapsed / this.duration, 1); // 0 → 1
      const rotation = progress * 360; // 360° in 30s
      clockHand.style.transition = "none";
      clockHand.style.transform = `translate(-50%, -100%) rotate(${rotation}deg)`;
    }

    // Update clock appearance based on time left
    if (animatedClock) {
      animatedClock.classList.remove("warning", "danger");

      if (this.timeLeft <= 5) {
        animatedClock.classList.add("danger");
      } else if (this.timeLeft <= 10) {
        animatedClock.classList.add("warning");
      }
    }

    // Update time left in stats
    const timeLeftEl = document.getElementById("timeLeft");
    if (timeLeftEl) {
      timeLeftEl.textContent = this.timeLeft;
    }
  }

  updateProgress() {
    const progressBar = document.getElementById("progressBar");
    const progressText = document.getElementById("progressText");

    if (progressBar) {
      const progress = (this.currentQuestion / this.totalQuestions) * 100;
      progressBar.style.width = `${progress}%`;
    }

    if (progressText) {
      progressText.textContent = `Question ${this.currentQuestion + 1} of ${this.totalQuestions}`;
    }
  }


  updateScoreDisplay() {
    const scoreEl = document.getElementById("currentScore")
    const streakEl = document.getElementById("currentStreak")

    if (scoreEl) scoreEl.textContent = this.score
    if (streakEl) streakEl.textContent = this.streak
  }

  endQuiz() {
    this.stopTimer()
    this.endTime = Date.now()

    // Hide game screen and stats, show results
    document.getElementById("gameScreen").style.display = "none"
    document.getElementById("statsBar").style.display = "none"
    document.getElementById("resultsScreen").style.display = "block"

    // Show tips and analysis after quiz completion
    this.showTipsAndAnalysis()

    // Calculate final stats
    const accuracy = (this.correctAnswers / this.totalQuestions) * 100
    const totalTime = Math.round((this.endTime - this.startTime) / 1000)

    // Update results display
    document.getElementById("finalScore").textContent = this.score
    document.getElementById("finalAccuracy").textContent = `${Math.round(accuracy)}%`
    document.getElementById("finalStreak").textContent = this.bestStreak
    document.getElementById("totalTime").textContent = `${totalTime}s`

    // Show detailed results
    this.showDetailedResults()

    // Show analysis
    this.showAnalysis()

    // Save results to session
    this.saveResults()
  }

  showDetailedResults() {
    const container = document.getElementById("resultsBreakdown")
    if (!container) return

    let html = '<div class="results-table">'

    this.userAnswers.forEach((answer, index) => {
      const statusIcon = answer.correct ? "fa-check text-success" : "fa-times text-danger"
      const statusClass = answer.correct ? "correct" : "incorrect"

      html += `
        <div class="result-row ${statusClass}">
          <div class="result-gif-preview">
            <img src="${answer.gif}" alt="${answer.syllable}" class="gif-infinite" style="animation-iteration-count: infinite;">
          </div>
          <div class="result-content">
            <div class="result-question">
              <i class="fas ${statusIcon} me-2"></i>
              Question ${answer.question}: "${answer.syllable.toUpperCase()}"
            </div>
            <div class="result-answer">
              Your answer: "${answer.userAnswer.toUpperCase() || "No answer"}"
              <small class="text-muted d-block">Time: ${answer.timeSpent}s</small>
            </div>
          </div>
          <div class="result-status">
            <i class="fas ${statusIcon}"></i>
          </div>
        </div>
      `
    })

    html += "</div>"
    container.innerHTML = html

    // Force all result GIFs to loop infinitely
    setTimeout(() => {
      const resultGifs = container.querySelectorAll('img[src*=".gif"]')
      resultGifs.forEach((gif) => {
        // Add timestamp to force reload and ensure looping
        const originalSrc = gif.src.split("?")[0]
        gif.src = `${originalSrc}?loop=${Date.now()}`

        // Ensure infinite looping
        gif.style.animationIterationCount = "infinite"
        gif.classList.add("gif-infinite")
      })
    }, 100)
  }

  showAnalysis() {
    const strengthsList = document.getElementById("strengthsList")
    const weaknessesList = document.getElementById("weaknessesList")

    if (!strengthsList || !weaknessesList) return

    // Analyze performance by syllable type
    const syllablePerformance = {}
    this.userAnswers.forEach((answer) => {
      const syllable = answer.syllable
      if (!syllablePerformance[syllable]) {
        syllablePerformance[syllable] = { correct: 0, total: 0 }
      }
      syllablePerformance[syllable].total++
      if (answer.correct) {
        syllablePerformance[syllable].correct++
      }
    })

    // Find strengths (>75% accuracy)
    const strengths = []
    const weaknesses = []

    Object.entries(syllablePerformance).forEach(([syllable, performance]) => {
      const accuracy = (performance.correct / performance.total) * 100
      if (accuracy >= 75) {
        strengths.push(`${syllable.toUpperCase()} (${Math.round(accuracy)}%)`)
      } else if (accuracy < 50) {
        weaknesses.push(`${syllable.toUpperCase()} (${Math.round(accuracy)}%)`)
      }
    })

    // General analysis
    const accuracy = (this.correctAnswers / this.totalQuestions) * 100
    const avgTime = this.userAnswers.reduce((sum, a) => sum + a.timeSpent, 0) / this.userAnswers.length

    if (accuracy >= 80) {
      strengths.push("Overall excellent performance")
    }
    if (this.bestStreak >= 5) {
      strengths.push("Great consistency")
    }
    if (avgTime < 15) {
      strengths.push("Quick decision making")
    }

    if (accuracy < 60) {
      weaknesses.push("Overall accuracy needs improvement")
    }
    if (this.bestStreak < 3) {
      weaknesses.push("Focus on consistency")
    }
    if (avgTime > 25) {
      weaknesses.push("Take more time to observe")
    }

    // Display results
    strengthsList.innerHTML = strengths.length
      ? strengths.map((s) => `<div class="analysis-item text-success">• ${s}</div>`).join("")
      : '<div class="analysis-item text-muted">Keep practicing to build strengths!</div>'

    weaknessesList.innerHTML = weaknesses.length
      ? weaknesses.map((w) => `<div class="analysis-item text-warning">• ${w}</div>`).join("")
      : '<div class="analysis-item text-success">Great job! No major weaknesses found.</div>'
  }

  async saveResults() {
    try {
      const results = {
        score: this.score,
        accuracy: (this.correctAnswers / this.totalQuestions) * 100,
      }

      const response = await fetch("/api/word-quiz/save-score", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(results),
      })

      if (response.ok) {
        const data = await response.json()
        this.showHighScores(data.high_scores, data.is_new_high_score)
      }
    } catch (error) {
    }
  }

  resetQuiz() {
    // Reset all states
    this.currentQuestion = 0
    this.score = 0
    this.streak = 0
    this.bestStreak = 0
    this.correctAnswers = 0
    this.userAnswers = []
    this.questions = []

    // Show start screen
    document.getElementById("resultsScreen").style.display = "none"
    document.getElementById("startScreen").style.display = "block"
    document.getElementById("statsBar").style.display = "none"

    // Reset sidebar to tips only
    this.showTipsOnly()

    // Reset UI
    document.getElementById("currentScore").textContent = "0"
    document.getElementById("currentStreak").textContent = "0"
    document.getElementById("questionNumber").textContent = "0"
    document.getElementById("timeLeft").textContent = "30"

    const progressBar = document.getElementById("progressBar")
    if (progressBar) {
      progressBar.style.width = "0%"
    }

    // Reset timer display
    const timerText = document.getElementById("timerText")
    const clockHand = document.getElementById("clockHand")
    const animatedClock = document.getElementById("animatedClock")

    if (timerText) timerText.textContent = "30"
    if (clockHand) clockHand.style.transform = "translate(-50%, -100%) rotate(0deg)"
    if (animatedClock) animatedClock.classList.remove("warning", "danger")

    // Reset analysis to default state
    const strengthsList = document.getElementById("strengthsList")
    const weaknessesList = document.getElementById("weaknessesList")

    if (strengthsList) {
      strengthsList.innerHTML = '<div class="analysis-item text-muted">Complete a quiz to see your strengths!</div>'
    }
    if (weaknessesList) {
      weaknessesList.innerHTML =
        '<div class="analysis-item text-muted">Complete a quiz to see areas for improvement!</div>'
    }
  }

  resetToStart() {
    document.getElementById("gameScreen").style.display = "none"
    document.getElementById("statsBar").style.display = "none"
    document.getElementById("startScreen").style.display = "block"

    // Reset sidebar to tips only
    this.showTipsOnly()
  }

  showLoading(message) {
    // You can implement a loading overlay here
    console.log("Loading:", message)
  }

  showNotification(message, type = "info") {
    if (window.LipLearn && window.LipLearn.showNotification) {
      window.LipLearn.showNotification(message, type)
    } else {
      console.log(`${type.toUpperCase()}: ${message}`)
    }
  }

  showHighScores(highScores, isNewHigh) {
    const container = document.getElementById("highScoresList")
    if (!container) return

    let html = "<h5>Top Scores</h5><ul class='list-group'>"
    highScores.forEach((score, i) => {
      html += `
        <li class="list-group-item d-flex justify-content-between align-items-center">
          #${i + 1} – ${score.score} pts
          <span class="badge bg-primary">${Math.round(score.accuracy)}%</span>
        </li>
      `
    })
    html += "</ul>"

    if (isNewHigh) {
      html += `<p class="text-success mt-2"><i class="fas fa-trophy"></i> New High Score!</p>`
    }

    container.innerHTML = html
  }
}

// Initialize quiz manager when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  window.quizManager = new QuizManager()
  console.log("Quiz manager initialized")
})