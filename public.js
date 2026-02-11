// public.js
// Common logic for index.html and shared UI components

// DOM Elements
const scrollProgress = document.getElementById('scroll-progress');
const themeToggle = document.getElementById('theme-toggle');
const avatar = document.getElementById('user-avatar');
const dropdown = document.getElementById('avatar-dropdown');
const backToTop = document.getElementById('back-to-top');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    AOS.init({ duration: 800, once: true });
    checkTheme();
    setupEventListeners();
    
    // Page specific logic
    if(window.location.pathname.includes('index.html') || window.location.pathname === '/') {
        fetchHomeworks();
    }
});

// Scroll Progress & Back to Top
window.onscroll = () => {
    let winScroll = document.body.scrollTop || document.documentElement.scrollTop;
    let height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    let scrolled = (winScroll / height) * 100;
    scrollProgress.style.width = scrolled + "%";

    if (winScroll > 300) {
        backToTop.classList.add('show');
    } else {
        backToTop.classList.remove('show');
    }
};

function setupEventListeners() {
    // Theme Toggle
    themeToggle.addEventListener('click', () => {
        const body = document.body;
        const icon = themeToggle.querySelector('i');
        if (body.getAttribute('data-theme') === 'dark') {
            body.removeAttribute('data-theme');
            icon.classList.replace('fa-sun', 'fa-moon');
            localStorage.setItem('theme', 'light');
        } else {
            body.setAttribute('data-theme', 'dark');
            icon.classList.replace('fa-moon', 'fa-sun');
            localStorage.setItem('theme', 'dark');
        }
    });

    // Avatar Click
    avatar.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent closing immediately
        const user = auth.currentUser;
        if (!user) {
            window.location.href = 'auth.html';
        } else {
            dropdown.classList.toggle('active');
        }
    });

    // Close Dropdown on click outside
    document.addEventListener('click', () => {
        dropdown.classList.remove('active');
    });

    // Back To Top
    backToTop.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

function checkTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.setAttribute('data-theme', 'dark');
        themeToggle.querySelector('i').classList.replace('fa-moon', 'fa-sun');
    }
}

// Authentication State Listener
auth.onAuthStateChanged(async (user) => {
    const userNameSpan = document.getElementById('dropdown-username');
    const dashboardBtn = document.getElementById('btn-dashboard');
    const adminPanelBtn = document.getElementById('btn-dashboard-users');
    
    if (user) {
        // Fetch user details from Firestore
        const doc = await db.collection('users').doc(user.email).get();
        if (doc.exists) {
            const userData = doc.data();
            userNameSpan.textContent = userData.fullName;
            
            // Setup Dropdown links
            dashboardBtn.onclick = () => window.location.href = 'admin/dashboard.html';
            
            // Show Admin-only buttons
            if (userData.position === 'super admin') {
                adminPanelBtn.classList.remove('hidden');
                adminPanelBtn.onclick = () => window.location.href = 'admin/settings.html';
            } else {
                adminPanelBtn.classList.add('hidden');
            }
        }
    } else {
        if(userNameSpan) userNameSpan.textContent = "Guest";
    }
});

// Logout Logic
function handleLogout() {
    auth.signOut().then(() => {
        showPopup('Log Out Successful', true);
    });
}

// Homework Fetching (Public)
async function fetchHomeworks() {
    const hwContainer = document.getElementById('hw-list');
    const searchInput = document.getElementById('search-hw');
    const filterDate = document.getElementById('filter-date');
    const filterSubject = document.getElementById('filter-subject');
    
    // Snapshot listener for real-time updates
    db.collection('homework').orderBy('date', 'desc').onSnapshot(snapshot => {
        let homeworks = [];
        snapshot.forEach(doc => {
            homeworks.push({ id: doc.id, ...doc.data() });
        });
        
        renderHomeworks(homeworks);

        // Search/Filter Event Listeners
        const filterHandler = () => {
            const term = searchInput.value.toLowerCase();
            const date = filterDate.value;
            const subj = filterSubject.value;

            const filtered = homeworks.filter(hw => {
                const dateMatch = date ? hw.date === date : true;
                // Check if any period has the subject or if subject is 'all'
                const subjMatch = subj ? hw.periods.some(p => p.subject === subj) : true;
                
                // Simple search in periods
                const searchMatch = term ? JSON.stringify(hw).toLowerCase().includes(term) : true;

                return dateMatch && subjMatch && searchMatch;
            });
            renderHomeworks(filtered);
        };

        searchInput.addEventListener('input', filterHandler);
        filterDate.addEventListener('change', filterHandler);
        filterSubject.addEventListener('change', filterHandler);
    });
}

function renderHomeworks(list) {
    const container = document.getElementById('hw-list');
    container.innerHTML = '';
    
    if (list.length === 0) {
        container.innerHTML = '<div class="text-center">কোনো হোমওয়ার্ক নেই</div>';
        return;
    }

    const today = new Date().toISOString().split('T')[0];

    list.forEach(hw => {
        const isToday = hw.date === today;
        
        let periodsHtml = '';
        hw.periods.forEach((p, index) => {
            let badgeClass = '';
            switch(p.type) {
                case 'Classwork': badgeClass = 'badge-cw'; break;
                case 'Homework': badgeClass = 'badge-hw'; break;
                case 'Pop Test': badgeClass = 'badge-pt'; break;
                case 'Assignment': badgeClass = 'badge-as'; break;
                case 'Notice': badgeClass = 'badge-nt'; break;
            }

            periodsHtml += `
                <div class="period-row">
                    <strong>পিরিয়ড ${index + 1}:</strong> ${p.subject} - <small>${p.teacher}</small><br>
                    <span class="badge ${badgeClass}">${p.type}</span> 
                    ${p.description ? `- ${p.description}` : ''}
                </div>
            `;
        });

        const html = `
            <div class="hw-card ${isToday ? 'today' : ''}" data-aos="fade-up">
                <div class="hw-header">
                    <span><i class="fas fa-calendar-alt"></i> ${hw.date} (${hw.day})</span>
                    <button class="action-btn" onclick="shareHw('${hw.id}')"><i class="fas fa-share-alt"></i></button>
                </div>
                <div class="hw-body">
                    ${periodsHtml}
                </div>
            </div>
        `;
        container.innerHTML += html;
    });
}

// Popup Logic
function showPopup(message, isLogout = false) {
    const popup = document.createElement('div');
    popup.className = 'popup active';
    popup.innerHTML = `
        <div class="popup-content">
            <i class="fas fa-check-circle" style="color: var(--success); font-size: 3rem; margin-bottom: 10px;"></i>
            <h3>${message}</h3>
            <div style="margin-top: 20px;">
                ${isLogout ? 
                `<button onclick="window.location.href='index.html'">Go to Home</button>
                 <button onclick="window.location.href='auth.html'">Login</button>` : 
                `<button onclick="this.closest('.popup').remove()">OK</button>`}
            </div>
        </div>
    `;
    document.body.appendChild(popup);
}

function shareHw(id) {
    // Native share or clipboard copy
    const url = window.location.href; // In real app, deep link to ID
    navigator.clipboard.writeText(`হোমওয়ার্ক দেখুন: ${url}`);
    alert('লিংক কপি করা হয়েছে!');
}

// Set current year in footer
const currentYear = new Date().getFullYear();
const yearElements = document.querySelectorAll('#currentYear');
yearElements.forEach(el => {
    if (el) el.textContent = currentYear;
});