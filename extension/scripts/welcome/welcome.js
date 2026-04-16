import { DB_TYPE } from '../common/types.js';
import { interactWithDB } from '../supabase/api.js';

// Welcome page script
const steps = Array.from(document.querySelectorAll('.step'));
const dots = Array.from(document.querySelectorAll('.dot'));
const nextBtn = document.getElementById('getStartedBtn');

let currentStep = 0;
let selectedPrivacy = '';

// If the welcome page is opened in its own tab/window (not in the
// extension iframe), hide the final "Done" button since there's no
// parent to close. When embedded in the extension iframe, show it.
const isEmbedded = (window.self !== window.top);

// Allow dot navigation
dots.forEach((dot, index) => {
  dot.addEventListener('click', () => {
    currentStep = index;
    updateUI();
  });
});

function updateUI() {
  steps.forEach((step, index) => {
    step.classList.toggle('active', index === currentStep);
  });
  dots.forEach((dot, index) => {
    dot.classList.toggle('active', index === currentStep);
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
