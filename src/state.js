import {blank, heir, property, parseState, serialize, invalidate, FLAGS} from './model.js';
import {caseJurisdiction, updateCaseOffice} from './jurisdiction.js';
import {drafts} from './documents.js?v=0.2.4';

const CASE_FIELDS = new Set([
  'deceased.name', 'deceased.address', 'deceased.death', 'knownDate',
  'applicationDate', 'office', 'officeManual', 'phone', 'method',
  'recipientId', 'agreementDate', 'expectedSpouses', 'expectedChildren',
  'properties.0.location',
]);
const CHECKS = new Set(['family', 'registry', 'scope', 'agreement', 'search']);
const HEIR_FIELDS = new Set(['relation', 'name', 'address', 'kana', 'birth', 'nationality', 'nationalityEvidence', 'email', 'noEmail']);
const PROPERTY_FIELDS = new Set(['kind', 'location', 'description', 'value', 'fullOwnership']);
const DOCUMENTS = new Set(['family', 'address', 'heirs', 'registry', 'valuation', 'nationality', 'agreement', 'seals']);
const invalidAction = () => { throw new Error('入力操作が不正です。'); };
function findById(items, id) {
  const item = items.find(candidate => candidate.id === id);
  if (!item) invalidAction();
  return item;
}

// The store has no DOM, network, timers, or browser storage. Callers receive copies.
export function createCaseStore(initial = blank()) {
  let state = parseState(JSON.stringify(initial));
  let revision = 0;
  let preview = null;

  function commit(next, revokeConfirmations = true) {
    // Validate before replacing the current case: failed edits/imports are atomic.
    const valid = parseState(JSON.stringify(next));
    state = revokeConfirmations ? invalidate(valid) : valid;
    revision += 1;
    preview = null;
    return structuredClone(state);
  }

  function dispatch(action) {
    if (!action || typeof action !== 'object') invalidAction();
    const next = structuredClone(state);
    let revokeConfirmations = true;
    switch (action.type) {
      case 'case.update': {
        if (!CASE_FIELDS.has(action.path)) invalidAction();
        const keys = action.path.split('.');
        const field = keys.pop();
        keys.reduce((object, key) => object[key], next)[field] = action.value;
        if (action.path === 'properties.0.location' || action.path === 'officeManual') updateCaseOffice(next);
        break;
      }
      case 'check.update':
        if (!CHECKS.has(action.field)) invalidAction();
        next.checks[action.field] = action.value;
        revokeConfirmations = false;
        break;
      case 'flag.update':
        if (!Object.hasOwn(FLAGS, action.field)) invalidAction();
        next.flags[action.field] = action.value;
        break;
      case 'document.update':
        if (!DOCUMENTS.has(action.field)) invalidAction();
        next.documents[action.field] = action.value;
        revokeConfirmations = false;
        break;
      case 'heir.update':
        if (!HEIR_FIELDS.has(action.field)) invalidAction();
        findById(next.heirs, action.id)[action.field] = action.value;
        break;
      case 'heir.add':
        if (next.heirs.length >= 100) invalidAction();
        next.heirs.push(heir());
        break;
      case 'heir.remove':
        if (next.heirs.length <= 1) invalidAction();
        findById(next.heirs, action.id);
        next.heirs = next.heirs.filter(person => person.id !== action.id);
        if (next.recipientId === action.id) next.recipientId = '';
        break;
      case 'property.update':
        if (!PROPERTY_FIELDS.has(action.field)) invalidAction();
        findById(next.properties, action.id)[action.field] = action.value;
        if (action.field === 'location') updateCaseOffice(next);
        break;
      case 'property.add':
        if (next.properties.length >= 100) invalidAction();
        next.properties.push(property());
        updateCaseOffice(next);
        break;
      case 'property.remove':
        if (next.properties.length <= 1) invalidAction();
        findById(next.properties, action.id);
        next.properties = next.properties.filter(item => item.id !== action.id);
        updateCaseOffice(next);
        break;
      default:
        invalidAction();
    }
    return commit(next, revokeConfirmations);
  }

  return {
    dispatch,
    getSnapshot: () => structuredClone(state),
    getRevision: () => revision,
    getPreview: () => preview?.revision === revision ? structuredClone(preview.documents) : null,
    generatePreview() {
      const documents = drafts(state);
      preview = documents ? {revision, documents} : null;
      return documents ? structuredClone(documents) : null;
    },
    exportJSON: () => serialize(state),
    importJSON(raw) {
      const restored = parseState(raw);
      if (!restored.officeManual) restored.office = caseJurisdiction(restored.properties).office;
      return commit(restored);
    },
    reset: () => commit(blank()),
  };
}
