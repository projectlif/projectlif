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
  async saveHighScore() {
    const accuracy = (this.correctAnswers / this.totalQuestions) * 100
    
    const scoreData = {
        score: this.score,
        accuracy: accuracy,
        difficulty: this.difficulty
    }
    
    // Save to session via API
    if (window.SessionManager) {
        const result = await window.SessionManager.saveQuizScore(scoreData)
        if (result && result.high_scores) {
            this.updateLeaderboardWithSessionScores(result.high_scores)
        }
    }
    
    // Also save to localStorage as backup
    const highScores = JSON.parse(localStorage.getItem("liplearn_highscores") || "[]")
    highScores.push(scoreData)
    highScores.sort((a, b) => b.score - a.score)
    localStorage.setItem("liplearn_highscores", JSON.stringify(highScores.slice(0, 3)))
}

updateLeaderboardWithSessionScores(highScores) {
    const leaderboardList = document.querySelector(".leaderboard-list")
    if (!leaderboardList) return

    // Clear existing entries
    leaderboardList.innerHTML = ''
    
    // Add session high scores
    highScores.forEach((score, index) => {
        const entry = document.createElement('div')
        entry.className = 'leaderboard-item'
        entry.innerHTML = `
            <div class="rank">${index + 1}</div>
            <div class="player">Your Score #${index + 1}</div>
            <div class="score">${score.score}</div>
        `
        leaderboardList.appendChild(entry)
    })
    
    // Fill remaining slots with placeholders
    for (let i = highScores.length; i < 3; i++) {
        const entry = document.createElement('div')
        entry.className = 'leaderboard-item'
        entry.innerHTML = `
            <div class="rank">${i + 1}</div>
            <div class="player">-</div>
            <div class="score">0</div>
        `
        leaderboardList.appendChild(entry)
    }
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
    const options = [correct]; // Always include correct answer first
    const remaining = allSyllables.filter((s) => s !== correct);

    // Add 3 random incorrect options
    while (options.length < 4 && remaining.length > 0) {
        const randomIndex = Math.floor(Math.random() * remaining.length);
        options.push(remaining.splice(randomIndex, 1)[0]);
    }

    // If we don't have enough syllables, fill with duplicates (shouldn't happen)
    while (options.length < 4) {
        options.push(correct);
    }

    // Shuffle options so correct answer isn't always first
    return this.shuffleArray(options);
}

// Add this helper method
shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
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
    this.displayAnswerOptions(question)
    this.startTimer()
  }

displayQuestionGif(question) {
    const gifContainer = document.getElementById("questionGif");
    if (gifContainer) {
        const img = document.createElement('img');
        img.src = question.gif;
        img.alt = `Pronunciation of ${question.syllable}`;
        img.className = 'img-fluid rounded';
        img.style.cssText = 'width: 100%; height: 100%; object-fit: contain;';
        


        const restartGif = () => {
            const timestamp = new Date().getTime();
            img.src = `${question.gif}?t=${timestamp}`;
        };
        
        img.onload = () => {
            setTimeout(restartGif, 2500); 
        };
        
        // Set up continuous restart
        const intervalId = setInterval(restartGif, 3000);
        img.dataset.intervalId = intervalId;
        
        gifContainer.innerHTML = '';
        gifContainer.appendChild(img);
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
async endQuiz() {
    console.log('🏁 Quiz ending...')
    
    this.stopTimer()

    // Hide game screen, show results
    document.getElementById("gameScreen").style.display = "none"
    document.getElementById("resultsScreen").style.display = "block"

    // Calculate final stats
    const accuracy = (this.correctAnswers / this.totalQuestions) * 100

    console.log('📊 Final quiz stats:', {
        score: this.score,
        accuracy: accuracy,
        bestStreak: this.bestStreak,
        difficulty: this.difficulty
    })

    // Update results display
    document.getElementById("finalScore").textContent = this.score
    document.getElementById("finalAccuracy").textContent = `${Math.round(accuracy)}%`
    document.getElementById("finalStreak").textContent = this.bestStreak

    // Save high score
    await this.saveHighScore()

    // Update leaderboard
    this.updateLeaderboard()

    // Check for achievements
    this.checkAchievements(accuracy)

    window.LipLearn.showNotification("Quiz completed! Check your results.", "success")
}

async saveHighScore() {
    console.log('💾 Saving high score...')
    
    const accuracy = (this.correctAnswers / this.totalQuestions) * 100
    
    const scoreData = {
        score: this.score,
        accuracy: accuracy,
        difficulty: this.difficulty
    }
    
    console.log('📊 Score data to save:', scoreData)
    
    // Save to session via API
    if (window.SessionManager) {
        const result = await window.SessionManager.saveQuizScore(scoreData)
        console.log('📊 Quiz save result:', result)
        
        if (result && result.high_scores) {
            this.updateLeaderboardWithSessionScores(result.high_scores)
        }
    }
    
    // Also save to localStorage as backup
    const highScores = JSON.parse(localStorage.getItem("liplearn_highscores") || "[]")
    highScores.push(scoreData)
    highScores.sort((a, b) => b.score - a.score)
    localStorage.setItem("liplearn_highscores", JSON.stringify(highScores.slice(0, 3)))
}

updateLeaderboardWithSessionScores(highScores) {
    console.log('🏆 Updating leaderboard with session scores:', highScores)
    
    const leaderboardList = document.querySelector(".leaderboard-list")
    if (!leaderboardList) return

    // Clear existing entries
    leaderboardList.innerHTML = ''
    
    // Add session high scores
    highScores.forEach((score, index) => {
        const entry = document.createElement('div')
        entry.className = 'leaderboard-item'
        entry.innerHTML = `
            <div class="rank">${index + 1}</div>
            <div class="player">Your Score #${index + 1}</div>
            <div class="score">${score.score}</div>
        `
        leaderboardList.appendChild(entry)
    })
    
    // Fill remaining slots with placeholders
    for (let i = highScores.length; i < 3; i++) {
        const entry = document.createElement('div')
        entry.className = 'leaderboard-item'
        entry.innerHTML = `
            <div class="rank">${i + 1}</div>
            <div class="player">-</div>
            <div class="score">0</div>
        `
        leaderboardList.appendChild(entry)
    }
    
    console.log('✅ Leaderboard updated successfully')
}

// Update the updateLeaderboard method to use session scores
updateLeaderboard() {
    // This method will be called but the real update happens in updateLeaderboardWithSessionScores
    console.log('📊 Leaderboard update requested (handled by session scores)')
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
