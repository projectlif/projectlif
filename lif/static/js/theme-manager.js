// Theme Management System
class ThemeManager {
  constructor() {
    this.currentTheme = this.getStoredTheme() || "dark"
    this.initializeTheme()
    this.initializeEventListeners()
    this.setupDynamicUpdates()
  }

  getStoredTheme() {
    return localStorage.getItem("liplearn_theme")
  }

  setStoredTheme(theme) {
    localStorage.setItem("liplearn_theme", theme)
  }

  initializeTheme() {
    this.applyTheme(this.currentTheme)
  }

  initializeEventListeners() {
    // Wait for DOM to be ready
    const initButton = () => {
      const themeToggle = document.getElementById("themeToggle")
      if (themeToggle) {
        themeToggle.addEventListener("click", () => {
          this.toggleTheme()
        })
        this.updateToggleButton(this.currentTheme)
      }
    }

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", initButton)
    } else {
      initButton()
    }

    // Listen for system theme changes
    if (window.matchMedia) {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
      mediaQuery.addEventListener("change", (e) => {
        if (!this.getStoredTheme()) {
          const newTheme = e.matches ? "dark" : "light"
          this.applyTheme(newTheme)
        }
      })
    }
  }

  setupDynamicUpdates() {
    // Observer for dynamically added content
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
          // Apply theme to newly added elements
          setTimeout(() => {
            this.updateTextColors(this.currentTheme)
          }, 100)
        }
      })
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    })
  }

  toggleTheme() {
    const newTheme = this.currentTheme === "dark" ? "light" : "dark"

    this.currentTheme = newTheme
    this.applyTheme(newTheme)
    this.setStoredTheme(newTheme)

    // Trigger custom event for other components
    window.dispatchEvent(
      new CustomEvent("themeChanged", {
        detail: { theme: newTheme },
      }),
    )
  }

  applyTheme(theme) {
    // Set data attribute on root element
    document.documentElement.setAttribute("data-theme", theme)

    // Force text color updates
    this.updateTextColors(theme)

    // Update toggle button
    this.updateToggleButton(theme)

    // Update meta theme-color for mobile browsers
    this.updateMetaThemeColor(theme)

    this.currentTheme = theme
  }

  updateTextColors(theme) {
    // Force update all text elements
    const textElements = document.querySelectorAll(".text-light, .text-muted, h1, h2, h3, h4, h5, h6, .card-title")

    textElements.forEach((element) => {
      if (theme === "light") {
        if (element.classList.contains("text-light")) {
          element.style.color = "#1e293b"
        }
        if (element.classList.contains("text-muted")) {
          element.style.color = "#64748b"
        }
        if (element.tagName.match(/^H[1-6]$/) || element.classList.contains("card-title")) {
          element.style.color = "#1e293b"
        }
      } else {
        // Reset to CSS defaults for dark theme
        element.style.color = ""
      }
    })

    // Update gradient text elements
    const gradientElements = document.querySelectorAll(".gradient-text")
    gradientElements.forEach((element) => {
      if (theme === "light") {
        element.style.background = "linear-gradient(135deg, #0ea5e9, #06b6d4)"
        element.style.webkitBackgroundClip = "text"
        element.style.webkitTextFillColor = "transparent"
        element.style.backgroundClip = "text"
      } else {
        element.style.background = ""
        element.style.webkitBackgroundClip = ""
        element.style.webkitTextFillColor = ""
        element.style.backgroundClip = ""
      }
    })
  }

  updateToggleButton(theme) {
    const themeIcon = document.getElementById("themeIcon")
    const themeText = document.getElementById("themeText")
    const themeToggle = document.getElementById("themeToggle")

    if (!themeIcon || !themeText || !themeToggle) return

    if (theme === "dark") {
      themeIcon.className = "fas fa-sun"
      themeText.textContent = "Light"
      themeToggle.setAttribute("aria-label", "Switch to light theme")
    } else {
      themeIcon.className = "fas fa-moon"
      themeText.textContent = "Dark"
      themeToggle.setAttribute("aria-label", "Switch to dark theme")
    }
  }

  updateMetaThemeColor(theme) {
    let metaThemeColor = document.querySelector('meta[name="theme-color"]')

    if (!metaThemeColor) {
      metaThemeColor = document.createElement("meta")
      metaThemeColor.name = "theme-color"
      document.head.appendChild(metaThemeColor)
    }

    const color = theme === "dark" ? "#0f172a" : "#f8fafc"
    metaThemeColor.content = color
  }

  // Method to get current theme for other components
  getCurrentTheme() {
    return this.currentTheme
  }

  // Method to check if dark theme is active
  isDarkTheme() {
    return this.currentTheme === "dark"
  }

  // Method to programmatically set theme
  setTheme(theme) {
    if (theme !== "dark" && theme !== "light") {
      console.warn("Invalid theme:", theme)
      return
    }

    this.currentTheme = theme
    this.applyTheme(theme)
    this.setStoredTheme(theme)
  }
}

// Handle theme persistence across page loads
document.addEventListener("DOMContentLoaded", () => {
  const storedTheme = localStorage.getItem("liplearn_theme")
  if (storedTheme) {
    document.documentElement.setAttribute("data-theme", storedTheme)
  }

  // Initialize theme manager
  window.ThemeManager = new ThemeManager()

  // Make theme manager globally available
  window.LipLearn = window.LipLearn || {}
  window.LipLearn.ThemeManager = window.ThemeManager
})
