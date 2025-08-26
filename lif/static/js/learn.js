class LearningManager {
  constructor() {
    this.currentFilter = "all"
    this.currentSearch = ""
    this.allSyllables = []
    this.initializeEventListeners()
    this.initializeProgress()
    this.initializeSearch()
    this.cacheSyllables()
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

  initializeSearch() {
    const searchInput = document.getElementById("syllableSearch")
    const clearButton = document.getElementById("clearSearch")

    if (searchInput) {
      // Real-time search with debouncing
      searchInput.addEventListener(
        "input",
        window.LipLearn.debounce((e) => {
          this.handleSearch(e.target.value)
        }, 300),
      )

      // Show/hide clear button
      searchInput.addEventListener("input", (e) => {
        if (clearButton) {
          clearButton.style.display = e.target.value ? "flex" : "none"
        }
      })

      // Handle Enter key
      searchInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault()
          this.handleSearch(e.target.value)
        }
      })
    }

    if (clearButton) {
      clearButton.addEventListener("click", () => {
        this.clearSearch()
      })
    }
  }

  cacheSyllables() {
    this.allSyllables = Array.from(document.querySelectorAll(".syllable-card")).map((card) => ({
      element: card,
      syllable: card.dataset.syllable || "",
      difficulty: card.dataset.difficulty || "1",
      text: card.textContent.toLowerCase(),
    }))
  }

  handleSearch(searchTerm) {
    this.currentSearch = searchTerm.toLowerCase().trim()
    this.filterAndDisplaySyllables()
    this.updateSearchResults()
  }

  clearSearch() {
    const searchInput = document.getElementById("syllableSearch")
    const clearButton = document.getElementById("clearSearch")

    if (searchInput) {
      searchInput.value = ""
      searchInput.focus()
    }

    if (clearButton) {
      clearButton.style.display = "none"
    }

    this.currentSearch = ""
    this.filterAndDisplaySyllables()
    this.updateSearchResults()
  }

  filterAndDisplaySyllables() {
    let visibleCount = 0

    this.allSyllables.forEach(({ element, syllable, difficulty }) => {
      const matchesSearch =
        !this.currentSearch ||
        syllable.includes(this.currentSearch) ||
        element.textContent.toLowerCase().includes(this.currentSearch)

      const matchesFilter = this.currentFilter === "all" || difficulty === this.currentFilter

      const shouldShow = matchesSearch && matchesFilter

      if (shouldShow) {
        this.showSyllableCard(element)
        visibleCount++
      } else {
        this.hideSyllableCard(element)
      }
    })

    // Show/hide no results message
    const noResultsMessage = document.getElementById("noResultsMessage")
    const syllablesGrid = document.getElementById("syllablesGrid")

    if (visibleCount === 0) {
      if (noResultsMessage) noResultsMessage.style.display = "block"
      if (syllablesGrid) syllablesGrid.style.opacity = "0.5"
    } else {
      if (noResultsMessage) noResultsMessage.style.display = "none"
      if (syllablesGrid) syllablesGrid.style.opacity = "1"
    }

    return visibleCount
  }

  showSyllableCard(element) {
    element.style.display = "block"
    element.classList.remove("hidden")

    // Trigger reflow for animation
    element.offsetHeight

    element.style.opacity = "1"
    element.style.transform = "translateY(0)"
    element.style.transition = "all 0.3s ease"
  }

  hideSyllableCard(element) {
    element.style.opacity = "0"
    element.style.transform = "translateY(20px)"
    element.style.transition = "all 0.3s ease"

    setTimeout(() => {
      if (element.style.opacity === "0") {
        element.style.display = "none"
        element.classList.add("hidden")
      }
    }, 300)
  }

  updateSearchResults() {
    const resultsInfo = document.getElementById("searchResults")
    if (!resultsInfo) return

    const visibleCount = this.filterAndDisplaySyllables()
    const totalCount = this.allSyllables.length

    let message = ""

    if (this.currentSearch && this.currentFilter !== "all") {
      message = `${visibleCount} syllables found for "${this.currentSearch}" in ${this.getDifficultyName(this.currentFilter)} level`
    } else if (this.currentSearch) {
      message = `${visibleCount} syllables found for "${this.currentSearch}"`
    } else if (this.currentFilter !== "all") {
      message = `${visibleCount} ${this.getDifficultyName(this.currentFilter)} syllables`
    } else {
      message = `${totalCount} syllables available`
    }

    resultsInfo.innerHTML = `<span class="results-count">${message}</span>`
  }

  getDifficultyName(difficulty) {
    const names = {
      1: "Beginner",
      2: "Intermediate",
      3: "Advanced",
    }
    return names[difficulty] || "Unknown"
  }

  handleFilterChange(difficulty) {
    // Update active filter button - FIXED VERSION
    document.querySelectorAll(".filter-btn").forEach((btn) => {
      btn.classList.remove("active")
    })

    // Find the button more safely
    const targetButton = document.querySelector(`[data-difficulty="${difficulty}"]`)
    if (targetButton) {
      targetButton.classList.add("active")
    } else {
      console.warn(`Filter button with difficulty "${difficulty}" not found`)
      // Fallback to "all" button if target not found
      const allButton = document.querySelector('[data-difficulty="all"]')
      if (allButton) {
        allButton.classList.add("active")
        difficulty = "all"
      }
    }

    this.currentFilter = difficulty
    this.filterAndDisplaySyllables()
    this.updateSearchResults()
  }

  clearAllFilters() {
    this.clearSearch()
    this.handleFilterChange("all")
  }

  handleCardHover(e) {
    const card = e.currentTarget
    const gifPreview = card.querySelector(".gif-preview-container")

    if (gifPreview) {
      gifPreview.style.transform = "scale(1.05)"
    }
  }

  handleCardLeave(e) {
    const card = e.currentTarget
    const gifPreview = card.querySelector(".gif-preview-container")

    if (gifPreview) {
      gifPreview.style.transform = "scale(1)"
    }
  }

  initializeProgress() {
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
    const totalSyllables = this.allSyllables.length
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
      const card = document.querySelector(`[data-syllable="${syllable}"]`)
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

// Global function for clearing all filters - IMPROVED VERSION
function clearAllFilters() {
  if (window.learningManager) {
    window.learningManager.clearAllFilters()
  } else {
    console.warn("Learning manager not initialized yet")
    // Fallback: manually reset filters
    document.querySelectorAll(".filter-btn").forEach((btn) => {
      btn.classList.remove("active")
    })
    const allButton = document.querySelector('[data-difficulty="all"]')
    if (allButton) {
      allButton.classList.add("active")
    }
  }
}

// Initialize learning manager and make it globally available
document.addEventListener("DOMContentLoaded", () => {
  // Wait a bit to ensure all elements are rendered
  setTimeout(() => {
    window.learningManager = new LearningManager()
    console.log("Learning manager initialized")
  }, 100)
})
