import { sanitizeServerText } from '../common/utils.js';
import { WEBSITE_CATEGORIES, DEFAULT, DECISIONS, IDS, COORDINATES } from '../common/types.js';

let category;
let preferences;
let coordinates;
let container;

let hideTimeout = null;

function categoriseWebsite() {
  return new Promise((resolve) => {
    const categoryList = Object.keys(WEBSITE_CATEGORIES).join(', ');
    // TODO: move this into backend and just send the website name and types and create a new func
    const prompt = `The website is "${document.title}". Return one of these categories based on what fits the website the most: "${categoryList}". Return a single word ONLY.`;
    chrome.runtime.sendMessage({ action: 'ask', prompt }, response => {
      if (response && response.ok) {
        resolve(sanitizeServerText(response.text));
      } else {
        resolve(""); // TODO: add error message in either the extension pop up quickly, reuse for when we dont place any also
      }
    });
  });
}

function getAppliedPreferences() {
  const isValid = Object.values(WEBSITE_CATEGORIES).includes(category);
  if (!isValid) {
    // TODO: add error handling
    console.warn(`AI returned bad response: ${category}`);
    return;
  }
  // TODO: fetch from db the recent interaction for this website
  const savedPreferences = getSavedPreferences();
  return savedPreferences.length !== 0 ? savedPreferences : getDefaultPreferences();
}

function getSavedPreferences() {
  // TODO: make request and response with category
  return [];
}

function getDefaultPreferences() {
  return [
    {context: DEFAULT.DEFAULT, decision: DECISIONS.PREFERENCES}, 
    {context: DEFAULT.DEFAULT, decision: DECISIONS.NECESSARY}, 
  ];
}

function buildProfile() {
  const container = createContainer();

  createQuadrants(container);
  createHLine(container);
  createVLine(container);
  createDot(container);
  
  document.documentElement.appendChild(container);

  return container;
}

function getCoordinatesCompass() {
  if (preferences == undefined || preferences.length === 0) return { x: 0, y: 0 };

  const totals = preferences.reduce((acc, p) => {
        const move = COORDINATES[p.decision.action];
        return {
            x: acc.x + move.x,
            y: acc.y + move.y
        };
    }, { x: 0, y: 0 });

  return {
      x: totals.x / preferences.length,
      y: totals.y / preferences.length
  };
}

function createContainer() {
  const container = document.createElement('div');
  container.id = IDS.COMPASS_CONTAINER;
  Object.assign(container.style, {
    position: 'relative',
    width: '400px',
    height: '400px',
    visibility: 'hidden',
    opacity: '0',
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gridTemplateRows: '1fr 1fr',
    border: '2px solid #333',
    background: '#f9f9f9',
    overflow: 'hidden',
    fontFamily: 'sans-serif',
    zIndex: '2147483647',
  });
  return container;
}

function createQuadrants(container) {
  const labels = [DECISIONS.NECESSARY.action, DECISIONS.ACCEPT.action, DECISIONS.REJECT.action, DECISIONS.PREFERENCES.action];
  labels.forEach(text => {
    const q = document.createElement('div');
    q.innerText = text;
    Object.assign(q.style, {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      border: '0.5px solid #eee',
      color: '#aaa',
      fontWeight: 'bold',
      fontSize: '10px'
    });
    container.appendChild(q);
  });
}

function createHLine(container) {
  const hLine = document.createElement('div');
  Object.assign(hLine.style, { position: 'absolute', top: '50%', left: 0, width: '100%', height: '1px', background: '#ddd' });
  container.appendChild(hLine);
}

function createVLine(container) {
  const vLine = document.createElement('div');
  Object.assign(vLine.style, { position: 'absolute', left: '50%', top: 0, width: '1px', height: '100%', background: '#ddd' });
  container.appendChild(vLine);
}


function createDot(container) {
  const dot = document.createElement('div');
  dot.id = IDS.COMPASS_DOT;
  Object.assign(dot.style, {
    position: 'absolute',
    width: '18px',
    height: '18px',
    backgroundColor: '#2d3748',
    borderRadius: '50%',
    zIndex: '10',
    transform: 'translate(-50%, -50%)',
    boxShadow: '0 0 8px rgba(0,0,0,0.3)',
    transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    left: `${50 + (coordinates.x * 50)}%`,
    top: `${50 - (coordinates.y * 50)}%`,
    cursor: 'grab',
    pointerEvents: 'auto'
  });

  const pulse = document.createElement('div');
  Object.assign(pulse.style, {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: '50%',
    background: 'inherit',
    opacity: '0.4'
  });
  dot.appendChild(pulse);

  container.appendChild(dot);
}

function getRecommendedActions() {
  const actions = [];
  
  const isRight = coordinates.x >= 0;
  const isLeft = coordinates.x <= 0;

  const isTop = coordinates.y >= 0;
  const isBottom = coordinates.y <= 0;

  if (isRight && isTop)    actions.push(DECISIONS.ACCEPT.action);
  if (isLeft && isTop)     actions.push(DECISIONS.NECESSARY.action);
  if (isLeft && isBottom)  actions.push(DECISIONS.REJECT.action);
  if (isRight && isBottom) actions.push(DECISIONS.PREFERENCES.action);

  return [...new Set(actions)];
}

function createOverlay(results) {
  const recommendedActions = getRecommendedActions();
  const allResults = Array.from(results);

  const matches = allResults.filter(res =>
    recommendedActions.includes(res.category)
  );

  if (matches.length == 0) {
    console.warn("We couldnt find the button with corralating to the recommended action", results, recommendedActions);
  }

  matches.forEach(item => {
    const buttonNode = item.element;

    if (!buttonNode || document.getElementById(`badge-${item.category}`)) return;

    buttonNode.style.position = 'relative';

    const badge = document.createElement('div');

    badge.id = `badge-${item.category}`;
    badge.className = 'overlay-badge';
    badge.innerText = '✔️'; 

    Object.assign(badge.style, {
        position: 'absolute',
        top: '0px',
        right: '0px',
        transform: 'translate(50%, -50%)',
        overflow: 'visible',
        width: '20px',
        height: '20px',
        backgroundColor: '#11FF00',
        color: 'white',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '12px',
        zIndex: '2147483647', 
        boxShadow: '0 0 5px rgba(0,0,0,0.3)',
        pointerEvents: 'auto', 
        cursor: 'pointer'
    });

    buttonNode.appendChild(badge);

    badge.onmouseenter = () => showCompass(badge);
    badge.onmouseleave = hideCompass;

    const compass = document.getElementById(IDS.COMPASS_CONTAINER);
      if (compass) {
          compass.onmouseenter = () => {
              if (hideTimeout) clearTimeout(hideTimeout);
          };
          compass.onmouseleave = hideCompass;
      }
    })
}

function showCompass(badge) {
    const compass = document.getElementById(IDS.COMPASS_CONTAINER);
    if (!compass) return;

    if (hideTimeout) clearTimeout(hideTimeout);

    const rect = badge.getBoundingClientRect();
    const compassSize = 400; 
    const gap = 10;

    let topPos = (rect.top + window.scrollY) - compassSize - gap;
    let leftPos = (rect.left + window.scrollX) - (compassSize / 2) + (rect.width / 2);

    if (topPos < window.scrollY) {
        topPos = rect.bottom + window.scrollY + gap;
    }

    const maxLeft = document.documentElement.scrollWidth - compassSize - gap;
    leftPos = Math.max(gap, Math.min(leftPos, maxLeft));

    compass.style.setProperty('display', 'grid', 'important');
    compass.style.setProperty('visibility', 'visible', 'important');
    compass.style.setProperty('opacity', '1', 'important');
    compass.style.setProperty('position', 'absolute', 'important'); 
    compass.style.setProperty('pointer-events', 'auto', 'important'); 
    
    compass.style.top = `${topPos}px`;
    compass.style.left = `${leftPos}px`;
}

function hideCompass() {
  const compass = document.getElementById(IDS.COMPASS_CONTAINER);
  if (!compass) return;
  hideTimeout = setTimeout(() => {
      compass.style.visibility = 'hidden';
      compass.style.opacity = '0';
  }, 150);
}

export async function initProfile(results) {
  category = await categoriseWebsite();
  // TODO: add await when fetching from db
  preferences = getAppliedPreferences();
  coordinates = getCoordinatesCompass();
  container = buildProfile();

  createOverlay(results);
}