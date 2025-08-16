// Main JavaScript file for LipLearn

// Global variables
const isScrolling = false
let bootstrap // Declare the bootstrap variable

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  initializeAnimations()
  initializeNavigation()
  initializeScrollEffects()
  initializeTooltips()
  initializeGifLooping()
  initializePerformanceOptimizations()
})

// Animation initialization
function initializeAnimations() {
  const observerOptions = {
    threshold: 0.1,
    rootMargin: "0px 0px -50px 0px",
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible")

        // Add staggered animation delay for multiple elements
        const siblings = Array.from(entry.target.parentNode.children)
        const index = siblings.indexOf(entry.target)
        entry.target.style.animationDelay = `${index * 0.1}s`
      }
    })
  }, observerOptions)

  // Observe all elements with animate-on-scroll class
  document.querySelectorAll(".animate-on-scroll").forEach((el) => {
    observer.observe(el)
  })
}

// Enhanced navigation functionality
function initializeNavigation() {
  const navbar = document.querySelector(".navbar")

  // Add scroll effect to navbar with backdrop blur
  window.addEventListener("scroll", () => {
    if (window.scrollY > 50) {
      navbar.classList.add("scrolled")
      navbar.style.backdropFilter = "blur(10px)"
      navbar.style.webkitBackdropFilter = "blur(10px)"
      navbar.style.backgroundColor = "rgba(15, 23, 42, 0.9)"
    } else {
      navbar.classList.remove("scrolled")
      navbar.style.backdropFilter = ""
      navbar.style.webkitBackdropFilter = ""
      navbar.style.backgroundColor = ""
    }
  })

  // Enhanced mobile menu handling
  const navbarToggler = document.querySelector(".navbar-toggler")
  const navbarCollapse = document.querySelector(".navbar-collapse")

  if (navbarToggler && navbarCollapse) {
    // Toggle menu with proper ARIA attributes
    navbarToggler.addEventListener("click", () => {
      const isExpanded = navbarToggler.getAttribute("aria-expanded") === "true"
      navbarToggler.setAttribute("aria-expanded", !isExpanded)
      navbarCollapse.classList.toggle("show")
      navbarToggler.classList.toggle("collapsed")

      // Add body scroll lock when menu is open on mobile
      if (window.innerWidth <= 991) {
        document.body.style.overflow = navbarCollapse.classList.contains("show") ? "hidden" : ""
      }
    })

    // Close mobile menu when clicking on links
    document.querySelectorAll(".nav-link").forEach((link) => {
      link.addEventListener("click", () => {
        navbarCollapse.classList.remove("show")
        navbarToggler.setAttribute("aria-expanded", "false")
        navbarToggler.classList.add("collapsed")
        document.body.style.overflow = "" // Restore scroll
      })
    })

    // Close menu when clicking outside
    document.addEventListener("click", (e) => {
      const isClickInsideNav = navbar.contains(e.target)
      const isMenuOpen = navbarCollapse.classList.contains("show")

      if (!isClickInsideNav && isMenuOpen) {
        navbarCollapse.classList.remove("show")
        navbarToggler.setAttribute("aria-expanded", "false")
        navbarToggler.classList.add("collapsed")
        document.body.style.overflow = ""
      }
    })

    // Handle escape key to close menu
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && navbarCollapse.classList.contains("show")) {
        navbarCollapse.classList.remove("show")
        navbarToggler.setAttribute("aria-expanded", "false")
        navbarToggler.classList.add("collapsed")
        navbarToggler.focus() // Return focus to toggle button
        document.body.style.overflow = ""
      }
    })

    // Handle window resize
    window.addEventListener("resize", () => {
      if (window.innerWidth > 991) {
        navbarCollapse.classList.remove("show")
        navbarToggler.setAttribute("aria-expanded", "false")
        navbarToggler.classList.add("collapsed")
        document.body.style.overflow = ""
      }
    })
  }

  // Add active page highlighting
  highlightActivePage()
}

// Highlight active navigation item
function highlightActivePage() {
  const currentPath = window.location.pathname
  const navLinks = document.querySelectorAll(".nav-link")

  navLinks.forEach((link) => {
    try {
      // Skip links that don't have valid hrefs or are just anchors
      if (!link.href || link.href === "#" || link.href.startsWith("#")) {
        return
      }

      const linkPath = new URL(link.href).pathname
      if (linkPath === currentPath) {
        link.classList.add("active")
        link.setAttribute("aria-current", "page")
      } else {
        link.classList.remove("active")
        link.removeAttribute("aria-current")
      }
    } catch (error) {
      // Skip invalid URLs silently
      console.warn("Invalid URL found in navigation:", link.href)
    }
  })
}

// Enhanced scroll effects
function initializeScrollEffects() {
  // Smooth scrolling for anchor links
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", function (e) {
      e.preventDefault()
      const target = document.querySelector(this.getAttribute("href"))
      if (target) {
        const navbarHeight = document.querySelector(".navbar").offsetHeight
        const targetPosition = target.offsetTop - navbarHeight - 20

        window.scrollTo({
          top: targetPosition,
          behavior: "smooth",
        })
      }
    })
  })

  // Enhanced parallax effect for hero section
  const heroSection = document.querySelector(".hero-section")
  if (heroSection) {
    let ticking = false

    const updateParallax = () => {
      const scrolled = window.pageYOffset
      const rate = scrolled * -0.3
      heroSection.style.transform = `translateY(${rate}px)`
      ticking = false
    }

    window.addEventListener("scroll", () => {
      if (!ticking) {
        requestAnimationFrame(updateParallax)
        ticking = true
      }
    })
  }

  // Add scroll-to-top button
  addScrollToTopButton()
}

// Add scroll-to-top functionality
function addScrollToTopButton() {
  const scrollButton = document.createElement("button")
  scrollButton.innerHTML = '<i class="fas fa-arrow-up"></i>'
  scrollButton.className = "scroll-to-top"
  scrollButton.setAttribute("aria-label", "Scroll to top")
  scrollButton.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    width: 50px;
    height: 50px;
    border-radius: 50%;
    background: var(--gradient-primary);
    border: none;
    color: white;
    font-size: 1.2rem;
    cursor: pointer;
    opacity: 0;
    visibility: hidden;
    transition: all 0.3s ease;
    z-index: 1000;
    box-shadow: var(--shadow-lg);
  `

  document.body.appendChild(scrollButton)

  // Show/hide scroll button based on scroll position
  window.addEventListener("scroll", () => {
    if (window.pageYOffset > 300) {
      scrollButton.style.opacity = "1"
      scrollButton.style.visibility = "visible"
    } else {
      scrollButton.style.opacity = "0"
      scrollButton.style.visibility = "hidden"
    }
  })

  // Scroll to top when clicked
  scrollButton.addEventListener("click", () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    })
  })

  // Hover effects
  scrollButton.addEventListener("mouseenter", () => {
    scrollButton.style.transform = "scale(1.1)"
  })

  scrollButton.addEventListener("mouseleave", () => {
    scrollButton.style.transform = "scale(1)"
  })
}

// Initialize tooltips
function initializeTooltips() {
  if (typeof bootstrap !== "undefined") {
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'))
    tooltipTriggerList.map((tooltipTriggerEl) => new bootstrap.Tooltip(tooltipTriggerEl))
  }
}

// Enhanced GIF looping functionality
function initializeGifLooping() {
  const makeGifInfinite = (img) => {
    const originalSrc = img.src.split("?")[0]

    const restartGif = () => {
      if (img.parentNode && !img.dataset.paused) {
        const timestamp = new Date().getTime()
        img.src = `${originalSrc}?t=${timestamp}`
      }
    }

    // Set up automatic restart
    img.onload = () => {
      setTimeout(restartGif, 3000) // Restart every 3 seconds
    }

    // Add pause/play functionality on click
    img.addEventListener("click", () => {
      if (img.dataset.paused === "true") {
        img.dataset.paused = "false"
        restartGif()
        showNotification("GIF resumed", "info")
      } else {
        img.dataset.paused = "true"
        showNotification("GIF paused - click to resume", "info")
      }
    })

    // Add hover effects
    img.style.cursor = "pointer"
    img.title = "Click to pause/resume"
  }

  // Initialize existing GIFs and watch for new ones
  const initializeGifs = () => {
    document.querySelectorAll('img[src*=".gif"]').forEach((img) => {
      if (!img.dataset.infiniteSetup) {
        img.dataset.infiniteSetup = "true"
        makeGifInfinite(img)
      }
    })
  }

  // Initial setup
  initializeGifs()

  // Watch for dynamically added GIFs
  const observer = new MutationObserver(() => {
    initializeGifs()
  })

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  })
}

// Performance optimizations
function initializePerformanceOptimizations() {
  // Lazy load images
  if ("IntersectionObserver" in window) {
    const imageObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const img = entry.target
          if (img.dataset.src) {
            img.src = img.dataset.src
            img.removeAttribute("data-src")
            imageObserver.unobserve(img)
          }
        }
      })
    })

    document.querySelectorAll("img[data-src]").forEach((img) => {
      imageObserver.observe(img)
    })
  }

  // Preload critical resources
  const preloadLinks = ["/static/css/style.css", "/static/js/theme-manager.js"]

  preloadLinks.forEach((href) => {
    const link = document.createElement("link")
    link.rel = "preload"
    link.href = href
    link.as = href.endsWith(".css") ? "style" : "script"
    document.head.appendChild(link)
  })
}

// Enhanced notification system
function showNotification(message, type = "info", duration = 5000) {
  // Remove existing notifications of the same type
  document.querySelectorAll(`.alert-${type}`).forEach((alert) => {
    alert.remove()
  })

  const notification = document.createElement("div")
  notification.className = `alert alert-${type} alert-dismissible fade show position-fixed`
  notification.style.cssText = `
    top: 100px; 
    right: 20px; 
    z-index: 9999; 
    min-width: 300px;
    max-width: 400px;
    animation: slideInFromRight 0.3s ease-out;
  `

  const icon = getNotificationIcon(type)
  notification.innerHTML = `
    <div class="d-flex align-items-center">
      <i class="${icon} me-2"></i>
      <span>${message}</span>
      <button type="button" class="btn-close ms-auto" data-bs-dismiss="alert" aria-label="Close"></button>
    </div>
  `

  document.body.appendChild(notification)

  // Auto remove after specified duration
  setTimeout(() => {
    if (notification.parentNode) {
      notification.style.animation = "slideOutToRight 0.3s ease-in"
      setTimeout(() => notification.remove(), 300)
    }
  }, duration)

  return notification
}

// Get appropriate icon for notification type
function getNotificationIcon(type) {
  const icons = {
    success: "fas fa-check-circle",
    danger: "fas fa-exclamation-triangle",
    warning: "fas fa-exclamation-circle",
    info: "fas fa-info-circle",
  }
  return icons[type] || icons.info
}

// Enhanced time formatting
function formatTime(seconds) {
  const hours = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  if (hours > 0) {
    return `${hours}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
}

// Enhanced debounce function
function debounce(func, wait, immediate = false) {
  let timeout
  return function executedFunction(...args) {
    const later = () => {
      timeout = null
      if (!immediate) func(...args)
    }
    const callNow = immediate && !timeout
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
    if (callNow) func(...args)
  }
}

// Throttle function for performance-critical events
function throttle(func, limit) {
  let inThrottle
  return function (...args) {
    if (!inThrottle) {
      func.apply(this, args)
      inThrottle = true
      setTimeout(() => (inThrottle = false), limit)
    }
  }
}

// Device detection utilities
function isMobile() {
  return window.innerWidth <= 768
}

function isTablet() {
  return window.innerWidth > 768 && window.innerWidth <= 1024
}

function isDesktop() {
  return window.innerWidth > 1024
}

// Local storage utilities
function saveToStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch (error) {
    console.warn("Failed to save to localStorage:", error)
    return false
  }
}

function loadFromStorage(key, defaultValue = null) {
  try {
    const item = localStorage.getItem(key)
    return item ? JSON.parse(item) : defaultValue
  } catch (error) {
    console.warn("Failed to load from localStorage:", error)
    return defaultValue
  }
}

// Add CSS animations for notifications
const style = document.createElement("style")
style.textContent = `
  @keyframes slideInFromRight {
    from {
      opacity: 0;
      transform: translateX(100%);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  @keyframes slideOutToRight {
    from {
      opacity: 1;
      transform: translateX(0);
    }
    to {
      opacity: 0;
      transform: translateX(100%);
    }
  }

  .nav-link.active {
    color: var(--primary-color) !important;
    font-weight: 600;
  }

  .scroll-to-top:hover {
    transform: scale(1.1) !important;
  }
`
document.head.appendChild(style)

// Export enhanced functions for use in other scripts
window.LipLearn = {
  showNotification,
  formatTime,
  debounce,
  throttle,
  isMobile,
  isTablet,
  isDesktop,
  saveToStorage,
  loadFromStorage,
}

// Add error handling for the entire application
window.addEventListener("error", (event) => {
  console.error("Application error:", event.error)
  showNotification("An error occurred. Please refresh the page if issues persist.", "danger")
})

// Add unhandled promise rejection handling
window.addEventListener("unhandledrejection", (event) => {
  console.error("Unhandled promise rejection:", event.reason)
  showNotification("A network error occurred. Please check your connection.", "warning")
})
