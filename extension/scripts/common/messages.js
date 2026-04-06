export function showError(message) {
  const errorToast = document.createElement('div');
  
  Object.assign(errorToast.style, {
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    padding: '12px 20px',
    background: '#fee2e2', 
    color: '#991b1b', 
    border: '1px solid #fecaca',
    borderRadius: '8px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    fontSize: '13px',
    fontWeight: '600',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    zIndex: '2147483647',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'opacity 0.3s ease'
  });

  errorToast.innerHTML = `
    <span>⚠️</span>
    <span>${message}</span>
  `;

  document.body.appendChild(errorToast);

  setTimeout(() => {
    errorToast.style.opacity = '0';
    setTimeout(() => errorToast.remove(), 300);
  }, 4000);
}