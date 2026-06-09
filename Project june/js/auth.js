/* GoalPad Authentication System */

// Check user session on every page load
function checkSession() {
  const user = getCurrentUser();
  const path = window.location.pathname;
  const page = path.substring(path.lastIndexOf('/') + 1);
  const publicPages = ['login.html', 'signup.html', 'index.html', ''];
  
  const isPublic = publicPages.some(p => page === p);
  
  if (!user && !isPublic) {
    window.location.href = 'login.html';
  } else if (user && isPublic) {
    window.location.href = 'dashboard.html';
  }
}

// Deterministic simple password hashing function
function hashPassword(password) {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(16);
}

// Input validation helpers
function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(String(email).toLowerCase());
}

function validatePassword(password) {
  return password.length >= 6;
}

function showError(inputId, message) {
  const inputEl = document.getElementById(inputId);
  if (inputEl) {
    inputEl.classList.add('border-danger');
    const group = inputEl.closest('.form-group');
    if (group) {
      let errEl = group.querySelector('.form-error');
      if (!errEl) {
        errEl = document.createElement('span');
        errEl.className = 'form-error';
        group.appendChild(errEl);
      }
      errEl.textContent = message;
      errEl.style.display = 'block';
    }
  }
}

function clearError(inputId) {
  const inputEl = document.getElementById(inputId);
  if (inputEl) {
    inputEl.classList.remove('border-danger');
    const group = inputEl.closest('.form-group');
    if (group) {
      const errEl = group.querySelector('.form-error');
      if (errEl) {
        errEl.style.display = 'none';
      }
    }
  }
}

// Compress avatar image using canvas to save localStorage space
function compressProfileImage(dataUrl, callback) {
  const img = new Image();
  img.onload = function() {
    const canvas = document.createElement('canvas');
    const maxDim = 150; // Keep avatar size small
    let width = img.width;
    let height = img.height;
    
    if (width > maxDim || height > maxDim) {
      if (width > height) {
        height = Math.round((height * maxDim) / width);
        width = maxDim;
      } else {
        width = Math.round((width * maxDim) / height);
        height = maxDim;
      }
    }
    
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, width, height);
    
    const compressedBase64 = canvas.toDataURL('image/jpeg', 0.75);
    callback(compressedBase64);
  };
  img.src = dataUrl;
}

// Generate an initials avatar if user skips upload
function generateInitialsAvatar(name) {
  const canvas = document.createElement('canvas');
  canvas.width = 100;
  canvas.height = 100;
  const ctx = canvas.getContext('2d');
  
  // Background color based on name length
  const colors = ['#FF6B6B', '#6EC6FF', '#C8F55A', '#C084FC', '#7A7888', '#FACC15', '#4ADE80'];
  const colorIndex = name.length % colors.length;
  
  ctx.fillStyle = colors[colorIndex];
  ctx.fillRect(0, 0, 100, 100);
  
  ctx.fillStyle = '#0E0E12';
  ctx.font = 'bold 44px Syne';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  const initials = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  ctx.fillText(initials || 'GP', 50, 50);
  
  return canvas.toDataURL('image/png');
}

// Login verification
function login(email, password) {
  clearError('loginEmail');
  clearError('loginPassword');
  
  if (!email || !validateEmail(email)) {
    showError('loginEmail', 'Please enter a valid email address.');
    return false;
  }
  if (!password) {
    showError('loginPassword', 'Please enter your password.');
    return false;
  }
  
  const user = getUser(email);
  if (!user || user.passwordHash !== hashPassword(password)) {
    showError('loginEmail', 'Invalid email or password.');
    showError('loginPassword', 'Invalid email or password.');
    return false;
  }
  
  setCurrentUser(email);
  window.location.href = 'dashboard.html';
  return true;
}

// Signup submission
function signup(formData) {
  let hasErrors = false;
  
  // Reset all errors
  const fields = ['signupName', 'signupEmail', 'signupPassword', 'signupConfirmPassword', 'signupAge', 'signupSecurityAnswer'];
  fields.forEach(clearError);
  
  if (!formData.fullName || formData.fullName.trim().length < 2) {
    showError('signupName', 'Name must be at least 2 characters long.');
    hasErrors = true;
  }
  if (!formData.email || !validateEmail(formData.email)) {
    showError('signupEmail', 'Please enter a valid email address.');
    hasErrors = true;
  }
  if (!formData.password || !validatePassword(formData.password)) {
    showError('signupPassword', 'Password must be at least 6 characters.');
    hasErrors = true;
  }
  if (formData.password !== formData.confirmPassword) {
    showError('signupConfirmPassword', 'Passwords do not match.');
    hasErrors = true;
  }
  const ageInt = parseInt(formData.age, 10);
  if (isNaN(ageInt) || ageInt < 10 || ageInt > 100) {
    showError('signupAge', 'Age must be between 10 and 100.');
    hasErrors = true;
  }
  if (!formData.securityAnswer || formData.securityAnswer.trim().length < 1) {
    showError('signupSecurityAnswer', 'Security answer is required.');
    hasErrors = true;
  }
  
  if (hasErrors) return false;
  
  // Check user limit
  const users = getAllUsers();
  if (users.length >= 3) {
    alert("GoalPad limit reached: Maximum 3 users are allowed per device.");
    return false;
  }
  
  // Set default initials avatar if none provided
  const avatar = formData.photo || generateInitialsAvatar(formData.fullName);
  
  const newUserData = {
    fullName: formData.fullName,
    email: formData.email,
    passwordHash: hashPassword(formData.password),
    age: ageInt,
    profession: formData.profession || 'Self',
    securityQuestion: formData.securityQuestion,
    securityAnswer: hashPassword(formData.securityAnswer.toLowerCase().trim()),
    photo: avatar,
    points: 0,
    createdAt: new Date().toISOString()
  };
  
  const result = saveUser(newUserData);
  if (!result.success) {
    showError('signupEmail', result.message);
    return false;
  }
  
  // Set active settings and initial goals demo content
  setCurrentUser(formData.email);
  saveSettings({ theme: 'dark', language: 'en' });
  
  // Inject 3 demo goals for user guidance
  const today = getTodayDate();
  const demoGoals = [
    {
      id: 'demo-1',
      title: 'Explore GoalPad dashboard & set alarms ⏰',
      category: 'Other',
      priority: 'Medium',
      deadline: '06:00 PM',
      isRecurring: 'None',
      done: false,
      createdAt: new Date().toISOString()
    },
    {
      id: 'demo-2',
      title: 'Daily morning exercise for 15 minutes 🏃‍♂️',
      category: 'Health',
      priority: 'High',
      deadline: '08:00 AM',
      isRecurring: 'Daily',
      done: false,
      createdAt: new Date().toISOString()
    },
    {
      id: 'demo-3',
      title: 'Read a book chapter or research paper 📚',
      category: 'Study',
      priority: 'Low',
      deadline: '10:30 PM',
      isRecurring: 'None',
      done: false,
      createdAt: new Date().toISOString()
    }
  ];
  localStorage.setItem(`goalpad_${formData.email.toLowerCase()}_goals_${today}`, JSON.stringify(demoGoals));
  
  window.location.href = 'dashboard.html';
  return true;
}

// Password recovery reset
function forgotPassword(email, answer, newPassword) {
  clearError('forgotEmail');
  clearError('forgotAnswer');
  clearError('forgotNewPassword');
  
  if (!email || !validateEmail(email)) {
    showError('forgotEmail', 'Please enter a valid email.');
    return false;
  }
  
  const user = getUser(email);
  if (!user) {
    showError('forgotEmail', 'Email is not registered.');
    return false;
  }
  
  if (hashPassword(answer.toLowerCase().trim()) !== user.securityAnswer) {
    showError('forgotAnswer', 'Security answer is incorrect.');
    return false;
  }
  
  if (!newPassword || !validatePassword(newPassword)) {
    showError('forgotNewPassword', 'Password must be at least 6 characters.');
    return false;
  }
  
  user.passwordHash = hashPassword(newPassword);
  updateUser(email, { passwordHash: user.passwordHash });
  return true;
}
