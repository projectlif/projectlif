class LearningManager {
  constructor() {
    this.currentFilter = "all"
    this.initializeEventListeners()
    this.initializeProgress()
    this.setupInfiniteGifs()
    this.setupProgressListener()
}

setupProgressListener() {
    // Listen for storage changes from other tabs/pages
    window.addEventListener('storage', (e) => {
        if (e.key === 'liplearn_progress') {
            console.log('📢 Storage change detected, refreshing progress...')
            this.loadSessionProgress()
        }
    })
    
    // Listen for custom progress events
    window.addEventListener('progressUpdated', (event) => {
        console.log('📢 Progress update event received on learn page:', event.detail)
        this.updateProgressDisplay(event.detail)
    })
    
    // Refresh progress every 5 seconds when page is visible
    setInterval(() => {
        if (!document.hidden) {
            console.log('🔄 Periodic progress refresh...')
            this.loadSessionProgress()
        }
    }, 5000)
}
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
    }, 3000); 
}

  initializeEventListeners() {
    document.querySelectorAll(".filter-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        this.handleFilterChange(e.target.dataset.difficulty)
      })
    })

    document.querySelectorAll(".syllable-card").forEach((card) => {
      card.addEventListener("mouseenter", this.handleCardHover)
      card.addEventListener("mouseleave", this.handleCardLeave)
    })
  }

  handleFilterChange(difficulty) {
    document.querySelectorAll(".filter-btn").forEach((btn) => {
      btn.classList.remove("active")
    })
    document.querySelector(`[data-difficulty="${difficulty}"]`).classList.add("active")

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

async initializeProgress() {
    window.addEventListener('progressUpdated', (event) => {
        this.updateProgressDisplay(event.detail)
    })
    
    await this.loadSessionProgress()
}

async loadSessionProgress() {
    try {
        const response = await fetch('/api/progress/get')
        if (response.ok) {
            const data = await response.json()
            
            const progress = {
                completed: data.mastered_syllables || [],
                points: data.total_points || 0,
                totalTime: 0 
            }
            
            this.updateProgressDisplay(progress)
            this.markMasteredSyllables(data.mastered_syllables || [])
        }
    } catch (error) {
        console.error('Error loading session progress:', error)
        const progress = this.loadProgress()
        this.updateProgressDisplay(progress)
    }
}

markMasteredSyllables(masteredSyllables) {
    masteredSyllables.forEach(syllable => {
        const syllableCard = document.querySelector(`[href*="learn/${syllable}"]`)?.closest('.syllable-card')
        if (syllableCard) {
            syllableCard.classList.add('mastered')
            
            if (!syllableCard.querySelector('.mastery-badge')) {
                const badge = document.createElement('div')
                badge.className = 'mastery-badge'
                badge.innerHTML = '<i class="fas fa-crown text-warning"></i>'
                badge.style.cssText = `
                    position: absolute;
                    top: 10px;
                    right: 10px;
                    background: rgba(255, 193, 7, 0.2);
                    border: 1px solid #ffc107;
                    border-radius: 50%;
                    width: 30px;
                    height: 30px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                `
                syllableCard.style.position = 'relative'
                syllableCard.appendChild(badge)
            }
        }
    })
}

  saveProgress(progress) {
    localStorage.setItem("liplearn_progress", JSON.stringify(progress))
  }


updateProgressDisplay(progress) {
    console.log('📊 Updating progress display with:', progress)
    
    const totalSyllables = document.querySelectorAll(".syllable-card").length
    const completedCount = progress.completed ? progress.completed.length : 0
    const progressPercentage = totalSyllables > 0 ? (completedCount / totalSyllables) * 100 : 0

    console.log('📈 Progress calculations:', {
        totalSyllables,
        completedCount,
        progressPercentage,
        points: progress.points
    })

    // Update progress stats with IDs
    const completedEl = document.getElementById("completedSyllables")
    const progressEl = document.getElementById("progressPercentage")
    const pointsEl = document.getElementById("pointsEarned")
    const progressBar = document.getElementById("progressBar")

    if (completedEl) {
        completedEl.textContent = completedCount
        console.log('✅ Updated completed syllables:', completedCount)
    }
    
    if (progressEl) {
        progressEl.textContent = `${Math.round(progressPercentage)}%`
        console.log('✅ Updated progress percentage:', Math.round(progressPercentage))
    }
    
    if (pointsEl) {
        pointsEl.textContent = progress.points || 0
        console.log('✅ Updated points:', progress.points)
    }
    
    if (progressBar) {
        progressBar.style.width = `${progressPercentage}%`
        console.log('✅ Updated progress bar:', progressPercentage)
    }

    // Mark completed syllables with visual indicators
    if (progress.completed && progress.completed.length > 0) {
        this.markMasteredSyllables(progress.completed)
    }
}


  markSyllableCompleted(syllable) {
    const progress = this.loadProgress()
    if (!progress.completed.includes(syllable)) {
      progress.completed.push(syllable)
      progress.points += 50
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

document.addEventListener("DOMContentLoaded", () => {
  new LearningManager()
})
