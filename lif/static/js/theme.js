// Debug script to ensure theme button exists
console.log("🔍 Debug theme script loaded")

// Wait for DOM to be ready
document.addEventListener("DOMContentLoaded", () => {
  console.log("🔍 DOM loaded, checking for theme button")

  // Check if button exists
  let themeButton = document.getElementById("themeToggle")
  console.log("🔍 Theme button found:", !!themeButton)

  if (!themeButton) {
    console.log("🔍 Creating theme button manually")

    // Create the button
    themeButton = document.createElement("button")
    themeButton.id = "themeToggle"
    themeButton.innerHTML = `
            <i class="fas fa-sun" id="themeIcon"></i>
            <span id="themeText">Light</span>
        `

    // Add click handler
    themeButton.addEventListener("click", () => {
      console.log("🔍 Theme button clicked!")
      alert("Theme button works!")
    })

    // Add to page
    document.body.appendChild(themeButton)
  } else {
    themeButton.style.cssText = `
            z-index: 99999 !important;
            background: rgb(30, 41, 59); !important;
            color: white !important;
            padding: 10px 15px !important;
            cursor: pointer !important;
            display: block !important;
            font-size: 14px !important;
            border: none;
            font-weight: bold !important;
        `
  }

  // Log all elements with theme-related IDs or classes
  console.log("🔍 All theme elements:", {
    themeToggle: document.getElementById("themeToggle"),
    themeIcon: document.getElementById("themeIcon"),
    themeText: document.getElementById("themeText"),
    themeClass: document.querySelector(".theme-toggle"),
  })
})

// Also try after a delay
setTimeout(() => {
  console.log("🔍 Delayed check for theme button")
  const button = document.getElementById("themeToggle")
  if (button) {
    console.log("🔍 Button found after delay:", button)
    button.style.background = "blue !important"
  } else {
    console.log("🔍 Still no button after delay")
  }
}, 2000)
