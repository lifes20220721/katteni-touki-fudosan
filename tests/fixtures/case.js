import {blank, heir} from '../../src/model.js';

// Entirely fictitious. No resident, account, or certificate data is used.
export function simpleCase() {
  const state = blank();
  state.deceased = {name: '架空 被相続人', address: '架空県例示市1', death: '2020-01-01'};
  state.knownDate = '2020-02-01';
  state.applicationDate = '2026-11-18';
  state.office = '東京法務局';
  state.officeManual = true;
  state.phone = '000-0000-0000';
  state.heirs = ['spouse', 'child-a', 'child-b'].map((id, index) => ({
    ...heir(id), relation: index === 0 ? 'spouse' : 'child',
    name: `架空 相続人${index}`, address: '架空県例示市2', kana: `カクウ${index}`,
    birth: '1980-01-01', nationality: '日本',
    nationalityEvidence: '本籍地記載の住民票の写し', noEmail: true,
  }));
  state.properties = [{id: 'property-a', kind: 'building', location: '東京都千代田区',
    description: '架空県例示市・家屋番号1・居宅・木造・50平方メートル',
    value: '5000000', fullOwnership: true}];
  state.expectedSpouses = '1';
  state.expectedChildren = '2';
  for (const field of Object.keys(state.checks)) state.checks[field] = true;
  return state;
}
