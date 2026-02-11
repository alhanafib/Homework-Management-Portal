// admin/admin.js
// Handles all admin panel logic

// Check Auth on Load
auth.onAuthStateChanged(user => {
    if (!user) {
        window.location.href = '../auth.html';
    } else {
        loadUserData(user);
        initPageLogic();
    }
});

let currentUserData = null;

async function loadUserData(user) {
    const doc = await db.collection('users').doc(user.email).get();
    if (doc.exists) {
        currentUserData = doc.data();
        updateAdminUI(currentUserData);
    }
}

function updateAdminUI(data) {
    // Update Sidebar/Header info
    const names = document.querySelectorAll('.user-name-display');
    names.forEach(el => el.textContent = data.fullName);

    // Hide Settings if not super admin
    if (data.position !== 'super admin') {
        const settingsBtns = document.querySelectorAll('.restricted-super-admin');
        settingsBtns.forEach(btn => btn.style.display = 'none');
    }
}

function initPageLogic() {
    const path = window.location.pathname;

    if (path.includes('dashboard.html')) {
        updateDashboardStats();
        setInterval(updateTime, 1000);
    } else if (path.includes('profile.html')) {
        loadProfileForm();
    } else if (path.includes('hw.html')) {
        loadAdminHomeworks();
    } else if (path.includes('settings.html')) {
        loadSettingsModules();
    }
}

// --- Dashboard Functions ---
function updateTime() {
    const now = new Date();
    document.getElementById('live-clock').textContent = now.toLocaleString('bn-BD', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
        hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: true
    });
}

async function updateDashboardStats() {
    const hwSnap = await db.collection('homework').get();
    document.getElementById('stat-hw-count').innerText = hwSnap.size;
    
    // Mock Online Users (Real implementation requires RTDB presence)
    document.getElementById('stat-online').innerText = Math.floor(Math.random() * 20) + 1; 
}

// --- Profile Functions ---
function loadProfileForm() {
    if(!currentUserData) return setTimeout(loadProfileForm, 500);
    
    document.getElementById('p-username').value = currentUserData.username; // email
    document.getElementById('p-fullname').value = currentUserData.fullName;
    document.getElementById('p-roll').value = currentUserData.roll;
    document.getElementById('p-studentid').value = currentUserData.studentId;
    document.getElementById('p-password').value = currentUserData.password;
    document.getElementById('p-position').value = currentUserData.position;
}

async function saveProfile() {
    const updatedData = {
        fullName: document.getElementById('p-fullname').value,
        roll: document.getElementById('p-roll').value,
        studentId: document.getElementById('p-studentid').value,
        password: document.getElementById('p-password').value
        // Email and Position usually not editable by self here for safety, but logic allows
    };

    try {
        await db.collection('users').doc(currentUserData.username).update(updatedData);
        // Also update auth password if changed (requires re-auth in real scenarios)
        if(updatedData.password !== currentUserData.password) {
            auth.currentUser.updatePassword(updatedData.password);
        }
        showPopup('আপলোড Success');
    } catch (e) {
        alert(e.message);
    }
}

// --- Homework Functions ---
let periods = [];

function openAddHwModal() {
    document.getElementById('hw-modal').classList.add('active');
    periods = [];
    renderPeriodsInput();
}

function closeHwModal() {
    document.getElementById('hw-modal').classList.remove('active');
}

function addPeriodInput() {
    // In a real app, populate select options from DB subjects/teachers
    periods.push({
        subject: '', teacher: '', type: 'Classwork', description: ''
    });
    renderPeriodsInput();
}

function renderPeriodsInput() {
    const container = document.getElementById('periods-container');
    container.innerHTML = '';
    periods.forEach((p, index) => {
        container.innerHTML += `
            <div class="period-input-group" style="border:1px solid #ddd; padding:10px; margin-bottom:10px; border-radius:5px;">
                <h6>পিরিয়ড ${index + 1}</h6>
                <select onchange="updatePeriod(${index}, 'subject', this.value)" class="mb-2">
                    <option value="">বিষয় সিলেক্ট</option>
                    <option value="বাংলা ১ম">বাংলা ১ম</option>
                    <option value="গণিত">গণিত</option>
                    <option value="ইংরেজি">ইংরেজি</option>
                    <!-- Add more options -->
                </select>
                <input type="text" placeholder="শিক্ষকের নাম" onchange="updatePeriod(${index}, 'teacher', this.value)" class="mb-2">
                <select onchange="updatePeriod(${index}, 'type', this.value)" class="mb-2">
                    <option value="Classwork">Classwork</option>
                    <option value="Homework">Homework</option>
                    <option value="Pop Test">Pop Test</option>
                    <option value="Assignment">Assignment</option>
                    <option value="Notice">Notice</option>
                </select>
            </div>
        `;
    });
}

function updatePeriod(index, field, value) {
    periods[index][field] = value;
}

async function saveHomework() {
    const date = document.getElementById('hw-date').value;
    const day = document.getElementById('hw-day').value;

    if(!date || periods.length === 0) {
        alert("তারিখ এবং অন্তত একটি পিরিয়ড যোগ করুন");
        return;
    }

    try {
        await db.collection('homework').add({
            date, day, periods, timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        closeHwModal();
        showPopup('Upload Success');
    } catch(e) {
        console.error(e);
    }
}

function loadAdminHomeworks() {
    db.collection('homework').orderBy('date', 'desc').onSnapshot(snap => {
        const list = document.getElementById('admin-hw-list');
        list.innerHTML = '';
        snap.forEach(doc => {
            const data = doc.data();
            list.innerHTML += `
                <div class="hw-card">
                    <div class="hw-header">
                        ${data.date} (${data.day})
                        <div>
                            <button class="btn-edit" onclick="editHw('${doc.id}')">Edit</button>
                            <button class="btn-delete" onclick="deleteHw('${doc.id}')">Delete</button>
                        </div>
                    </div>
                    <div>${data.periods.length} periods added.</div>
                </div>
            `;
        });
    });
}

function deleteHw(id) {
    if(confirm("Are you sure?")) {
        db.collection('homework').doc(id).delete().then(() => showPopup('Delete Success'));
    }
}

// --- Settings Functions (Super Admin) ---
function loadSettingsModules() {
    if (!currentUserData || currentUserData.position !== 'super admin') return;
    
    loadUserTable();
    // Similar logic for Subjects and Teachers would go here
}

function loadUserTable() {
    db.collection('users').onSnapshot(snap => {
        const tbody = document.getElementById('user-table-body');
        tbody.innerHTML = '';
        snap.forEach(doc => {
            const u = doc.data();
            tbody.innerHTML += `
                <tr>
                    <td>${u.username}</td>
                    <td>${u.fullName}</td>
                    <td>${u.roll}</td>
                    <td>${u.position}</td>
                    <td>
                        <button class="btn-edit" onclick="editUser('${doc.id}')">Edit</button>
                        <button class="btn-delete" onclick="deleteUser('${doc.id}')">Delete</button>
                    </td>
                </tr>
            `;
        });
    });
}

async function addNewUser() {
    // Gather data from modal
    const email = document.getElementById('new-u-email').value;
    const pass = document.getElementById('new-u-pass').value;
    const name = document.getElementById('new-u-name').value;
    const roll = document.getElementById('new-u-roll').value;
    const sid = document.getElementById('new-u-sid').value;
    const pos = document.getElementById('new-u-pos').value;

    try {
        // Create Auth User (Note: Requires Firebase Admin SDK for creating OTHER users without logging out, 
        // or a secondary app instance. For this frontend-only demo, we just save to Firestore 
        // and assume the user will sign up or we use a cloud function. 
        // *Simulating success for frontend demo*)
        
        await db.collection('users').doc(email).set({
            username: email, password: pass, fullName: name, roll: roll, studentId: sid, position: pos
        });
        showPopup('Add Success');
        document.getElementById('user-modal').classList.remove('active');
    } catch(e) {
        alert(e.message);
    }
}