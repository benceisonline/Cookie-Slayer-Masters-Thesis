// Welcome page script
const steps = Array.from(document.querySelectorAll('.step'));
const dots = Array.from(document.querySelectorAll('.dot'));
const nextBtn = document.getElementById('getStartedBtn');

let currentStep = 0;
let selectedPrivacy = 'high';

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
    nextBtn.textContent = 'Done';
  } else if (currentStep === 0) {
    nextBtn.textContent = 'Get Started';
  } else {
    nextBtn.textContent = 'Next';
  }
}

function advanceStep() {
  if (currentStep < steps.length - 1) {
    currentStep += 1;
    updateUI();
    return;
  }

  // Final step: save settings and close overlay
  chrome.storage.local.set({ welcomeSeen: true, privacyLevel: selectedPrivacy }, () => {
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
