/* GoalPad Alarms and Reminders Scheduling System */

let audioCtx = null;
let alarmLoop = null;

// Initialize Audio Context on user interaction
function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
}

// Generate synth chimes dynamically via Web Audio API
function playBeep(freq, duration, delay, vol = 0.4) {
  try {
    initAudio();
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime + delay);
    
    gain.gain.setValueAtTime(0, audioCtx.currentTime + delay);
    gain.gain.linearRampToValueAtTime(vol, audioCtx.currentTime + delay + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + delay + duration);
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    osc.start(audioCtx.currentTime + delay);
    osc.stop(audioCtx.currentTime + delay + duration);
  } catch (err) {
    console.warn("Audio Context blocked or failed:", err);
  }
}

// Sound Types Definitions
function playDeadlineAlarm() {
  // 3 short high beeps + 1 long beep
  playBeep(880, 0.15, 0.0);
  playBeep(880, 0.15, 0.2);
  playBeep(880, 0.15, 0.4);
  playBeep(1100, 0.6, 0.6);
}

function playWarningSound() {
  // 2 medium alert notes
  playBeep(660, 0.2, 0.0);
  playBeep(660, 0.2, 0.3);
}

function playReminderSound() {
  // 3 ascending pleasant chimes
  playBeep(523, 0.1, 0.0, 0.3);
  playBeep(659, 0.1, 0.12, 0.3);
  playBeep(784, 0.2, 0.24, 0.3);
}

function playSuccessSound() {
  // 4 happy ascending chords
  playBeep(523, 0.08, 0.0, 0.3);
  playBeep(659, 0.08, 0.1, 0.3);
  playBeep(784, 0.08, 0.2, 0.3);
  playBeep(1047, 0.3, 0.3, 0.3);
}

function playBadgeSound() {
  // 5 quick triumphant chimes
  playBeep(523, 0.06, 0.0, 0.3);
  playBeep(659, 0.06, 0.08, 0.3);
  playBeep(784, 0.06, 0.16, 0.3);
  playBeep(1047, 0.06, 0.24, 0.3);
  playBeep(1318, 0.5, 0.32, 0.3);
}

// Loop alarms
function startLoopingAlarm() {
  if (!alarmLoop) {
    initAudio();
    playDeadlineAlarm();
    alarmLoop = setInterval(playDeadlineAlarm, 1500);
  }
}

function stopLoopingAlarm() {
  if (alarmLoop) {
    clearInterval(alarmLoop);
    alarmLoop = null;
  }
}

// Main scheduling checker (Runs every 60 seconds)
function checkAllAlarms() {
  const user = getCurrentUser();
  if (!user) return;
  
  const today = getTodayDate();
  const now = new Date();
  
  // Format current system time to HH:MM AM/PM
  let h = now.getHours();
  const m = String(now.getMinutes()).padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  h = h ? h : 12;
  const currentStr = `${String(h).padStart(2, '0')}:${m} ${ampm}`;
  
  // 1. Check Custom Reminders Alarms
  const alarms = getActiveAlarms();
  alarms.forEach(alarm => {
    if (alarm.time === currentStr) {
      // Validate weekday filters if set
      let shouldTrigger = true;
      const day = now.getDay(); // 0 is Sunday, 6 is Saturday
      
      if (alarm.repeat === 'Weekdays' && (day === 0 || day === 6)) {
        shouldTrigger = false;
      }
      
      if (shouldTrigger) {
        triggerAlarm(alarm);
        if (alarm.repeat === 'Once') {
          updateAlarm(alarm.id, { active: false });
          if (document.getElementById('remindersList')) {
            renderReminders();
          }
        }
      }
    }
  });
  
  // 2. Check Daily Deadline warnings
  const dailyDeadline = getDailyDeadline(today);
  const incompleteCount = getIncompleteGoals(today).length;
  
  if (dailyDeadline && incompleteCount > 0) {
    const remaining = getTimeRemaining(dailyDeadline);
    if (remaining) {
      const minutesLeft = Math.floor(remaining.totalMs / 60000);
      
      // Load fired markers from sessionStorage to prevent triggers repeat loop within same minute
      const firedKey = `goalpad_fired_warnings_${today}`;
      const fired = JSON.parse(sessionStorage.getItem(firedKey) || '{"w120":false,"w60":false,"w15":false,"w0":false}');
      
      if (minutesLeft <= 120 && minutesLeft > 60 && !fired.w120) {
        fired.w120 = true;
        sessionStorage.setItem(firedKey, JSON.stringify(fired));
        sendNotification("Deadline Warning (2 Hrs Left)", `You have ${incompleteCount} goal(s) remaining for today.`);
        showToast("Deadline: 2 hours remaining!", "warning");
      } 
      else if (minutesLeft <= 60 && minutesLeft > 15 && !fired.w60) {
        fired.w60 = true;
        sessionStorage.setItem(firedKey, JSON.stringify(fired));
        playWarningSound();
        sendNotification("Deadline Warning (1 Hr Left)", `Hurry up! ${incompleteCount} task(s) need completion.`);
        showToast("Deadline: 1 hour remaining!", "warning");
      } 
      else if (minutesLeft <= 15 && minutesLeft > 0 && !fired.w15) {
        fired.w15 = true;
        sessionStorage.setItem(firedKey, JSON.stringify(fired));
        playWarningSound();
        setTimeout(playWarningSound, 400);
        sendNotification("Deadline Critical (15 Mins Left)", "Finish up your goals now!");
        showToast("Deadline: 15 minutes remaining!", "danger");
      } 
      else if (minutesLeft <= 0 && !fired.w0) {
        fired.w0 = true;
        sessionStorage.setItem(firedKey, JSON.stringify(fired));
        startLoopingAlarm();
        showDeadlinePopup(incompleteCount);
        sendNotification("Deadline Reached! ⚠️", `You missed completing ${incompleteCount} goal(s) today.`);
      }
    }
  }
}

// Trigger Alarm details
function triggerAlarm(alarm) {
  startLoopingAlarm();
  showAlarmPopup(alarm);
  sendNotification("Reminder Alarm!", alarm.label);
}

// Screen overlay modal alert builders
function showAlarmPopup(alarm) {
  const overlay = document.createElement('div');
  overlay.className = 'alarm-overlay';
  overlay.id = 'alarmPopupOverlay';
  
  overlay.innerHTML = `
    <div class="alarm-card">
      <span class="alarm-emoji ringing">🔔</span>
      <div class="alarm-time">${alarm.time}</div>
      <div class="alarm-label">${alarm.label}</div>
      <button class="alarm-dismiss" onclick="dismissAlarm()">Dismiss Alarm</button>
    </div>
  `;
  document.body.appendChild(overlay);
}

function showDeadlinePopup(pendingCount) {
  const overlay = document.createElement('div');
  overlay.className = 'alarm-overlay';
  overlay.id = 'alarmPopupOverlay';
  
  overlay.innerHTML = `
    <div class="alarm-card" style="border-color: var(--danger)">
      <span class="alarm-emoji ringing">⏰</span>
      <div class="alarm-time">00:00</div>
      <div class="alarm-label">Daily deadline reached! You have ${pendingCount} incomplete goal(s).</div>
      <button class="alarm-dismiss" style="background: var(--danger); color: white;" onclick="dismissAlarm()">Acknowledge</button>
    </div>
  `;
  document.body.appendChild(overlay);
}

function dismissAlarm() {
  stopLoopingAlarm();
  const overlay = document.getElementById('alarmPopupOverlay');
  if (overlay) {
    overlay.remove();
  }
}

// Web Notifications permission requests
function requestNotifPermission() {
  if ("Notification" in window) {
    if (Notification.permission !== "granted" && Notification.permission !== "denied") {
      Notification.requestPermission();
    }
  }
}

function sendNotification(title, body) {
  if ("Notification" in window && Notification.permission === "granted") {
    new Notification(title, {
      body: body,
      icon: 'assets/icons/icon-192.png'
    });
  }
}

// Toast Alert scheduling helper
function showToast(message, type) {
  // Remove existing toasts
  document.querySelectorAll('.toast').forEach(t => t.remove());
  
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  let icon = 'fa-check-circle';
  if (type === 'warning') icon = 'fa-exclamation-triangle';
  if (type === 'danger') icon = 'fa-times-circle';
  
  toast.innerHTML = `
    <i class="fa-solid ${icon}" style="color: var(--${type})"></i>
    <div style="flex: 1; font-weight: 500;">${message}</div>
  `;
  
  document.body.appendChild(toast);
  
  // Show animation
  setTimeout(() => toast.classList.add('show'), 10);
  
  // Exit duration
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 400);
  }, 3500);
}

// Reminders HTML page management
function renderReminders() {
  const container = document.getElementById('remindersList');
  if (!container) return;
  
  const alarms = getAlarms();
  if (alarms.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon"><i class="fa-solid fa-bell-slash"></i></div>
        <h3>No reminders scheduled</h3>
        <p>Set a custom alarm time using the form above.</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = alarms.map(alarm => {
    const isChecked = alarm.active ? 'on' : '';
    return `
      <div class="reminder-item">
        <div class="reminder-info">
          <div class="reminder-time">${alarm.time}</div>
          <div class="reminder-details">
            <div class="reminder-label">${alarm.label}</div>
            <div class="reminder-repeat"><i class="fa-solid fa-repeat"></i> ${alarm.repeat}</div>
          </div>
        </div>
        <div class="reminder-actions">
          <div class="toggle-switch ${isChecked}" onclick="toggleReminder('${alarm.id}')">
            <div class="toggle-knob"></div>
          </div>
          <button class="goal-action-btn delete" onclick="deleteReminder('${alarm.id}')" title="Delete Alarm">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

function addReminder() {
  const labelEl = document.getElementById('reminderLabel');
  if (!labelEl || !labelEl.value.trim()) {
    showToast("Please enter a reminder label!", "warning");
    return;
  }
  
  // Repeat check value
  const repeatBtn = document.querySelector('.repeat-btn.active');
  const repeatMode = repeatBtn ? repeatBtn.getAttribute('data-value') : 'Once';
  
  const timeStr = `${pickerTimeState.hour}:${pickerTimeState.minute} ${pickerTimeState.ampm}`;
  const alarmId = 'alarm-' + Date.now();
  
  const alarmData = {
    id: alarmId,
    label: labelEl.value.trim(),
    time: timeStr,
    repeat: repeatMode,
    active: true
  };
  
  saveAlarm(alarmData);
  labelEl.value = '';
  renderReminders();
  showToast("Reminder scheduled!", "success");
  
  if (typeof playReminderSound === 'function') {
    playReminderSound();
  }
}

function deleteReminder(id) {
  deleteAlarm(id);
  renderReminders();
  showToast("Reminder deleted.", "danger");
}

function toggleReminder(id) {
  const alarms = getAlarms();
  const alarm = alarms.find(a => a.id === id);
  if (alarm) {
    updateAlarm(id, { active: !alarm.active });
    renderReminders();
    showToast(alarm.active ? "Reminder deactivated." : "Reminder activated.", "success");
    if (typeof playReminderSound === 'function') {
      playReminderSound();
    }
  }
}

function testSound() {
  playSuccessSound();
  showToast("Playing test chimes!", "success");
}

// Start Alarm Engine Checkers
document.addEventListener('DOMContentLoaded', () => {
  requestNotifPermission();
  
  // Verify alarms once a minute
  setInterval(checkAllAlarms, 60000);
  // Perform first run check after 1 second delay
  setTimeout(checkAllAlarms, 1000);
  
  // Set reminders list bindings
  if (document.getElementById('remindersList')) {
    renderReminders();
  }
});
