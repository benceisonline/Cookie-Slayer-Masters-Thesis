import { IDS, VAL } from '../common/types.js';
import { showError } from '../common/messages.js';

let hideTimeout = null;

export function buildProfile(stats, category, results) {
  const container = createContainer();
  createHeader(container, category)
  createWeb(container);
  createLabels(container);
  createRadarShape(container, stats, results);
  
  document.documentElement.appendChild(container);

  createOverlays(results, stats);
}

function createContainer() {
  const container = document.createElement('div');
  container.id = IDS.RADAR_CONTAINER;
  Object.assign(container.style, {
    position: 'relative', 
    width: '400px', 
    height: '400px',
    background: '#ffffff', 
    borderRadius: '12px',
    border: '1px solid #e2e8f0', 
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
    zIndex: '2147483647', 
    transition: 'opacity 0.3s ease',
    boxSizing: 'border-box', 
    padding: '40px', 
    visibility: 'hidden', 
    opacity: '0',
    padding: '20px',
  });
  return container;
}

function createHeader(container, category) {
  const header = document.createElement('div');
  header.innerText = category.toUpperCase();
  
  Object.assign(header.style, {
    width: '100%',
    textAlign: 'center',
    fontSize: '13px',
    fontWeight: '800',
    color: '#1e293b',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    letterSpacing: '0.05em',
    padding: '16px 0',
    borderBottom: '1px solid #f1f5f9',
    position: 'absolute',
    top: '0',
    left: '0',
    pointerEvents: 'none',
    zIndex: '5'
  });

  container.appendChild(header);
}

function createWeb(container) {
  [0.33, 0.66, 1].forEach(scale => {
    const ring = document.createElement('div');
    const size = scale * 40; 
    Object.assign(ring.style, {
        position: 'absolute', 
        top: '50%', 
        left: '50%',
        width: `${size}%`, 
        height: `${size}%`,
        border: '1px solid #f1f5f9', 
        transform: 'translate(-50%, -50%) rotate(45deg)',
        pointerEvents: 'none',
        boxSizing: 'border-box'
    });
    container.appendChild(ring);
  });
}

function createLabels(container) {
  const positions = [
    { text: 'ACCEPT', top: '17.5%', left: '50%' },
    { text: 'CUSTOMIZE', top: '50%', left: '90%' },
    { text: 'REJECT', top: '87.5%', left: '50%' },
    { text: 'NECESSARY', top: '50%', left: '10%' }
  ];

  positions.forEach(pos => {
    const label = document.createElement('div');
    label.innerText = pos.text;
    Object.assign(label.style, {
      position: 'absolute', top: pos.top, left: pos.left,
      transform: 'translate(-50%, -50%)', fontSize: '11px',
      fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase',
      whiteSpace: 'nowrap', padding: '4px', zIndex: '3'
    });
    container.appendChild(label);
  });
}

function createRadarShape(container, stats, results) {
  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  
  const CENTER = 200;
  const MAX_PX = 113.1;
  const MAX_PCT = 28.28;
  const MIN_VAL = VAL.MIN_VALUE;

  Object.assign(svg.style, {
    position: 'absolute', width: '100%', height: '100%', top: 0, left: 0, pointerEvents: 'none', zIndex: '2'
  });

  const polygon = document.createElementNS(svgNS, "polygon");
  polygon.setAttribute("fill", "rgba(17, 255, 0, 0.2)");
  polygon.setAttribute("stroke", "#11FF00");
  polygon.setAttribute("stroke-width", "2");
  svg.appendChild(polygon);
  container.appendChild(svg);

  const updatePolygon = () => {
    const p1 = `${CENTER},${CENTER - (Math.max(MIN_VAL, stats.ACCEPT) * MAX_PX)}`;
    const p2 = `${CENTER + (Math.max(MIN_VAL, stats.CUSTOMIZE) * MAX_PX)},${CENTER}`;
    const p3 = `${CENTER},${CENTER + (Math.max(MIN_VAL, stats.REJECT) * MAX_PX)}`;
    const p4 = `${CENTER - (Math.max(MIN_VAL, stats.NECESSARY) * MAX_PX)},${CENTER}`;
    polygon.setAttribute("points", `${p1} ${p2} ${p3} ${p4}`);
  };

  const axes = [
    { key: 'ACCEPT', x: 50, y: (v) => 50 - (Math.max(MIN_VAL, v) * MAX_PCT), type: 'vertical' },
    { key: 'CUSTOMIZE', x: (v) => 50 + (Math.max(MIN_VAL, v) * MAX_PCT), y: 50, type: 'horizontal' },
    { key: 'REJECT', x: 50, y: (v) => 50 + (Math.max(MIN_VAL, v) * MAX_PCT), type: 'vertical' },
    { key: 'NECESSARY', x: (v) => 50 - (Math.max(MIN_VAL, v) * MAX_PCT), y: 50, type: 'horizontal' }
  ];

  axes.forEach(axis => {
    const dot = document.createElement('div');
    Object.assign(dot.style, {
      position: 'absolute', width: '12px', height: '12px', backgroundColor: '#11FF00',
      border: '2px solid white', borderRadius: '50%', transform: 'translate(-50%, -50%)',
      cursor: 'grab', zIndex: '10', boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
      top: typeof axis.y === 'function' ? `${axis.y(stats[axis.key])}%` : `${axis.y}%`,
      left: typeof axis.x === 'function' ? `${axis.x(stats[axis.key])}%` : `${axis.x}%`
    });

    dot.onmousedown = () => {
      document.onmousemove = (e) => {
        const rect = container.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        let val;
        if (axis.type === 'vertical') {
          const deltaY = e.clientY - centerY;
          val = axis.key === 'REJECT' ? deltaY / MAX_PX : -deltaY / MAX_PX;
        } else {
          const deltaX = e.clientX - centerX;
          val = axis.key === 'CUSTOMIZE' ? deltaX / MAX_PX : -deltaX / MAX_PX;
        }

        stats[axis.key] = Math.max(MIN_VAL, Math.min(1, val));
        
        dot.style.top = typeof axis.y === 'function' ? `${axis.y(stats[axis.key])}%` : `${axis.y}%`;
        dot.style.left = typeof axis.x === 'function' ? `${axis.x(stats[axis.key])}%` : `${axis.x}%`;
        updatePolygon();
        syncOverlays(results, stats);
      };

      document.onmouseup = () => {
        document.onmousemove = null;
      };
    };
    container.appendChild(dot);
  });
  
  updatePolygon();
}

function syncOverlays(results, stats) {
  let hasVisibleBadge = false;

  results.forEach(item => {
    const buttonNode = item.element;
    if (!buttonNode) return;

    const categoryKey = item.category.toUpperCase();
    const statValue = stats[categoryKey] || 0;
    const badgeId = `badge-${item.category}`;
    const existingBadge = document.getElementById(badgeId);

    if (statValue >= 0.5) {
      hasVisibleBadge = true;
      if (!existingBadge) createBadge(buttonNode, item.category);
    } else {
      if (existingBadge) existingBadge.remove();
    }
  });

  console.log(hasVisibleBadge, results)
  if (!hasVisibleBadge && results.length > 0) {
    showError("No buttons match your current preferences.");
  }
}

function createBadge(parent, category) {
  parent.style.position = 'relative';
  const badge = document.createElement('div');
  badge.id = `badge-${category}`;
  badge.innerText = '✔️'; 
  Object.assign(badge.style, {
      position: 'absolute', top: '0', right: '0', transform: 'translate(50%, -50%)',
      width: '20px', height: '20px', backgroundColor: '#11FF00', color: 'white',
      borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: '12px', zIndex: '2147483647', cursor: 'pointer'
  });

  badge.onmouseenter = () => showRadar(badge);
  badge.onmouseleave = hideRadar;
  parent.appendChild(badge);
}

function createOverlays(results, stats) {
  const radar = document.getElementById(IDS.RADAR_CONTAINER);
  if (radar) {
    radar.onmouseenter = () => {
      if (hideTimeout) clearTimeout(hideTimeout);
    };
    radar.onmouseleave = hideRadar;
  }

  syncOverlays(results, stats)
}

function showRadar(badge) {
    const radar = document.getElementById(IDS.RADAR_CONTAINER);
    if (!radar) return;
    if (hideTimeout) clearTimeout(hideTimeout);

    const rect = badge.getBoundingClientRect();
    const radarSize = 400;
    const gap = 10;
    const margin = 10;

    let topPos = (rect.top + window.scrollY) - radarSize - gap;
    let leftPos = (rect.left + window.scrollX) - (radarSize / 2) + (rect.width / 2);

    if (leftPos < margin) {
        leftPos = margin;
    }

    const viewportWidth = document.documentElement.clientWidth;
    const maxLeft = (viewportWidth + window.scrollX) - radarSize - margin;
    if (leftPos > maxLeft) {
        leftPos = maxLeft;
    }

    if (topPos < window.scrollY + margin) {
        topPos = rect.bottom + window.scrollY + gap;
    }

    Object.assign(radar.style, {
      display: 'block', 
      visibility: 'visible', 
      opacity: '1', 
      position: 'absolute',
      top: `${topPos}px`, 
      left: `${leftPos}px`, 
      zIndex: '2147483647'
    });
}

function hideRadar() {
  const radar = document.getElementById(IDS.RADAR_CONTAINER);
  if (!radar) return;
  hideTimeout = setTimeout(() => {
      radar.style.visibility = 'hidden';
      radar.style.opacity = '0';
  }, 150);
}