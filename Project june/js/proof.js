/* GoalPad Proof Verification System */

// Global state for verification process
let proofState = {
  goalId: null,
  date: null,
  type: null, // 'photo', 'note', 'number'
  photoBase64: null,
  note: '',
  number: '',
  unit: '',
  rating: 0,
  cameraStream: null
};

// Rating labels in English & Hindi
const RATING_LABELS = {
  1: "😔 Bohot Kharab (Poor)",
  2: "😐 Theek Tha (Okay)",
  3: "🙂 Achha Kiya (Good)",
  4: "😊 Bahut Achha (Great)",
  5: "🤩 Zabardast! (Excellent!)"
};

// Open the proof modal
function openProofModal(goalId, date) {
  // Reset previous state
  proofState = {
    goalId: goalId,
    date: date,
    type: null,
    photoBase64: null,
    note: '',
    number: '',
    unit: '',
    rating: 0,
    cameraStream: null
  };
  
  const goal = getGoals(date).find(g => g.id === goalId);
  const goalTitle = goal ? goal.title : 'Complete Task';
  
  // Build and insert modal
  const modal = document.createElement('div');
  modal.className = 'proof-overlay modal-enter';
  modal.id = 'proofModalContainer';
  
  modal.innerHTML = `
    <div class="proof-card">
      <div class="proof-header">
        <span class="proof-header-emoji">⚡</span>
        <h3>Verify Completion</h3>
        <p>Provide evidence to complete your goal</p>
        <button class="proof-close" onclick="closeProofModal()">&times;</button>
      </div>
      
      <div class="proof-goal-label">
        <i class="fa-solid fa-bullseye"></i> ${goalTitle}
      </div>
      
      <!-- STEP 1: Select proof type -->
      <div class="proof-section" id="proofStep1">
        <div class="proof-step-title">Step 1: Choose Proof Type</div>
        <div class="proof-types">
          <div class="proof-type-card" onclick="selectProofType('photo')" id="proofTypePhoto">
            <span class="proof-type-emoji">📸</span>
            <div class="proof-type-name">Photo</div>
            <div class="proof-type-sub">Upload/Capture</div>
          </div>
          <div class="proof-type-card" onclick="selectProofType('note')" id="proofTypeNote">
            <span class="proof-type-emoji">✍️</span>
            <div class="proof-type-name">Note</div>
            <div class="proof-type-sub">Min 10 chars</div>
          </div>
          <div class="proof-type-card" onclick="selectProofType('number')" id="proofTypeNumber">
            <span class="proof-type-emoji">🔢</span>
            <div class="proof-type-name">Value</div>
            <div class="proof-type-sub">Count/Number</div>
          </div>
        </div>
      </div>
      
      <!-- STEP 2: Proof Detail Inputs -->
      <div class="proof-section" id="proofStep2" style="display: none; margin-bottom: 1.5rem;">
        <div class="proof-step-title">Step 2: Provide Proof Content</div>
        
        <!-- Photo Container -->
        <div id="proofInputPhoto" style="display: none;">
          <div class="photo-upload-box" onclick="document.getElementById('proofPhotoFileInput').click()">
            <div class="photo-upload-icon"><i class="fa-solid fa-cloud-arrow-up"></i></div>
            <div class="photo-upload-text">Upload Photo File</div>
            <div class="photo-upload-hint">Drag & drop or click (JPG, PNG max 5MB)</div>
          </div>
          <input type="file" id="proofPhotoFileInput" accept="image/*" style="display: none;" onchange="handlePhotoFile(event)">
          
          <button class="camera-btn" onclick="openProofCamera()">
            <i class="fa-solid fa-camera"></i> Capture via Webcam
          </button>
          
          <div class="camera-modal" id="cameraStreamContainer" style="display: none;">
            <video id="proofVideo" autoplay playsinline></video>
            <div class="camera-controls">
              <button class="capture-btn" onclick="captureProofPhoto()">Capture Frame</button>
              <button class="cancel-cam-btn" onclick="stopProofCamera()">Cancel</button>
            </div>
          </div>
          
          <div class="proof-photo-preview" id="photoPreviewContainer" style="display: none;">
            <img id="photoPreviewImg" src="" alt="Proof Preview">
            <button class="remove-photo-btn" onclick="removeProofPhoto()">Remove Photo</button>
          </div>
        </div>
        
        <!-- Note Container -->
        <div id="proofInputNote" style="display: none;">
          <textarea class="proof-textarea" id="proofTextNote" placeholder="Explain what you accomplished..." oninput="handleNoteInput()"></textarea>
          <div class="char-count" id="noteCharCount">0 / 10 characters minimum</div>
        </div>
        
        <!-- Number Container -->
        <div id="proofInputNumber" style="display: none;">
          <div class="number-row">
            <div>
              <label class="form-label">Numerical Value</label>
              <input type="number" class="form-input" id="proofNumValue" placeholder="e.g. 5, 2.5" oninput="handleNumberInput()">
            </div>
            <div>
              <label class="form-label">Unit</label>
              <input type="text" class="form-input" id="proofNumUnit" placeholder="e.g. km, pages, reps" oninput="handleNumberInput()">
            </div>
          </div>
          <div class="number-preview" id="numPreviewText">Result: --</div>
        </div>
      </div>
      
      <!-- STEP 3: Rating Selection -->
      <div class="proof-section stars-section" id="proofStep3" style="display: none;">
        <div class="proof-step-title">Step 3: Self-Rate Performance</div>
        <div class="stars-row">
          <span class="star" data-star="1" onclick="setRating(1)"><i class="fa-solid fa-star"></i></span>
          <span class="star" data-star="2" onclick="setRating(2)"><i class="fa-solid fa-star"></i></span>
          <span class="star" data-star="3" onclick="setRating(3)"><i class="fa-solid fa-star"></i></span>
          <span class="star" data-star="4" onclick="setRating(4)"><i class="fa-solid fa-star"></i></span>
          <span class="star" data-star="5" onclick="setRating(5)"><i class="fa-solid fa-star"></i></span>
        </div>
        <div class="rating-text" id="proofRatingLabel">Tap to select stars</div>
      </div>
      
      <button class="proof-submit" id="proofSubmitBtn" disabled onclick="submitProof()">
        Verify & Complete
      </button>
      
      <div class="proof-progress">
        <span class="proof-step-dot done" id="dotStep1">1</span>
        <span class="proof-step-line"></span>
        <span class="proof-step-dot" id="dotStep2">2</span>
        <span class="proof-step-line"></span>
        <span class="proof-step-dot" id="dotStep3">3</span>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
}

// Close the modal
function closeProofModal() {
  stopProofCamera();
  const modal = document.getElementById('proofModalContainer');
  if (modal) {
    modal.classList.add('page-exit');
    setTimeout(() => {
      modal.remove();
      resetProofModal();
    }, 300);
  }
}

// Reset state
function resetProofModal() {
  proofState = {
    goalId: null,
    date: null,
    type: null,
    photoBase64: null,
    note: '',
    number: '',
    unit: '',
    rating: 0,
    cameraStream: null
  };
}

// Select proof type: Step 1 transition
function selectProofType(type) {
  proofState.type = type;
  
  // Highlight chosen card
  document.querySelectorAll('.proof-type-card').forEach(card => {
    card.classList.remove('active');
  });
  
  const activeCard = document.getElementById(`proofType${type.charAt(0).toUpperCase() + type.slice(1)}`);
  if (activeCard) activeCard.classList.add('active');
  
  // Show proper inputs container
  document.getElementById('proofStep2').style.display = 'block';
  document.getElementById('proofInputPhoto').style.display = type === 'photo' ? 'block' : 'none';
  document.getElementById('proofInputNote').style.display = type === 'note' ? 'block' : 'none';
  document.getElementById('proofInputNumber').style.display = type === 'number' ? 'block' : 'none';
  
  // Progress tracker indicator
  document.getElementById('dotStep2').classList.add('done');
  
  // Check triggers for step 3
  document.getElementById('proofStep3').style.display = 'block';
  
  checkSubmitReady();
}

// File photo handlers
function handlePhotoFile(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  // Validate file type
  if (!file.type.startsWith('image/')) {
    alert("Please select a valid image file.");
    return;
  }
  
  // Validate file size: Max 5MB
  if (file.size > 5 * 1024 * 1024) {
    alert("Image size exceeds 5MB quota. Please select a smaller photo.");
    return;
  }
  
  const reader = new FileReader();
  reader.onload = function(e) {
    // Compress base64 to save storage space
    compressProfileImage(e.target.result, (compressed) => {
      proofState.photoBase64 = compressed;
      showPhotoPreview(compressed);
      checkSubmitReady();
    });
  };
  reader.readAsDataURL(file);
}

function showPhotoPreview(src) {
  const container = document.getElementById('photoPreviewContainer');
  const img = document.getElementById('photoPreviewImg');
  if (container && img) {
    img.src = src;
    container.style.display = 'block';
    // Hide standard upload box during preview
    const box = document.querySelector('.photo-upload-box');
    if (box) box.style.display = 'none';
  }
}

function removeProofPhoto() {
  proofState.photoBase64 = null;
  const container = document.getElementById('photoPreviewContainer');
  if (container) container.style.display = 'none';
  
  const box = document.querySelector('.photo-upload-box');
  if (box) box.style.display = 'flex';
  
  const fileInput = document.getElementById('proofPhotoFileInput');
  if (fileInput) fileInput.value = '';
  
  checkSubmitReady();
}

// Camera handlers
async function openProofCamera() {
  const container = document.getElementById('cameraStreamContainer');
  const video = document.getElementById('proofVideo');
  if (!container || !video) return;
  
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    proofState.cameraStream = stream;
    video.srcObject = stream;
    container.style.display = 'block';
    
    // Hide file upload boxes
    const box = document.querySelector('.photo-upload-box');
    if (box) box.style.display = 'none';
    const preview = document.getElementById('photoPreviewContainer');
    if (preview) preview.style.display = 'none';
  } catch (err) {
    console.error(err);
    alert("Camera access failed! Please upload a photo instead.");
  }
}

function stopProofCamera() {
  if (proofState.cameraStream) {
    proofState.cameraStream.getTracks().forEach(track => track.stop());
    proofState.cameraStream = null;
  }
  const container = document.getElementById('cameraStreamContainer');
  if (container) container.style.display = 'none';
  
  // Re-display upload boxes if no preview exists
  if (!proofState.photoBase64) {
    const box = document.querySelector('.photo-upload-box');
    if (box) box.style.display = 'flex';
  }
}

function captureProofPhoto() {
  const video = document.getElementById('proofVideo');
  if (!video || !proofState.cameraStream) return;
  
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth || 640;
  canvas.height = video.videoHeight || 480;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  
  const base64 = canvas.toDataURL('image/jpeg');
  
  // Compress captured frame
  compressProfileImage(base64, (compressed) => {
    proofState.photoBase64 = compressed;
    stopProofCamera();
    showPhotoPreview(compressed);
    checkSubmitReady();
  });
}

// Text note change validator
function handleNoteInput() {
  const el = document.getElementById('proofTextNote');
  const countEl = document.getElementById('noteCharCount');
  if (!el || !countEl) return;
  
  const text = el.value.trim();
  proofState.note = text;
  
  const len = text.length;
  if (len < 10) {
    countEl.textContent = `${len} / 10 characters minimum`;
    countEl.style.color = 'var(--danger)';
  } else {
    countEl.textContent = `${len} characters (Valid)`;
    countEl.style.color = 'var(--success)';
  }
  checkSubmitReady();
}

// Number change validator
function handleNumberInput() {
  const valEl = document.getElementById('proofNumValue');
  const unitEl = document.getElementById('proofNumUnit');
  const preview = document.getElementById('numPreviewText');
  if (!valEl || !unitEl || !preview) return;
  
  proofState.number = valEl.value.trim();
  proofState.unit = unitEl.value.trim();
  
  if (proofState.number) {
    preview.textContent = `Result: ${proofState.number} ${proofState.unit || ''}`;
    preview.style.color = 'var(--accent)';
  } else {
    preview.textContent = 'Result: --';
    preview.style.color = 'var(--muted)';
  }
  checkSubmitReady();
}

// Star rating selectors
function setRating(val) {
  proofState.rating = val;
  
  document.querySelectorAll('.star').forEach(star => {
    const starVal = parseInt(star.getAttribute('data-star'), 10);
    if (starVal <= val) {
      star.classList.add('lit');
    } else {
      star.classList.remove('lit');
    }
  });
  
  const label = document.getElementById('proofRatingLabel');
  if (label) {
    label.textContent = RATING_LABELS[val];
    label.style.color = '#FACC15';
  }
  
  document.getElementById('dotStep3').classList.add('done');
  checkSubmitReady();
}

// Verify if submit button can unlock
function checkSubmitReady() {
  const btn = document.getElementById('proofSubmitBtn');
  if (!btn) return;
  
  let isValid = false;
  if (proofState.type && proofState.rating > 0) {
    if (proofState.type === 'photo' && proofState.photoBase64) {
      isValid = true;
    } else if (proofState.type === 'note' && proofState.note.length >= 10) {
      isValid = true;
    } else if (proofState.type === 'number' && proofState.number !== '') {
      isValid = true;
    }
  }
  
  btn.disabled = !isValid;
}

// Commit the verification details
function submitProof() {
  if (!proofState.goalId || !proofState.date) return;
  
  // Create object data
  const data = {
    type: proofState.type,
    photoBase64: proofState.photoBase64,
    note: proofState.note,
    number: proofState.number,
    unit: proofState.unit,
    rating: proofState.rating,
    timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) + ' ' + new Date().toLocaleDateString('en-US')
  };
  
  // Storage commits
  saveProof(proofState.date, proofState.goalId, data);
  updateGoal(proofState.date, proofState.goalId, { done: true });
  
  // Modal exit transitions
  closeProofModal();
  
  // Points increment
  addPoints(10);
  
  // Animation triggers
  if (typeof animateGoalComplete === 'function') {
    animateGoalComplete(proofState.goalId);
  }
  
  // Check badge unlocks
  if (typeof checkBadges === 'function') {
    // Delay slightly to let complete animation finish
    setTimeout(checkBadges, 800);
  }
  
  // Re-render dashboard lists
  setTimeout(() => {
    renderGoals(proofState.date);
    showToast("Goal verified and completed! +10 XP earned", "success");
  }, 600);
}

// Open view-proof details window
function viewProof(goalId, date) {
  const proof = getProof(date, goalId);
  const goal = getGoals(date).find(g => g.id === goalId);
  const goalTitle = goal ? goal.title : 'Goal Completed';
  
  if (!proof) {
    showToast("Proof details not found.", "warning");
    return;
  }
  
  const modal = document.createElement('div');
  modal.className = 'proof-overlay modal-enter';
  modal.id = 'proofModalContainer';
  
  let contentHtml = '';
  
  if (proof.type === 'photo') {
    contentHtml = `
      <img src="${proof.photoBase64}" class="view-proof-img" alt="Proof Photo">
    `;
  } else if (proof.type === 'note') {
    contentHtml = `
      <div class="view-proof-note">
        "${proof.note}"
      </div>
    `;
  } else if (proof.type === 'number') {
    contentHtml = `
      <div class="big-result-number">${proof.number}</div>
      <div style="text-align: center; color: var(--muted); font-size: 0.9rem; font-weight: 600; text-transform: uppercase; margin-bottom: 1rem;">
        ${proof.unit || 'Units'}
      </div>
    `;
  }
  
  const litStars = Array.from({ length: 5 }, (_, i) => {
    const lit = (i + 1) <= proof.rating ? 'color: #FACC15;' : 'color: var(--border2);';
    return `<i class="fa-solid fa-star" style="${lit}"></i>`;
  }).join('');
  
  modal.innerHTML = `
    <div class="view-proof-card proof-card">
      <div class="proof-header">
        <span class="proof-header-emoji">🏅</span>
        <h3>Verification Log</h3>
        <p>Goal completed successfully</p>
        <button class="proof-close" onclick="closeProofModal()">&times;</button>
      </div>
      
      <div class="proof-goal-label">
        <i class="fa-solid fa-bullseye"></i> ${goalTitle}
      </div>
      
      <div class="proof-step-title">Verified Evidence</div>
      ${contentHtml}
      
      <div class="proof-step-title" style="margin-top: 1.25rem;">Performance Self-Rating</div>
      <div class="proof-stars">${litStars}</div>
      <div style="text-align: center; font-size: 0.85rem; color: var(--muted); margin-top: 0.35rem; font-weight: 600;">
        ${RATING_LABELS[proof.rating] || 'Rating'}
      </div>
      
      <div class="proof-timestamp">
        <i class="fa-solid fa-check-double" style="color: var(--success); margin-right: 0.25rem;"></i>
        Completed on ${proof.timestamp}
      </div>
      
      <button class="proof-submit" style="margin-top: 1.5rem;" onclick="closeProofModal()">
        Close
      </button>
    </div>
  `;
  
  document.body.appendChild(modal);
}
