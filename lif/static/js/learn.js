// Learning page functionality

class LearningManager {
  constructor() {
    this.currentFilter = "all"
    this.initializeEventListeners()
    this.initializeProgress()
    this.setupInfiniteGifs() // Add this line
}

// Add this method
setupInfiniteGifs() {
    setInterval(() => {
        document.querySelectorAll('.gif-preview').forEach(img => {
            if (img.src.includes('.gif') && !img.dataset.restarting) {
                img.dataset.restarting = 'true';
                const originalSrc = img.src.split('?')[0];
                const timestamp = new Date().getTime();
                img.src = `${originalSrc}?t=${timestamp}`;
                
                setTimeout(() => {
                    img.dataset.restarting = 'false';
                }, 100);
            }
        });
    }, 3000); // Restart every 3 seconds
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

// Initialize learning manager
document.addEventListener("DOMContentLoaded", () => {
  new LearningManager()
})
