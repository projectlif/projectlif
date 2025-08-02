// Session and Progress Management
class SessionManager {
    constructor() {
        this.sessionInfo = null
        this.progressSyncInterval = null
        this.initializeSession()
    }

    async initializeSession() {
        try {
            console.log('🔄 Initializing session...')
            
            // Get session info from server
            const response = await fetch('/api/session/info')
            if (response.ok) {
                this.sessionInfo = await response.json()
                console.log('✅ Session initialized:', this.sessionInfo)
                console.log(`📊 Session ID: ${this.sessionInfo.user_id}`)
                console.log(`📈 Page visits: ${this.sessionInfo.page_visits}`)
                
                // Only show welcome message if server says to
                if (this.sessionInfo.show_welcome) {
                    if (this.sessionInfo.is_new_user) {
                        this.showWelcomeMessage()
                    } else {
                        this.showReturningUserMessage()
                    }
                }
                
                // Sync progress from server
                await this.syncProgressFromServer()
                
                // Start periodic progress sync
                this.startProgressSync()
                
                // Update UI with session info
                this.updateSessionUI()
            }
        } catch (error) {
            console.error('❌ Error initializing session:', error)
        }
    }

    async syncProgressFromServer() {
        try {
            console.log('🔄 Syncing progress from server...')
            
            const response = await fetch('/api/progress/get')
            if (response.ok) {
                const data = await response.json()
                console.log('📥 Server progress data:', data)
                
                // Get local progress
                const localProgress = this.getLocalProgress()
                console.log('💾 Local progress:', localProgress)
                
                // Create server progress object in expected format
                const serverProgress = {
                    completed: data.mastered_syllables || [],
                    points: data.total_points || 0,
                    total_time: 0
                }
                console.log('🔄 Formatted server progress:', serverProgress)
                
                // Merge progress
                const mergedProgress = this.mergeProgress(localProgress, serverProgress)
                console.log('🔀 Merged progress:', mergedProgress)
                
                // Save merged progress to local storage
                this.saveLocalProgress(mergedProgress)
                
                console.log('✅ Progress synced from server successfully')
            }
        } catch (error) {
            console.error('❌ Error syncing progress from server:', error)
        }
    }

    mergeProgress(local, server) {
        console.log('🔀 Merging progress:', { local, server })
        
        // Ensure both have completed arrays
        const localCompleted = local.completed || []
        const serverCompleted = server.completed || []
        
        // Merge completed syllables (union of both)
        const completedSet = new Set([...localCompleted, ...serverCompleted])
        
        const merged = {
            completed: Array.from(completedSet),
            points: Math.max(local.points || 0, server.points || 0),
            total_time: Math.max(local.total_time || 0, server.total_time || 0),
            last_updated: new Date().toISOString()
        }
        
        console.log('✅ Progress merged:', merged)
        return merged
    }

    getLocalProgress() {
        const saved = localStorage.getItem('liplearn_progress')
        const progress = saved ? JSON.parse(saved) : {
            completed: [],
            points: 0,
            total_time: 0
        }
        console.log('💾 Retrieved local progress:', progress)
        return progress
    }

saveLocalProgress(progress) {
    console.log('💾 Saving local progress:', progress)
    localStorage.setItem('liplearn_progress', JSON.stringify(progress))
    
    // Trigger custom event for other components to listen
    window.dispatchEvent(new CustomEvent('progressUpdated', {
        detail: progress
    }))
    
    // Also trigger a storage event for cross-tab communication
    localStorage.setItem('liplearn_progress_timestamp', Date.now().toString())
    
    console.log('✅ Local progress saved and events triggered')
}

    // Add method to mark syllable as mastered
    async markSyllableMastered(syllable) {
        try {
            console.log(`🎯 Marking syllable as mastered: ${syllable}`)
            
            const response = await fetch(`/api/syllable/${syllable}/master`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            })
            
            if (response.ok) {
                const result = await response.json()
                console.log('📊 Mastery result:', result)
                
                if (result.success) {
                    // Update local storage too
                    const progress = this.getLocalProgress()
                    if (!progress.completed.includes(syllable)) {
                        progress.completed.push(syllable)
                        progress.points = result.total_points
                        this.saveLocalProgress(progress)
                    }
                    
                    console.log(`✅ Syllable ${syllable} mastered! Total points: ${result.total_points}`)
                    
                    if (window.LipLearn && window.LipLearn.showNotification) {
                        window.LipLearn.showNotification(
                            `🎉 Mastered "${syllable.toUpperCase()}"! +${result.points_earned} points`,
                            "success"
                        )
                    }
                    
                    return true
                } else {
                    console.log(`ℹ️ Syllable ${syllable} already mastered`)
                }
            }
        } catch (error) {
            console.error('❌ Error marking syllable as mastered:', error)
        }
        
        return false
    }

    // Add method to save quiz score
    async saveQuizScore(scoreData) {
        try {
            console.log('🎮 Saving quiz score:', scoreData)
            
            const response = await fetch('/api/quiz/save-score', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(scoreData)
            })
            
            if (response.ok) {
                const result = await response.json()
                console.log('📊 Quiz score result:', result)
                
                if (result.success && result.is_new_high_score) {
                    console.log('🏆 New high score achieved!')
                    if (window.LipLearn && window.LipLearn.showNotification) {
                        window.LipLearn.showNotification(
                            "🏆 New High Score!",
                            "success"
                        )
                    }
                }
                
                return result
            }
        } catch (error) {
            console.error('❌ Error saving quiz score:', error)
        }
        
        return null
    }

    // Rest of the methods remain the same...
    showWelcomeMessage() {
        if (window.LipLearn && window.LipLearn.showNotification) {
            window.LipLearn.showNotification(
                "Welcome to LipLearn! Your progress will be automatically saved.",
                "success"
            )
        }
    }

    showReturningUserMessage() {
        if (window.LipLearn && window.LipLearn.showNotification) {
            window.LipLearn.showNotification(
                `Welcome back! You've visited ${this.sessionInfo.page_visits} pages this session.`,
                "info"
            )
        }
    }

    async syncProgressToServer() {
        try {
            const progress = this.getLocalProgress()
            console.log('📤 Syncing progress to server:', progress)
            
            const response = await fetch('/api/progress/sync', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(progress)
            })
            
            if (response.ok) {
                const result = await response.json()
                console.log('✅ Progress synced to server:', result)
            }
        } catch (error) {
            console.error('❌ Error syncing progress to server:', error)
        }
    }

    startProgressSync() {
        // Sync progress every 30 seconds
        this.progressSyncInterval = setInterval(() => {
            this.syncProgressToServer()
        }, 30000)
        
        // Sync when page is about to unload
        window.addEventListener('beforeunload', () => {
            this.syncProgressToServer()
        })
    }

    updateSessionUI() {
        // Update any UI elements that show session info
        const sessionElements = document.querySelectorAll('[data-session-info]')
        sessionElements.forEach(element => {
            const infoType = element.dataset.sessionInfo
            
            switch(infoType) {
                case 'user-id':
                    element.textContent = this.sessionInfo.user_id.substring(0, 8) + '...'
                    break
                case 'session-count':
                    element.textContent = this.sessionInfo.total_sessions
                    break
                case 'member-since':
                    const date = new Date(this.sessionInfo.created_at)
                    element.textContent = date.toLocaleDateString()
                    break
            }
        })
    }

    // Get user stats
    getUserStats() {
        const progress = this.getLocalProgress()
        const totalSyllables = Object.keys(window.SYLLABLES_DATA || {}).length || 8
        
        return {
            completedSyllables: progress.completed.length,
            totalSyllables: totalSyllables,
            completionPercentage: Math.round((progress.completed.length / totalSyllables) * 100),
            totalPoints: progress.points,
            sessionCount: this.sessionInfo?.total_sessions || 0,
            memberSince: this.sessionInfo?.created_at
        }
    }
}

// Initialize session manager globally
window.SessionManager = new SessionManager()