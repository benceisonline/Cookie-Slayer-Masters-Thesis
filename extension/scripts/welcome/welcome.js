import { DB_TYPE } from '../common/types.js';
import { interactWithDB } from '../supabase/api.js';

// Welcome page script
const steps = Array.from(document.querySelectorAll('.step'));
const dots = Array.from(document.querySelectorAll('.dot'));
const nextBtn = document.getElementById('getStartedBtn');

let currentStep = 0;
let selectedPrivacy = '';

// Name input elements (preferences slide)
const nameContainer = document.getElementById('nameContainer');
const nameInput = document.getElementById('nameInput');

// If the welcome page is opened in its own tab/window (not in the
// extension iframe), hide the final "Done" button since there's no
// parent to close. When embedded in the extension iframe, show it.
const isEmbedded = (window.self !== window.top);

// Dots are indicators only; disable interaction and prevent focus
dots.forEach(dot => {
  dot.setAttribute('aria-hidden', 'true');
  dot.tabIndex = -1;
});

function updateUI() {
  steps.forEach((step, index) => {
    step.classList.toggle('active', index === currentStep);
  });
  dots.forEach((dot, index) => {
    dot.classList.toggle('active', index === currentStep);
  });

  // Toggle container width when a video slide is active
  try {
    const container = document.querySelector('.welcome-container');
    const activeStep = steps[currentStep];
    if (activeStep && activeStep.querySelector('.welcome-video')) {
      container.classList.add('video-active');
    } else {
      container.classList.remove('video-active');
    }
  } catch (e) {}

  // Manage videos: play the video inside the active step, pause/reset others
  const videos = Array.from(document.querySelectorAll('.welcome-video'));
  videos.forEach(video => {
    const parentStep = video.closest('.step');
    if (parentStep && parentStep.classList.contains('active')) {
      // ensure muted and looping for autoplay reliability
      video.muted = true;
      video.loop = true;
      // try to play (browsers may reject if autoplay disallowed)
      const p = video.play();
      if (p && typeof p.catch === 'function') p.catch(() => {});
    } else {
      try {
        video.pause();
        video.currentTime = 0;
      } catch (e) {}
    }
  });

  if (currentStep === steps.length - 1) {
    // Only show "Done" when embedded in the extension iframe.
    if (isEmbedded) nextBtn.textContent = 'Done'; else nextBtn.style.display = 'none';
  } else if (currentStep === 0) {
    nextBtn.style.display = '';
    nextBtn.textContent = 'Get Started';
  } else {
    nextBtn.style.display = '';
    nextBtn.textContent = 'Next';
  }
  // Update Next button enabled/disabled state for the preferences step
  try { updateNextState(); } catch (e) {}
}

async function initializeUser() {
  const result = await chrome.storage.local.get("userId");
  let userId = result.userId
  if (!userId) {
    userId = crypto.randomUUID();
    await chrome.storage.local.set({ userId: userId });
  }
  return userId;
}

async function advanceStep() {
  // If we're on the preferences step (index 6), require and save the name first
  if (currentStep === 6) {
    const nameVal = (nameInput?.value || '').trim();
    if (!nameVal) {
      if (nameInput) {
        nameInput.style.borderColor = '#e74c3c';
        nameInput.focus();
      }
      return; // block advancing until name provided
    }

    try {
      await saveNameIfNeeded();
    } catch (e) {
      console.error('Failed saving name:', e);
    }
  }
  if (currentStep < steps.length - 1) {
    currentStep += 1;
    updateUI();
    return;
  }

  const userId = await initializeUser();
  await savePrivacyLevel(userId, selectedPrivacy);

  const settingsToSave = { 
    welcomeSeen: true, 
    privacyLevel: selectedPrivacy,
  };

  // Final step: save settings and close overlay
  await chrome.storage.local.set(settingsToSave);
  window.parent.postMessage({ type: 'close-welcome' }, '*');  
}

// Save optional name from the preferences slide and remove the field so it's no longer accessible
async function saveNameIfNeeded() {
  if (!nameContainer) return;
  const stored = await chrome.storage.local.get('userName');
  if (stored?.userName) {
    // already saved — remove the field
    nameContainer.remove();
    return;
  }

  const name = (nameInput?.value || '').trim();
  if (!name) {
    // do not save empty names; keep the field so user can enter it
    return;
  }

  const userId = await initializeUser();
  await chrome.storage.local.set({ userName: name });

  // Optionally log to backend (non-blocking)
  try {
    await interactWithDB(DB_TYPE.SAVE_LOG, { userId, event: 'SAVE_USER_NAME', name });
  } catch (e) {
    // ignore backend failures for name save
  }

  // Remove input so it is not accessible anymore
  nameContainer.remove();
}

// Enable/disable Next button depending on whether name is filled on the preferences step
function updateNextState() {
  if (!nextBtn) return;
  if (currentStep === 6) {
    // If the name field was already removed (name saved), allow advancing
    if (!nameContainer) {
      nextBtn.disabled = false;
      nextBtn.style.opacity = '';
      return;
    }

    const hasName = !!(nameInput && nameInput.value && nameInput.value.trim());
    nextBtn.disabled = !hasName;
    nextBtn.style.opacity = hasName ? '' : '0.6';
  } else {
    nextBtn.disabled = false;
    nextBtn.style.opacity = '';
  }
}

// Listen for input changes to enable Next when appropriate
if (nameInput) {
  nameInput.addEventListener('input', () => {
    nameInput.style.borderColor = '';
    updateNextState();
  });
}

async function savePrivacyLevel(userId, level) {
  const payload = {
    userId: userId,
    level: level,
  };

  const response = await interactWithDB(DB_TYPE.SAVE_PRIVACY_CHOICE, payload);
  
  if (response?.success) {
    console.log(`Saving privacy choice: ${level}`);
    return response.data; 
  } else {
    console.error("Save failed:", response?.error);
  }
}

nextBtn.addEventListener('click', async () => {
  await advanceStep();
});

// Privacy selection
const privacyOptions = Array.from(document.querySelectorAll('.privacy-option'));
privacyOptions.forEach(btn => {
  btn.addEventListener('click', () => {
    privacyOptions.forEach(o => o.classList.remove('selected'));
    btn.classList.add('selected');
    selectedPrivacy = btn.dataset.value;
  });
});

updateUI();
// On load, if name already present remove the field
(async () => {
  try {
    const stored = await chrome.storage.local.get('userName');
    if (stored?.userName && nameContainer) nameContainer.remove();
  } catch (e) {}
})();
