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
    this.difficulty = "easy"
    this.totalQuestions = 10
    this.correctAnswers = 0

    this.initializeEventListeners()
  }

  initializeEventListeners() {
    // Start quiz button
    const startBtn = document.getElementById("startQuiz")
    if (startBtn) {
      startBtn.addEventListener("click", () => this.startQuiz())
    }

    // Play again button
    const playAgainBtn = document.getElementById("playAgain")
    if (playAgainBtn) {
      playAgainBtn.addEventListener("click", () => this.resetQuiz())
    }

    // Difficulty selection
    document.querySelectorAll('input[name="difficulty"]').forEach((radio) => {
      radio.addEventListener("change", (e) => {
        this.difficulty = e.target.value
      })
    })
  }

  async startQuiz() {
    // Hide start screen, show game screen
    document.getElementById("startScreen").style.display = "none"
    document.getElementById("gameScreen").style.display = "block"

    // Reset quiz state
    this.currentQuestion = 0
    this.score = 0
    this.streak = 0
    this.correctAnswers = 0
    this.questions = []

    // Load questions
    await this.loadQuestions()

    // Start first question
    this.showQuestion()

    window.LipLearn.showNotification("Quiz started! Good luck!", "info")
  }

  async loadQuestions() {
    // Generate questions based on difficulty
    for (let i = 0; i < this.totalQuestions; i++) {
      try {
        const response = await fetch("/api/quiz/question")
        if (response.ok) {
          const questionData = await response.json()
          this.questions.push(questionData)
        }
      } catch (error) {
        console.error("Error loading question:", error)
      }
    }

    // Fallback if API fails
    if (this.questions.length === 0) {
      this.generateMockQuestions()
    }
  }

  generateMockQuestions() {
    const syllables = ["a", "e", "i", "o", "u", "ba", "da", "ka"]

    for (let i = 0; i < this.totalQuestions; i++) {
      const correctAnswer = syllables[Math.floor(Math.random() * syllables.length)]
      const options = this.generateOptions(correctAnswer, syllables)

      this.questions.push({
        syllable: correctAnswer,
        gif: `/placeholder.svg?height=200&width=200&query=person pronouncing ${correctAnswer}`,
        options: options,
      })
    }
  }

  generateOptions(correct, allSyllables) {
    const options = [correct]
    const remaining = allSyllables.filter((s) => s !== correct)

    // Add 3 random incorrect options
    for (let i = 0; i < 3 && remaining.length > 0; i++) {
      const randomIndex = Math.floor(Math.random() * remaining.length)
      options.push(remaining.splice(randomIndex, 1)[0])
    }

    // Shuffle options
    return options.sort(() => Math.random() - 0.5)
  }

  showQuestion() {
    if (this.currentQuestion >= this.questions.length) {
      this.endQuiz()
      return
    }

    const question = this.questions[this.currentQuestion]

    // Update progress
    this.updateProgress()

    // Update question number
    document.getElementById("questionNumber").textContent = this.currentQuestion + 1

    // Show GIF
    this.displayQuestionGif(question)

    // Show options
    this.displayAnswerOptions(question)

    // Start timer
    this.startTimer()
  }

  displayQuestionGif(question) {
    const gifContainer = document.getElementById("questionGif")
    if (gifContainer) {
      gifContainer.innerHTML = `
                <img src="${question.gif}" 
                     alt="Pronunciation of ${question.syllable}" 
                     class="img-fluid rounded"
                     style="max-width: 100%; height: auto;">
            `
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
        this.selectAnswer(option, question.syllable)
      })

      optionsContainer.appendChild(optionButton)
    })
  }

  selectAnswer(selectedAnswer, correctAnswer) {
    // Stop timer
    this.stopTimer()

    // Disable all options
    document.querySelectorAll(".answer-option").forEach((btn) => {
      btn.disabled = true

      if (btn.dataset.answer === correctAnswer) {
        btn.classList.add("correct")
      } else if (btn.dataset.answer === selectedAnswer && selectedAnswer !== correctAnswer) {
        btn.classList.add("incorrect")
      }
    })

    // Check if answer is correct
    const isCorrect = selectedAnswer === correctAnswer

    if (isCorrect) {
      this.handleCorrectAnswer()
    } else {
      this.handleIncorrectAnswer()
    }

    // Show feedback
    this.showAnswerFeedback(isCorrect, correctAnswer)

    // Move to next question after delay
    setTimeout(() => {
      this.currentQuestion++
      this.showQuestion()
    }, 2000)
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

    // Bonus for speed
    if (this.timeLeft > 20) basePoints += 5
    else if (this.timeLeft > 10) basePoints += 3

    // Streak bonus
    if (this.streak >= 5) basePoints += 10
    else if (this.streak >= 3) basePoints += 5

    // Difficulty bonus
    if (this.difficulty === "hard") basePoints += 5
    else if (this.difficulty === "medium") basePoints += 3

    return basePoints
  }

  showAnswerFeedback(isCorrect, correctAnswer) {
    const feedbackContainer = document.getElementById("answerFeedback")
    if (!feedbackContainer) return

    const feedbackClass = isCorrect ? "correct" : "incorrect"
    const icon = isCorrect ? "fa-check-circle text-success" : "fa-times-circle text-danger"
    const title = isCorrect ? "Correct!" : "Incorrect!"
    const message = isCorrect
      ? `Great job! You earned ${this.calculatePoints()} points.`
      : `The correct answer was "${correctAnswer.toUpperCase()}".`

    feedbackContainer.className = `answer-feedback ${feedbackClass}`
    feedbackContainer.innerHTML = `
            <div class="feedback-content">
                <div class="feedback-icon">
                    <i class="fas ${icon}"></i>
                </div>
                <div class="feedback-text">
                    <h5>${title}</h5>
                    <p>${message}</p>
                </div>
            </div>
        `

    feedbackContainer.style.display = "block"

    // Hide feedback before next question
    setTimeout(() => {
      feedbackContainer.style.display = "none"
    }, 1800)
  }

  startTimer() {
    this.timeLeft = 30
    this.updateTimerDisplay()

    this.timer = setInterval(() => {
      this.timeLeft--
      this.updateTimerDisplay()

      if (this.timeLeft <= 0) {
        this.selectAnswer("", this.questions[this.currentQuestion].syllable)
      }
    }, 1000)
  }

  stopTimer() {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  }

  updateTimerDisplay() {
    const timerDisplay = document.getElementById("timerDisplay")
    const timerCircle = document.querySelector(".timer-circle")

    if (timerDisplay) {
      timerDisplay.textContent = this.timeLeft
    }

    if (timerCircle) {
      timerCircle.classList.remove("warning", "danger")

      if (this.timeLeft <= 5) {
        timerCircle.classList.add("danger")
      } else if (this.timeLeft <= 10) {
        timerCircle.classList.add("warning")
      }
    }

    // Update time left in stats
    document.getElementById("timeLeft").textContent = this.timeLeft
  }

  updateProgress() {
    const progressBar = document.getElementById("progressBar")
    if (progressBar) {
      const progress = (this.currentQuestion / this.totalQuestions) * 100
      progressBar.style.width = `${progress}%`
    }
  }

  updateScoreDisplay() {
    document.getElementById("currentScore").textContent = this.score
    document.getElementById("currentStreak").textContent = this.streak
  }

  endQuiz() {
    this.stopTimer()

    // Hide game screen, show results
    document.getElementById("gameScreen").style.display = "none"
    document.getElementById("resultsScreen").style.display = "block"

    // Calculate final stats
    const accuracy = (this.correctAnswers / this.totalQuestions) * 100

    // Update results display
    document.getElementById("finalScore").textContent = this.score
    document.getElementById("finalAccuracy").textContent = `${Math.round(accuracy)}%`
    document.getElementById("finalStreak").textContent = this.bestStreak

    // Save high score
    this.saveHighScore()

    // Update leaderboard
    this.updateLeaderboard()

    // Check for achievements
    this.checkAchievements(accuracy)

    window.LipLearn.showNotification("Quiz completed! Check your results.", "success")
  }

  saveHighScore() {
    const highScores = JSON.parse(localStorage.getItem("liplearn_highscores") || "[]")

    const newScore = {
      score: this.score,
      accuracy: (this.correctAnswers / this.totalQuestions) * 100,
      streak: this.bestStreak,
      difficulty: this.difficulty,
      date: new Date().toISOString(),
    }

    highScores.push(newScore)
    highScores.sort((a, b) => b.score - a.score)

    // Keep only top 10 scores
    if (highScores.length > 10) {
      highScores.splice(10)
    }

    localStorage.setItem("liplearn_highscores", JSON.stringify(highScores))
  }

  updateLeaderboard() {
    const leaderboardList = document.querySelector(".leaderboard-list")
    if (!leaderboardList) return

    const highScores = JSON.parse(localStorage.getItem("liplearn_highscores") || "[]")

    // Update the "You" entry with current score
    const yourEntry = leaderboardList.querySelector(".leaderboard-item:first-child .score")
    if (yourEntry) {
      yourEntry.textContent = this.score
    }
  }

  checkAchievements(accuracy) {
    const achievements = JSON.parse(localStorage.getItem("liplearn_achievements") || "[]")
    const newAchievements = []

    // Hot Streak achievement
    if (this.bestStreak >= 5 && !achievements.includes("hot_streak")) {
      achievements.push("hot_streak")
      newAchievements.push("Hot Streak - Get 5 correct in a row!")
      this.unlockAchievement("hot_streak")
    }

    // Perfect Score achievement
    if (accuracy === 100 && !achievements.includes("perfect_score")) {
      achievements.push("perfect_score")
      newAchievements.push("Perfect Score - 100% accuracy in a quiz!")
      this.unlockAchievement("perfect_score")
    }

    // Speed Demon achievement (if answered quickly)
    if (this.timeLeft > 25 && !achievements.includes("speed_demon")) {
      achievements.push("speed_demon")
      newAchievements.push("Speed Demon - Answer in under 5 seconds!")
      this.unlockAchievement("speed_demon")
    }

    localStorage.setItem("liplearn_achievements", JSON.stringify(achievements))

    // Show achievement notifications
    newAchievements.forEach((achievement, index) => {
      setTimeout(() => {
        window.LipLearn.showNotification(`🏆 Achievement Unlocked: ${achievement}`, "success")
      }, index * 1000)
    })
  }

  unlockAchievement(achievementId) {
    const achievementElement = document.querySelector(`[data-achievement="${achievementId}"]`)
    if (achievementElement) {
      achievementElement.classList.remove("locked")
      achievementElement.classList.add("unlocked")
    }
  }

  resetQuiz() {
    // Reset all states
    this.currentQuestion = 0
    this.score = 0
    this.streak = 0
    this.bestStreak = 0
    this.correctAnswers = 0
    this.questions = []

    // Show start screen
    document.getElementById("resultsScreen").style.display = "none"
    document.getElementById("startScreen").style.display = "block"

    // Reset UI
    document.getElementById("currentScore").textContent = "0"
    document.getElementById("currentStreak").textContent = "0"
    document.getElementById("questionNumber").textContent = "0"
    document.getElementById("timeLeft").textContent = "30"

    const progressBar = document.getElementById("progressBar")
    if (progressBar) {
      progressBar.style.width = "0%"
    }
  }
}

// Initialize quiz manager when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  new QuizManager()
})
