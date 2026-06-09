/* GoalPad Goals Management System */

// Category UI configurations
const CATEGORIES = {
  Health: { color: '#FF6B6B', bg: 'rgba(255, 107, 107, 0.15)' },
  Study: { color: '#6EC6FF', bg: 'rgba(110, 198, 255, 0.15)' },
  Work: { color: '#C8F55A', bg: 'rgba(200, 245, 90, 0.15)' },
  Personal: { color: '#C084FC', bg: 'rgba(192, 132, 252, 0.15)' },
  Other: { color: '#7A7888', bg: 'rgba(122, 120, 136, 0.15)' }
};

// Global variables for time picker state
let pickerTimeState = {
  hour: '08',
  minute: '00',
  ampm: 'AM'
};

// Set AM/PM select status
function setAmPm(val) {
  pickerTimeState.ampm = val;
  document.querySelectorAll('.ampm-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-value') === val);
  });
  updateTimePreview();
}

function updateTimePreview() {
  const preview = document.getElementById('timePreview');
  if (preview) {
    preview.textContent = `Selected Time: ${pickerTimeState.hour}:${pickerTimeState.minute} ${pickerTimeState.ampm}`;
  }
}

// Convert "HH:MM AM/PM" to Date object relative to today
function parseDeadlineString(timeStr) {
  if (!timeStr) return null;
  const match = timeStr.match(/^(\d{2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return null;
  
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const ampm = match[3].toUpperCase();
  
  if (ampm === 'PM' && hours < 12) hours += 12;
  if (ampm === 'AM' && hours === 12) hours = 0;
  
  const target = new Date();
  target.setHours(hours, minutes, 0, 0);
  return target;
}

// Compute time differences for timers
function getTimeRemaining(deadlineStr) {
  const target = parseDeadlineString(deadlineStr);
  if (!target) return null;
  
  const now = new Date();
  let diffMs = target - now;
  
  // If target time has already passed for today, mark as overdue
  if (diffMs < 0) {
    return { hours: 0, minutes: 0, totalMs: diffMs, color: 'var(--danger)', isOverdue: true };
  }
  
  const totalMinutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  
  let color = 'var(--success)'; // Green > 2hr
  if (diffMs <= 30 * 60 * 1000) {
    color = 'var(--danger)'; // Red < 30min
  } else if (diffMs <= 60 * 60 * 1000) {
    color = '#F97316'; // Orange 30-60min
  } else if (diffMs <= 2 * 60 * 60 * 1000) {
    color = 'var(--warning)'; // Yellow 1-2hr
  }
  
  return { hours, minutes, totalMs: diffMs, color, isOverdue: false };
}

// Renders the goals grid
function renderGoals(date) {
  const container = document.getElementById('goalsList');
  if (!container) return;
  
  // Check for auto-recurring goals generation
  generateRecurringGoals(date);
  
  const goals = getGoals(date);
  
  // Update progress bar
  const progressBar = document.getElementById('dailyProgressBar');
  const progressText = document.getElementById('dailyProgressText');
  if (goals.length > 0) {
    const completed = goals.filter(g => g.done).length;
    const pct = Math.round((completed / goals.length) * 100);
    if (progressBar) progressBar.style.width = `${pct}%`;
    if (progressText) progressText.textContent = `${pct}% Completed (${completed}/${goals.length} goals)`;
  } else {
    if (progressBar) progressBar.style.width = '0%';
    if (progressText) progressText.textContent = '0% Completed (0/0 goals)';
  }
  
  if (goals.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon"><i class="fa-solid fa-list-check"></i></div>
        <h3>No goals yet!</h3>
        <p>Add your first goal using the form above.</p>
      </div>
    `;
    return;
  }
  
  // Sort: Pending first (high priority first), Completed last
  const priorityWeight = { High: 3, Medium: 2, Low: 1 };
  const sortedGoals = [...goals].sort((a, b) => {
    if (a.done && !b.done) return 1;
    if (!a.done && b.done) return -1;
    if (!a.done && !b.done) {
      return (priorityWeight[b.priority] || 0) - (priorityWeight[a.priority] || 0);
    }
    return new Date(b.createdAt) - new Date(a.createdAt);
  });
  
  container.innerHTML = sortedGoals.map(g => renderGoalCard(g, date)).join('');
  updateDeadlineCountdowns();
}

// Builds the goal card HTML layout
function renderGoalCard(goal, date) {
  const cat = CATEGORIES[goal.category] || CATEGORIES.Other;
  const cardStyle = `--category-color: ${cat.color};`;
  const isDoneClass = goal.done ? 'done' : '';
  const isCheckedClass = goal.done ? 'checked' : '';
  const titleDoneClass = goal.done ? 'done strikethrough-animate' : '';
  
  let priorityTagClass = 'tag-low';
  if (goal.priority === 'High') priorityTagClass = 'tag-high';
  if (goal.priority === 'Medium') priorityTagClass = 'tag-medium';
  
  let deadlineTag = '';
  if (goal.deadline) {
    deadlineTag = `
      <span class="goal-tag tag-deadline" data-goal-deadline="${goal.deadline}">
        <i class="fa-regular fa-clock"></i> <span class="time-left">${goal.deadline}</span>
      </span>
    `;
  }
  
  let recurringTag = '';
  if (goal.isRecurring && goal.isRecurring !== 'None') {
    recurringTag = `
      <span class="goal-tag tag-recurring">
        <i class="fa-solid fa-arrows-spin"></i> ${goal.isRecurring}
      </span>
    `;
  }
  
  let proofTag = '';
  if (goal.done) {
    proofTag = `
      <span class="goal-tag tag-proof" onclick="viewProof('${goal.id}', '${date}')">
        <i class="fa-solid fa-certificate"></i> View Proof
      </span>
    `;
  }
  
  return `
    <div class="goal-card ${isDoneClass} goal-new" id="goal-card-${goal.id}" style="${cardStyle}">
      <div class="goal-checkbox ${isCheckedClass}" onclick="initiateComplete('${goal.id}', '${date}')">
        ${goal.done ? '<i class="fa-solid fa-check"></i>' : ''}
      </div>
      <div class="goal-body">
        <h4 class="goal-title ${titleDoneClass}">${goal.title}</h4>
        <div class="goal-meta">
          <span class="goal-tag tag-category" style="--category-bg: ${cat.bg}; --category-color: ${cat.color};">
            ${goal.category}
          </span>
          <span class="goal-tag ${priorityTagClass}">
            ${goal.priority}
          </span>
          ${deadlineTag}
          ${recurringTag}
          ${proofTag}
        </div>
      </div>
      <div class="goal-actions">
        <button class="goal-action-btn delete" onclick="deleteGoal('${goal.id}', '${date}')" title="Delete Goal">
          <i class="fa-solid fa-trash"></i>
        </button>
      </div>
    </div>
  `;
}

// Add a new goal
function addGoal() {
  const titleEl = document.getElementById('goalTitle');
  const categoryEl = document.getElementById('goalCategory');
  const priorityEl = document.getElementById('goalPriority');
  const recurringEl = document.getElementById('goalRecurring');
  
  if (!titleEl || !titleEl.value.trim()) {
    showToast("Please enter a goal title!", "warning");
    return;
  }
  
  let deadlineStr = '';
  const pickerWrap = document.querySelector('.time-picker-wrap');
  // Check if user is using deadline picker or skipped it
  const useDeadlineCheck = document.getElementById('useIndividualDeadline');
  if (!useDeadlineCheck || useDeadlineCheck.checked) {
    deadlineStr = `${pickerTimeState.hour}:${pickerTimeState.minute} ${pickerTimeState.ampm}`;
  }
  
  const today = getTodayDate();
  const goalId = 'goal-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
  
  const newGoal = {
    id: goalId,
    title: titleEl.value.trim(),
    category: categoryEl ? categoryEl.value : 'Other',
    priority: priorityEl ? priorityEl.value : 'Medium',
    deadline: deadlineStr,
    isRecurring: recurringEl ? recurringEl.value : 'None',
    done: false,
    createdAt: new Date().toISOString()
  };
  
  saveGoal(today, newGoal);
  renderGoals(today);
  
  // Clear inputs
  titleEl.value = '';
  if (useDeadlineCheck) useDeadlineCheck.checked = false;
  
  showToast("Goal added successfully!", "success");
  
  // Play subtle warning/notifier sound
  if (typeof playReminderSound === 'function') {
    playReminderSound();
  }
}

// Delete a goal
function deleteGoal(goalId, date) {
  const card = document.getElementById(`goal-card-${goalId}`);
  if (card) {
    card.classList.remove('goal-new');
    card.classList.add('goal-deleting');
    setTimeout(() => {
      deleteGoalFromStorage(date, goalId);
      renderGoals(date);
      showToast("Goal deleted.", "danger");
    }, 400);
  } else {
    deleteGoalFromStorage(date, goalId);
    renderGoals(date);
  }
}

// Initiates completion check: checkbox click
function initiateComplete(goalId, date) {
  const goals = getGoals(date);
  const goal = goals.find(g => g.id === goalId);
  if (!goal) return;
  
  if (goal.done) {
    showToast("Goal is already completed!", "warning");
    return;
  }
  
  // Goal completion requires visual proof submission
  if (typeof openProofModal === 'function') {
    openProofModal(goalId, date);
  } else {
    // Fallback if proof script not loaded
    updateGoal(date, goalId, { done: true });
    renderGoals(date);
  }
}

// Check for goals that need to be carried forward from yesterday
function checkCarryForward() {
  const todayStr = getTodayDate();
  const today = new Date();
  
  // Get yesterday's date
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);
  
  // Check if we have already carried forward for today
  const hasCarriedKey = `goalpad_carried_${yesterdayStr}_to_${todayStr}`;
  if (localStorage.getItem(hasCarriedKey) === 'true') {
    return; // Already resolved
  }
  
  const yesterdayIncomplete = getIncompleteGoals(yesterdayStr);
  if (yesterdayIncomplete.length > 0) {
    showCarryForwardPopup(yesterdayIncomplete, yesterdayStr, hasCarriedKey);
  }
}

function showCarryForwardPopup(goals, yesterdayStr, resolveKey) {
  const container = document.getElementById('carryForwardPlaceholder');
  if (!container) return;
  
  // Create carrying banner
  const banner = document.createElement('div');
  banner.className = 'carry-banner carry-popup-enter';
  banner.id = 'carryForwardBanner';
  
  banner.innerHTML = `
    <div class="carry-text">
      <i class="fa-solid fa-triangle-exclamation"></i>
      You have <strong>${goals.length} incomplete goal(s)</strong> from yesterday (${yesterdayStr}).
    </div>
    <div style="display: flex; gap: 0.5rem;">
      <button class="btn btn-primary btn-sm" onclick="executeCarryForward('${yesterdayStr}', '${resolveKey}')">Carry to Today</button>
      <button class="btn btn-ghost btn-sm" onclick="dismissCarryForward('${resolveKey}')">Dismiss</button>
    </div>
  `;
  container.appendChild(banner);
}

function executeCarryForward(yesterdayStr, resolveKey) {
  const todayStr = getTodayDate();
  const yesterdayIncomplete = getIncompleteGoals(yesterdayStr);
  
  yesterdayIncomplete.forEach(goal => {
    const newGoalId = 'goal-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
    const carriedGoal = {
      ...goal,
      id: newGoalId,
      createdAt: new Date().toISOString()
    };
    saveGoal(todayStr, carriedGoal);
  });
  
  // Mark the yesterday goals as carried forward by appending tag or deleting them
  yesterdayIncomplete.forEach(goal => {
    updateGoal(yesterdayStr, goal.id, { title: goal.title + ' [Carried Forward]' });
  });
  
  localStorage.setItem(resolveKey, 'true');
  dismissCarryForward(resolveKey);
  renderGoals(todayStr);
  showToast("Carried forward incomplete goals!", "success");
}

function dismissCarryForward(resolveKey) {
  const banner = document.getElementById('carryForwardBanner');
  if (banner) {
    banner.remove();
  }
  localStorage.setItem(resolveKey, 'true');
}

// Sets overall daily deadline
function setDailyDeadlineTime() {
  const pickerWrap = document.getElementById('dailyDeadlinePicker');
  if (!pickerWrap) return;
  
  const today = getTodayDate();
  const timeStr = `${pickerTimeState.hour}:${pickerTimeState.minute} ${pickerTimeState.ampm}`;
  
  saveDailyDeadline(today, timeStr);
  showTodayDeadline();
  showToast("Daily deadline updated!", "success");
}

function showTodayDeadline() {
  const today = getTodayDate();
  const deadline = getDailyDeadline(today);
  const container = document.getElementById('todayDeadlineDisplay');
  if (!container) return;
  
  if (deadline) {
    container.innerHTML = `
      <div class="card card-hover" style="border: 1px solid var(--border2)">
        <h4 class="card-title">Daily Core Deadline</h4>
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <span style="font-family: 'JetBrains Mono', monospace; font-size: 1.5rem; font-weight: 700; color: var(--accent);">
            ${deadline}
          </span>
          <span id="overallCountdown" class="goal-tag" style="font-size: 0.9rem; padding: 0.4rem 0.8rem; border-radius: 8px;">
            Calculating...
          </span>
        </div>
      </div>
    `;
    updateDeadlineCountdowns();
  } else {
    container.innerHTML = `
      <div class="card" style="opacity: 0.7;">
        <p style="font-size: 0.9rem; color: var(--muted); text-align: center;">No overall daily deadline set for today.</p>
      </div>
    `;
  }
}

// Live ticking updates for deadline values
function updateDeadlineCountdowns() {
  // Update overall countdown
  const overallCountdown = document.getElementById('overallCountdown');
  if (overallCountdown) {
    const today = getTodayDate();
    const deadline = getDailyDeadline(today);
    const remaining = getTimeRemaining(deadline);
    if (remaining) {
      if (remaining.isOverdue) {
        overallCountdown.textContent = 'Overdue ⚠️';
        overallCountdown.style.background = 'rgba(255, 107, 107, 0.15)';
        overallCountdown.style.color = '#FF6B6B';
        overallCountdown.classList.add('timer-shake');
      } else {
        overallCountdown.textContent = `${remaining.hours}h ${remaining.minutes}m left`;
        overallCountdown.style.background = remaining.color.replace(')', ', 0.15)');
        overallCountdown.style.color = remaining.color;
        overallCountdown.classList.remove('timer-shake');
        if (remaining.totalMs < 15 * 60 * 1000) {
          overallCountdown.classList.add('deadline-pulse');
        } else {
          overallCountdown.classList.remove('deadline-pulse');
        }
      }
    }
  }
  
  // Update individual goal deadline badges
  document.querySelectorAll('[data-goal-deadline]').forEach(badge => {
    const deadline = badge.getAttribute('data-goal-deadline');
    const label = badge.querySelector('.time-left');
    const remaining = getTimeRemaining(deadline);
    if (remaining && label) {
      if (remaining.isOverdue) {
        label.textContent = `${deadline} (Overdue ⚠️)`;
        badge.style.color = '#FF6B6B';
        badge.style.background = 'rgba(255, 107, 107, 0.15)';
      } else {
        label.textContent = `${deadline} (${remaining.hours}h ${remaining.minutes}m)`;
        badge.style.color = remaining.color;
        badge.style.background = remaining.color === 'var(--success)' ? 'var(--accent-dim)' : remaining.color.replace(')', ', 0.12)');
      }
    }
  });
}

// Generate recurring goals
function generateRecurringGoals(date) {
  const goals = getGoals(date);
  if (goals.length > 0) return; // Only populate if date is empty
  
  // Look back at previous date (yesterday)
  const d = new Date(date);
  d.setDate(d.getDate() - 1);
  const prevDateStr = d.toISOString().slice(0, 10);
  
  const prevGoals = getGoals(prevDateStr);
  const recurringGoals = prevGoals.filter(g => g.isRecurring && g.isRecurring !== 'None');
  
  recurringGoals.forEach(g => {
    // For weekly, check if day matches
    let shouldCopy = false;
    if (g.isRecurring === 'Daily') {
      shouldCopy = true;
    } else if (g.isRecurring === 'Weekly') {
      // Copy over if the day matches (which it does if we search yesterday and copy? No, weekly is copy exactly 7 days later).
      // Let's copy from exactly 7 days ago if day is Weekly.
    }
    
    if (shouldCopy) {
      const newId = 'goal-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
      const newGoal = {
        ...g,
        id: newId,
        done: false,
        createdAt: new Date().toISOString()
      };
      saveGoal(date, newGoal);
    }
  });
  
  // Check for weekly recurring from exactly 7 days ago
  const weekAgo = new Date(date);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekAgoStr = weekAgo.toISOString().slice(0, 10);
  const weekAgoGoals = getGoals(weekAgoStr);
  
  weekAgoGoals.forEach(g => {
    if (g.isRecurring === 'Weekly') {
      const newId = 'goal-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
      const newGoal = {
        ...g,
        id: newId,
        done: false,
        createdAt: new Date().toISOString()
      };
      saveGoal(date, newGoal);
    }
  });
}

// Complete goal animations
function animateGoalComplete(goalId) {
  const card = document.getElementById(`goal-card-${goalId}`);
  if (!card) return;
  
  card.classList.add('goal-completing');
  
  const title = card.querySelector('.goal-title');
  if (title) title.classList.add('done', 'strikethrough-animate');
  
  const checkbox = card.querySelector('.goal-checkbox');
  if (checkbox) {
    checkbox.classList.add('checked');
    checkbox.innerHTML = '<i class="fa-solid fa-check"></i>';
  }
  
  // Sounds
  if (typeof playSuccessSound === 'function') {
    playSuccessSound();
  }
  
  // Confetti and Float values
  launchConfetti(checkbox);
  showFloatingPoints(checkbox);
}

function launchConfetti(element) {
  const rect = element.getBoundingClientRect();
  const originX = rect.left + rect.width / 2;
  const originY = rect.top + rect.height / 2;
  
  for (let i = 0; i < 20; i++) {
    const confetti = document.createElement('div');
    confetti.className = 'confetti-piece';
    
    // Random directions
    const angle = Math.random() * Math.PI * 2;
    const distance = 40 + Math.random() * 80;
    const x = Math.cos(angle) * distance;
    const y = Math.sin(angle) * distance - 20; // boost upwards
    
    confetti.style.setProperty('--x', `${x}px`);
    confetti.style.setProperty('--y', `${y}px`);
    confetti.style.setProperty('--r', `${360 + Math.random() * 360}deg`);
    
    const colors = ['#C8F55A', '#FF6B6B', '#6EC6FF', '#C084FC', '#FACC15', '#4ADE80'];
    confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
    
    confetti.style.left = `${originX}px`;
    confetti.style.top = `${originY}px`;
    
    document.body.appendChild(confetti);
    
    setTimeout(() => confetti.remove(), 800);
  }
}

function showFloatingPoints(element) {
  const rect = element.getBoundingClientRect();
  const originX = rect.left + rect.width / 2;
  const originY = rect.top + rect.height / 2;
  
  const floatText = document.createElement('div');
  floatText.className = 'points-float';
  floatText.textContent = '+10 XP';
  floatText.style.left = `${originX - 20}px`;
  floatText.style.top = `${originY - 10}px`;
  
  document.body.appendChild(floatText);
  setTimeout(() => floatText.remove(), 1000);
}

// Award Badges Checks
function checkBadges() {
  const user = getCurrentUser();
  if (!user) return;
  
  const today = getTodayDate();
  
  // Calculate completed count
  let totalCompletions = 0;
  // Iterate all dates in goals keys
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key.startsWith(`goalpad_${user.email.toLowerCase()}_goals_`)) {
      const goals = JSON.parse(localStorage.getItem(key) || '[]');
      totalCompletions += goals.filter(g => g.done).length;
    }
  }
  
  const streak = getStreak();
  
  // 🎯 First Goal
  if (totalCompletions >= 1) {
    triggerBadgeUnlock('first_goal', '🎯 First Goal', 'Completed your very first task!');
  }
  
  // 🌅 Early Bird (done before 12:00 PM noon local time)
  // Check if current goal completed now is before 12
  const currentHour = new Date().getHours();
  if (currentHour < 12 && totalCompletions >= 1) {
    triggerBadgeUnlock('early_bird', '🌅 Early Bird', 'Completed a task before 12:00 PM.');
  }
  
  // 🔥 Streak badges
  if (streak.currentStreak >= 3) {
    triggerBadgeUnlock('streak_3', '🔥 Streak 3', 'Kept a streak alive for 3 consecutive days.');
  }
  if (streak.currentStreak >= 7) {
    triggerBadgeUnlock('streak_7', '⚡ Streak 7', 'Maintained a solid 7 days streak.');
  }
  if (streak.currentStreak >= 30) {
    triggerBadgeUnlock('streak_30', '💎 Streak 30', 'Unbelievable commitment! 30 days streak.');
  }
  
  // 💯 Century
  if (totalCompletions >= 100) {
    triggerBadgeUnlock('century', '💯 Century', 'Completed 100 total goals tracker!');
  }
  
  // 📸 Honest badges count
  let proofDays = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key.startsWith(`goalpad_${user.email.toLowerCase()}_proofs_`)) {
      proofDays++;
    }
  }
  if (proofDays >= 7) {
    triggerBadgeUnlock('honest_7', '📸 Honest 7', 'Provided active verification for 7 days.');
  }
  if (proofDays >= 30) {
    triggerBadgeUnlock('honest_30', '👑 Honest 30', 'Proof verification champion! 30 days active proofs.');
  }
}

function triggerBadgeUnlock(badgeId, badgeTitle, badgeDesc) {
  const unlocked = saveBadge(badgeId);
  if (unlocked) {
    // Show premium screen overlay popup
    const overlay = document.createElement('div');
    overlay.className = 'badge-unlock-overlay';
    overlay.innerHTML = `
      <div class="badge-unlock-card badge-glow">
        <div style="font-size: 4rem; margin-bottom: 1rem;">🏆</div>
        <h2 style="font-family: 'Syne', sans-serif; color: var(--accent); margin-bottom: 0.5rem;">Badge Unlocked!</h2>
        <h3 style="font-family: 'Syne', sans-serif; margin-bottom: 1rem;">${badgeTitle}</h3>
        <p style="font-size: 0.9rem; color: var(--muted); margin-bottom: 1.5rem;">${badgeDesc}</p>
        <button class="btn btn-primary" onclick="this.closest('.badge-unlock-overlay').remove()">Awesome!</button>
      </div>
    `;
    document.body.appendChild(overlay);
    
    if (typeof playBadgeSound === 'function') {
      playBadgeSound();
    }
  }
}

// Helper time picker initializations
function initTimePicker() {
  const hourSelect = document.getElementById('pickerHour');
  const minuteSelect = document.getElementById('pickerMinute');
  
  if (hourSelect && minuteSelect) {
    // Hours
    hourSelect.innerHTML = Array.from({ length: 12 }, (_, i) => {
      const h = String(i + 1).padStart(2, '0');
      return `<option value="${h}">${h}</option>`;
    }).join('');
    
    // Minutes step 5
    minuteSelect.innerHTML = Array.from({ length: 12 }, (_, i) => {
      const m = String(i * 5).padStart(2, '0');
      return `<option value="${m}">${m}</option>`;
    }).join('');
    
    // Watchers
    hourSelect.value = pickerTimeState.hour;
    minuteSelect.value = pickerTimeState.minute;
    
    hourSelect.addEventListener('change', (e) => {
      pickerTimeState.hour = e.target.value;
      updateTimePreview();
    });
    
    minuteSelect.addEventListener('change', (e) => {
      pickerTimeState.minute = e.target.value;
      updateTimePreview();
    });
    
    updateTimePreview();
  }
}

function showTodayDate() {
  const el = document.getElementById('todayDateDisplayHeader');
  if (el) {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    el.textContent = new Date().toLocaleDateString('en-US', options);
  }
}
