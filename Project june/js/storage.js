/* GoalPad LocalStorage Storage System */

// Helper: Get storage key for current user
function getUserKey(dataType) {
  const email = localStorage.getItem('goalpad_current_user') || 'guest';
  return `goalpad_${email}_${dataType}`;
}

// === USERS ===
function saveUser(userData) {
  const users = getAllUsers();
  if (users.length >= 3) {
    return { success: false, message: "Maximum 3 users allowed on this device!" };
  }
  if (users.some(u => u.email.toLowerCase() === userData.email.toLowerCase())) {
    return { success: false, message: "Email already registered!" };
  }
  users.push(userData);
  localStorage.setItem('goalpad_users_list', JSON.stringify(users));
  return { success: true };
}

function getUser(email) {
  const users = getAllUsers();
  return users.find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
}

function getAllUsers() {
  return JSON.parse(localStorage.getItem('goalpad_users_list') || '[]');
}

function updateUser(email, updates) {
  const users = getAllUsers();
  const index = users.findIndex(u => u.email.toLowerCase() === email.toLowerCase());
  if (index !== -1) {
    users[index] = { ...users[index], ...updates };
    localStorage.setItem('goalpad_users_list', JSON.stringify(users));
    return true;
  }
  return false;
}

function setCurrentUser(email) {
  localStorage.setItem('goalpad_current_user', email.toLowerCase());
}

function getCurrentUser() {
  const email = localStorage.getItem('goalpad_current_user');
  if (!email) return null;
  return getUser(email);
}

function logoutUser() {
  localStorage.removeItem('goalpad_current_user');
}

// === GOALS ===
function saveGoal(date, goalData) {
  const key = `${getUserKey('goals')}_${date}`;
  const goals = getGoals(date);
  goals.push(goalData);
  localStorage.setItem(key, JSON.stringify(goals));
  updateStreak(); // Recalculate streak whenever goals update
}

function getGoals(date) {
  const key = `${getUserKey('goals')}_${date}`;
  return JSON.parse(localStorage.getItem(key) || '[]');
}

function updateGoal(date, goalId, updates) {
  const key = `${getUserKey('goals')}_${date}`;
  const goals = getGoals(date);
  const index = goals.findIndex(g => g.id === goalId);
  if (index !== -1) {
    goals[index] = { ...goals[index], ...updates };
    localStorage.setItem(key, JSON.stringify(goals));
    updateStreak();
    return true;
  }
  return false;
}

function deleteGoalFromStorage(date, goalId) {
  const key = `${getUserKey('goals')}_${date}`;
  let goals = getGoals(date);
  goals = goals.filter(g => g.id !== goalId);
  localStorage.setItem(key, JSON.stringify(goals));
  updateStreak();
}

function getIncompleteGoals(date) {
  return getGoals(date).filter(g => !g.done);
}

function getTodayDate() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// === PROOF ===
function saveProof(date, goalId, proofData) {
  const key = `${getUserKey('proofs')}_${date}_${goalId}`;
  localStorage.setItem(key, JSON.stringify(proofData));
}

function getProof(date, goalId) {
  const key = `${getUserKey('proofs')}_${date}_${goalId}`;
  return JSON.parse(localStorage.getItem(key) || 'null');
}

function hasProof(date, goalId) {
  const key = `${getUserKey('proofs')}_${date}_${goalId}`;
  return localStorage.getItem(key) !== null;
}

// === WEEKLY NOTES ===
function saveWeekNote(weekKey, note) {
  const key = getUserKey('weeknotes');
  const notes = JSON.parse(localStorage.getItem(key) || '{}');
  notes[weekKey] = note;
  localStorage.setItem(key, JSON.stringify(notes));
}

function getWeekNote(weekKey) {
  const key = getUserKey('weeknotes');
  const notes = JSON.parse(localStorage.getItem(key) || '{}');
  return notes[weekKey] || '';
}

function getCurrentWeekKey() {
  const d = new Date();
  const day = d.getDay();
  // Set to Monday of the current week
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  const year = monday.getFullYear();
  const month = String(monday.getMonth() + 1).padStart(2, '0');
  const date = String(monday.getDate()).padStart(2, '0');
  return `${year}-${month}-${date}`;
}

// === MONTHLY GOALS ===
function saveMonthlyGoal(data) {
  const key = getUserKey('monthlygoals');
  const goals = getMonthlyGoals();
  goals.push(data);
  localStorage.setItem(key, JSON.stringify(goals));
}

function getMonthlyGoals() {
  const key = getUserKey('monthlygoals');
  return JSON.parse(localStorage.getItem(key) || '[]');
}

function updateMonthlyGoal(id, updates) {
  const key = getUserKey('monthlygoals');
  const goals = getMonthlyGoals();
  const index = goals.findIndex(g => g.id === id);
  if (index !== -1) {
    goals[index] = { ...goals[index], ...updates };
    localStorage.setItem(key, JSON.stringify(goals));
    return true;
  }
  return false;
}

function deleteMonthlyGoal(id) {
  const key = getUserKey('monthlygoals');
  let goals = getMonthlyGoals();
  goals = goals.filter(g => g.id !== id);
  localStorage.setItem(key, JSON.stringify(goals));
}

// === ALARMS ===
function saveAlarm(alarmData) {
  const key = getUserKey('alarms');
  const alarms = getAlarms();
  alarms.push(alarmData);
  localStorage.setItem(key, JSON.stringify(alarms));
}

function getAlarms() {
  const key = getUserKey('alarms');
  return JSON.parse(localStorage.getItem(key) || '[]');
}

function updateAlarm(id, updates) {
  const key = getUserKey('alarms');
  const alarms = getAlarms();
  const index = alarms.findIndex(a => a.id === id);
  if (index !== -1) {
    alarms[index] = { ...alarms[index], ...updates };
    localStorage.setItem(key, JSON.stringify(alarms));
    return true;
  }
  return false;
}

function deleteAlarm(id) {
  const key = getUserKey('alarms');
  let alarms = getAlarms();
  alarms = alarms.filter(a => a.id !== id);
  localStorage.setItem(key, JSON.stringify(alarms));
}

function getActiveAlarms() {
  return getAlarms().filter(a => a.active);
}

// === BADGES ===
function saveBadge(badgeId) {
  const key = getUserKey('badges');
  const badges = getBadges();
  if (!badges.some(b => b.id === badgeId)) {
    badges.push({ id: badgeId, earnedAt: new Date().toISOString() });
    localStorage.setItem(key, JSON.stringify(badges));
    return true; // Badge newly earned
  }
  return false;
}

function getBadges() {
  const key = getUserKey('badges');
  return JSON.parse(localStorage.getItem(key) || '[]');
}

function hasBadge(badgeId) {
  return getBadges().some(b => b.id === badgeId);
}

// === STREAK ===
function getStreak() {
  const key = getUserKey('streak');
  const defaultStreak = { currentStreak: 0, bestStreak: 0, lastActiveDate: null };
  return JSON.parse(localStorage.getItem(key) || JSON.stringify(defaultStreak));
}

function updateStreak() {
  const key = getUserKey('streak');
  const streak = getStreak();
  const todayStr = getTodayDate();
  
  // Calculate current streak dynamically from goals history
  let currentStreak = 0;
  let hasActiveCompletions = true;
  let checkDate = new Date();
  
  // Determine if today has completed goals
  const todayGoals = getGoals(todayStr);
  const todayCompleted = todayGoals.filter(g => g.done).length;
  
  let startCheckDate = new Date();
  if (todayCompleted === 0) {
    // If no completions today, streak is evaluated starting from yesterday
    startCheckDate.setDate(startCheckDate.getDate() - 1);
  }
  
  let curr = new Date(startCheckDate);
  // Scan backwards for up to 365 days to calculate streak
  for (let i = 0; i < 365; i++) {
    const checkStr = curr.toISOString().slice(0, 10);
    const dayGoals = getGoals(checkStr);
    const dayCompleted = dayGoals.filter(g => g.done).length;
    
    if (dayCompleted > 0) {
      currentStreak++;
      curr.setDate(curr.getDate() - 1);
    } else {
      // If we encounter a day that had goals but none completed, streak is broken.
      // If the day had no goals at all, we don't break the streak (it's a rest day/empty day),
      // EXCEPT if it was yesterday and today also has no completions.
      if (dayGoals.length > 0) {
        break;
      } else {
        // If there were no goals, let's keep checking earlier days, but
        // a calendar streak shouldn't bridge over empty gaps infinitely. Let's limit gap bridging.
        // We will allow gap bridging only if the user didn't register goals, but to be strict,
        // let's say a streak is active if they completed goals on consecutive days they actually had goals.
        // If they had no goals on a day, it doesn't count against them but also doesn't increase streak.
        curr.setDate(curr.getDate() - 1);
      }
    }
  }
  
  streak.currentStreak = currentStreak;
  if (currentStreak > streak.bestStreak) {
    streak.bestStreak = currentStreak;
  }
  
  localStorage.setItem(key, JSON.stringify(streak));
}

// === SETTINGS ===
function saveSettings(settings) {
  const key = getUserKey('settings');
  localStorage.setItem(key, JSON.stringify(settings));
}

function getSettings() {
  const key = getUserKey('settings');
  const defaults = { theme: 'dark', language: 'en' };
  return JSON.parse(localStorage.getItem(key) || JSON.stringify(defaults));
}

// === CARRY FORWARD ===
function saveCarryForward(goals) {
  const key = getUserKey('carryforward');
  localStorage.setItem(key, JSON.stringify(goals));
}

function getCarryForward() {
  const key = getUserKey('carryforward');
  return JSON.parse(localStorage.getItem(key) || '[]');
}

function clearCarryForward() {
  const key = getUserKey('carryforward');
  localStorage.removeItem(key);
}

// === STATS ===
function getDayScore(date) {
  const goals = getGoals(date);
  if (goals.length === 0) return 0;
  const completed = goals.filter(g => g.done).length;
  return Math.round((completed / goals.length) * 100);
}

function getWeekScores() {
  const scores = [];
  const d = new Date();
  const day = d.getDay();
  // Get Monday of current week
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  
  for (let i = 0; i < 7; i++) {
    const current = new Date(monday);
    current.setDate(monday.getDate() + i);
    const dateStr = current.toISOString().slice(0, 10);
    scores.push(getDayScore(dateStr));
  }
  return scores;
}

function getMonthScores(year, month) {
  const scores = [];
  const numDays = new Date(year, month, 0).getDate(); // 1-indexed month
  for (let d = 1; d <= numDays; d++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    scores.push({
      day: d,
      score: getDayScore(dateStr)
    });
  }
  return scores;
}

// === DEADLINE ===
function saveDailyDeadline(date, timeString) {
  const key = `${getUserKey('dailydeadline')}_${date}`;
  localStorage.setItem(key, timeString);
}

function getDailyDeadline(date) {
  const key = `${getUserKey('dailydeadline')}_${date}`;
  return localStorage.getItem(key) || '';
}

// === POINTS ===
function addPoints(amount) {
  const key = getUserKey('points');
  let points = getPoints();
  points += amount;
  localStorage.setItem(key, points.toString());
}

function getPoints() {
  const key = getUserKey('points');
  return parseInt(localStorage.getItem(key) || '0', 10);
}
