export const DOM_TYPES = {
    DIV: 'DIV',
    BUTTON: 'BUTTON',
    LINK: 'A'
};

export const SCAN_CONFIG = {
    MAX_ATTEMPTS: 10,
    RETRY_DELAY: 1000,
    INITIAL_DELAY: 1500,
    Z_INDEX_THRESHOLD: 0
};

export const CATEGORIES = {
    ACCEPT: 'ACCEPT',
    REJECT: 'REJECT',
    NECESSARY: 'NECESSARY',
    PREFERENCES: 'PREFERENCES'
};

export const PATTERNS = {
    necessary: /(?=(.*(accept|agree|allow)))?.*(necessary|nødvendige|nødvendig|essential|kun\s+nødvendige)/i,
    preferences: /(preference(s|r)?|præferencer|indstillinger|valgmuligheder|administrer|purpose|formål|manage)/i,
    accept: /(accept(er|ér)?(\s+alle|all)?)/i,
    reject: /(reject|afvis|deny|decline|nej\s+tak)(\s+alle)?/i,
};

export const IDS = {
    OVERLAY: 'ci-click-overlay',
    TOGGLE: 'ci-toggle-btn',
    EDIT_CONTAINER: 'ci-edit-container',
    EDIT_FORM: 'ci-edit-form',
    EDIT_INPUT: 'ci-edit-input',
    CONNECTOR_SVG: 'ci-connector-svg'
};

export const CLASSES = {
    HOVER: 'ci-hover-highlight',
    POSTIT: 'ci-postit',
    SHAKE: 'ci-shake'
};

export const STYLES = {
    Z_INDEX: '2147483647',
    PRIMARY_BLUE: 'rgba(52,152,219,0.95)',
    BG_BLUE: 'rgba(52,152,219,0.06)'
};