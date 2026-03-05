/**
 * Personal Study Hub - Modern Colorful Design
 * A lightweight app for organizing class notes and video lectures
 * Integrates with Supabase for cloud storage
 */

// ============================================
// Global Variables
// ============================================
let isAdminUnlocked = sessionStorage.getItem('adminUnlocked') === 'true';
console.log('Initial admin state:', isAdminUnlocked);

// ============================================
// Supabase Configuration
// ============================================
const SUPABASE_URL = 'https://vmjcoenomgcqisxbvznh.supabase.co';
const SUPABASE_KEY = 'sb_publishable_htZ81L9cM67EcvPK9RL_tg_6NOyEWW8';

// Use different variable name to avoid conflict with Supabase library global
let supabaseClient = null;
(function() {
  try {
    if (typeof window !== 'undefined' && typeof window.supabase !== 'undefined') {
      supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
      console.log('Supabase connected');
    }
  } catch (e) {
    console.log('Supabase not available:', e.message);
  }
})();

// ============================================
// Data Store & LocalStorage Keys
// ============================================
const STORAGE_KEYS = {
    SUBJECTS: 'psh_subjects',
    NOTES: 'psh_notes',
    VIDEOS: 'psh_videos',
    PLANS: 'psh_plans',
    REMINDERS: 'psh_reminders',
    TODOS: 'psh_todos',
    SETTINGS: 'psh_settings'
};

// Default data
const defaultSubjects = [
    { id: 'math', name: 'Mathematics', color: '#6366f1' },
    { id: 'physics', name: 'Physics', color: '#ec4899' },
    { id: 'chemistry', name: 'Chemistry', color: '#10b981' }
];

const defaultSettings = {
    notificationsEnabled: false,
    adminMode: true
};

// ============================================
// State Management
// ============================================
let appState = {
    subjects: [],
    notes: [],
    videos: [],
    essays: [],
    plans: [],
    reminders: [],
    todos: [],
    settings: {},
    currentTab: 'home',
    currentMonth: new Date()
};

// ============================================
// Pre-define switchTab globally to avoid issues
// ============================================
window.switchTab = function(tabName) {
    showTab(tabName);
};

// ============================================
// Initialization
// ============================================
// Service Worker Registration for PWA
// ============================================
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then((registration) => {
                console.log('ServiceWorker registered: ', registration.scope);
                
                // Check for updates
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            // New update available
                            if (confirm('A new version is available. Reload to update?')) {
                                window.location.reload();
                            }
                        }
                    });
                });
            })
            .catch((error) => {
                console.error('ServiceWorker registration failed: ', error);
            });
    });
}

// ============================================
document.addEventListener('DOMContentLoaded', () => {
    // Check if user is already logged in
    const isLoggedIn = sessionStorage.getItem('appLoggedIn') === 'true';
    
    // Get DOM elements for login screen
    const loginScreen = document.getElementById('appLoginScreen');
    const appContainer = document.querySelector('.app-container');
    const loginIdInput = document.getElementById('appLoginId');
    const loginPasswordInput = document.getElementById('appLoginPassword');
    const loginBtn = document.getElementById('appLoginBtn');
    const loginError = document.getElementById('appLoginError');
    
    // Function to verify user login
    window.verifyUserLogin = async function(username, password) {
        if (!supabaseClient) {
            console.log('Supabase not connected, using fallback');
            // Fallback to default credentials if Supabase not connected
            if (username === '220101' && password === '179084') {
                return { success: true };
            }
            return { success: false, error: 'Supabase not connected' };
        }
        
        try {
            const { data, error } = await supabaseClient
                .from('login_credentials')
                .select('*')
                .eq('username', username)
                .eq('password', password)
                .single();
            
            if (error) {
                console.log('Login error:', error);
                return { success: false, error: 'Invalid credentials' };
            }
            
            if (data) {
                return { success: true, data: data };
            }
            
            return { success: false, error: 'Invalid credentials' };
        } catch (e) {
            console.log('Login exception:', e);
            return { success: false, error: 'Login failed' };
        }
    };
    
    // Function to show main app
    window.showMainApp = function() {
        console.log('showMainApp called');
        if (loginScreen) {
            loginScreen.style.display = 'none';
            console.log('Hidden login screen');
        }
        if (appContainer) {
            appContainer.style.display = '';
            console.log('Shown app container');
        }
        // Small delay to ensure DOM is visible before initializing
        setTimeout(() => {
            console.log('Calling initializeApp...');
            initializeApp();
        }, 50);
    };
    
    // Handle login button click
    if (loginBtn) {
        loginBtn.addEventListener('click', async () => {
            const username = loginIdInput ? loginIdInput.value.trim() : '';
            const password = loginPasswordInput ? loginPasswordInput.value.trim() : '';
            
            if (!username || !password) {
                if (loginError) {
                    loginError.textContent = 'Please enter ID and Password';
                    loginError.style.display = 'block';
                }
                return;
            }
            
            // Disable button during login
            loginBtn.disabled = true;
            loginBtn.textContent = 'Logging in...';
            
            const result = await window.verifyUserLogin(username, password);
            
            if (result.success) {
                sessionStorage.setItem('appLoggedIn', 'true');
                window.showMainApp();
            } else {
                if (loginError) {
                    loginError.textContent = result.error || 'Invalid ID or Password';
                    loginError.style.display = 'block';
                }
                if (loginPasswordInput) loginPasswordInput.value = '';
                loginBtn.disabled = false;
                loginBtn.textContent = 'Login';
            }
        });
    }
    
    // Handle Enter key in login inputs
    if (loginIdInput) {
        loginIdInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                loginPasswordInput.focus();
            }
        });
    }
    
    if (loginPasswordInput) {
        loginPasswordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && loginBtn) {
                loginBtn.click();
            }
        });
    }
    
    // If already logged in, show main app
    if (isLoggedIn) {
        console.log('User already logged in, showing main app');
        setTimeout(() => {
            window.showMainApp();
        }, 50);
    } else {
        console.log('User not logged in, showing login screen');
        // Hide the main app until logged in
        if (appContainer) appContainer.style.display = 'none';
    }
    
    // Handle fullscreen changes to restore header visibility
    document.addEventListener('fullscreenchange', () => {
        if (!document.fullscreenElement) {
            const header = document.querySelector('.viewer-header');
            const controls = document.getElementById('customControls');
            
            if (header) {
                header.style.opacity = '';
                header.style.pointerEvents = '';
                header.classList.remove('auto-hide');
            }
            
            if (controls) {
                controls.style.opacity = '';
                controls.style.pointerEvents = '';
                controls.classList.remove('auto-hide');
            }
            
            // Unlock orientation when exiting fullscreen
            if (screen.orientation && screen.orientation.unlock) {
                screen.orientation.unlock();
            }
        }
    });
    
    // Also handle webkit fullscreen change
    document.addEventListener('webkitfullscreenchange', () => {
        const header = document.querySelector('.viewer-header');
        const controls = document.getElementById('customControls');
        
        if (header && !document.webkitFullscreenElement) {
            header.style.opacity = '';
            header.style.pointerEvents = '';
            header.classList.remove('auto-hide');
        }
        
        if (controls && !document.webkitFullscreenElement) {
            controls.style.opacity = '';
            controls.style.pointerEvents = '';
            controls.classList.remove('auto-hide');
        }
    });
    
    // Verify login credentials from Supabase
    window.verifyLoginCredentials = async function(username, password) {
        if (!supabaseClient) {
            console.log('Supabase not connected, using fallback');
            // Fallback to default credentials if Supabase not connected
            if (username === '220101' && password === '179084') {
                return { success: true };
            }
            return { success: false, error: 'Supabase not connected' };
        }
        
        try {
            const { data, error } = await supabaseClient
                .from('login_credentials')
                .select('*')
                .eq('username', username)
                .eq('password', password)
                .single();
            
            if (error) {
                console.log('Login error:', error);
                return { success: false, error: 'Invalid credentials' };
            }
            
            if (data) {
                return { success: true };
            }
            
            return { success: false, error: 'Invalid credentials' };
        } catch (e) {
            console.log('Login exception:', e);
            return { success: false, error: 'Login failed' };
        }
    };
});

function initializeApp() {
    loadData();
    setupEventListeners();
    setupNavigation();
    setupSubTabs();
    renderCalendar();
    renderAll();
    checkReminders();
    
    // Initialize view preferences
    initializeViews();
    
    // Re-initialize Lucide icons after DOM is ready
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
    
    // Initialize admin panel state (delayed to ensure all functions are defined)
    setTimeout(() => {
        if (isAdminUnlocked) {
            if (typeof showAdminPanel === 'function') {
                showAdminPanel();
            }
        } else {
            if (typeof showAdminLockScreen === 'function') {
                showAdminLockScreen();
            }
        }
    }, 100);
}

// Initialize view preferences
function initializeViews() {
    // Notes view
    const notesView = appState.settings?.notesView || 'grid';
    const notesContainer = document.getElementById('notesGrid');
    if (notesContainer) {
        if (notesView === 'list') {
            notesContainer.classList.add('list-view', 'notes-list');
        } else {
            notesContainer.classList.remove('list-view', 'notes-list');
        }
    }
    document.querySelectorAll('#notesTab .view-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.view === notesView) {
            btn.classList.add('active');
        }
    });
    
    // Videos view
    const videosView = appState.settings?.videosView || 'grid';
    const videosContainer = document.getElementById('videosGrid');
    if (videosContainer) {
        if (videosView === 'list') {
            videosContainer.classList.add('list-view', 'videos-list');
        } else {
            videosContainer.classList.remove('list-view', 'videos-list');
        }
    }
    document.querySelectorAll('#videosTab .view-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.view === videosView) {
            btn.classList.add('active');
        }
    });
    
    // Add view toggle event listeners
    document.querySelectorAll('#notesTab .view-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            setNotesView(this.dataset.view);
        });
    });
    
    document.querySelectorAll('#videosTab .view-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            setVideosView(this.dataset.view);
        });
    });
}

// Load data from localStorage or Supabase
async function loadData() {
    console.log('Loading data...');
    console.log('Supabase client available:', !!supabaseClient);
    
    // Try to load from Supabase first
    if (supabaseClient) {
        try {
            console.log('Attempting to load from Supabase...');
            const { data: remoteData, error } = await supabaseClient
                .from('app_data')
                .select('*')
                .eq('id', 'main')
                .single();
            
            console.log('Supabase response:', { data: remoteData, error });
            
            if (!error && remoteData) {
                appState.subjects = remoteData.subjects || defaultSubjects;
                appState.notes = remoteData.notes || [];
                appState.videos = remoteData.videos || [];
                appState.essays = remoteData.essays || [];
                appState.plans = remoteData.plans || [];
                appState.reminders = remoteData.reminders || [];
                appState.todos = remoteData.todos || [];
                appState.settings = remoteData.settings || defaultSettings;
                console.log('Loaded from Supabase');
                
                // Populate settings inputs
                const adminModeToggle = document.getElementById('adminModeToggle');
                if (adminModeToggle) adminModeToggle.checked = appState.settings?.adminMode === true;
                
                // Set admin elements visibility based on PIN status
                const isAdminModeOn = appState.settings?.adminMode === true;
                const isAdmin = isAdminUnlocked || isAdminModeOn;
                toggleAdminElements(isAdmin);
                return;
            }
        } catch (e) {
            console.log('Supabase fetch failed, using localStorage:', e);
        }
    } else {
        console.log('No Supabase client, using localStorage');
    }
    
    // Fallback to localStorage
    try {
        appState.subjects = JSON.parse(localStorage.getItem(STORAGE_KEYS.SUBJECTS)) || defaultSubjects;
        appState.notes = JSON.parse(localStorage.getItem(STORAGE_KEYS.NOTES)) || [];
        appState.videos = JSON.parse(localStorage.getItem(STORAGE_KEYS.VIDEOS)) || [];
        appState.essays = JSON.parse(localStorage.getItem('appEssays')) || [];
        appState.plans = JSON.parse(localStorage.getItem(STORAGE_KEYS.PLANS)) || [];
        appState.reminders = JSON.parse(localStorage.getItem(STORAGE_KEYS.REMINDERS)) || [];
        appState.todos = JSON.parse(localStorage.getItem(STORAGE_KEYS.TODOS)) || [];
        appState.settings = JSON.parse(localStorage.getItem(STORAGE_KEYS.SETTINGS)) || defaultSettings;
        
        // Populate settings inputs
        const adminModeToggle = document.getElementById('adminModeToggle');
        if (adminModeToggle) adminModeToggle.checked = appState.settings?.adminMode === true;
        
        // Set admin elements visibility based on PIN status
        const isAdminModeOn = appState.settings?.adminMode === true;
        const isAdmin = isAdminUnlocked || isAdminModeOn;
        toggleAdminElements(isAdmin);
    } catch (e) {
        console.error('Error loading data:', e);
        showToast('Error loading data', 'error');
    }
}

// Save data to localStorage and Supabase
async function saveData() {
    // Always save to localStorage as backup
    try {
        localStorage.setItem(STORAGE_KEYS.SUBJECTS, JSON.stringify(appState.subjects));
        localStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify(appState.notes));
        localStorage.setItem(STORAGE_KEYS.VIDEOS, JSON.stringify(appState.videos));
        localStorage.setItem('appEssays', JSON.stringify(appState.essays));
        localStorage.setItem(STORAGE_KEYS.PLANS, JSON.stringify(appState.plans));
        localStorage.setItem(STORAGE_KEYS.REMINDERS, JSON.stringify(appState.reminders));
        localStorage.setItem(STORAGE_KEYS.TODOS, JSON.stringify(appState.todos));
        localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(appState.settings));
    } catch (e) {
        console.error('Error saving to localStorage:', e);
    }
    
    // Try to save to Supabase
    if (supabaseClient) {
        try {
            const dataToSave = {
                id: 'main',
                subjects: appState.subjects,
                notes: appState.notes,
                videos: appState.videos,
                essays: appState.essays,
                plans: appState.plans,
                reminders: appState.reminders,
                todos: appState.todos,
                settings: appState.settings,
                updated_at: new Date().toISOString()
            };
            
            // Try to update, if not exists then insert
            const { error } = await supabaseClient
                .from('app_data')
                .upsert(dataToSave, { onConflict: 'id' });
            
            if (error) {
                console.log('Supabase save note: Could not save to cloud (table may not exist)');
            } else {
                console.log('Saved to Supabase');
            }
        } catch (e) {
            console.log('Supabase save error:', e);
        }
    }
}

// ============================================
// Toggle Admin Elements
// ============================================
function toggleAdminElements(forceAdmin) {
    console.log('toggleAdminElements called, isAdminUnlocked:', isAdminUnlocked, 'forceAdmin:', forceAdmin);
    
    // Use the forceAdmin parameter if provided, otherwise determine from state
    // forceAdmin is passed from showAdminPanel/showAdminLockScreen
    let isAdmin = false;
    if (typeof forceAdmin === 'boolean') {
        isAdmin = forceAdmin;
    } else {
        // Check both session state and settings for admin
        const isAdminModeOn = appState.settings?.adminMode === true;
        isAdmin = isAdminUnlocked || isAdminModeOn;
    }
    
    console.log('Final isAdmin:', isAdmin);
    
    // Hide/Show Add buttons for Notes and Videos
    const addNoteBtn = document.getElementById('addNoteBtn');
    const addVideoBtn = document.getElementById('addVideoBtn');
    
    if (addNoteBtn) {
        addNoteBtn.style.display = isAdmin ? 'flex' : 'none';
        console.log('addNoteBtn display set to:', addNoteBtn.style.display);
    } else {
        console.log('addNoteBtn not found in DOM');
    }
    if (addVideoBtn) {
        addVideoBtn.style.display = isAdmin ? 'flex' : 'none';
        console.log('addVideoBtn display set to:', addVideoBtn.style.display);
    } else {
        console.log('addVideoBtn not found in DOM');
    }
    
    // Hide/Show Add button for Essays
    const addEssayBtn = document.getElementById('addEssayBtn');
    if (addEssayBtn) {
        addEssayBtn.style.display = isAdmin ? 'flex' : 'none';
        console.log('addEssayBtn display set to:', addEssayBtn.style.display);
    } else {
        console.log('addEssayBtn not found in DOM');
    }
    
    // Hide/Show Settings sections (except admin section which is always visible)
    const settingsSections = document.querySelectorAll('#settingsTab .settings-section');
    settingsSections.forEach(section => {
        const isAdminSection = section.classList.contains('admin-section');
        if (!isAdminSection) {
            section.style.display = isAdmin ? '' : 'none';
        }
    });
    
    // Re-render essays grid to show/hide edit and delete buttons
    if (typeof renderEssaysGrid === 'function') {
        renderEssaysGrid();
    }
}

// ============================================
// Event Listeners Setup
// ============================================
function setupEventListeners() {
    // Note Modal
    const noteForm = document.getElementById('noteForm');
    if (noteForm) noteForm.addEventListener('submit', handleNoteSubmit);
    const addNoteBtn = document.getElementById('addNoteBtn');
    if (addNoteBtn) addNoteBtn.addEventListener('click', () => openModal('noteModal'));
    
    // Auto-fill title from URL for Notes
    const noteFileUrl = document.getElementById('noteFileUrl');
    const noteTitle = document.getElementById('noteTitle');
    const noteDescription = document.getElementById('noteDescription');
    if (noteFileUrl && noteTitle) {
        noteFileUrl.addEventListener('change', () => autoFillTitleFromUrl(noteFileUrl, noteTitle, noteDescription, 'note'));
        noteFileUrl.addEventListener('blur', () => autoFillTitleFromUrl(noteFileUrl, noteTitle, noteDescription, 'note'));
    }

    // Video Modal
    const videoForm = document.getElementById('videoForm');
    if (videoForm) videoForm.addEventListener('submit', handleVideoSubmit);
    const addVideoBtn = document.getElementById('addVideoBtn');
    if (addVideoBtn) addVideoBtn.addEventListener('click', () => openModal('videoModal'));
    
    // Auto-fill title from URL for Videos
    const videoUrl = document.getElementById('videoUrl');
    const videoTitle = document.getElementById('videoTitle');
    const videoDescription = document.getElementById('videoDescription');
    if (videoUrl && videoTitle) {
        videoUrl.addEventListener('change', () => autoFillTitleFromUrl(videoUrl, videoTitle, videoDescription, 'video'));
        videoUrl.addEventListener('blur', () => autoFillTitleFromUrl(videoUrl, videoTitle, videoDescription, 'video'));
    }

    // Plan Modal
    const planForm = document.getElementById('planForm');
    if (planForm) planForm.addEventListener('submit', handlePlanSubmit);
    const addPlanBtn = document.getElementById('addPlanBtn');
    if (addPlanBtn) addPlanBtn.addEventListener('click', () => openModal('planModal'));
    
    // New planning add button in hero
    const planningAddBtn = document.getElementById('planningAddBtn');
    if (planningAddBtn) planningAddBtn.addEventListener('click', () => openModal('planModal'));
    
    // Add Reel button
    const addReelBtn = document.getElementById('addReelBtn');
    if (addReelBtn) addReelBtn.addEventListener('click', () => openModal('reelModal'));
    
    // Reel Modal
    const reelForm = document.getElementById('reelForm');
    if (reelForm) reelForm.addEventListener('submit', handleReelSubmit);

    // Reminder Modal
    const reminderForm = document.getElementById('reminderForm');
    if (reminderForm) reminderForm.addEventListener('submit', handleReminderSubmit);
    const addReminderBtn = document.getElementById('addReminderBtn');
    if (addReminderBtn) addReminderBtn.addEventListener('click', () => openModal('reminderModal'));

    // Todo Modal
    const todoForm = document.getElementById('todoForm');
    if (todoForm) todoForm.addEventListener('submit', handleTodoSubmit);
    const addTodoBtn = document.getElementById('addTodoBtn');
    if (addTodoBtn) addTodoBtn.addEventListener('click', () => openModal('todoModal'));

    // Settings
    const addSubjectBtn = document.getElementById('addSubjectBtn');
    if (addSubjectBtn) addSubjectBtn.addEventListener('click', handleAddSubject);
    const exportDataBtn = document.getElementById('exportDataBtn');
    if (exportDataBtn) exportDataBtn.addEventListener('click', exportData);
    const importDataBtn = document.getElementById('importDataBtn');
    if (importDataBtn) importDataBtn.addEventListener('click', () => document.getElementById('importFileInput').click());
    const importFileInput = document.getElementById('importFileInput');
    if (importFileInput) importFileInput.addEventListener('change', importData);
    const clearDataBtn = document.getElementById('clearDataBtn');
    if (clearDataBtn) clearDataBtn.addEventListener('click', clearAllData);
    const enableNotificationsBtn = document.getElementById('enableNotificationsBtn');
    if (enableNotificationsBtn) enableNotificationsBtn.addEventListener('click', enableNotifications);

    // Search
    const searchBtn = document.getElementById('searchBtn');
    if (searchBtn) searchBtn.addEventListener('click', () => openModal('searchModal'));
    const globalSearch = document.getElementById('globalSearch');
    if (globalSearch) globalSearch.addEventListener('input', handleGlobalSearch);

    // Calendar navigation
    const prevMonth = document.getElementById('prevMonth');
    if (prevMonth) prevMonth.addEventListener('click', () => navigateMonth(-1));
    const nextMonth = document.getElementById('nextMonth');
    if (nextMonth) nextMonth.addEventListener('click', () => navigateMonth(1));

    // Filter/Search inputs
    const notesSearch = document.getElementById('notesSearch');
    if (notesSearch) notesSearch.addEventListener('input', filterNotes);
    const notesSubjectFilter = document.getElementById('notesSubjectFilter');
    if (notesSubjectFilter) notesSubjectFilter.addEventListener('change', filterNotes);
    const notesSort = document.getElementById('notesSort');
    if (notesSort) notesSort.addEventListener('change', filterNotes);
    const videosSearch = document.getElementById('videosSearch');
    if (videosSearch) videosSearch.addEventListener('input', filterVideos);
    const videosSubjectFilter = document.getElementById('videosSubjectFilter');
    if (videosSubjectFilter) videosSubjectFilter.addEventListener('change', filterVideos);
    const videosSort = document.getElementById('videosSort');
    if (videosSort) videosSort.addEventListener('change', filterVideos);
    
    // Reels search and filter
    const reelsSearch = document.getElementById('reelsSearch');
    if (reelsSearch) reelsSearch.addEventListener('input', filterReels);
    const reelsSubjectFilter = document.getElementById('reelsSubjectFilter');
    if (reelsSubjectFilter) reelsSubjectFilter.addEventListener('change', filterReels);

    // Admin PIN System
    const ADMIN_PIN = '179084';

    // Check if admin was previously unlocked (session-based)
    if (sessionStorage.getItem('adminUnlocked') === 'true') {
        isAdminUnlocked = true;
        showAdminPanel();
    }

    // Admin PIN Input - expose function globally and add event listener
    const adminPinInput = document.getElementById('adminPinInput');
    const unlockAdminBtn = document.getElementById('unlockAdminBtn');
    const lockAdminBtn = document.getElementById('lockAdminBtn');
    const pinError = document.getElementById('pinError');
    const adminIdInput = null; // Not used in current design
    
    // Declare lockAdminPanel first, then export it
    window.lockAdminPanel = null;
    
    console.log('lockAdminBtn element:', lockAdminBtn);
    
    // Expose function globally - verifyAdminPin must query admin_pin from Supabase
    window.verifyAdminPin = async function() {
        console.log('verifyAdminPin called');
        if (!adminPinInput) {
            console.error('adminPinInput element not found');
            showToast('Error: PIN input not found', 'error');
            return;
        }
        const pin = adminPinInput.value.trim();
        
        console.log('Verifying admin PIN:', pin);
        
        if (!pin) {
            showToast('Please enter a PIN', 'error');
            return;
        }
        
        // Verify PIN against Supabase
        if (!supabaseClient) {
            console.log('Supabase not connected, using fallback');
            // Fallback to default PIN if Supabase not connected
            if (pin === '1610') {
                isAdminUnlocked = true;
                sessionStorage.setItem('adminUnlocked', 'true');
                appState.settings.adminMode = true;
                saveData();
                showAdminPanel();
                renderNotes();
                renderVideos();
                showToast('Admin mode unlocked successfully!', 'success');
            } else {
                console.log('PIN incorrect (fallback)');
                if (pinError) pinError.style.display = 'block';
                if (adminPinInput) adminPinInput.value = '';
                setTimeout(() => {
                    if (pinError) pinError.style.display = 'none';
                }, 3000);
            }
            return;
        }
        
        try {
            const { data, error } = await supabaseClient
                .from('login_credentials')
                .select('admin_pin')
                .eq('id', 'admin')
                .single();
            
            if (error || !data) {
                console.log('Could not fetch admin PIN:', error);
                // Fallback
                if (pin === '1610') {
                    isAdminUnlocked = true;
                    sessionStorage.setItem('adminUnlocked', 'true');
                    appState.settings.adminMode = true;
                    saveData();
                    showAdminPanel();
                    renderNotes();
                    renderVideos();
                    showToast('Admin mode unlocked successfully!', 'success');
                } else {
                    if (pinError) pinError.style.display = 'block';
                    if (adminPinInput) adminPinInput.value = '';
                    setTimeout(() => {
                        if (pinError) pinError.style.display = 'none';
                    }, 3000);
                }
                return;
            }
            
            const storedPin = data.admin_pin;
            console.log('Stored PIN from Supabase:', storedPin);
            
            if (pin === storedPin) {
                isAdminUnlocked = true;
                sessionStorage.setItem('adminUnlocked', 'true');
                appState.settings.adminMode = true;
                saveData();
                showAdminPanel();
                renderNotes();
                renderVideos();
                showToast('Admin mode unlocked successfully!', 'success');
            } else {
                console.log('PIN incorrect');
                if (pinError) pinError.style.display = 'block';
                if (adminPinInput) adminPinInput.value = '';
                setTimeout(() => {
                    if (pinError) pinError.style.display = 'none';
                }, 3000);
            }
        } catch (e) {
            console.log('PIN verification exception:', e);
            // Fallback
            if (pin === '1610') {
                isAdminUnlocked = true;
                sessionStorage.setItem('adminUnlocked', 'true');
                appState.settings.adminMode = true;
                saveData();
                showAdminPanel();
                renderNotes();
                renderVideos();
                showToast('Admin mode unlocked successfully!', 'success');
            } else {
                if (pinError) pinError.style.display = 'block';
                if (adminPinInput) adminPinInput.value = '';
                setTimeout(() => {
                    if (pinError) pinError.style.display = 'none';
                }, 3000);
            }
        }
    };

    if (unlockAdminBtn) {
        unlockAdminBtn.onclick = window.verifyAdminPin;
    }

    if (adminPinInput) {
        adminPinInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                window.verifyAdminPin();
            }
        });
    }

    // Also trigger login on Enter in ID input
    if (adminIdInput) {
        adminIdInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                window.verifyAdminPin();
            }
        });
    }

    if (lockAdminBtn) {
        console.log('Attaching click listener to lockAdminBtn');
        lockAdminBtn.addEventListener('click', lockAdminPanel);
    } else {
        console.log('lockAdminBtn not found in DOM');
    }

    function lockAdminPanel() {
        console.log('lockAdminPanel called');
        isAdminUnlocked = false;
        sessionStorage.removeItem('adminUnlocked');
        appState.settings.adminMode = false;
        saveData();
        showAdminLockScreen();
        renderNotes();
        renderVideos();
        renderEssaysGrid();
        showToast('Admin mode locked', 'info');
    }
    
    // Export function globally
    window.lockAdminPanel = lockAdminPanel;
    console.log('Exported lockAdminPanel to window');

    function showAdminPanel() {
        console.log('showAdminPanel called');
        const lockScreen = document.getElementById('adminLockScreen');
        const adminPanel = document.getElementById('adminPanel');
        if (lockScreen) {
            lockScreen.style.display = 'none';
        }
        if (adminPanel) {
            adminPanel.style.display = 'block';
        }
        // Show settings sections when admin is unlocked
        const settingsSections = document.querySelectorAll('.settings-section');
        settingsSections.forEach(section => {
            if (!section.classList.contains('admin-section')) {
                section.style.display = '';
            }
        });
        // Re-render grids to show/hide admin elements
        renderNotes();
        renderVideos();
        renderEssaysGrid();
        toggleAdminElements(true);
    }

    function showAdminLockScreen() {
        console.log('showAdminLockScreen called');
        const lockScreen = document.getElementById('adminLockScreen');
        const adminPanel = document.getElementById('adminPanel');
        console.log('lockScreen element:', lockScreen);
        console.log('adminPanel element:', adminPanel);
        if (lockScreen) {
            lockScreen.style.display = 'flex';
            console.log('Set lockScreen display to flex');
        }
        if (adminPanel) {
            adminPanel.style.display = 'none';
        }
        if (adminPinInput) adminPinInput.value = '';
        if (adminIdInput) adminIdInput.value = '';
        // Hide other settings sections when admin is locked
        const settingsSections = document.querySelectorAll('.settings-section');
        settingsSections.forEach(section => {
            if (!section.classList.contains('admin-section')) {
                section.style.display = 'none';
            }
        });
        // Re-render grids to hide admin elements
        renderNotes();
        renderVideos();
        renderEssaysGrid();
        toggleAdminElements(false);
    }

    // Initialize admin state - always call the appropriate function
    console.log('Initializing admin, isAdminUnlocked:', isAdminUnlocked);
    const adminLockScreen = document.getElementById('adminLockScreen');
    console.log('adminLockScreen found:', adminLockScreen !== null);
    if (isAdminUnlocked) {
        showAdminPanel();
    } else {
        showAdminLockScreen();
        // Also call toggleAdminElements to hide buttons initially
        toggleAdminElements(false);
    }
}

// ============================================
// Navigation
// ============================================
function setupNavigation() {
    console.log('Setting up navigation...');
    
    // Wait for DOM to be fully ready
    setTimeout(() => {
        const navContainer = document.querySelector('.bottom-nav');
        if (!navContainer) {
            console.error('Navigation container not found!');
            return;
        }
        
        // Get nav items
        const navItems = document.querySelectorAll('.nav-item');
        console.log('Nav items found:', navItems.length);
        
        navItems.forEach((item) => {
            // Get the tab name directly
            const tabName = item.getAttribute('data-tab');
            console.log('Setting up nav item for tab:', tabName);
            
            // Add click handler directly
            item.onclick = function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log('Nav clicked:', tabName);
                if (tabName) {
                    // Manually switch tabs
                    showTab(tabName);
                }
            };
        });
        
        console.log('Navigation setup complete');
    }, 100);
}

// Show tab function
function showTab(tabName) {
    console.log('showTab called:', tabName);
    
    // Make sure app container is visible
    const appContainer = document.querySelector('.app-container');
    if (appContainer && appContainer.style.display === 'none') {
        appContainer.style.display = '';
    }
    
    // Always show navigation in all tabs (navigation hides only in video player modal)
    const bottomNav = document.querySelector('.bottom-nav');
    if (bottomNav) {
        bottomNav.style.display = '';
    }
    
    // Update nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        const itemTab = item.getAttribute('data-tab');
        if (itemTab === tabName) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
    
    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.add('hidden');
    });
    
    // Show target tab
    const targetTab = document.getElementById(tabName + 'Tab');
    if (targetTab) {
        targetTab.classList.remove('hidden');
    }
    
    // Render content based on tab
    if (tabName === 'home') {
        renderStats();
        updateHeroStats();
        renderRecentNotes();
        renderRecentVideos();
    } else if (tabName === 'notes') {
        renderNotes();
        renderSubjects();
        populateSubjectSelects();
        // Update stats in notes tab hero
        const notesCount = document.querySelector('#notesTab #notesCount');
        if (notesCount) {
            notesCount.textContent = appState.notes.length;
        }
        const notesSubjectsCount = document.querySelector('#notesTab #notesSubjectsCount');
        if (notesSubjectsCount) {
            const uniqueSubjects = new Set(appState.notes.map(n => n.subjectId).filter(Boolean));
            notesSubjectsCount.textContent = uniqueSubjects.size;
        }
    } else if (tabName === 'essays') {
        renderEssaysGrid();
    } else if (tabName === 'videos') {
        renderVideos();
        populateSubjectSelects();
        // Update stats in videos tab hero
        const videosCount = document.querySelector('#videosTab #videosCount');
        if (videosCount) {
            videosCount.textContent = appState.videos.length;
        }
    } else if (tabName === 'planning') {
        renderCalendar();
        renderReminders();
        renderTodos();
        populateSubjectSelects();
        // Update stats in planning tab hero
        const plansCount = document.querySelector('#planningTab #plansCount');
        if (plansCount) {
            const plans = document.querySelectorAll('#calendarGrid .calendar-day.has-plan');
            plansCount.textContent = plans.length || appState.plans?.length || 0;
        }
        const remindersCount = document.querySelector('#planningTab #remindersCount');
        if (remindersCount) {
            remindersCount.textContent = appState.reminders?.length || 0;
        }
        const todosCount = document.querySelector('#planningTab #todosCount');
        if (todosCount) {
            todosCount.textContent = appState.todos?.length || 0;
        }
    } else if (tabName === 'settings') {
        populateSubjectSelects();
    }
    
    // Update state
    if (typeof appState !== 'undefined') {
        appState.currentTab = tabName;
    }
    
    // Re-initialize Lucide icons
    if (typeof lucide !== 'undefined') {
        setTimeout(() => lucide.createIcons(), 50);
    }
}

// Make it globally available
window.showTab = showTab;

// ============================================
// Navigation
// ============================================

// ============================================
// Sub-tabs (Planning)
// ============================================
function setupSubTabs() {
    const subTabs = document.querySelectorAll('.modern-sub-tab');
    subTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const subTab = tab.dataset.subtab;
            
            // Update sub-tab buttons
            subTabs.forEach(t => t.classList.toggle('active', t === tab));
            
            // Show corresponding content
            document.querySelectorAll('.sub-tab-content').forEach(content => {
                content.classList.add('hidden');
            });
            document.getElementById(`${subTab}View`).classList.remove('hidden');
            
            // Re-initialize Lucide icons
            if (typeof lucide !== 'undefined') {
                setTimeout(() => lucide.createIcons(), 100);
            }
        });
    });
}

// ============================================
// Render Functions
// ============================================
function renderAll() {
    renderStats();
    updateHeroStats();
    renderRecentNotes();
    renderRecentVideos();
    renderNotes();
    renderVideos();
    renderSubjects();
    renderReminders();
    renderTodos();
    populateSubjectSelects();
    
    // Re-initialize Lucide icons
    if (typeof lucide !== 'undefined') {
        setTimeout(() => lucide.createIcons(), 100);
    }
}

// Update hero section stats
function updateHeroStats() {
    // Notes count
    const notesCount = document.getElementById('notesCount');
    if (notesCount) {
        notesCount.textContent = appState.notes.length;
    }
    const notesSubjectsCount = document.getElementById('notesSubjectsCount');
    if (notesSubjectsCount) {
        const uniqueSubjects = new Set(appState.notes.map(n => n.subjectId).filter(Boolean));
        notesSubjectsCount.textContent = uniqueSubjects.size;
    }
    
    // Videos count and duration
    const videosCount = document.getElementById('videosCount');
    if (videosCount) {
        videosCount.textContent = appState.videos.length;
    }
    const videosDuration = document.getElementById('videosDuration');
    if (videosDuration) {
        const totalMinutes = appState.videos.reduce((sum, v) => sum + (parseInt(v.duration) || 0), 0);
        videosDuration.textContent = totalMinutes;
    }
}

function renderStats() {
    const totalNotes = appState.notes.length;
    const totalVideos = appState.videos.length;
    
    // Calculate study hours from plans
    const studyPlans = appState.plans.filter(p => p.type === 'study' && p.completed);
    let studyHours = studyPlans.length;
    
    // Calculate completion rate
    const totalTodos = appState.todos.length;
    const completedTodos = appState.todos.filter(t => t.completed).length;
    const completionRate = totalTodos > 0 ? Math.round((completedTodos / totalTodos) * 100) : 0;
    
    const elements = {
        totalNotes: document.getElementById('totalNotes'),
        totalVideos: document.getElementById('totalVideos'),
        studyHours: document.getElementById('studyHours'),
        completionRate: document.getElementById('completionRate'),
        completedTodos: document.getElementById('completedTodos'),
        completedPlans: document.getElementById('completedPlans'),
        progressPercent: document.getElementById('progressPercent'),
        progressCircle: document.getElementById('progressCircle')
    };
    
    if (elements.totalNotes) elements.totalNotes.textContent = totalNotes;
    if (elements.totalVideos) elements.totalVideos.textContent = totalVideos;
    if (elements.studyHours) elements.studyHours.textContent = `${studyHours}h`;
    if (elements.completionRate) elements.completionRate.textContent = `${completionRate}%`;
    if (elements.completedTodos) elements.completedTodos.textContent = completedTodos;
    if (elements.completedPlans) elements.completedPlans.textContent = studyPlans.length;
    
    // Update progress ring
    if (elements.progressPercent) {
        elements.progressPercent.textContent = `${completionRate}%`;
        const circumference = 2 * Math.PI * 40;
        const offset = circumference - (completionRate / 100) * circumference;
        if (elements.progressCircle) {
            elements.progressCircle.style.strokeDashoffset = offset;
        }
    }
}

function renderRecentNotes() {
    const container = document.getElementById('recentNotesList');
    if (!container) return;
    
    const recentNotes = [...appState.notes]
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 5);

    if (recentNotes.length === 0) {
        container.innerHTML = `
            <div class="empty-state-small">
                <i data-lucide="file-plus"></i>
                <p>No notes yet</p>
            </div>
        `;
    } else {
        container.innerHTML = recentNotes.map(note => `
            <div class="recent-card" onclick="openNoteViewer('${note.id}')">
                <span class="card-subject" style="background: ${getSubjectColor(note.subjectId)}">${getSubjectName(note.subjectId)}</span>
                <h4>${escapeHtml(note.title)}</h4>
                <p>${formatDate(note.date)}</p>
            </div>
        `).join('');
    }
    
    if (typeof lucide !== 'undefined') {
        setTimeout(() => lucide.createIcons(), 100);
    }
}

function renderRecentVideos() {
    const container = document.getElementById('recentVideosList');
    if (!container) return;
    
    const recentVideos = [...appState.videos]
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 5);

    if (recentVideos.length === 0) {
        container.innerHTML = `
            <div class="empty-state-small">
                <i data-lucide="video"></i>
                <p>No videos yet</p>
            </div>
        `;
    } else {
        container.innerHTML = recentVideos.map(video => `
            <div class="recent-card" onclick="openVideoPlayer('${video.id}')">
                <span class="card-subject" style="background: ${getSubjectColor(video.subjectId)}">${getSubjectName(video.subjectId)}</span>
                <h4>${escapeHtml(video.title)}</h4>
                <p>${video.duration ? video.duration + ' min' : formatDate(video.date)}</p>
            </div>
        `).join('');
    }
    
    if (typeof lucide !== 'undefined') {
        setTimeout(() => lucide.createIcons(), 100);
    }
}

function renderUpcoming() {
    const container = document.getElementById('upcomingList');
    if (!container) return;
    
    // Get today's and upcoming plans
    const today = new Date().toISOString().slice(0, 10);
    const upcoming = [...appState.plans]
        .filter(p => p.date >= today && !p.completed)
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .slice(0, 3);
    
    // Also get upcoming reminders
    const now = new Date();
    const upcomingReminders = [...appState.reminders]
        .filter(r => new Date(r.dateTime) > now)
        .sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime))
        .slice(0, 2);
    
    const items = [];
    
    upcoming.forEach(plan => {
        items.push({
            type: 'plan',
            title: plan.title,
            date: plan.date,
            icon: plan.type === 'video' ? 'video' : plan.type === 'note' ? 'file-text' : 'book-open',
            color: plan.type === 'video' ? '#ec4899' : plan.type === 'note' ? '#6366f1' : '#10b981'
        });
    });
    
    upcomingReminders.forEach(reminder => {
        items.push({
            type: 'reminder',
            title: reminder.message,
            date: reminder.dateTime,
            icon: 'bell',
            color: '#f59e0b'
        });
    });
    
    if (items.length === 0) {
        container.innerHTML = `
            <div class="empty-state-small">
                <i data-lucide="calendar-plus"></i>
                <p>No upcoming plans</p>
            </div>
        `;
    } else {
        container.innerHTML = items.slice(0, 4).map(item => `
            <div class="upcoming-item">
                <div class="upcoming-icon" style="background: ${item.color}">
                    <i data-lucide="${item.icon}"></i>
                </div>
                <div class="upcoming-content">
                    <h4>${escapeHtml(item.title)}</h4>
                    <p>${formatDate(item.date)}</p>
                </div>
            </div>
        `).join('');
    }
    
    if (typeof lucide !== 'undefined') {
        setTimeout(() => lucide.createIcons(), 100);
    }
}

function renderNotes() {
    const container = document.getElementById('notesGrid');
    if (!container) return;
    
    const searchTerm = document.getElementById('notesSearch')?.value?.toLowerCase() || '';
    const subjectFilter = document.getElementById('notesSubjectFilter')?.value || '';
    const sortOrder = document.getElementById('notesSort')?.value || 'newest';
    
    let filteredNotes = appState.notes.filter(note => {
        const matchesSearch = note.title.toLowerCase().includes(searchTerm) ||
                             (note.description && note.description.toLowerCase().includes(searchTerm));
        const matchesSubject = !subjectFilter || note.subjectId === subjectFilter;
        return matchesSearch && matchesSubject;
    });
    
    // Sort notes
    filteredNotes.sort((a, b) => {
        switch(sortOrder) {
            case 'oldest':
                return new Date(a.date) - new Date(b.date);
            case 'title-asc':
                return a.title.localeCompare(b.title);
            case 'title-desc':
                return b.title.localeCompare(a.title);
            default: // newest
                return new Date(b.date) - new Date(a.date);
        }
    });

    if (filteredNotes.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i data-lucide="file-x"></i>
                <p>No notes found</p>
            </div>
        `;
    } else {
        // Check both settings and session state for admin
        const isAdmin = isAdminUnlocked || appState.settings?.adminMode !== false;
        const viewMode = appState.settings?.notesView || 'grid';
        
        // Apply view class
        if (viewMode === 'list') {
            container.classList.add('list-view', 'notes-list');
        } else {
            container.classList.remove('list-view', 'notes-list');
        }
        
        container.innerHTML = filteredNotes.map(note => {
            const subjectName = getSubjectName(note.subjectId);
            const subjectColor = getSubjectColor(note.subjectId);
            
            // Generate thumbnail URL from Google Drive PDF
            let thumbnailHtml = '';
            if (note.fileUrl) {
                const fileId = note.fileUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
                if (fileId && fileId[1]) {
                    thumbnailHtml = `<img src="https://drive.google.com/thumbnail?id=${fileId[1]}&sz=w400-h300" alt="${escapeHtml(note.title)}" onerror="this.style.display='none'">`;
                }
            }
            
            return `
            <div class="note-card" onclick="openNoteViewer('${note.id}')">
                <div class="card-image">
                    ${thumbnailHtml || '<i data-lucide="file-text"></i>'}
                </div>
                <div class="card-body">
                    <span class="card-subject" style="background: ${subjectColor}">${subjectName}</span>
                    <div class="card-title">${escapeHtml(note.title)}</div>
                    ${note.description ? `<div class="card-description">${escapeHtml(note.description)}</div>` : ''}
                    <div class="card-meta">
                        <span><i data-lucide="calendar"></i> ${formatDate(note.date)}</span>
                    </div>
                </div>
                ${isAdmin ? `<div class="card-actions">
                    <button onclick="event.stopPropagation(); editNote('${note.id}')">
                        <i data-lucide="edit-2"></i> Edit
                    </button>
                    <button onclick="event.stopPropagation(); deleteNote('${note.id}')">
                        <i data-lucide="trash-2"></i> Delete
                    </button>
                </div>` : ''}
            </div>
        `}).join('');
    }
    
    // Show/hide clear button
    const clearBtn = document.querySelector('#notesSearch')?.closest('.search-box')?.querySelector('.search-clear');
    if (clearBtn) {
        clearBtn.style.display = searchTerm ? 'flex' : 'none';
    }
    
    if (typeof lucide !== 'undefined') {
        setTimeout(() => lucide.createIcons(), 100);
    }
}

function renderReels() {
    const container = document.getElementById('reelsGrid');
    if (!container) return;
    
    const searchTerm = document.getElementById('reelsSearch')?.value?.toLowerCase() || '';
    const subjectFilter = document.getElementById('reelsSubjectFilter')?.value || '';
    
    let filteredReels = appState.reels.filter(reel => {
        const matchesSearch = reel.title.toLowerCase().includes(searchTerm);
        const matchesSubject = !subjectFilter || reel.subjectId === subjectFilter;
        return matchesSearch && matchesSubject;
    });
    
    if (filteredReels.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i data-lucide="video"></i>
                <p>No reels yet</p>
                <span>Add your first reel to get started</span>
            </div>
        `;
    } else {
        container.innerHTML = filteredReels.map(reel => {
            const subjectName = getSubjectName(reel.subjectId);
            const subjectColor = getSubjectColor(reel.subjectId);
            
            // Extract YouTube video ID
            let youtubeId = '';
            if (reel.videoUrl) {
                const match = reel.videoUrl.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
                youtubeId = match ? match[1] : '';
            }
            
            const thumbnailUrl = youtubeId 
                ? `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`
                : '';
            
            return `
                <div class="reel-card" onclick="playReel('${reel.id}')">
                    <div class="reel-thumbnail">
                        ${thumbnailUrl ? `<img src="${thumbnailUrl}" alt="${escapeHtml(reel.title)}">` : ''}
                        <div class="reel-play-overlay">
                            <i data-lucide="play"></i>
                        </div>
                        ${reel.duration ? `<span class="reel-duration">${reel.duration}</span>` : ''}
                    </div>
                    <div class="reel-info">
                        <h4 class="reel-title">${escapeHtml(reel.title)}</h4>
                        <div class="reel-meta">
                            <div class="reel-subject">
                                <span class="reel-subject-dot" style="background: ${subjectColor.split(' ')[2]}"></span>
                                <span>${subjectName}</span>
                            </div>
                            <div class="reel-views">
                                <i data-lucide="eye"></i>
                                <span>${reel.views || 0}</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    // Re-initialize Lucide icons
    if (typeof lucide !== 'undefined') {
        setTimeout(() => lucide.createIcons(), 100);
    }
}

// Play reel function
function playReel(reelId) {
    const reel = appState.reels.find(r => r.id === reelId);
    if (!reel) return;
    
    // Update view count
    reel.views = (reel.views || 0) + 1;
    saveData();
    
    // Open video player modal
    if (reel.videoUrl) {
        // Find the video by URL or create a temporary reference
        const video = appState.videos.find(v => v.videoUrl === reel.videoUrl);
        if (video) {
            openVideoPlayer(video.id);
        } else {
            // If no matching video, open video player and set URL manually
            openModal('videoPlayerModal');
            const playerContainer = document.getElementById('videoPlayerContainer');
            const customPlayer = document.getElementById('customVideoPlayer');
            const youtubeEmbed = document.getElementById('youtubeEmbed');
            
            // Extract YouTube ID
            let youtubeId = '';
            const match = reel.videoUrl.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
            youtubeId = match ? match[1] : '';
            
            if (youtubeId && youtubeEmbed && customPlayer) {
                customPlayer.style.display = 'none';
                youtubeEmbed.style.display = 'block';
                youtubeEmbed.src = `https://www.youtube.com/embed/${youtubeId}?autoplay=1&rel=0`;
            }
            
            document.getElementById('videoPlayerTitle').textContent = reel.title;
        }
    }
}

// Essay Functions
let currentEssayId = null;
let essayDarkMode = false;
let essayAutosaveInterval = null;

function deleteEssayById(id) {
    const essay = appState.essays.find(e => e.id === id);
    const essayTitle = essay?.title || 'this essay';
    
    // Show confirmation modal
    document.getElementById('confirmMessage').textContent = `Are you sure you want to delete "${essayTitle}"? This action cannot be undone.`;
    document.getElementById('confirmModal').classList.remove('hidden');
    
    // Set up one-time confirm handler
    const confirmBtn = document.getElementById('confirmBtn');
    const newConfirmBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
    
    newConfirmBtn.onclick = function() {
        appState.essays = appState.essays.filter(e => e.id !== id);
        if (window.currentEssayId === id) {
            window.currentEssayId = null;
        }
        saveData();
        renderEssaysGrid();
        closeModal('confirmModal');
        showToast('Essay deleted', 'success');
    };
}

function renderEssaysGrid() {
    const container = document.getElementById('essaysGrid');
    if (!container) return;
    
    // Check if admin is unlocked
    const isAdmin = isAdminUnlocked || appState.settings?.adminMode !== false;
    
    if (appState.essays.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i data-lucide="file-text"></i>
                <p>No essays yet. ${isAdmin ? 'Click "New Essay" to start writing!' : 'Check back later for essays.'}</p>
            </div>
        `;
    } else {
        container.innerHTML = appState.essays.map(essay => {
            const subject = appState.subjects.find(s => s.id === essay.subjectId);
            const subjectColor = subject?.color || '#6366f1';
            const subjectName = subject?.name || 'No Subject';
            const preview = essay.content ? essay.content.replace(/<[^>]*>/g, '').substring(0, 100) : 'No content';
            
            // Calculate word count dynamically from content
            const textContent = essay.content ? essay.content.replace(/<[^>]*>/g, '') : '';
            const wordCount = textContent.trim() ? textContent.trim().split(/\s+/).length : 0;
            
            // Format date as "01 Mar, 2026"
            const dateObj = new Date(essay.date);
            const formattedDate = dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
            
            // Only show edit/delete buttons for admin
            const adminButtons = isAdmin ? `
                <button class="essay-card-delete" onclick="event.stopPropagation(); deleteEssayById('${essay.id}')" title="Delete essay">
                    <i data-lucide="trash-2"></i>
                </button>
            ` : '';
            
            const actionButtons = isAdmin ? `
                <div class="essay-card-actions">
                    <button class="btn secondary btn-sm" onclick="openEssayModalWithId('${essay.id}')">
                        <i data-lucide="edit-2"></i> Edit
                    </button>
                    <button class="btn primary btn-sm" onclick="openReadEssayModal('${essay.id}')">
                        <i data-lucide="book-open"></i> Read Full Essay
                    </button>
                </div>
            ` : `
                <div class="essay-card-actions">
                    <button class="btn primary btn-sm" onclick="openReadEssayModal('${essay.id}')">
                        <i data-lucide="book-open"></i> Read Full Essay
                    </button>
                </div>
            `;
            
            return `
                <div class="essay-card">
                    <div class="essay-card-header">
                        <span class="essay-subject" style="background: ${subjectColor}20; color: ${subjectColor}">${escapeHtml(subjectName)}</span>
                        ${adminButtons}
                    </div>
                    <h3 class="essay-card-title">${escapeHtml(essay.title || 'Untitled')}</h3>
                    <p class="essay-card-preview">${escapeHtml(preview)}${essay.content && essay.content.length > 100 ? '...' : ''}</p>
                    <div class="essay-card-footer">
                        <span class="essay-card-date">${formattedDate}</span>
                        <span class="essay-card-words">${wordCount} words</span>
                    </div>
                    ${actionButtons}
                </div>
            `;
        }).join('');
    }
    
    if (typeof lucide !== 'undefined') {
        setTimeout(() => lucide.createIcons(), 100);
    }
}

function newEssay() {
    currentEssayId = null;
    document.getElementById('essayModalTitle').value = '';
    document.getElementById('essayModalEditor').innerHTML = '';
    updateEssayStats();
    renderEssaysGrid();
}

function loadEssay(id) {
    const essay = appState.essays.find(e => e.id === id);
    if (!essay) return;
    
    currentEssayId = essay.id;
    document.getElementById('essayModalTitle').value = essay.title || '';
    document.getElementById('essayModalEditor').innerHTML = essay.content || '';
    updateEssayStats();
    renderEssaysGrid();
}

function saveEssay() {
    const title = document.getElementById('essayModalTitle').value || 'Untitled';
    const content = document.getElementById('essayModalEditor').innerHTML;
    
    if (currentEssayId) {
        const essay = appState.essays.find(e => e.id === currentEssayId);
        if (essay) {
            essay.title = title;
            essay.content = content;
            essay.date = new Date().toISOString();
            essay.wordCount = document.getElementById('wordCount').textContent;
        }
    } else {
        const newEssay = {
            id: generateId(),
            title: title,
            content: content,
            date: new Date().toISOString(),
            wordCount: document.getElementById('wordCount').textContent
        };
        appState.essays.unshift(newEssay);
        currentEssayId = newEssay.id;
    }
    
    saveData();
    renderEssaysGrid();
    showToast('Essay saved', 'success');
}

function deleteEssay(id) {
    if (!confirm('Are you sure you want to delete this essay?')) return;
    
    appState.essays = appState.essays.filter(e => e.id !== id);
    if (currentEssayId === id) {
        newEssay();
    }
    saveData();
    renderEssaysGrid();
    showToast('Essay deleted', 'success');
}

function formatText(command, value = null) {
    const editor = document.getElementById('essayModalEditor');
    
    switch(command) {
        case 'bold':
            document.execCommand('bold', false, null);
            break;
        case 'italic':
            document.execCommand('italic', false, null);
            break;
        case 'underline':
            document.execCommand('underline', false, null);
            break;
        case 'strikethrough':
            document.execCommand('strikeThrough', false, null);
            break;
        case 'color':
            if (value) {
                // First try execCommand which is more reliable
                document.execCommand('foreColor', false, value);
                document.getElementById('essayModalEditor').focus();
            }
            break;
        case 'h1':
            document.execCommand('formatBlock', false, '<h1>');
            break;
        case 'h2':
            document.execCommand('formatBlock', false, '<h2>');
            break;
        case 'h3':
            document.execCommand('formatBlock', false, '<h3>');
            break;
        case 'ul':
            document.execCommand('insertUnorderedList', false, null);
            break;
        case 'ol':
            document.execCommand('insertOrderedList', false, null);
            break;
        case 'quote':
            // Check if already in a blockquote - if so, remove it
            const selection = window.getSelection();
            if (selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);
                let container = range.commonAncestorContainer;
                
                // Find if we're inside a blockquote
                let blockquote = container.nodeType === 1 ? container.closest('blockquote') : null;
                if (!blockquote && container.nodeType === 3) {
                    blockquote = container.parentElement.closest('blockquote');
                }
                
                if (blockquote && blockquote.parentNode) {
                    // We're inside a blockquote, unwrap it
                    const parent = blockquote.parentNode;
                    while (blockquote.firstChild) {
                        parent.insertBefore(blockquote.firstChild, blockquote);
                    }
                    parent.removeChild(blockquote);
                } else {
                    // Not in a blockquote, add one
                    const selectedText = range.toString();
                    if (selectedText) {
                        const newBlockquote = document.createElement('blockquote');
                        newBlockquote.innerHTML = range.toString();
                        range.deleteContents();
                        range.insertNode(newBlockquote);
                    } else {
                        document.execCommand('formatBlock', false, '<blockquote>');
                    }
                }
            }
            break;
        case 'alignLeft':
            document.execCommand('justifyLeft', false, null);
            break;
        case 'alignCenter':
            document.execCommand('justifyCenter', false, null);
            break;
        case 'alignRight':
            document.execCommand('justifyRight', false, null);
            break;
        case 'alignJustify':
            document.execCommand('justifyFull', false, null);
            break;
        case 'fontSize':
            // Use fontSize with value 1 (small), 3 (normal), 5 (large)
            const sizeMap = { 'small': '1', 'normal': '3', 'large': '5' };
            document.execCommand('fontSize', false, sizeMap[value] || '3');
            break;
        case 'table':
            insertTable(value || 3, 3); // Default 3x3 table
            break;
        default:
            document.execCommand(command, false, value);
    }
    
    const editorEl = document.getElementById('essayModalEditor');
    if (editorEl) {
        editorEl.focus();
        updateToolbarState();
    }
}

function updateToolbarState() {
    // Update active state for formatting buttons
    const editorEl = document.getElementById('essayModalEditor');
    const commands = ['bold', 'italic', 'underline', 'strikeThrough', 'insertUnorderedList', 'insertOrderedList', 'justifyLeft', 'justifyCenter', 'justifyRight'];
    const commandMap = {
        'bold': 'formatBtnBold',
        'italic': 'formatBtnItalic',
        'underline': 'formatBtnUnderline',
        'strikeThrough': 'formatBtnStrikethrough',
        'insertUnorderedList': 'formatBtnUl',
        'insertOrderedList': 'formatBtnOl',
        'justifyLeft': 'formatBtnAlignLeft',
        'justifyCenter': 'formatBtnAlignCenter',
        'justifyRight': 'formatBtnAlignRight'
    };
    
    commands.forEach(cmd => {
        const btnId = commandMap[cmd];
        const btn = document.getElementById(btnId);
        if (btn) {
            const isActive = document.queryCommandState(cmd);
            btn.classList.toggle('active', isActive);
        }
    });
    
    // Check for blockquote
    const quoteBtn = document.getElementById('formatBtnQuote');
    if (quoteBtn && editorEl) {
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
            let container = selection.getRangeAt(0).commonAncestorContainer;
            let inBlockquote = false;
            if (container.nodeType === 1) {
                inBlockquote = container.closest('blockquote') !== null;
            } else if (container.nodeType === 3) {
                inBlockquote = container.parentElement.closest('blockquote') !== null;
            }
            quoteBtn.classList.toggle('active', inBlockquote);
        }
    }
    
    // Check for text color
    const colorBtn = document.getElementById('colorBtn');
    if (colorBtn && editorEl) {
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
            let container = selection.getRangeAt(0).commonAncestorContainer;
            let hasColor = false;
            if (container.nodeType === 1) {
                hasColor = container.style && container.style.color !== '';
                if (!hasColor && container.closest) {
                    const parentWithColor = container.closest('[style*="color"]');
                    hasColor = parentWithColor !== null;
                }
            } else if (container.nodeType === 3) {
                hasColor = container.parentElement.style && container.parentElement.style.color !== '';
                if (!hasColor && container.parentElement.closest) {
                    const parentWithColor = container.parentElement.closest('[style*="color"]');
                    hasColor = parentWithColor !== null;
                }
            }
            colorBtn.classList.toggle('active', hasColor);
        }
    }
}

function hideColorDropdown() {
    const dropdown = document.getElementById('colorDropdown');
    if (dropdown) {
        dropdown.style.display = 'none';
    }
}

function focusEditorForColor() {
    const editor = document.getElementById('essayModalEditor');
    if (editor) {
        editor.focus();
        updateToolbarState();
    }
}

function applyColor(color) {
    const editor = document.getElementById('essayModalEditor');
    if (!editor) return;
    
    // First focus the editor
    editor.focus();
    
    // Use execCommand which works reliably
    const success = document.execCommand('foreColor', false, color);
    console.log('Color applied:', color, 'Success:', success);
    
    // Update toolbar state
    updateToolbarState();
}

// Close color dropdown when clicking outside
document.addEventListener('click', function(e) {
    const colorPicker = document.getElementById('colorPickerContainer');
    const dropdown = document.getElementById('colorDropdown');
    if (colorPicker && dropdown && !colorPicker.contains(e.target)) {
        dropdown.style.display = 'none';
    }
    
    // Also handle modal color dropdown
    const colorPickerModal = document.getElementById('colorPickerContainerModal');
    const dropdownModal = document.getElementById('colorDropdownModal');
    if (colorPickerModal && dropdownModal && !colorPickerModal.contains(e.target)) {
        dropdownModal.style.display = 'none';
    }
    
    // Also handle modal table dropdown
    const tablePickerModal = document.getElementById('tablePickerContainerModal');
    const tableDropdownModal = document.getElementById('tableDropdownModal');
    if (tablePickerModal && tableDropdownModal && !tablePickerModal.contains(e.target)) {
        tableDropdownModal.style.display = 'none';
    }
});

function insertTable(rows, cols) {
    let tableHTML = '<table border="1" style="border-collapse: collapse; width: 100%;">';
    for (let i = 0; i < rows; i++) {
        tableHTML += '<tr>';
        for (let j = 0; j < cols; j++) {
            tableHTML += '<td style="padding: 8px; border: 1px solid #ddd;">&nbsp;</td>';
        }
        tableHTML += '</tr>';
    }
    tableHTML += '</table><br>';
    
    document.getElementById('essayModalEditor').focus();
    document.execCommand('insertHTML', false, tableHTML);
}

function insertCustomTable() {
    const rows = parseInt(document.getElementById('tableRows').value) || 3;
    const cols = parseInt(document.getElementById('tableCols').value) || 3;
    insertTable(rows, cols);
    
    // Hide dropdown
    const dropdown = document.getElementById('tableDropdown');
    if (dropdown) {
        dropdown.style.display = 'none';
    }
}

// Essay Modal Functions
function openEssayModal() {
    const modal = document.getElementById('essayModal');
    
    if (modal) {
        modal.classList.add('active');
        document.body.classList.add('essay-modal-open');
        
        // Prevent page scroll when modal is open on mobile
        document.body.style.overflow = 'hidden';
        
        document.getElementById('essayModalTitle').value = '';
        document.getElementById('essayModalEditor').innerHTML = '';
        document.getElementById('wordCountModal').textContent = '0';
        
        // Populate subject dropdown
        const subjectSelect = document.getElementById('essayModalSubject');
        if (subjectSelect) {
            subjectSelect.innerHTML = '<option value="">Select Subject</option>';
            appState.subjects.forEach(subject => {
                subjectSelect.innerHTML += `<option value="${subject.id}">${escapeHtml(subject.name)}</option>`;
            });
            subjectSelect.value = '';
        }
        
        // Focus and scroll editor into view without shifting modal
        setTimeout(() => {
            const editor = document.getElementById('essayModalEditor');
            if (editor) {
                editor.focus();
            }
        }, 100);
        
        // Add event listener for stats
        const editor = document.getElementById('essayModalEditor');
        editor.addEventListener('input', updateEssayStatsModal);
        editor.addEventListener('keyup', updateToolbarStateModal);
        editor.addEventListener('keydown', updateToolbarStateModal);
        editor.addEventListener('mouseup', updateToolbarStateModal);
        editor.addEventListener('input', updateToolbarStateModal);
        
        // Handle paste to strip formatting - paste as plain text only
        editor.onpaste = function(e) {
            e.preventDefault();
            const text = (e.clipboardData || window.clipboardData).getData('text/plain');
            document.execCommand('insertText', false, text);
        };
    }
}

function openEssayModalWithId(id) {
    const essay = appState.essays.find(e => e.id === id);
    const modal = document.getElementById('essayModal');
    
    if (modal && essay) {
        modal.classList.add('active');
        document.body.classList.add('essay-modal-open');
        
        window.currentEssayId = essay.id;
        document.getElementById('essayModalTitle').value = essay.title || '';
        document.getElementById('essayModalEditor').innerHTML = essay.content || '';
        
        // Populate subject dropdown
        const subjectSelect = document.getElementById('essayModalSubject');
        if (subjectSelect) {
            subjectSelect.innerHTML = '<option value="">Select Subject</option>';
            appState.subjects.forEach(subject => {
                subjectSelect.innerHTML += `<option value="${subject.id}">${escapeHtml(subject.name)}</option>`;
            });
            subjectSelect.value = essay.subjectId || '';
        }
        
        updateEssayStatsModal();
        
        document.getElementById('essayModalEditor').focus();
        
        // Add event listener for stats
        const editor = document.getElementById('essayModalEditor');
        editor.addEventListener('input', updateEssayStatsModal);
        editor.addEventListener('keyup', updateToolbarStateModal);
        editor.addEventListener('keydown', updateToolbarStateModal);
        editor.addEventListener('mouseup', updateToolbarStateModal);
        editor.addEventListener('input', updateToolbarStateModal);
        
        // Handle paste to strip formatting - paste as plain text only
        editor.onpaste = function(e) {
            e.preventDefault();
            const text = (e.clipboardData || window.clipboardData).getData('text/plain');
            document.execCommand('insertText', false, text);
        };
    }
}

function closeEssayModal() {
    const modal = document.getElementById('essayModal');
    
    if (modal) {
        modal.classList.remove('active');
        document.body.classList.remove('essay-modal-open');
        // Restore body scroll
        document.body.style.overflow = '';
        window.currentEssayId = null;
    }
}

function openReadEssayModal(id) {
    const essay = appState.essays.find(e => e.id === id);
    if (!essay) {
        showToast('Essay not found', 'error');
        return;
    }
    
    const modal = document.getElementById('readEssayModal');
    if (!modal) {
        showToast('Read modal not found', 'error');
        return;
    }
    
    // Set content
    document.getElementById('readEssayTitle').textContent = essay.title || 'Untitled';
    document.getElementById('readEssayContent').innerHTML = essay.content || '<p>No content</p>';
    
    // Show modal
    modal.classList.add('active');
    document.body.classList.add('essay-modal-open');
    
    // Refresh icons
    if (typeof lucide !== 'undefined') {
        setTimeout(() => lucide.createIcons(), 100);
    }
}

function closeReadEssayModal() {
    const modal = document.getElementById('readEssayModal');
    
    if (modal) {
        modal.classList.remove('active');
        document.body.classList.remove('essay-modal-open');
    }
}

function saveEssayModal() {
    const title = document.getElementById('essayModalTitle').value || 'Untitled';
    const content = document.getElementById('essayModalEditor').innerHTML;
    const subjectId = document.getElementById('essayModalSubject')?.value || null;
    
    // Get current essay ID or create new
    const currentId = window.currentEssayId || null;
    
    if (currentId) {
        // Update existing
        const essay = appState.essays.find(e => e.id === currentId);
        if (essay) {
            essay.title = title;
            essay.content = content;
            essay.subjectId = subjectId;
            essay.date = new Date().toISOString();
        }
    } else {
        // Create new
        const newEssay = {
            id: 'essay_' + Date.now(),
            title: title,
            content: content,
            subjectId: subjectId,
            date: new Date().toISOString()
        };
        appState.essays.push(newEssay);
    }
    
    saveData();
    renderEssaysGrid();
    closeEssayModal();
    showToast('Essay saved', 'success');
}

function exportEssayModal(format) {
    const title = document.getElementById('essayModalTitle').value || 'essay';
    const content = document.getElementById('essayModalEditor').innerText;
    
    if (format === 'txt') {
        const blob = new Blob([content], { type: 'text/plain' });
        downloadFile(blob, `${title}.txt`);
    } else if (format === 'docx') {
        const header = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><title>' + title + '</title></head><body>';
        const footer = '</body></html>';
        const html = header + document.getElementById('essayModalEditor').innerHTML + footer;
        const blob = new Blob([html], { type: 'application/msword' });
        downloadFile(blob, `${title}.doc`);
    }
}

function updateEssayStatsModal() {
    const editor = document.getElementById('essayModalEditor');
    if (!editor) return;
    
    const text = editor.innerText || '';
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    
    document.getElementById('wordCountModal').textContent = words;
}

function updateToolbarStateModal() {
    const editor = document.getElementById('essayModalEditor');
    
    // Update formatting buttons
    const commands = ['bold', 'italic', 'underline', 'strikeThrough', 'insertUnorderedList', 'insertOrderedList', 'justifyLeft', 'justifyCenter', 'justifyRight'];
    const commandMap = {
        'bold': 'formatBtnBold',
        'italic': 'formatBtnItalic',
        'underline': 'formatBtnUnderline',
        'strikeThrough': 'formatBtnStrikethrough',
        'insertUnorderedList': 'formatBtnUl',
        'insertOrderedList': 'formatBtnOl',
        'justifyLeft': 'formatBtnAlignLeft',
        'justifyCenter': 'formatBtnAlignCenter',
        'justifyRight': 'formatBtnAlignRight'
    };
    
    commands.forEach(cmd => {
        const btnId = commandMap[cmd];
        const btn = document.getElementById(btnId);
        if (btn) {
            const isActive = document.queryCommandState(cmd);
            btn.classList.toggle('active', isActive);
        }
    });
    
    // Special handling for quote (blockquote)
    const quoteBtn = document.getElementById('formatBtnQuote');
    if (quoteBtn) {
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            let container = range.commonAncestorContainer;
            let inBlockquote = container.nodeType === 1 ? container.closest('blockquote') !== null : false;
            if (!inBlockquote && container.nodeType === 3) {
                inBlockquote = container.parentElement && container.parentElement.closest('blockquote') !== null;
            }
            quoteBtn.classList.toggle('active', inBlockquote);
        }
    }
}

function applyColorModal(color) {
    const editor = document.getElementById('essayModalEditor');
    if (!editor) return;
    
    editor.focus();
    document.execCommand('foreColor', false, color);
    updateToolbarStateModal();
}

function focusEditorForColorModal() {
    const editor = document.getElementById('essayModalEditor');
    if (editor) {
        editor.focus();
        updateToolbarStateModal();
    }
}

function hideColorDropdownModal() {
    const dropdown = document.getElementById('colorDropdownModal');
    if (dropdown) {
        dropdown.style.display = 'none';
    }
}

function toggleColorDropdownModal(e) {
    if (e) e.preventDefault();
    const editor = document.getElementById('essayModalEditor');
    if (editor) {
        editor.focus();
    }
    const dropdown = document.getElementById('colorDropdownModal');
    if (dropdown) {
        dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
    }
}

function toggleTableDropdownModal(e) {
    if (e) e.preventDefault();
    const editor = document.getElementById('essayModalEditor');
    if (editor) {
        editor.focus();
    }
    const dropdown = document.getElementById('tableDropdownModal');
    if (dropdown) {
        dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
    }
}

function insertLinkModal() {
    const editor = document.getElementById('essayModalEditor');
    if (!editor) return;
    
    const url = prompt('Enter URL:');
    if (url) {
        editor.focus();
        document.execCommand('createLink', false, url);
    }
}

function insertCustomTableModal() {
    const rows = parseInt(document.getElementById('tableRowsModal').value) || 3;
    const cols = parseInt(document.getElementById('tableColsModal').value) || 3;
    
    let tableHTML = '<table border="1" style="border-collapse: collapse; width: 100%;">';
    for (let i = 0; i < rows; i++) {
        tableHTML += '<tr>';
        for (let j = 0; j < cols; j++) {
            tableHTML += '<td style="padding: 8px; border: 1px solid #ddd;">&nbsp;</td>';
        }
        tableHTML += '</tr>';
    }
    tableHTML += '</table><br>';
    
    const editor = document.getElementById('essayModalEditor');
    if (!editor) return;
    
    editor.focus();
    
    // Try execCommand first
    const success = document.execCommand('insertHTML', false, tableHTML);
    
    // If execCommand doesn't work, try using Selection API
    if (!success) {
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            range.deleteContents();
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = tableHTML;
            range.insertNode(tempDiv);
        }
    }
    
    // Hide dropdown
    const dropdown = document.getElementById('tableDropdownModal');
    if (dropdown) {
        dropdown.style.display = 'none';
    }
}

// Modal-specific formatting functions
function formatTextModal(command, value = null) {
    const editor = document.getElementById('essayModalEditor');
    if (!editor) return;
    
    switch(command) {
        case 'bold':
            document.execCommand('bold', false, null);
            break;
        case 'italic':
            document.execCommand('italic', false, null);
            break;
        case 'underline':
            document.execCommand('underline', false, null);
            break;
        case 'strikethrough':
            document.execCommand('strikeThrough', false, null);
            break;
        case 'h1':
            document.execCommand('formatBlock', false, '<h1>');
            break;
        case 'h2':
            document.execCommand('formatBlock', false, '<h2>');
            break;
        case 'h3':
            document.execCommand('formatBlock', false, '<h3>');
            break;
        case 'ul':
            document.execCommand('insertUnorderedList', false, null);
            break;
        case 'ol':
            document.execCommand('insertOrderedList', false, null);
            break;
        case 'alignLeft':
            document.execCommand('justifyLeft', false, null);
            break;
        case 'alignCenter':
            document.execCommand('justifyCenter', false, null);
            break;
        case 'alignRight':
            document.execCommand('justifyRight', false, null);
            break;
        case 'alignJustify':
            document.execCommand('justifyFull', false, null);
            break;
        case 'quote':
            // First focus the editor
            editor.focus();
            
            // Check if already in a blockquote - if so, remove it, otherwise add it
            const selection = window.getSelection();
            if (selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);
                let container = range.commonAncestorContainer;
                
                // Find if we're inside a blockquote
                let blockquote = container.nodeType === 1 ? container.closest('blockquote') : null;
                if (!blockquote && container.nodeType === 3) {
                    blockquote = container.parentElement.closest('blockquote');
                }
                
                if (blockquote && blockquote.parentNode) {
                    // We're inside a blockquote, unwrap it
                    const parent = blockquote.parentNode;
                    while (blockquote.firstChild) {
                        parent.insertBefore(blockquote.firstChild, blockquote);
                    }
                    parent.removeChild(blockquote);
                } else {
                    // Not in a blockquote, use formatBlock to add one
                    document.execCommand('formatBlock', false, '<blockquote>');
                }
            }
            break;
    }
    
    editor.focus();
    updateToolbarStateModal();
}

function insertLink() {
    const url = prompt('Enter URL:');
    if (url) {
        document.execCommand('createLink', false, url);
    }
}

function toggleFullscreen() {
    const editor = document.querySelector('.essay-editor-wrapper');
    if (document.fullscreenElement) {
        document.exitFullscreen();
    } else {
        editor.requestFullscreen();
    }
}

function toggleEssayDarkMode() {
    essayDarkMode = !essayDarkMode;
    const wrapper = document.querySelector('.essay-editor-wrapper');
    if (wrapper) {
        wrapper.classList.toggle('dark-mode', essayDarkMode);
    }
}

function updateEssayStats() {
    const editor = document.getElementById('essayModalEditor');
    if (!editor) return;
    
    const text = editor.innerText || '';
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    
    const wordCountEl = document.getElementById('wordCountModal');
    if (wordCountEl) wordCountEl.textContent = words;
}

function exportEssayModal(format) {
    const title = document.getElementById('essayModalTitle').value || 'essay';
    const content = document.getElementById('essayModalEditor').innerText;
    
    if (format === 'txt') {
        const blob = new Blob([content], { type: 'text/plain' });
        downloadFile(blob, `${title}.txt`);
    } else if (format === 'docx') {
        // Simple HTML to DOCX conversion
        const header = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><title>' + title + '</title></head><body>';
        const footer = '</body></html>';
        const html = header + document.getElementById('essayModalEditor').innerHTML + footer;
        const blob = new Blob([html], { type: 'application/msword' });
        downloadFile(blob, `${title}.doc`);
    }
    
    showToast('Essay exported', 'success');
}

function downloadFile(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function renderVideos() {
    const container = document.getElementById('videosGrid');
    if (!container) return;
    
    const searchTerm = document.getElementById('videosSearch')?.value?.toLowerCase() || '';
    const subjectFilter = document.getElementById('videosSubjectFilter')?.value || '';
    const sortOrder = document.getElementById('videosSort')?.value || 'newest';
    
    let filteredVideos = appState.videos.filter(video => {
        const matchesSearch = video.title.toLowerCase().includes(searchTerm) ||
                             (video.description && video.description.toLowerCase().includes(searchTerm));
        const matchesSubject = !subjectFilter || video.subjectId === subjectFilter;
        return matchesSearch && matchesSubject;
    });
    
    // Sort videos
    filteredVideos.sort((a, b) => {
        switch(sortOrder) {
            case 'oldest':
                return new Date(a.date) - new Date(b.date);
            case 'title-asc':
                return a.title.localeCompare(b.title);
            case 'title-desc':
                return b.title.localeCompare(a.title);
            default: // newest
                return new Date(b.date) - new Date(a.date);
        }
    });

    if (filteredVideos.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i data-lucide="video"></i>
                <p>No videos found</p>
            </div>
        `;
    } else {
        // Check both settings and session state for admin
        const isAdmin = isAdminUnlocked || appState.settings?.adminMode !== false;
        const viewMode = appState.settings?.videosView || 'grid';
        
        // Apply view class
        if (viewMode === 'list') {
            container.classList.add('list-view', 'videos-list');
        } else {
            container.classList.remove('list-view', 'videos-list');
        }
        
        container.innerHTML = filteredVideos.map(video => {
            const subjectName = getSubjectName(video.subjectId);
            const subjectColor = getSubjectColor(video.subjectId);
            
            // Generate thumbnail URL from YouTube
            let thumbnailHtml = '';
            if (video.videoUrl) {
                const youtubeId = video.videoUrl.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
                if (youtubeId && youtubeId[1]) {
                    thumbnailHtml = `<img src="https://img.youtube.com/vi/${youtubeId[1]}/mqdefault.jpg" alt="${escapeHtml(video.title)}">`;
                }
            }
            
            return `
            <div class="video-card" onclick="openVideoPlayer('${video.id}')">
                <div class="card-image">
                    ${thumbnailHtml || `<div class="play-overlay"><i data-lucide="play-circle"></i></div>`}
                </div>
                <div class="card-body">
                    <span class="card-subject" style="background: ${subjectColor}">${subjectName}</span>
                    <div class="card-title">${escapeHtml(video.title)}</div>
                    ${video.description ? `<div class="card-description">${escapeHtml(video.description)}</div>` : ''}
                    <div class="card-meta">
                        <span><i data-lucide="calendar"></i> ${formatDate(video.date)}</span>
                        ${video.duration ? `<span><i data-lucide="clock"></i> ${video.duration} min</span>` : ''}
                    </div>
                </div>
                ${isAdmin ? `<div class="card-actions">
                    <button onclick="event.stopPropagation(); editVideo('${video.id}')">
                        <i data-lucide="edit-2"></i> Edit
                    </button>
                    <button onclick="event.stopPropagation(); deleteVideo('${video.id}')">
                        <i data-lucide="trash-2"></i> Delete
                    </button>
                </div>` : ''}
            </div>`;
        }).join('');
    }
    
    // Show/hide clear button
    const clearBtn = document.querySelector('#videosSearch')?.closest('.search-box')?.querySelector('.search-clear');
    if (clearBtn) {
        clearBtn.style.display = searchTerm ? 'flex' : 'none';
    }
    
    if (typeof lucide !== 'undefined') {
        setTimeout(() => lucide.createIcons(), 100);
    }
}

function renderSubjects() {
    const container = document.getElementById('subjectsList');
    if (!container) return;
    
    if (appState.subjects.length === 0) {
        container.innerHTML = '<div class="empty-state-small"><p>No subjects</p></div>';
    } else {
        container.innerHTML = appState.subjects.map(subject => `
            <div class="subject-item">
                <span class="subject-color" style="background: ${subject.color}"></span>
                <span class="subject-name">${escapeHtml(subject.name)}</span>
                <div class="subject-actions">
                    <button onclick="editSubject('${subject.id}')"><i data-lucide="edit-2"></i></button>
                    <button onclick="deleteSubject('${subject.id}')"><i data-lucide="trash-2"></i></button>
                </div>
            </div>
        `).join('');
    }
    
    if (typeof lucide !== 'undefined') {
        setTimeout(() => lucide.createIcons(), 100);
    }
}

function renderReminders() {
    const container = document.getElementById('remindersList');
    if (!container) return;
    
    const sortedReminders = [...appState.reminders].sort((a, b) => 
        new Date(a.dateTime) - new Date(b.dateTime)
    );

    if (sortedReminders.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i data-lucide="bell-off"></i>
                <p>No reminders</p>
            </div>
        `;
    } else {
        container.innerHTML = sortedReminders.map(reminder => `
            <div class="reminder-item">
                <div class="todo-content">
                    <span class="todo-text">${escapeHtml(reminder.message)}</span>
                    <span style="font-size: 0.75rem; color: var(--text-light)">${formatDateTime(reminder.dateTime)}</span>
                </div>
                <div class="todo-actions">
                    <button onclick="editReminder('${reminder.id}')"><i data-lucide="edit-2"></i></button>
                    <button onclick="deleteReminder('${reminder.id}')"><i data-lucide="trash-2"></i></button>
                </div>
            </div>
        `).join('');
    }
    
    if (typeof lucide !== 'undefined') {
        setTimeout(() => lucide.createIcons(), 100);
    }
}

function renderTodos() {
    const container = document.getElementById('todosList');
    if (!container) return;
    
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    const sortedTodos = [...appState.todos].sort((a, b) => 
        priorityOrder[a.priority] - priorityOrder[b.priority]
    );

    if (sortedTodos.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i data-lucide="list-checks"></i>
                <p>No to-dos</p>
            </div>
        `;
    } else {
        container.innerHTML = sortedTodos.map(todo => `
            <div class="todo-item ${todo.completed ? 'completed' : ''}">
                <div class="todo-checkbox ${todo.completed ? 'checked' : ''}" onclick="toggleTodo('${todo.id}')"></div>
                <div class="todo-content">
                    <span class="todo-text">${escapeHtml(todo.task)}</span>
                    <span class="todo-priority ${todo.priority}">${todo.priority}</span>
                </div>
                <div class="todo-actions">
                    <button onclick="editTodo('${todo.id}')"><i data-lucide="edit-2"></i></button>
                    <button onclick="deleteTodo('${todo.id}')"><i data-lucide="trash-2"></i></button>
                </div>
            </div>
        `).join('');
    }
    
    if (typeof lucide !== 'undefined') {
        setTimeout(() => lucide.createIcons(), 100);
    }
}

// ============================================
// Calendar
// ============================================
function renderCalendar() {
    const grid = document.getElementById('calendarGrid');
    const monthLabel = document.getElementById('currentMonth');
    
    if (!grid || !monthLabel) return;
    
    const year = appState.currentMonth.getFullYear();
    const month = appState.currentMonth.getMonth();
    
    monthLabel.textContent = appState.currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startingDay = firstDay.getDay();
    const totalDays = lastDay.getDate();
    
    const today = new Date();
    let html = '';
    
    // Day headers
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    days.forEach(day => {
        html += `<div class="calendar-day calendar-day-header">${day}</div>`;
    });
    
    // Previous month days
    const prevMonth = new Date(year, month, 0);
    for (let i = startingDay - 1; i >= 0; i--) {
        html += `<div class="calendar-day other-month">${prevMonth.getDate() - i}</div>`;
    }
    
    // Current month days
    for (let day = 1; day <= totalDays; day++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const hasPlans = appState.plans.some(p => p.date === dateStr);
        const isToday = today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;
        
        html += `<div class="calendar-day ${isToday ? 'today' : ''} ${hasPlans ? 'has-plans' : ''}" 
                      onclick="showDayPlans('${dateStr}')">${day}</div>`;
    }
    
    // Next month days
    const remainingDays = 42 - (startingDay + totalDays);
    for (let i = 1; i <= remainingDays; i++) {
        html += `<div class="calendar-day other-month">${i}</div>`;
    }
    
    grid.innerHTML = html;
    
    if (typeof lucide !== 'undefined') {
        setTimeout(() => lucide.createIcons(), 100);
    }
}

function navigateMonth(direction) {
    appState.currentMonth.setMonth(appState.currentMonth.getMonth() + direction);
    renderCalendar();
}

function showDayPlans(dateStr) {
    const dayPlans = appState.plans.filter(p => p.date === dateStr);
    if (dayPlans.length > 0) {
        showToast(`Plans for ${formatDate(dateStr)}: ${dayPlans.length} item(s)`, 'info');
    }
}

// ============================================
// Modal Management
// ============================================
function openModal(modalId) {
    // Disable body scroll when viewer modals are open
    if (modalId === 'pdfViewerModal' || modalId === 'videoPlayerModal') {
        document.body.style.overflow = 'hidden';
        document.body.style.position = 'fixed';
        document.body.style.width = '100%';
        document.addEventListener('keydown', handleViewerKeydown);
        document.documentElement.classList.add('viewer-open');
        
        // Hide navigation when video player or PDF viewer is open
        const bottomNav = document.querySelector('.bottom-nav');
        if (bottomNav) bottomNav.style.display = 'none';
    }
    
    // Hide navigation for note and video modals too
    if (modalId === 'noteModal' || modalId === 'videoModal' || modalId === 'reelModal') {
        const bottomNav = document.querySelector('.bottom-nav');
        if (bottomNav) bottomNav.style.display = 'none';
    }
    
    document.getElementById(modalId).classList.remove('hidden');
    populateSubjectSelects();
    
    if (typeof lucide !== 'undefined') {
        setTimeout(() => lucide.createIcons(), 100);
    }
}

function handleViewerKeydown(e) {
    if (e.key === 'Escape') {
        const visibleViewer = document.getElementById('videoPlayerModal');
        if (!visibleViewer.classList.contains('hidden')) {
            closeModal('videoPlayerModal');
        } else {
            const visiblePdf = document.getElementById('pdfViewerModal');
            if (!visiblePdf.classList.contains('hidden')) {
                closeModal('pdfViewerModal');
            }
        }
        document.removeEventListener('keydown', handleViewerKeydown);
    }
}

function closeModal(modalId) {
    // Stop video player when closing video modal
    if (modalId === 'videoPlayerModal') {
        // Stop YouTube video if playing
        if (youtubePlayer && playerReady) {
            try {
                youtubePlayer.stopVideo();
                youtubePlayer.clearVideo();
            } catch (e) {
                console.log('YouTube player stop error:', e);
            }
        }
        
        // Reset player ready state
        playerReady = false;
        
        // Stop native video
        const player = document.getElementById('videoPlayer');
        const playerContainer = document.getElementById('videoPlayerContainer');
        if (player) {
            player.pause();
            player.src = '';
            player.load();
        }
        if (playerContainer) {
            playerContainer.innerHTML = '';
        }
        
        // Reset loading state
        const customPlayer = document.getElementById('customVideoPlayer');
        if (customPlayer) {
            customPlayer.classList.remove('loading');
        }
        
        // Navigate to videos tab after closing video player
        showTab('videos');
    }
    
    // Re-enable body scroll and remove classes when closing viewer modals
    if (modalId === 'pdfViewerModal' || modalId === 'videoPlayerModal') {
        document.removeEventListener('keydown', handleViewerKeydown);
        document.documentElement.classList.remove('viewer-open');
        document.body.style.overflow = '';
        document.body.style.position = '';
        
        // Show navigation when closing video player or PDF viewer
        const bottomNav = document.querySelector('.bottom-nav');
        if (bottomNav) bottomNav.style.display = '';
    }
    
    // Show navigation when closing note or video modal
    if (modalId === 'noteModal' || modalId === 'videoModal' || modalId === 'reelModal') {
        const bottomNav = document.querySelector('.bottom-nav');
        if (bottomNav) bottomNav.style.display = '';
    }
    
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('hidden');
    }
}

function showConfirmDialog(message, onConfirm) {
    document.getElementById('confirmMessage').textContent = message;
    document.getElementById('confirmModal').classList.remove('hidden');
    
    document.getElementById('confirmBtn').onclick = () => {
        onConfirm();
        closeModal('confirmModal');
    };
    
    if (typeof lucide !== 'undefined') {
        setTimeout(() => lucide.createIcons(), 100);
    }
}

// ============================================
// CRUD Operations - Notes
// ============================================
function handleNoteSubmit(e) {
    e.preventDefault();
    
    const noteId = document.getElementById('noteId').value;
    const noteData = {
        id: noteId || generateId(),
        title: document.getElementById('noteTitle').value,
        subjectId: document.getElementById('noteSubject').value,
        description: document.getElementById('noteDescription').value,
        fileUrl: document.getElementById('noteFileUrl').value,
        date: noteId ? appState.notes.find(n => n.id === noteId)?.date : new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    if (noteId) {
        const index = appState.notes.findIndex(n => n.id === noteId);
        if (index !== -1) appState.notes[index] = noteData;
        showToast('Note updated', 'success');
    } else {
        appState.notes.push(noteData);
        showToast('Note added', 'success');
    }
    
    saveData();
    renderAll();
    closeModal('noteModal');
    document.getElementById('noteForm').reset();
    document.getElementById('noteId').value = '';
}

function editNote(id) {
    const note = appState.notes.find(n => n.id === id);
    if (!note) return;
    
    document.getElementById('noteId').value = note.id;
    document.getElementById('noteTitle').value = note.title;
    document.getElementById('noteSubject').value = note.subjectId;
    document.getElementById('noteDescription').value = note.description || '';
    document.getElementById('noteFileUrl').value = note.fileUrl || '';
    
    document.getElementById('noteModalTitle').textContent = 'Edit Note';
    openModal('noteModal');
}

function deleteNote(id) {
    showConfirmDialog('Delete this note?', () => {
        appState.notes = appState.notes.filter(n => n.id !== id);
        saveData();
        renderAll();
        showToast('Note deleted', 'success');
    });
}

function openNoteViewer(id) {
    const note = appState.notes.find(n => n.id === id);
    if (!note) return;
    
    document.getElementById('pdfViewerTitle').textContent = note.title;
    const pdfFrame = document.getElementById('pdfFrame');
    
    if (note.fileUrl) {
        // Check if it's a Google Drive URL
        if (note.fileUrl.includes('drive.google.com')) {
            // Convert Google Drive URL to embed format
            let embedUrl = note.fileUrl;
            // Handle different Google Drive URL formats
            if (embedUrl.includes('/view')) {
                embedUrl = embedUrl.replace('/view', '/preview');
            } else if (embedUrl.includes('?usp=sharing')) {
                embedUrl = embedUrl.replace('?usp=sharing', '/preview');
            } else if (!embedUrl.includes('/preview')) {
                embedUrl = embedUrl + '/preview';
            }
            pdfFrame.src = embedUrl;
            openModal('pdfViewerModal');
            return;
        }
        
        // Check if it's a direct PDF URL
        if (note.fileUrl.match(/\.(pdf)$/i) || note.fileUrl.includes('pdf')) {
            pdfFrame.src = note.fileUrl;
            openModal('pdfViewerModal');
            return;
        }
        
        // Fallback: open in new tab
        window.open(note.fileUrl, '_blank');
    } else {
        showToast('No file associated', 'info');
    }
}

window.openNoteViewer = openNoteViewer;

// ============================================
// CRUD Operations - Videos
// ============================================
function handleVideoSubmit(e) {
    e.preventDefault();
    
    const videoId = document.getElementById('videoId').value;
    const videoData = {
        id: videoId || generateId(),
        title: document.getElementById('videoTitle').value,
        subjectId: document.getElementById('videoSubject').value,
        description: document.getElementById('videoDescription').value,
        duration: parseInt(document.getElementById('videoDuration').value) || 0,
        videoUrl: document.getElementById('videoUrl').value,
        date: videoId ? appState.videos.find(v => v.id === videoId)?.date : new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    if (videoId) {
        const index = appState.videos.findIndex(v => v.id === videoId);
        if (index !== -1) appState.videos[index] = videoData;
        showToast('Video updated', 'success');
    } else {
        appState.videos.push(videoData);
        showToast('Video added', 'success');
    }
    
    saveData();
    renderAll();
    closeModal('videoModal');
    document.getElementById('videoForm').reset();
    document.getElementById('videoId').value = '';
}

function editVideo(id) {
    const video = appState.videos.find(v => v.id === id);
    if (!video) return;
    
    document.getElementById('videoId').value = video.id;
    document.getElementById('videoTitle').value = video.title;
    document.getElementById('videoSubject').value = video.subjectId;
    document.getElementById('videoDescription').value = video.description || '';
    document.getElementById('videoDuration').value = video.duration || '';
    document.getElementById('videoUrl').value = video.videoUrl || '';
    
    document.getElementById('videoModalTitle').textContent = 'Edit Video';
    openModal('videoModal');
}

// Reel Functions
function handleReelSubmit(e) {
    e.preventDefault();
    
    const reelId = document.getElementById('reelId').value;
    const reelData = {
        id: reelId || generateId(),
        title: document.getElementById('reelTitle').value,
        subjectId: document.getElementById('reelSubject').value,
        videoUrl: document.getElementById('reelUrl').value,
        duration: document.getElementById('reelDuration').value,
        views: reelId ? appState.reels.find(r => r.id === reelId)?.views || 0 : 0,
        date: reelId ? appState.reels.find(r => r.id === reelId)?.date : new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    if (reelId) {
        const index = appState.reels.findIndex(r => r.id === reelId);
        if (index !== -1) appState.reels[index] = reelData;
        showToast('Reel updated', 'success');
    } else {
        appState.reels.push(reelData);
        showToast('Reel added', 'success');
    }
    
    saveData();
    showTab('reels');
    closeModal('reelModal');
    document.getElementById('reelForm').reset();
    document.getElementById('reelId').value = '';
}

function editReel(id) {
    const reel = appState.reels.find(r => r.id === id);
    if (!reel) return;
    
    document.getElementById('reelId').value = reel.id;
    document.getElementById('reelTitle').value = reel.title;
    document.getElementById('reelSubject').value = reel.subjectId;
    document.getElementById('reelUrl').value = reel.videoUrl || '';
    document.getElementById('reelDuration').value = reel.duration || '';
    
    document.getElementById('reelModalTitle').textContent = 'Edit Reel';
    openModal('reelModal');
}

function deleteVideo(id) {
    showConfirmDialog('Delete this video?', () => {
        appState.videos = appState.videos.filter(v => v.id !== id);
        saveData();
        renderAll();
        showToast('Video deleted', 'success');
    });
}

// YouTube Player API variables
let youtubePlayer = null;
let playerReady = false;
let currentVideoId = null;

// Load YouTube IFrame API
function loadYouTubeAPI() {
    if (window.YT && window.YT.Player) return;
    
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
}

// YouTube API ready callback
window.onYouTubeIframeAPIReady = function() {
    console.log('YouTube API ready');
};

function openVideoPlayer(id) {
    const video = appState.videos.find(v => v.id === id);
    if (!video) return;
    
    // Ensure controls are visible when player opens
    const customControls = document.getElementById('customControls');
    if (customControls) {
        customControls.classList.remove('auto-hide');
        customControls.style.opacity = '1';
    }
    
    document.getElementById('videoPlayerTitle').textContent = video.title;
    const playerContainer = document.getElementById('videoPlayerContainer');
    const customPlayer = document.getElementById('customVideoPlayer');
    const nativeVideo = document.getElementById('videoPlayer');
    
    // Reset player state
    if (youtubePlayer) {
        youtubePlayer.destroy();
        youtubePlayer = null;
    }
    playerReady = false;
    
    if (video.videoUrl) {
        // Check if it's a YouTube URL
        if (video.videoUrl.includes('youtube.com') || video.videoUrl.includes('youtu.be')) {
            // Convert YouTube URL to video ID
            let videoId = '';
            
            if (video.videoUrl.includes('youtu.be/')) {
                videoId = video.videoUrl.split('youtu.be/')[1]?.split('?')[0];
            } else if (video.videoUrl.includes('youtube.com/watch')) {
                videoId = new URL(video.videoUrl).searchParams.get('v');
            } else if (video.videoUrl.includes('youtube.com/shorts')) {
                videoId = video.videoUrl.split('/shorts/')[1]?.split('?')[0];
            } else if (video.videoUrl.includes('youtube.com/embed/')) {
                videoId = video.videoUrl.split('/embed/')[1]?.split('?')[0];
            }
            
            if (videoId) {
                currentVideoId = videoId;
                playerContainer.innerHTML = '';
                customPlayer.classList.add('loading');
                
                // Load YouTube API if not loaded
                loadYouTubeAPI();
                
                // Wait for API to be ready then create player
                const createPlayer = () => {
                    if (window.YT && window.YT.Player) {
                        youtubePlayer = new window.YT.Player('videoPlayerContainer', {
                            videoId: videoId,
                            playerVars: {
                                'autoplay': 1,
                                'controls': 0,
                                'disablekb': 1,
                                'fs': 1,
                                'modestbranding': 1,
                                'rel': 0,
                                'showinfo': 0,
                                'iv_load_policy': 3,
                                'playsinline': 1,
                                'cc_load_policy': 0,
                                'enablejsapi': 1,
                                'origin': window.location.origin
                            },
                            events: {
                                'onReady': onYouTubePlayerReady,
                                'onStateChange': onYouTubePlayerStateChange
                            }
                        });
                    } else {
                        setTimeout(createPlayer, 100);
                    }
                };
                
                createPlayer();
                openModal('videoPlayerModal');
                
                // Fallback: remove loading after 3 seconds in case API fails
                setTimeout(() => {
                    const customPlayer = document.getElementById('customVideoPlayer');
                    if (customPlayer && customPlayer.classList.contains('loading')) {
                        customPlayer.classList.remove('loading');
                    }
                }, 3000);
                
                // Hide custom controls since YouTube native controls are enabled
                const customControls = document.getElementById('customControls');
                if (customControls) {
                    customControls.style.display = 'flex';
                    customControls.style.opacity = '1';
                }
                
                // Re-initialize Lucide icons
                setTimeout(() => {
                    if (typeof lucide !== 'undefined') {
                        lucide.createIcons();
                    }
                }, 100);
                
                // Auto-hide video header after 2 seconds for fresh look
                setupVideoHeaderAutoHide();
                
                return;
            }
        }
        
        // Check if it's a Google Drive video URL
        if (video.videoUrl.includes('drive.google.com')) {
            let embedUrl = video.videoUrl;
            if (embedUrl.includes('/view')) {
                embedUrl = embedUrl.replace('/view', '/preview');
            } else if (embedUrl.includes('?usp=sharing')) {
                embedUrl = embedUrl.replace('?usp=sharing', '/preview');
            } else if (!embedUrl.includes('/preview')) {
                embedUrl = embedUrl + '/preview';
            }
            playerContainer.innerHTML = `<iframe width="100%" height="100%" src="${embedUrl}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen playsinline></iframe>`;
            openModal('videoPlayerModal');
            
            // Auto-hide video header after 2 seconds for fresh look
            setupVideoHeaderAutoHide();
            
            return;
        }
        
        // For direct video URLs, use native player with custom controls
        playerContainer.innerHTML = '';
        customPlayer.classList.remove('loading');
        nativeVideo.style.display = 'block';
        nativeVideo.src = video.videoUrl;
        initNativeVideoControls();
        
        // Show custom controls for native video
        const customControls = document.getElementById('customControls');
        if (customControls) {
            customControls.style.display = 'flex';
            customControls.style.opacity = '1';
        }
        
        // Auto-hide video header after 2 seconds for fresh look
        setupVideoHeaderAutoHide();
        
        openModal('videoPlayerModal');
    } else {
        showToast('No video source', 'info');
    }
}

// YouTube Player Ready Event
function onYouTubePlayerReady(event) {
    playerReady = true;
    const customPlayer = document.getElementById('customVideoPlayer');
    customPlayer.classList.remove('loading');
    
    // Initialize Lucide icons for controls
    if (typeof lucide !== 'undefined') {
        setTimeout(() => lucide.createIcons(), 100);
    }
    
    initYouTubeControls();
    updateYouTubeProgress();
    
    console.log('YouTube player ready');
}

// YouTube Player State Change
function onYouTubePlayerStateChange(event) {
    const playIcon = document.querySelector('.play-icon');
    const pauseIcon = document.querySelector('.pause-icon');
    
    if (event.data === window.YT.PlayerState.PLAYING) {
        playIcon.style.display = 'none';
        pauseIcon.style.display = 'block';
    } else if (event.data === window.YT.PlayerState.PAUSED || event.data === window.YT.PlayerState.ENDED) {
        playIcon.style.display = 'block';
        pauseIcon.style.display = 'none';
    }
}

// Initialize YouTube Custom Controls
function initYouTubeControls() {
    console.log('Initializing YouTube controls...');
    
    const playPauseBtn = document.getElementById('playPauseBtn');
    const rewindBtn = document.getElementById('rewindBtn');
    const forwardBtn = document.getElementById('forwardBtn');
    const volumeBtn = document.getElementById('volumeBtn');
    const volumeSlider = document.getElementById('volumeSlider');
    const speedBtn = document.getElementById('speedBtn');
    const fullscreenBtn = document.getElementById('fullscreenBtn');
    const progressBar = document.getElementById('videoProgressBar');
    
    console.log('Buttons found:', { playPauseBtn, rewindBtn, forwardBtn, volumeBtn, speedBtn, fullscreenBtn, progressBar });
    
    if (!playPauseBtn || !rewindBtn || !forwardBtn || !volumeBtn || !speedBtn || !fullscreenBtn || !progressBar) {
        console.error('Some control elements not found!');
        return;
    }
    
    // Play/Pause
    playPauseBtn.onclick = () => {
        console.log('Play/Pause clicked, playerReady:', playerReady);
        if (!youtubePlayer || !playerReady) return;
        
        if (youtubePlayer.getPlayerState() === window.YT.PlayerState.PLAYING) {
            youtubePlayer.pauseVideo();
        } else {
            youtubePlayer.playVideo();
        }
    };
    
    // Rewind 10 seconds
    rewindBtn.onclick = () => {
        console.log('Rewind clicked');
        if (!youtubePlayer || !playerReady) return;
        const currentTime = youtubePlayer.getCurrentTime();
        youtubePlayer.seekTo(Math.max(0, currentTime - 10), true);
    };
    
    // Forward 10 seconds
    forwardBtn.onclick = () => {
        console.log('Forward clicked');
        if (!youtubePlayer || !playerReady) return;
        const currentTime = youtubePlayer.getCurrentTime();
        const duration = youtubePlayer.getDuration();
        youtubePlayer.seekTo(Math.min(duration, currentTime + 10), true);
    };
    
    // Volume
    volumeBtn.onclick = () => {
        console.log('Volume clicked');
        if (!youtubePlayer || !playerReady) return;
        
        const isMuted = youtubePlayer.isMuted();
        if (isMuted) {
            youtubePlayer.unMute();
            volumeSlider.value = youtubePlayer.getVolume();
            volumeBtn.innerHTML = '<i data-lucide="volume-2"></i>';
        } else {
            youtubePlayer.mute();
            volumeSlider.value = 0;
            volumeBtn.innerHTML = '<i data-lucide="volume-x"></i>';
        }
        lucide.createIcons();
    };
    
    volumeSlider.oninput = (e) => {
        console.log('Volume slider changed');
        if (!youtubePlayer || !playerReady) return;
        const volume = parseInt(e.target.value);
        youtubePlayer.setVolume(volume);
        if (volume === 0) {
            volumeBtn.innerHTML = '<i data-lucide="volume-x"></i>';
        } else {
            volumeBtn.innerHTML = '<i data-lucide="volume-2"></i>';
        }
        lucide.createIcons();
    };
    
    // Speed
    const speedOptions = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
    let currentSpeedIndex = 2; // Default 1x
    
    speedBtn.onclick = () => {
        console.log('Speed clicked');
        currentSpeedIndex = (currentSpeedIndex + 1) % speedOptions.length;
        const speed = speedOptions[currentSpeedIndex];
        youtubePlayer.setPlaybackRate(speed);
        speedBtn.querySelector('span').textContent = speed + 'x';
    };
    
    // Progress Bar Click
    progressBar.onclick = (e) => {
        console.log('Progress bar clicked');
        if (!youtubePlayer || !playerReady) return;
        
        const rect = progressBar.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        const duration = youtubePlayer.getDuration();
        youtubePlayer.seekTo(percent * duration, true);
    };
    
    // Fullscreen
    fullscreenBtn.onclick = async () => {
        console.log('Fullscreen clicked');
        const modal = document.getElementById('videoPlayerModal');
        
        // Try to lock to landscape orientation on mobile
        if (screen.orientation && screen.orientation.lock) {
            try {
                await screen.orientation.lock('landscape');
            } catch (e) {
                console.log('Orientation lock failed:', e);
            }
        } else if (window.screen && window.screen.orientation) {
            try {
                await window.screen.orientation.lock('landscape');
            } catch (e) {
                console.log('Orientation lock failed:', e);
            }
        }
        
        // Request fullscreen
        if (modal.requestFullscreen) {
            modal.requestFullscreen();
        } else if (modal.webkitRequestFullscreen) {
            modal.webkitRequestFullscreen();
        }
        
        // Auto-hide controls after 3 seconds in fullscreen (header is always hidden in CSS)
        const controls = document.getElementById('customControls');
        
        // Show controls initially in fullscreen
        if (controls) {
            controls.style.opacity = '1';
            controls.style.pointerEvents = 'auto';
        }
        
        setTimeout(() => {
            if (controls && (document.fullscreenElement || document.webkitFullscreenElement)) {
                controls.classList.add('auto-hide');
                controls.style.opacity = '0';
                controls.style.pointerEvents = 'none';
            }
        }, 3000);
        
        // Add click handler to video container to show controls temporarily
        const videoContent = document.querySelector('.video-viewer-content');
        if (videoContent) {
            videoContent.onclick = (e) => {
                // Don't trigger if clicking on controls
                if (e.target.closest('.custom-controls')) return;
                
                // Show controls
                if (controls) {
                    controls.classList.remove('auto-hide');
                    controls.style.opacity = '1';
                    controls.style.pointerEvents = 'auto';
                }
                
                // Hide again after 3 seconds
                setTimeout(() => {
                    if (controls && (document.fullscreenElement || document.webkitFullscreenElement)) {
                        controls.classList.add('auto-hide');
                        controls.style.opacity = '0';
                        controls.style.pointerEvents = 'none';
                    }
                }, 3000);
            };
        }
    };
    
    // Update progress bar
    updateYouTubeProgress();
    console.log('YouTube controls initialized');
}

// Auto-hide video header after 2 seconds for fresh look
let videoHeaderHideTimer = null;
let videoPlayerModal = null;

function setupVideoHeaderAutoHide() {
    // Get modal and container elements
    const videoPlayerModal = document.getElementById('videoPlayerModal');
    const videoContainer = document.getElementById('videoPlayerContainer');
    const customControls = document.getElementById('customControls');
    const customPlayer = document.getElementById('customVideoPlayer');
    
    // Clear any existing timer
    if (videoHeaderHideTimer) {
        clearTimeout(videoHeaderHideTimer);
    }
    
    // Get the video header element
    const videoHeader = document.querySelector('.video-header');
    if (!videoHeader) return;
    
    // Show header first
    videoHeader.style.opacity = '1';
    videoHeader.style.pointerEvents = 'auto';
    
    // Set timer to hide header after 2 seconds
    videoHeaderHideTimer = setTimeout(() => {
        if (videoHeader) {
            videoHeader.style.opacity = '0';
            videoHeader.style.pointerEvents = 'none';
        }
    }, 2000);
    
    // Show header on mouse move, but don't interfere with controls
    if (videoPlayerModal) {
        // Use a more specific approach - track mouse on modal but not on controls
        videoPlayerModal.addEventListener('mousemove', handleVideoMouseMove);
    }
    
    // Add click handler to video container for play/pause toggle
    // This ensures clicks on video area toggle play/pause
    if (customPlayer) {
        // Remove any existing click handler to avoid duplicates
        customPlayer.onclick = function(e) {
            // Don't toggle if clicking on the YouTube iframe (it handles its own) or controls
            if (e.target.closest('iframe') || e.target.closest('.custom-controls') || e.target.closest('.viewer-header')) {
                return;
            }
            
            // Toggle play/pause for YouTube
            if (youtubePlayer && playerReady) {
                try {
                    if (youtubePlayer.getPlayerState() === window.YT.PlayerState.PLAYING) {
                        youtubePlayer.pauseVideo();
                    } else {
                        youtubePlayer.playVideo();
                    }
                } catch (e) {}
            }
            
            // Toggle play/pause for native video
            const nativeVideo = document.getElementById('videoPlayer');
            if (nativeVideo && nativeVideo.style.display !== 'none') {
                if (nativeVideo.paused) {
                    nativeVideo.play();
                } else {
                    nativeVideo.pause();
                }
            }
        };
    }
}

// Handle mouse movement for header auto-show
function handleVideoMouseMove(e) {
    const videoHeader = document.querySelector('.video-header');
    const customControls = document.getElementById('customControls');
    
    // Don't show header if mouse is over controls
    if (customControls && customControls.contains(e.target)) {
        return;
    }
    
    // Don't show header if mouse is over header itself
    if (videoHeader && videoHeader.contains(e.target)) {
        return;
    }
    
    // Show header on mouse move
    if (videoHeader) {
        videoHeader.style.opacity = '1';
        videoHeader.style.pointerEvents = 'auto';
    }
    
    // Reset the timer
    if (videoHeaderHideTimer) {
        clearTimeout(videoHeaderHideTimer);
    }
    
    // Set timer to hide again after 2 seconds of inactivity
    videoHeaderHideTimer = setTimeout(() => {
        if (videoHeader) {
            videoHeader.style.opacity = '0';
            videoHeader.style.pointerEvents = 'none';
        }
    }, 2000);
}

// Update YouTube Progress
function updateYouTubeProgress() {
    if (!youtubePlayer || !playerReady) return;
    
    try {
        const currentTime = youtubePlayer.getCurrentTime();
        const duration = youtubePlayer.getDuration();
        const progress = (currentTime / duration) * 100;
        
        document.getElementById('videoProgress').style.width = progress + '%';
        document.getElementById('progressHandle').style.left = progress + '%';
        document.getElementById('timeDisplay').textContent = 
            formatTime(currentTime) + ' / ' + formatTime(duration);
    } catch (e) {
        // Player not ready
    }
    
    requestAnimationFrame(updateYouTubeProgress);
}

// Initialize Native Video Controls
function initNativeVideoControls() {
    const video = document.getElementById('videoPlayer');
    const playPauseBtn = document.getElementById('playPauseBtn');
    const rewindBtn = document.getElementById('rewindBtn');
    const forwardBtn = document.getElementById('forwardBtn');
    const volumeBtn = document.getElementById('volumeBtn');
    const volumeSlider = document.getElementById('volumeSlider');
    const speedBtn = document.getElementById('speedBtn');
    const fullscreenBtn = document.getElementById('fullscreenBtn');
    const progressBar = document.getElementById('videoProgressBar');
    
    // Initialize Lucide icons
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
    
    // Play/Pause
    playPauseBtn.onclick = function() {
        if (video.paused) {
            video.play();
        } else {
            video.pause();
        }
    };
    
    video.onplay = function() {
        document.querySelector('.play-icon').style.display = 'none';
        document.querySelector('.pause-icon').style.display = 'block';
    };
    
    video.onpause = function() {
        document.querySelector('.play-icon').style.display = 'block';
        document.querySelector('.pause-icon').style.display = 'none';
    };
    
    video.onended = function() {
        document.querySelector('.play-icon').style.display = 'block';
        document.querySelector('.pause-icon').style.display = 'none';
    };
    
    // Rewind 5 seconds - for native video only
    rewindBtn.onclick = function() {
        video.currentTime = Math.max(0, video.currentTime - 5);
    };
    
    // Forward 5 seconds - for native video only
    forwardBtn.onclick = function() {
        video.currentTime = Math.min(video.duration, video.currentTime + 5);
    };
    
    // Volume
    volumeBtn.onclick = () => {
        if (video.muted) {
            video.muted = false;
            volumeSlider.value = video.volume * 100;
            volumeBtn.innerHTML = '<i data-lucide="volume-2"></i>';
        } else {
            video.muted = true;
            volumeSlider.value = 0;
            volumeBtn.innerHTML = '<i data-lucide="volume-x"></i>';
        }
        lucide.createIcons();
    };
    
    volumeSlider.oninput = (e) => {
        video.volume = e.target.value / 100;
        if (video.volume === 0) {
            volumeBtn.innerHTML = '<i data-lucide="volume-x"></i>';
        } else {
            volumeBtn.innerHTML = '<i data-lucide="volume-2"></i>';
        }
        lucide.createIcons();
    };
    
    // Speed
    const speedOptions = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
    let currentSpeedIndex = 2;
    
    speedBtn.onclick = () => {
        currentSpeedIndex = (currentSpeedIndex + 1) % speedOptions.length;
        video.playbackRate = speedOptions[currentSpeedIndex];
        speedBtn.querySelector('span').textContent = speedOptions[currentSpeedIndex] + 'x';
    };
    
    // Progress Bar
    progressBar.onclick = (e) => {
        const rect = progressBar.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        video.currentTime = percent * video.duration;
    };
    
    video.ontimeupdate = () => {
        const progress = (video.currentTime / video.duration) * 100;
        document.getElementById('videoProgress').style.width = progress + '%';
        document.getElementById('progressHandle').style.left = progress + '%';
        document.getElementById('timeDisplay').textContent = 
            formatTime(video.currentTime) + ' / ' + formatTime(video.duration);
    };
    
    // Fullscreen
    fullscreenBtn.onclick = async () => {
        const modal = document.getElementById('videoPlayerModal');
        
        // Try to lock to landscape orientation on mobile
        if (screen.orientation && screen.orientation.lock) {
            try {
                await screen.orientation.lock('landscape');
            } catch (e) {
                console.log('Orientation lock failed:', e);
            }
        } else if (window.screen && window.screen.orientation) {
            try {
                await window.screen.orientation.lock('landscape');
            } catch (e) {
                console.log('Orientation lock failed:', e);
            }
        }
        
        // Request fullscreen
        if (modal.requestFullscreen) {
            modal.requestFullscreen();
        }
        
        // Auto-hide controls after 3 seconds in fullscreen (header is always hidden in CSS)
        const controls = document.getElementById('customControls');
        
        // Show controls initially in fullscreen
        if (controls) {
            controls.style.opacity = '1';
            controls.style.pointerEvents = 'auto';
        }
        
        setTimeout(() => {
            if (controls && (document.fullscreenElement || document.webkitFullscreenElement)) {
                controls.classList.add('auto-hide');
                controls.style.opacity = '0';
                controls.style.pointerEvents = 'none';
            }
        }, 3000);
        
        // Add click handler to video container to show controls temporarily
        const videoContent = document.querySelector('.video-viewer-content');
        if (videoContent) {
            videoContent.onclick = (e) => {
                // Don't trigger if clicking on controls
                if (e.target.closest('.custom-controls')) return;
                
                // Show controls
                if (controls) {
                    controls.classList.remove('auto-hide');
                    controls.style.opacity = '1';
                    controls.style.pointerEvents = 'auto';
                }
                
                // Hide again after 3 seconds
                setTimeout(() => {
                    if (controls && document.fullscreenElement) {
                        controls.classList.add('auto-hide');
                        controls.style.opacity = '0';
                        controls.style.pointerEvents = 'none';
                    }
                }, 3000);
            };
        }
    };
    
    lucide.createIcons();
}

// Format Time
function formatTime(seconds) {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return mins + ':' + (secs < 10 ? '0' : '') + secs;
}

window.openVideoPlayer = openVideoPlayer;
window.setupVideoHeaderAutoHide = setupVideoHeaderAutoHide;
window.openNoteModal = openNoteModal;
window.playReel = playReel;
window.openVideoModal = openVideoModal;

// Essay functions
exportFunction(newEssay);
exportFunction(loadEssay);
exportFunction(saveEssay);
exportFunction(deleteEssay);
exportFunction(deleteEssayById);
exportFunction(formatText);
exportFunction(insertTable);
exportFunction(insertCustomTable);
exportFunction(insertLink);
exportFunction(toggleFullscreen);
exportFunction(toggleEssayDarkMode);
exportFunction(exportEssay);
exportFunction(updateEssayStats);
exportFunction(updateToolbarState);
exportFunction(hideColorDropdown);
exportFunction(focusEditorForColor);
exportFunction(applyColor);
exportFunction(openEssayModal);
exportFunction(closeEssayModal);
exportFunction(saveEssayModal);
exportFunction(openReadEssayModal);
exportFunction(closeReadEssayModal);
exportFunction(exportEssayModal);
exportFunction(updateEssayStatsModal);
exportFunction(updateToolbarStateModal);
exportFunction(applyColorModal);
exportFunction(focusEditorForColorModal);
exportFunction(hideColorDropdownModal);
exportFunction(toggleColorDropdownModal);
exportFunction(insertLinkModal);
exportFunction(insertCustomTableModal);
exportFunction(formatTextModal);
exportFunction(toggleTableDropdownModal);

// ============================================
// CRUD Operations - Plans
// ============================================
function handlePlanSubmit(e) {
    e.preventDefault();
    
    const planId = document.getElementById('planId').value;
    const planData = {
        id: planId || generateId(),
        title: document.getElementById('planTitle').value,
        subjectId: document.getElementById('planSubject').value,
        type: document.getElementById('planType').value,
        date: document.getElementById('planDate').value,
        time: document.getElementById('planTime').value,
        completed: planId ? appState.plans.find(p => p.id === planId)?.completed || false : false,
        createdAt: planId ? appState.plans.find(p => p.id === planId)?.createdAt : new Date().toISOString()
    };
    
    if (planId) {
        const index = appState.plans.findIndex(p => p.id === planId);
        if (index !== -1) appState.plans[index] = planData;
        showToast('Plan updated', 'success');
    } else {
        appState.plans.push(planData);
        showToast('Plan added', 'success');
    }
    
    saveData();
    renderAll();
    renderCalendar();
    closeModal('planModal');
    document.getElementById('planForm').reset();
    document.getElementById('planId').value = '';
}

// ============================================
// CRUD Operations - Reminders
// ============================================
function handleReminderSubmit(e) {
    e.preventDefault();
    
    const reminderId = document.getElementById('reminderId').value;
    const reminderData = {
        id: reminderId || generateId(),
        message: document.getElementById('reminderMessage').value,
        dateTime: document.getElementById('reminderDateTime').value,
        createdAt: reminderId ? appState.reminders.find(r => r.id === reminderId)?.createdAt : new Date().toISOString()
    };
    
    if (reminderId) {
        const index = appState.reminders.findIndex(r => r.id === reminderId);
        if (index !== -1) appState.reminders[index] = reminderData;
        showToast('Reminder updated', 'success');
    } else {
        appState.reminders.push(reminderData);
        showToast('Reminder added', 'success');
    }
    
    saveData();
    renderAll();
    closeModal('reminderModal');
    document.getElementById('reminderForm').reset();
    document.getElementById('reminderId').value = '';
}

function editReminder(id) {
    const reminder = appState.reminders.find(r => r.id === id);
    if (!reminder) return;
    
    document.getElementById('reminderId').value = reminder.id;
    document.getElementById('reminderMessage').value = reminder.message;
    document.getElementById('reminderDateTime').value = reminder.dateTime.slice(0, 16);
    
    document.getElementById('reminderModalTitle').textContent = 'Edit Reminder';
    openModal('reminderModal');
}

function deleteReminder(id) {
    showConfirmDialog('Delete this reminder?', () => {
        appState.reminders = appState.reminders.filter(r => r.id !== id);
        saveData();
        renderAll();
        showToast('Reminder deleted', 'success');
    });
}

// ============================================
// CRUD Operations - Todos
// ============================================
function handleTodoSubmit(e) {
    e.preventDefault();
    
    const todoId = document.getElementById('todoId').value;
    const todoData = {
        id: todoId || generateId(),
        task: document.getElementById('todoTask').value,
        priority: document.getElementById('todoPriority').value,
        completed: todoId ? appState.todos.find(t => t.id === todoId)?.completed || false : false,
        createdAt: todoId ? appState.todos.find(t => t.id === todoId)?.createdAt : new Date().toISOString()
    };
    
    if (todoId) {
        const index = appState.todos.findIndex(t => t.id === todoId);
        if (index !== -1) appState.todos[index] = todoData;
        showToast('To-do updated', 'success');
    } else {
        appState.todos.push(todoData);
        showToast('To-do added', 'success');
    }
    
    saveData();
    renderAll();
    closeModal('todoModal');
    document.getElementById('todoForm').reset();
    document.getElementById('todoId').value = '';
}

function editTodo(id) {
    const todo = appState.todos.find(t => t.id === id);
    if (!todo) return;
    
    document.getElementById('todoId').value = todo.id;
    document.getElementById('todoTask').value = todo.task;
    document.getElementById('todoPriority').value = todo.priority;
    
    document.getElementById('todoModalTitle').textContent = 'Edit To-Do';
    openModal('todoModal');
}

function deleteTodo(id) {
    showConfirmDialog('Delete this to-do?', () => {
        appState.todos = appState.todos.filter(t => t.id !== id);
        saveData();
        renderAll();
        showToast('To-do deleted', 'success');
    });
}

function toggleTodo(id) {
    const todo = appState.todos.find(t => t.id === id);
    if (todo) {
        todo.completed = !todo.completed;
        saveData();
        renderAll();
    }
}

window.toggleTodo = toggleTodo;

// ============================================
// Subject Management
// ============================================
function handleAddSubject() {
    const nameInput = document.getElementById('newSubjectName');
    const colorInput = document.getElementById('newSubjectColor');
    
    const name = nameInput?.value?.trim();
    if (!name) {
        showToast('Enter subject name', 'error');
        return;
    }
    
    const newSubject = {
        id: generateId(),
        name: name,
        color: colorInput?.value || '#6366f1'
    };
    
    appState.subjects.push(newSubject);
    saveData();
    renderAll();
    
    if (nameInput) nameInput.value = '';
    showToast('Subject added', 'success');
}

function editSubject(id) {
    const subject = appState.subjects.find(s => s.id === id);
    if (!subject) return;
    
    const newName = prompt('Edit subject:', subject.name);
    if (newName?.trim()) {
        subject.name = newName.trim();
        saveData();
        renderAll();
        showToast('Subject updated', 'success');
    }
}

function deleteSubject(id) {
    showConfirmDialog('Delete this subject?', () => {
        appState.subjects = appState.subjects.filter(s => s.id !== id);
        saveData();
        renderAll();
        showToast('Subject deleted', 'success');
    });
}

// ============================================
// Helper Functions
// ============================================
function populateSubjectSelects() {
    const selects = ['noteSubject', 'videoSubject', 'reelSubject', 'planSubject', 'notesSubjectFilter', 'videosSubjectFilter', 'reelsSubjectFilter'];
    
    selects.forEach(selectId => {
        const select = document.getElementById(selectId);
        if (!select) return;
        
        const isFilter = selectId.includes('Filter');
        const currentValue = select.value;
        
        let options = isFilter ? '<option value="">All Subjects</option>' : '';
        
        appState.subjects.forEach(subject => {
            options += `<option value="${subject.id}">${escapeHtml(subject.name)}</option>`;
        });
        
        select.innerHTML = options;
        select.value = currentValue;
    });
}

function getSubjectName(subjectId) {
    if (!subjectId) return 'Uncategorized';
    const subject = appState.subjects.find(s => s.id === subjectId);
    return subject?.name || 'Unknown';
}

function getSubjectColor(subjectId) {
    if (!subjectId) return 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)';
    const subject = appState.subjects.find(s => s.id === subjectId);
    if (!subject || !subject.color) return 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)';
    // Convert hex color to gradient
    const hex = subject.color;
    return `linear-gradient(135deg, ${hex} 0%, ${hex}99 100%)`;
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// ============================================
// Auto-fill Title and Description from URL
// ============================================
// Old function removed - keeping the new version with description support

// Auto-fill title and description from URL
async function autoFillTitleFromUrl(urlInput, titleInput, descriptionInput, type) {
    const url = urlInput.value.trim();
    if (!url) return;
    
    // If user already entered a title, don't override it
    if (titleInput.value && titleInput.value.trim()) {
        // Still try to generate description if not set
        if (descriptionInput && !descriptionInput.value.trim()) {
            const desc = await autoGenerateBanglaDescription(titleInput.value, type);
            if (desc) {
                descriptionInput.value = desc;
                descriptionInput.dispatchEvent(new Event('input', { bubbles: true }));
            }
        }
        return;
    }
    
    let extractedTitle = '';
    
    // Try to extract YouTube video title
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
        extractedTitle = await getYouTubeTitle(url);
    } 
    // Try to extract Google Drive file title
    else if (url.includes('drive.google.com')) {
        extractedTitle = getGoogleDriveTitle(url);
    }
    // Try to extract from URL path for other links
    else {
        extractedTitle = extractTitleFromUrl(url);
    }
    
    if (extractedTitle) {
        titleInput.value = extractedTitle;
        // Trigger input event to ensure any listeners catch the change
        titleInput.dispatchEvent(new Event('input', { bubbles: true }));
        
        // Auto-generate Bangla description after title is set
        if (descriptionInput && !descriptionInput.value.trim()) {
            const desc = await autoGenerateBanglaDescription(extractedTitle, type);
            if (desc) {
                descriptionInput.value = desc;
                descriptionInput.dispatchEvent(new Event('input', { bubbles: true }));
            }
        }
    }
}

async function getYouTubeTitle(url) {
    // Extract video ID from various YouTube URL formats
    let videoId = '';
    
    if (url.includes('youtu.be/')) {
        videoId = url.split('youtu.be/')[1]?.split('?')[0];
    } else if (url.includes('youtube.com/watch')) {
        const urlParams = new URLSearchParams(url.split('?')[1]);
        videoId = urlParams.get('v');
    } else if (url.includes('youtube.com/embed/')) {
        videoId = url.split('youtube.com/embed/')[1]?.split('?')[0];
    }
    
    if (videoId) {
        // Try to get title from YouTube API or oEmbed
        try {
            const response = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
            if (response.ok) {
                const data = await response.json();
                return data.title;
            }
        } catch (e) {
            console.log('YouTube title fetch failed:', e);
        }
        
        // Fallback: try to get from noembed service
        try {
            const response = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`);
            if (response.ok) {
                const data = await response.json();
                return data.title;
            }
        } catch (e) {
            console.log('Noembed title fetch failed:', e);
        }
    }
    
    return '';
}

function getGoogleDriveTitle(url) {
    // Extract file ID from Google Drive URLs
    let fileId = '';
    let fileName = '';
    
    if (url.includes('/d/')) {
        // https://drive.google.com/file/d/FILE_ID/view or /edit
        // Try to extract filename from URL path
        const pathMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)\/(view|edit|preview)/);
        if (pathMatch) {
            fileId = pathMatch[1];
        } else {
            fileId = url.split('/d/')[1]?.split('/')[0];
        }
        // Try to extract filename from the URL path (often present in share URLs)
        // Format: /file/d/FILENAME-FILE_ID/view
        const nameMatch = url.match(/\/d\/[a-zA-Z0-9_-]+\/([^\/]+)\/(view|edit|preview)/);
        if (nameMatch) {
            fileName = nameMatch[1].replace(/-[a-zA-Z0-9_-]+$/, ''); // Remove trailing ID if present
            fileName = fileName.replace(/\?usp.*$/, ''); // Remove query params
        }
    } else if (url.includes('id=')) {
        // https://drive.google.com/open?id=FILE_ID
        fileId = url.split('id=')[1]?.split('&')[0];
    } else if (url.includes('/uc?')) {
        // https://drive.google.com/uc?export=download&id=FILE_ID
        fileId = url.split('id=')[1]?.split('&')[0];
    }
    
    if (fileName) {
        // Decode URL-encoded filename
        try {
            fileName = decodeURIComponent(fileName);
        } catch (e) {}
        return fileName;
    }
    
    if (fileId) {
        // Return a placeholder prompting user to enter title manually
        // (Google Drive API requires authentication to fetch file titles)
        return 'Google Drive File - Enter Title';
    }
    
    return '';
}

function extractTitleFromUrl(url) {
    try {
        const urlObj = new URL(url);
        const pathname = urlObj.pathname;
        
        // Get the last part of the path and clean it up
        let title = pathname.split('/').pop();
        
        // Remove file extension
        if (title.includes('.')) {
            title = title.substring(0, title.lastIndexOf('.'));
        }
        
        // Replace dashes and underscores with spaces
        title = title.replace(/[-_]/g, ' ');
        
        // Capitalize words
        title = title.replace(/\b\w/g, c => c.toUpperCase());
        
        return title || '';
    } catch (e) {
        return '';
    }
}

// Auto-generate description (Bangla or English) using free AI API
async function autoGenerateBanglaDescription(title, type) {
    if (!title || title.trim().length < 3) return '';
    
    // Check if title is in English (contains mostly English characters)
    const isEnglish = /^[a-zA-Z0-9\s\-\.]+$/.test(title.trim()) && /[a-zA-Z]/.test(title);
    
    // If English, use English templates
    if (isEnglish) {
        return generateEnglishDescription(title, type);
    }
    
    // Otherwise try AI for Bangla, fallback to Bangla templates
    try {
        // Using Hugging Face Inference API (free tier)
        // Using google/mt5-small for Bengali text generation
        const response = await fetch('https://api-inference.huggingface.co/models/google/mt5-small', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                inputs: `Generate a 100-word Bangla description for a ${type} titled: "${title}". Write in Bengali language.`,
                parameters: {
                    max_new_tokens: 150,
                    temperature: 0.7,
                }
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data && data[0] && data[0].generated_text) {
                // Extract the generated text and clean it up
                let generatedText = data[0].generated_text;
                // Remove the prompt if it appears in the output
                if (generatedText.includes('Write in Bengali language.')) {
                    generatedText = generatedText.split('Write in Bengali language.')[1];
                }
                // Clean up and return
                return generatedText ? generatedText.trim().substring(0, 500) : '';
            }
        }
    } catch (e) {
        console.log('AI description generation failed:', e);
    }
    
    // Fallback: Generate Bangla template-based description
    return generateFallbackBanglaDescription(title, type);
}

function generateEnglishDescription(title, type) {
    // English descriptions for study videos and notes
    const englishTemplates = [
        `Master any topic with our easy-to-follow video lecture and detailed PDF notes. This combo simplifies complex concepts, helping you learn faster and retain longer. Perfect for quick revision before exams. Download the notes and watch the video to boost your confidence and score higher. Start your smart study session today!`,
        `Get exam-ready with our focused study video and concise summary notes. We break down the entire chapter into key points for quick understanding. The attached PDF is perfect for last-minute revision, saving you time and effort. Ideal for students who want clear concepts and efficient learning. Watch now and ace your tests.`,
        `Struggling with difficult topics? This video explanation, paired with our crisp study notes, makes learning effortless. The PDF highlights all the essential formulas and definitions you need. Whether you're catching up or reviewing, this resource pack is your go-to guide for academic success. Click play and simplify your studies.`,
        `This video lecture and downloadable note set is all you need for thorough preparation. We cover everything from basics to advanced levels in a structured way. The notes serve as a perfect handbook for regular practice and revision. Join thousands of successful students who rely on our content. Learn smartly today!`,
        `Prepare smarter, not harder! Our video breaks down complex ideas visually, while the notes provide a text-based summary for quick recall. This powerful combination ensures you grasp the core concepts firmly. Great for competitive exams and board prep. Download the PDF and watch the video to maximize your potential.`,
        `Your ultimate study guide is here! This package includes an in-depth video tutorial and a set of printable notes. We've organized the information into bullet points and diagrams for easy memorization. Save hours of confusion and get straight to the point. Perfect for last-minute cramming or deep learning. Check it out now.`,
        `Ace your upcoming exams with our expert-crafted video lesson and companion study notes. The video ensures you understand the "why," and the notes help you remember the "what." This dual approach is proven to improve grades. Don't just study—study effectively. Get your free notes and start watching immediately.`,
        `This video and PDF note combination is designed for rapid learning. We focus only on the most important topics and questions asked in exams. The notes are a fantastic tool for quick revisions on the go. Whether you have one day or one week, this resource will help you cover the syllabus fast.`,
        `Transform your study routine with our engaging video content and neatly organized notes. Each session is designed to build your confidence step by step. The PDF notes are perfect for highlighting and annotating as you learn. Join us and experience a new way of learning that is both fun and effective. Watch the video now.`,
        `Get clarity on every subject with our detailed video breakdown and essential short notes. The video explains the theory, while the notes provide a skeleton for quick revision. This is the ideal resource for students who want to strengthen their fundamentals and perform well in exams. Start your journey to success today.`
    ];
    
    // Use title length to consistently select a template
    const index = title.length % englishTemplates.length;
    return englishTemplates[index];
}

function generateFallbackBanglaDescription(title, type) {
    // Comprehensive Bangla descriptions for notes/videos
    const noteTemplates = [
        `এই ভিডিওটি গুরুত্বপূর্ণ টপিকগুলোর সহজ ও সংক্ষিপ্ত ব্যাখ্যা নিয়ে সাজানো। পিডিএফ নোটগুলোতে মূল পয়েন্টগুলো চিহ্নিত করা আছে যা পরীক্ষার প্রস্তুতিতে দ্রুত রিভিশন দিতে সাহায্য করবে। যেকোনো প্রতিযোগিতামূলক পরীক্ষার জন্যই এটি অত্যন্ত কার্যকর। সময় বাঁচাতে এবং ধারণা স্পষ্ট করতে আজই দেখুন এবং নোট ডাউনলোড করুন। আপনার পড়াশোনাকে আরও সহজ করে তুলুন আমাদের সাথে।`,
        `ক্লাসরুমের পড়া এখন ঘরে বসেই। এই অধ্যয়ন ভিডিওতে প্রতিটি অধ্যায়ের ধাপে ধাপে ব্যাখ্যা দেওয়া হয়েছে, যা বুঝতে সুবিধা হয়। সংযুক্ত স্টাডি নোটস (পিডিএফ) মূল তথ্যগুলোকে খুব সুন্দরভাবে সাজিয়েছে, ফলে পড়া মনে রাখা সহজ হয়। যারা ব্যাসিক ক্লিয়ার করে দ্রুত এগোতে চান, তাদের জন্য এই সিরিজটি একদম পারফেক্ট। পড়ুন, বুঝুন এবং সফল হোন।`,
        `পরীক্ষার প্রস্তুতিকে ভয় না পেয়ে মজায় পরিণত করুন। এই ভিডিও লেকচার এবং নোটের কম্বো প্যাকেজ আপনাকে প্রতিটি টপিকের গভীরে নিয়ে যাবে। পিডিএফ নোটগুলো খুবই পরিপাটি এবং বহু বিকল্পী প্রশ্নের (MCQ) উত্তর খুঁজতে সহায়ক। যেকোনো বোর্ড বা বিশ্ববিদ্যালয়ের পরীক্ষার্থীদের জন্য এটি একটি নির্ভরযোগ্য গাইড। আর দেরি নয়, এখনই শুরু হোক প্রস্তুতি।`,
        `জটিল বিষয়গুলোকেও আমরা সহজ ভাষায় উপস্থাপন করেছি এই ভিডিও সিরিজে। সঙ্গে রয়েছে ডাউনলোডযোগ্য নোটস, যা মূল বক্তব্যকে পয়েন্ট আকারে তুলে ধরে। এই নোটগুলো শেষ মুহূর্তের প্রস্তুতির জন্য রামবাণ। পড়াশোনায় দুর্বল ছাত্রছাত্রীরাও খুব সহজেই এখান থেকে ভালো ফল করতে পারবে। আমাদের লক্ষ্য, শিক্ষাকে সবার জন্য সহজলভ্য করা।`,
        `আপনার মূল্যবান সময় বাঁচাতে আমরা বেছে বেছে গুরুত্বপূর্ণ টপিকগুলোর উপর এই ভিডিও তৈরি করেছি। প্রতিটি ভিডিওর শেষে দেওয়া নোটের পিডিএফ ফাইল আপনাকে দ্রুত পুরো অধ্যায় মনে করিয়ে দেবে। এটি মূলত সেইসব শিক্ষার্থীদের জন্য যারা অল্প সময়ে বেশি পড়তে চান। গুণগত মানের শিক্ষা এবং সহজ নোট পেতে চোখ রাখুন আমাদের চ্যানেলে।`,
        `এক্সপার্ট টিচারদের দ্বারা প্রস্তুত এই ভিডিও লেকচার এবং নোটস আপনাকে কনসেপচুয়াল ক্লিয়ারিটি দেবে। পিডিএফ গুলো এমনভাবে ডিজাইন করা হয়েছে যাতে আপনি অফলাইনে বসেও পড়তে পারেন। শিক্ষার্থীদের ফিডব্যাকের ভিত্তিতে আপডেট করা এই কনটেন্ট পরীক্ষায় ভালো নম্বর আনার জন্য যথেষ্ট। আজই আপনার স্টাডি প্ল্যানে যুক্ত করুন এই অসাধারণ রিসোর্স।`,
        `শর্টকাট টেকনিক এবং ইজি মেথড নিয়ে আমাদের এই স্পেশাল ভিডিও সিরিজ। স্টাডি নোটসগুলোতে শুধু মুখ্য কথাগুলো হাইলাইট করা আছে, যা রিভিশনের সময় অত্যন্ত কাজে দেয়। কঠিন অঙ্ক বা তত্ত্ব সহজে বোঝানোর চেষ্টা করা হয়েছে প্রতিটি ক্লাসে। যারা কোচিং করতে পারেন না বা সময় পাচ্ছেন না, তাদের জন্য এটি একটি আদর্শ সমাধান।`,
        `এই ভিডিও এবং পিডিএফ নোটের মাধ্যমে পড়াশোনা হবে আরও স্মার্টলি। ভিডিওতে রয়েছে ডিটেইল অ্যানালাইসিস এবং নোটসে রয়েছে দ্রুত মনে রাখার টিপস। বিগত বছরের প্রশ্ন বিশ্লেষণ করে এই কনটেন্ট তৈরি করায় পরীক্ষার হলেও আপনি আত্মবিশ্বাসী থাকবেন। আজই দেখুন এবং আপনার বন্ধুদের সাথে শেয়ার করে তাদেরও উপকৃত করুন।`,
        `বেসিক থেকে অ্যাডভান্সড লেভেল পর্যন্ত এই ভিডিও টিউটোরিয়াল আপনাকে গাইড করবে। নোটস গুলো প্রিন্ট করে নিয়ে পাশে রাখতে পারেন, কারণ এতে শুধু প্রয়োজনীয় তথ্যই সংক্ষেপে দেওয়া আছে। ভিডিও আর নোটের এই কম্বিনেশন আপনার পড়ার টেবিলকে সম্পূর্ণ একটি লাইব্রেরিতে পরিণত করবে। শিক্ষার এই যাত্রায় আমরা আপনার সঙ্গী।`,
        `পরীক্ষার আগে পুরো সিলেবাস দ্রুত রিভিশন দিতে আমাদের এই ভিডিও ও নোটের জুড়ি নেই। প্রতিটি অধ্যায়ের মূল পয়েন্ট পিডিএফ এ শর্টকাট আকারে দেওয়া আছে। এতে করে অপ্রয়োজনীয় তথ্য বাদ দিয়ে শুধু গুরুত্বপূর্ণ অংশগুলো পড়তে পারবেন। পড়াশোনায় গতি আনতে এবং কনফিডেন্স বাড়াতে এখনই দেখে ফেলুন এই ভিডিও সিরিজ।`,
        `যেকোনো প্রতিযোগিতার প্রস্তুতিকে শক্তিশালী করতে আজই দেখুন আমাদের এই ভিডিও লেকচার। স্টাডি নোটস (পিডিএফ) গুলোতে প্রতিটি টপিকের সারসংক্ষেপ এমনভাবে দেওয়া আছে যা একবার পড়লেই মনে থেকে যায়। এটি মূলত সময় বাঁচিয়ে প্রস্তুতি সম্পূর্ণ করার একটি আধুনিক পদ্ধতি। ভিডিও দেখে যদি কোনো কিছু বুঝতে সমস্যা হয়, নোটস সেই গ্যাপ পূরণ করবে।`,
        `আমাদের তৈরি এই ভিডিও ক্লাস এবং নোটস সম্পূর্ণ বিনামূল্যে শিক্ষার্থীদের জন্য উৎসর্গ করা হয়েছে। ভিডিওতে টপিক ভিত্তিক আলোচনা এবং পিডিএফ এ সংক্ষিপ্ত নোট আপনাকে সম্পূর্ণ সিলেবাস কভার করতে সাহায্য করবে। যারা স্কুল-কলেজের পড়ার পাশাপাশি নিজেদের বিকাশ চায়, তাদের জন্য এটি দারুণ একটি প্ল্যাটফর্ম। সুযোগটি কাজে লাগান।`,
        `অধ্যায়ভিত্তিক এই ভিডিও সিরিজে আমরা কঠিন টার্মগুলোকে সহজ ভাষায় ব্যাখ্যা করেছি। ডাউনলোডযোগ্য নোটগুলোতে সেই টার্মগুলোর অর্থ এবং প্রয়োগ খুব সুন্দরভাবে লেখা আছে। এই সিরিজটি ফলো করলে পড়াশোনায় আপনার আগ্রহ অনেক বেড়ে যাবে। শিক্ষার্থীদের সুবিধার জন্যই আমাদের এই ছোট্ট প্রয়াস। ভালো লাগলে লাইক ও শেয়ার করুন।`,
        `লাইভ ক্লাসের অভিজ্ঞতা নিয়ে আসা আমাদের এই রেকর্ডেড ভিডিও এবং নোটস। পিডিএফ ফাইলগুলোতে গুরুত্বপূর্ণ লাইনগুলো আন্ডারলাইন করা আছে, যা চোখে পড়ার সঙ্গে সঙ্গেই মস্তিষ্কে গেঁথে যাবে। যারা নিয়মিত পড়তে পারেন না বা পড়ায় ফাঁকি দেন, তাদের জন্য এটি পড়ার অভ্যাস গড়ে তোলার সেরা মাধ্যম। আজই সাবস্ক্রাইব করে আপডেট থাকুন।`,
        `পরীক্ষার আগের রাতে শেষ মুহূর্তের প্রস্তুতির জন্য আদর্শ এই শর্ট নোটস এবং ভিডিও সলিউশন। ভিডিওতে গুরুত্বপূর্ণ প্রশ্নের সমাধান এবং নোটসে সম্ভাব্য প্রশ্নের তালিকা দেওয়া আছে। অল্প সময়ের মধ্যে সর্বোচ্চ নম্বর তোলার কৌশল রপ্ত করে নিন আমাদের সাথে। এই কন্টেন্টগুলো বানানো হয়েছে আপনার সাফল্যের কথা মাথায় রেখেই।`
    ];
    
    // Use title length to consistently select a template
    const index = title.length % noteTemplates.length;
    return noteTemplates[index];
}

// Open Note modal for adding new note
function openNoteModal() {
    document.getElementById('noteModalTitle').textContent = 'Add Note';
    document.getElementById('noteId').value = '';
    document.getElementById('noteForm').reset();
    
    // Set up auto-fill listeners again to ensure they work
    const noteFileUrl = document.getElementById('noteFileUrl');
    const noteTitle = document.getElementById('noteTitle');
    const noteDescription = document.getElementById('noteDescription');
    if (noteFileUrl && noteTitle) {
        noteFileUrl.onchange = () => autoFillTitleFromUrl(noteFileUrl, noteTitle, noteDescription, 'note');
        noteFileUrl.onblur = () => autoFillTitleFromUrl(noteFileUrl, noteTitle, noteDescription, 'note');
    }
    
    openModal('noteModal');
}

// Open Video modal for adding new video
function openVideoModal() {
    document.getElementById('videoModalTitle').textContent = 'Add Video';
    document.getElementById('videoId').value = '';
    document.getElementById('videoForm').reset();
    
    // Set up auto-fill listeners again to ensure they work
    const videoUrl = document.getElementById('videoUrl');
    const videoTitle = document.getElementById('videoTitle');
    const videoDescription = document.getElementById('videoDescription');
    if (videoUrl && videoTitle) {
        videoUrl.onchange = () => autoFillTitleFromUrl(videoUrl, videoTitle, videoDescription, 'video');
        videoUrl.onblur = () => autoFillTitleFromUrl(videoUrl, videoTitle, videoDescription, 'video');
    }
    
    openModal('videoModal');
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatDateTime(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleString('en-US', { 
        month: 'short', day: 'numeric', 
        hour: 'numeric', minute: '2-digit'
    });
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function filterNotes() {
    // Show/hide clear button
    const searchInput = document.getElementById('notesSearch');
    const searchTerm = searchInput?.value?.toLowerCase() || '';
    const clearBtn = searchInput?.closest('.modern-search-box')?.querySelector('.search-clear');
    if (clearBtn) {
        clearBtn.style.display = searchTerm ? 'flex' : 'none';
    }
    renderNotes();
}

function filterVideos() {
    // Show/hide clear button
    const searchInput = document.getElementById('videosSearch');
    const searchTerm = searchInput?.value?.toLowerCase() || '';
    const clearBtn = searchInput?.closest('.modern-search-box')?.querySelector('.search-clear');
    if (clearBtn) {
        clearBtn.style.display = searchTerm ? 'flex' : 'none';
    }
    renderVideos();
}

function filterReels() {
    // Show/hide clear button
    const searchInput = document.getElementById('reelsSearch');
    const searchTerm = searchInput?.value?.toLowerCase() || '';
    const clearBtn = searchInput?.closest('.search-box')?.querySelector('.search-clear');
    if (clearBtn) {
        clearBtn.style.display = searchTerm ? 'flex' : 'none';
    }
    renderReels();
}

// View toggle functions
function setNotesView(view) {
    const container = document.getElementById('notesGrid');
    if (!container) return;
    
    // Update view toggle buttons
    document.querySelectorAll('#notesTab .view-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.view === view) {
            btn.classList.add('active');
        }
    });
    
    // Update container class
    if (view === 'list') {
        container.classList.add('list-view', 'notes-list');
    } else {
        container.classList.remove('list-view', 'notes-list');
    }
    
    // Save preference
    appState.settings.notesView = view;
    saveData();
}

function setVideosView(view) {
    const container = document.getElementById('videosGrid');
    if (!container) return;
    
    // Update view toggle buttons
    document.querySelectorAll('#videosTab .view-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.view === view) {
            btn.classList.add('active');
        }
    });
    
    // Update container class
    if (view === 'list') {
        container.classList.add('list-view', 'videos-list');
    } else {
        container.classList.remove('list-view', 'videos-list');
    }
    
    // Save preference
    appState.settings.videosView = view;
    saveData();
}


// ============================================
// Format Bytes
// ============================================
function formatBytes(bytes) {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// ============================================
// Search
// ============================================
function handleGlobalSearch() {
    const query = document.getElementById('globalSearch')?.value?.toLowerCase() || '';
    const resultsContainer = document.getElementById('searchResults');
    
    if (query.length < 2) {
        if (resultsContainer) resultsContainer.innerHTML = '';
        return;
    }
    
    const results = [];
    
    appState.notes.forEach(note => {
        if (note.title.toLowerCase().includes(query)) {
            results.push({ type: 'note', title: note.title, action: () => { showTab('notes'); closeModal('searchModal'); } });
        }
    });
    
    appState.videos.forEach(video => {
        if (video.title.toLowerCase().includes(query)) {
            results.push({ type: 'video', title: video.title, action: () => { showTab('videos'); closeModal('searchModal'); } });
        }
    });
    
    if (results.length === 0) {
        if (resultsContainer) resultsContainer.innerHTML = '<p>No results</p>';
        return;
    }
    
    if (resultsContainer) {
        resultsContainer.innerHTML = results.map(r => `
            <div class="search-result-item" onclick="this.onclick=null;(${r.action.toString()})()">
                <i data-lucide="${r.type === 'note' ? 'file-text' : 'video'}"></i>
                <span>${escapeHtml(r.title)}</span>
            </div>
        `).join('');
        
        if (typeof lucide !== 'undefined') {
            setTimeout(() => lucide.createIcons(), 100);
        }
    }
}

// ============================================
// Data Management
// ============================================
function exportData() {
    const data = {
        subjects: appState.subjects,
        notes: appState.notes,
        videos: appState.videos,
        plans: appState.plans,
        reminders: appState.reminders,
        todos: appState.todos,
        settings: appState.settings,
        exportDate: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `studyhub-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    showToast('Data exported', 'success');
}

function importData(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(event) {
        try {
            const data = JSON.parse(event.target.result);
            
            if (data.subjects) appState.subjects = data.subjects;
            if (data.notes) appState.notes = data.notes;
            if (data.videos) appState.videos = data.videos;
            if (data.plans) appState.plans = data.plans;
            if (data.reminders) appState.reminders = data.reminders;
            if (data.todos) appState.todos = data.todos;
            if (data.settings) appState.settings = { ...defaultSettings, ...data.settings };
            
            saveData();
            renderAll();
            showToast('Data imported', 'success');
        } catch (error) {
            showToast('Import error', 'error');
        }
    };
    reader.readAsText(file);
    e.target.value = '';
}

function clearAllData() {
    showConfirmDialog('Clear ALL data? This cannot be undone!', () => {
        localStorage.clear();
        appState.subjects = defaultSubjects;
        appState.notes = [];
        appState.videos = [];
        appState.plans = [];
        appState.reminders = [];
        appState.todos = [];
        appState.settings = defaultSettings;
        saveData();
        renderAll();
        showToast('All data cleared', 'success');
    });
}

// ============================================
// Notifications
// ============================================
function enableNotifications() {
    if (!('Notification' in window)) {
        showToast('Not supported', 'error');
        return;
    }
    
    Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
            appState.settings.notificationsEnabled = true;
            saveData();
            showToast('Notifications enabled', 'success');
        } else {
            showToast('Notifications denied', 'error');
        }
    });
}

function checkReminders() {
    setInterval(() => {
        const now = new Date();
        
        appState.reminders.forEach(reminder => {
            const reminderTime = new Date(reminder.dateTime);
            const diff = reminderTime - now;
            
            if (diff > 0 && diff <= 60000 && !reminder.notified) {
                if (Notification.permission === 'granted') {
                    new Notification('Study Hub', { body: reminder.message });
                }
                reminder.notified = true;
                saveData();
            }
        });
    }, 30000);
}

// ============================================
// UI Helpers
// ============================================
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    container?.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'toastSlideIn 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.classList.toggle('hidden', !show);
    }
}


