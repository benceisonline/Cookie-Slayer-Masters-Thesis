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
}

function advanceStep() {
  if (currentStep < steps.length - 1) {
    currentStep += 1;
    updateUI();
    return;
  }

  const settingsToSave = { 
    welcomeSeen: true, 
    privacyLevel: selectedPrivacy,
    userId: crypto.randomUUID()
  };

  // Final step: save settings and close overlay
  chrome.storage.local.set(settingsToSave, () => {
    window.parent.postMessage({ type: 'close-welcome' }, '*');
  });
}

nextBtn.addEventListener('click', advanceStep);

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
