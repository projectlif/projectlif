let isScrolling = false
let bootstrap 

document.addEventListener("DOMContentLoaded", () => {
  initializeAnimations()
  initializeNavigation()
  initializeScrollEffects()
  initializeTooltips()
})

function initializeAnimations() {
  const observerOptions = {
    threshold: 0.1,
    rootMargin: "0px 0px -50px 0px",
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible")
      }
    })
  }, observerOptions)

  document.querySelectorAll(".animate-on-scroll").forEach((el) => {
    observer.observe(el)
  })
}

function initializeNavigation() {
  const navbar = document.querySelector(".navbar")

  window.addEventListener("scroll", () => {
    if (window.scrollY > 50) {
      navbar.classList.add("scrolled")
    } else {
      navbar.classList.remove("scrolled")
    }
  })
  const navbarToggler = document.querySelector(".navbar-toggler")
  const navbarCollapse = document.querySelector(".navbar-collapse")

  if (navbarToggler && navbarCollapse) {
    navbarToggler.addEventListener("click", () => {
      navbarCollapse.classList.toggle("show")
    })

    document.querySelectorAll(".nav-link").forEach((link) => {
      link.addEventListener("click", () => {
        navbarCollapse.classList.remove("show")
      })
    })
  }
}

function initializeScrollEffects() {
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", function (e) {
      e.preventDefault()
      const target = document.querySelector(this.getAttribute("href"))
      if (target) {
        target.scrollIntoView({
          behavior: "smooth",
          block: "start",
        })
      }
    })
  })

  const heroSection = document.querySelector(".hero-section")
  if (heroSection) {
    window.addEventListener("scroll", () => {
      if (!isScrolling) {
        requestAnimationFrame(() => {
          const scrolled = window.pageYOffset
          const rate = scrolled * -0.5
          heroSection.style.transform = `translateY(${rate}px)`
          isScrolling = false
        })
        isScrolling = true
      }
    })
  }
}

function initializeTooltips() {
  if (typeof bootstrap !== "undefined") {
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'))
    tooltipTriggerList.map((tooltipTriggerEl) => new bootstrap.Tooltip(tooltipTriggerEl))
  }
}

function showNotification(message, type = "info") {
  const notification = document.createElement("div")
  notification.className = `alert alert-${type} alert-dismissible fade show position-fixed`
  notification.style.cssText = "top: 100px; right: 20px; z-index: 9999; min-width: 300px;"
  notification.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `

  document.body.appendChild(notification)

  setTimeout(() => {
    if (notification.parentNode) {
      notification.remove()
    }
  }, 5000)
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
}

function debounce(func, wait) {
  let timeout
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

function makeGifInfinite(img) {
    const originalSrc = img.src.split('?')[0]; 
    
    img.onload = function() {
        setTimeout(() => {
            if (img.parentNode) { 
                const timestamp = new Date().getTime();
                img.src = `${originalSrc}?t=${timestamp}`;
            }
        }, 3000);
    };
}

document.addEventListener('DOMContentLoaded', function() {
    setInterval(() => {
        document.querySelectorAll('img[src*=".gif"]').forEach(img => {
            if (!img.dataset.infiniteSetup) {
                img.dataset.infiniteSetup = 'true';
                makeGifInfinite(img);
            }
        });
    }, 1000);
});

window.LipLearn = {
  showNotification,
  formatTime,
  debounce,
}
