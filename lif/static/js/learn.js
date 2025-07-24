// Learning page functionality

class LearningManager {
  constructor() {
    this.currentFilter = "all"
    this.initializeEventListeners()
    this.initializeProgress()
  }

  initializeEventListeners() {
    // Difficulty filter buttons
    document.querySelectorAll(".filter-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        this.handleFilterChange(e.target.dataset.difficulty)
      })
    })

    // Syllable card hover effects
    document.querySelectorAll(".syllable-card").forEach((card) => {
      card.addEventListener("mouseenter", this.handleCardHover)
      card.addEventListener("mouseleave", this.handleCardLeave)
    })
  }

  handleFilterChange(difficulty) {
    // Update active filter button
    document.querySelectorAll(".filter-btn").forEach((btn) => {
      btn.classList.remove("active")
    })
    document.querySelector(`[data-difficulty="${difficulty}"]`).classList.add("active")

    // Filter syllable cards
    this.currentFilter = difficulty
    this.filterSyllables()
  }

  filterSyllables() {
    const cards = document.querySelectorAll(".syllable-card")

    cards.forEach((card) => {
      const cardDifficulty = card.dataset.difficulty

      if (this.currentFilter === "all" || cardDifficulty === this.currentFilter) {
        card.classList.remove("hidden")
        card.style.display = "block"
        // Animate in
        setTimeout(() => {
          card.style.opacity = "1"
          card.style.transform = "translateY(0)"
        }, 100)
      } else {
        card.style.opacity = "0"
        card.style.transform = "translateY(20px)"
        setTimeout(() => {
          card.style.display = "none"
          card.classList.add("hidden")
        }, 300)
      }
    })
  }

  handleCardHover(e) {
    const card = e.currentTarget
    const gifPlaceholder = card.querySelector(".gif-placeholder")

    if (gifPlaceholder) {
      gifPlaceholder.style.transform = "scale(1.05)"
      gifPlaceholder.style.borderColor = "var(--primary-color)"
    }
  }

  handleCardLeave(e) {
    const card = e.currentTarget
    const gifPlaceholder = card.querySelector(".gif-placeholder")

    if (gifPlaceholder) {
      gifPlaceholder.style.transform = "scale(1)"
      gifPlaceholder.style.borderColor = "var(--dark-border)"
    }
  }

  initializeProgress() {
    // Load progress from localStorage
    const progress = this.loadProgress()
    this.updateProgressDisplay(progress)
  }

  loadProgress() {
    const saved = localStorage.getItem("liplearn_progress")
    return saved
      ? JSON.parse(saved)
      : {
          completed: [],
          points: 0,
          totalTime: 0,
        }
  }

  saveProgress(progress) {
    localStorage.setItem("liplearn_progress", JSON.stringify(progress))
  }

  updateProgressDisplay(progress) {
    const totalSyllables = document.querySelectorAll(".syllable-card").length
    const completedCount = progress.completed.length
    const progressPercentage = totalSyllables > 0 ? (completedCount / totalSyllables) * 100 : 0

    // Update progress stats
    const completedEl = document.querySelector(".progress-stats .progress-item:nth-child(2) .progress-value")
    const progressEl = document.querySelector(".progress-stats .progress-item:nth-child(3) .progress-value")
    const pointsEl = document.querySelector(".progress-stats .progress-item:nth-child(4) .progress-value")
    const progressBar = document.querySelector(".progress-bar")

    if (completedEl) completedEl.textContent = completedCount
    if (progressEl) progressEl.textContent = `${Math.round(progressPercentage)}%`
    if (pointsEl) pointsEl.textContent = progress.points
    if (progressBar) progressBar.style.width = `${progressPercentage}%`

    // Mark completed syllables
    progress.completed.forEach((syllable) => {
      const card = document.querySelector(`[href*="${syllable}"]`)?.closest(".syllable-card")
      if (card) {
        card.classList.add("completed")
        const badge = document.createElement("div")
        badge.className = "completion-badge"
        badge.innerHTML = '<i class="fas fa-check-circle text-success"></i>'
        card.querySelector(".card-body").appendChild(badge)
      }
    })
  }

  markSyllableCompleted(syllable) {
    const progress = this.loadProgress()
    if (!progress.completed.includes(syllable)) {
      progress.completed.push(syllable)
      progress.points += 50 // Award points for completion
      this.saveProgress(progress)
      this.updateProgressDisplay(progress)

      window.LipLearn.showNotification(
        `Congratulations! You completed "${syllable.toUpperCase()}" and earned 50 points!`,
        "success",
      )
    }
  }
}

function playPreview(syllable) {
    // Create modal or enlarged view
    const modal = document.createElement('div');
    modal.className = 'gif-modal';
    modal.innerHTML = `
        <div class="gif-modal-content">
            <span class="gif-modal-close">&times;</span>
            <img src="/static/gifs/${syllable}.gif" alt="Pronunciation of ${syllable.toUpperCase()}">
            <h4>${syllable.toUpperCase()}</h4>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Close modal functionality
    modal.querySelector('.gif-modal-close').onclick = () => modal.remove();
    modal.onclick = (e) => {
        if (e.target === modal) modal.remove();
    };
}

// Initialize learning manager
document.addEventListener("DOMContentLoaded", () => {
  new LearningManager()
})
