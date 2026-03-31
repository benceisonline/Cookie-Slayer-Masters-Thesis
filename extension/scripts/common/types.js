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

export const DECISIONS = {
    ACCEPT: {action: 'ACCEPT', value: 3},
    REJECT: {action: 'REJECT', value: 2},
    NECESSARY: {action: 'NECESSARY', value: 1},
    PREFERENCES: {action: 'PREFERENCES', value: 0}
};

export const COORDINATES = {
    ACCEPT: { x: 1, y: 1 },
    REJECT: { x: -1, y: -1 },
    NECESSARY: { x: -1, y: 1 },
    PREFERENCES: { x: 1, y: -1 }
};

export const WEBSITE_CATEGORIES = {
    SOCIAL: 'SOCIAL',
    SHOPPING: 'SHOPPING',
    FINANCE: 'FINANCE',
    GOVERMENT: 'GOVERMENT',
};

export const DEFAULT = {
    DEFAULT: 'DEFAULT'
}

export const PATTERNS = {
    necessary: /(?=(.*(accept|agree|allow|tillad)))?.*(necessary|nødvendige|nødvendig|essential|kun\s+nødvendige)/i,
    preferences: /(preference(s|r)?|præferencer|indstillinger|valgmuligheder|administrer|purpose|formål|manage|vis\s+detaljer)/i,
    accept: /(accept(er|ér|ance)|tillad|allow|godkend|all|alle)(\s+alle|all)?/i,
    reject: /(reject|afvis|deny|decline|nej\s+tak)(\s+alle)?/i,
};

export const IDS = {
    OVERLAY: 'inspector-overlay',
    TOGGLE: 'inspector-toggle',
    EDIT_CONTAINER: 'prompt-input',
    EDIT_FORM: 'prompt-form',
    EDIT_INPUT: 'prompt-input-field',
    EDIT_SUBMIT: 'prompt-submit',
    CONNECTOR_SVG: 'inspector-connector-svg',
    COMPASS_CONTAINER: 'compass-container',
    COMPASS_DOT: 'compass-dot'
};

export const CLASSES = {
    HOVER: 'inspector-hover',
    POSTIT: 'post-it',
    SHAKE: 'inspector-shake',
    SPINNER: 'prompt-spinner',
    EDIT_LABEL: 'prompt-edit-label',
    LOADING: 'prompt-loading'
};

export const STYLES = {
    Z_INDEX: '2147483647',
    PRIMARY_BLUE: 'rgba(52,152,219,0.95)',
    BG_BLUE: 'rgba(52,152,219,0.06)'
};