// Word Quiz functionality - similar to quiz.js but for Filipino words

class WordQuizManager {
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
    const startBtn = document.getElementById("startQuiz")
    if (startBtn) {
      startBtn.addEventListener("click", () => this.startQuiz())
    }

    const playAgainBtn = document.getElementById("playAgain")
    if (playAgainBtn) {
      playAgainBtn.addEventListener("click", () => this.resetQuiz())
    }

    document.querySelectorAll('input[name="difficulty"]').forEach((radio) => {
      radio.addEventListener("change", (e) => {
        this.difficulty = e.target.value
      })
    })
  }

  async loadQuestions() {
    for (let i = 0; i < this.totalQuestions; i++) {
      try {
        const response = await fetch("/api/word-quiz/question")
        if (response.ok) {
          const questionData = await response.json()
          this.questions.push(questionData)
        }
      } catch (error) {
        console.error("Error loading question:", error)
      }
    }
  }

  async startQuiz() {
    document.getElementById("startScreen").style.display = "none"
    document.getElementById("gameScreen").style.display = "block"

    this.currentQuestion = 0
    this.score = 0
    this.streak = 0
    this.correctAnswers = 0
    this.questions = []

    await this.loadQuestions()
    this.showQuestion()

    window.LipLearn.showNotification("Word Quiz started! Good luck!", "info")
  }

  showQuestion() {
    if (this.currentQuestion >= this.questions.length) {
      this.endQuiz()
      return
    }

    const question = this.questions[this.currentQuestion]

    this.updateProgress()
    document.getElementById("questionNumber").textContent = this.currentQuestion + 1

    this.displayQuestionGif(question)
    this.displayWordHint(question)
    this.displayAnswerOptions(question)
    this.startTimer()
  }

  displayQuestionGif(question) {
    const gifContainer = document.getElementById("questionGif")
    if (gifContainer) {
      gifContainer.innerHTML = `
        <img src="${question.gif}" 
             alt="Pronunciation of ${question.word}" 
             class="img-fluid rounded"
             style="max-width: 100%; height: auto; loop: infinite;">
      `
    }
  }

  displayWordHint(question) {
    const hintContainer = document.getElementById("wordHint")
    const translationSpan = document.getElementById("wordTranslation")
    
    if (hintContainer && translationSpan) {
      translationSpan.textContent = question.translation
      hintContainer.style.display = "block"
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
        this.selectAnswer(option, question.word)
      })

      optionsContainer.appendChild(optionButton)
    })
  }

  selectAnswer(selectedAnswer, correctAnswer) {
    this.stopTimer()

    document.querySelectorAll(".answer-option").forEach((btn) => {
      btn.disabled = true

      if (btn.dataset.answer === correctAnswer) {
        btn.classList.add("correct")
      } else if (btn.dataset.answer === selectedAnswer && selectedAnswer !== correctAnswer) {
        btn.classList.add("incorrect")
      }
    })

    const isCorrect = selectedAnswer === correctAnswer

    if (isCorrect) {
      this.handleCorrectAnswer()
    } else {
      this.handleIncorrectAnswer()
    }

    this.showAnswerFeedback(isCorrect, correctAnswer)

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
    let basePoints = 15 // Higher base points for words

    if (this.timeLeft > 20) basePoints += 8
    else if (this.timeLeft > 10) basePoints += 5

    if (this.streak >= 5) basePoints += 15
    else if (this.streak >= 3) basePoints += 8

    if (this.difficulty === "hard") basePoints += 8
    else if (this.difficulty === "medium") basePoints += 5

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

    setTimeout(() => {
      feedbackContainer.style.display = "none"
    }, 2300)
  }

  startTimer() {
    this.timeLeft = 30
    this.updateTimerDisplay()

    this.timer = setInterval(() => {
      this.timeLeft--
      this.updateTimerDisplay()

      if (this.timeLeft <= 0) {
        this.selectAnswer("", this.questions[this.currentQuestion].word)
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

    document.getElementById("gameScreen").style.display = "none"
    document.getElementById("resultsScreen").style.display = "block"

    const accuracy = (this.correctAnswers / this.totalQuestions) * 100

    document.getElementById("finalScore").textContent = this.score
    document.getElementById("finalAccuracy").textContent = `${Math.round(accuracy)}%`
    document.getElementById("finalStreak").textContent = this.bestStreak

    this.saveHighScore()
    window.LipLearn.showNotification("Word Quiz completed! Check your results.", "success")
  }

  saveHighScore() {
    const highScores = JSON.parse(localStorage.getItem("liplearn_word_highscores") || "[]")

    const newScore = {
      score: this.score,
      accuracy: (this.correctAnswers / this.totalQuestions) * 100,
      streak: this.bestStreak,
      difficulty: this.difficulty,
      date: new Date().toISOString(),
      type: "word"
    }

    highScores.push(newScore)
    highScores.sort((a, b) => b.score - a.score)

    if (highScores.length > 10) {
      highScores.splice(10)
    }

    localStorage.setItem("liplearn_word_highscores", JSON.stringify(highScores))
  }

  resetQuiz() {
    this.currentQuestion = 0
    this.score = 0
    this.streak = 0
    this.bestStreak = 0
    this.correctAnswers = 0
    this.questions = []

    document.getElementById("resultsScreen").style.display = "none"
    document.getElementById("startScreen").style.display = "block"

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

document.addEventListener("DOMContentLoaded", () => {
  new WordQuizManager()
})