import {FLAGS} from './model.js';
import {caseJurisdiction, NATIONAL_JURISDICTION_URL} from './jurisdiction.js';
import {checklist} from './documents.js?v=0.2.4';

const $ = id => document.getElementById(id);
const readPath = (state, path) => path.split('.').reduce((object, key) => object[key], state);
function text(id, value) { $(id).textContent = value; }
function list(id, values) {
  $(id).replaceChildren(...values.map(value => {
    const item = document.createElement('li');
    item.textContent = value;
    return item;
  }));
}
function fill(input, value) {
  if (input.type === 'checkbox') input.checked = value;
  else if (input.value !== String(value)) input.value = value;
}
function externalLink(title, url) {
  const link = document.createElement('a');
  link.href = url;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.textContent = title + ' ↗';
  return link;
}

export function createView({onAction, sources}) {
  let checklistMethod = null;
  document.querySelectorAll('[data-path]').forEach(input => {
    input.addEventListener('input', () => {
      const path = input.dataset.path;
      const value = input.type === 'checkbox' ? input.checked : input.value;
      onAction(path.startsWith('checks.')
        ? {type: 'check.update', field: path.slice(7), value}
        : {type: 'case.update', path, value});
    });
  });
  $('add-heir').addEventListener('click', () => onAction({type: 'heir.add'}));
  $('add-property').addEventListener('click', () => onAction({type: 'property.add'}));
  Object.entries(FLAGS).forEach(([field, title]) => {
    const label = document.createElement('label');
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.dataset.flag = field;
    input.addEventListener('input', () => onAction({type: 'flag.update', field, value: input.checked}));
    label.append(input, document.createTextNode(title));
    $('flags').append(label);
  });
  sources.forEach(source => {
    const item = document.createElement('li');
    const status = document.createElement('span');
    status.textContent = `${source.checkedAt ? '確認日 ' + source.checkedAt : '原文確認未了'}：${source.status}`;
    item.append(externalLink(source.title, source.url), status);
    $('sources').append(item);
  });

  function collection(items, hostId, templateId, type) {
    const host = $(hostId);
    const previousIds = [...host.children].map(element => element.dataset.itemId);
    if (JSON.stringify(previousIds) !== JSON.stringify(items.map(item => item.id))) {
      host.replaceChildren();
      items.forEach(item => {
        const fragment = $(templateId).content.cloneNode(true);
        const group = fragment.querySelector('fieldset');
        group.dataset.itemId = item.id;
        fragment.querySelectorAll('[data-field]').forEach(input => {
          const field = input.dataset.field;
          input.id = `${hostId}-${item.id}-${field}`;
          const hint = fragment.querySelector(`[data-hint="${field}"]`);
          if (hint) {
            hint.id = input.id + '-help';
            input.setAttribute('aria-describedby', hint.id);
          }
          input.addEventListener('input', () => onAction({
            type: type + '.update', id: item.id, field,
            value: input.type === 'checkbox' ? input.checked : input.value,
          }));
        });
        fragment.querySelector('[data-remove]').addEventListener('click', () =>
          onAction({type: type + '.remove', id: item.id}));
        host.append(fragment);
      });
    }
    [...host.children].forEach((group, index) => {
      const item = items[index];
      group.querySelector('legend').textContent = `${type === 'heir' ? '相続人' : '不動産'} ${index + 1}`;
      group.querySelectorAll('[data-field]').forEach(input => fill(input, item[input.dataset.field]));
      group.querySelector('[data-remove]').disabled = items.length <= 1;
    });
  }

  function paintChecklist(state) {
    if (checklistMethod !== state.method) {
      checklistMethod = state.method;
      $('checklist').replaceChildren(...checklist(state).map(documentInfo => {
        const box = document.createElement('div');
        const label = document.createElement('label');
        const input = document.createElement('input');
        box.className = 'doc';
        input.type = 'checkbox';
        input.dataset.document = documentInfo.id;
        input.addEventListener('change', () => onAction({
          type: 'document.update', field: documentInfo.id, value: input.checked,
        }));
        label.append(input, document.createTextNode(documentInfo.title + '（取得済み）'));
        const guide = document.createElement('p');
        guide.textContent = documentInfo.guide;
        box.append(label, guide);
        if (documentInfo.links.length) {
          const links = document.createElement('ul');
          links.className = 'help-links';
          documentInfo.links.forEach(link => {
            const item = document.createElement('li');
            item.append(externalLink(link.title, link.url));
            links.append(item);
          });
          box.append(links);
        }
        return box;
      }));
    }
    $('checklist').querySelectorAll('[data-document]').forEach(input =>
      fill(input, !!state.documents[input.dataset.document]));
  }

  function paint(state, result, preview) {
    collection(state.heirs, 'heirs', 'heir-template', 'heir');
    collection(state.properties, 'properties', 'property-template', 'property');
    const recipientSelect = $('recipient');
    recipientSelect.replaceChildren();
    const empty = document.createElement('option');
    empty.value = '';
    empty.textContent = '取得者を選択';
    recipientSelect.append(empty);
    state.heirs.forEach((person, index) => {
      const option = document.createElement('option');
      option.value = person.id;
      option.textContent = person.name || `相続人${index + 1}（氏名未入力）`;
      recipientSelect.append(option);
    });
    document.querySelectorAll('[data-path]').forEach(input => fill(input, readPath(state, input.dataset.path)));
    document.querySelectorAll('[data-flag]').forEach(input => fill(input, state.flags[input.dataset.flag]));
    $('add-heir').disabled = state.heirs.length >= 100;
    $('add-property').disabled = state.properties.length >= 100;
    const office = document.querySelector('[data-path="office"]');
    office.readOnly = !state.officeManual;
    const jurisdiction = caseJurisdiction(state.properties);
    text('jurisdiction-status', state.officeManual
      ? '手入力モードです。所在地変更時には申請先を消去します。公式の不動産登記管轄表と照合してください。 '
        + (jurisdiction.status === 'matched' ? '所在地からの候補：' + jurisdiction.office + '。' : jurisdiction.message)
      : jurisdiction.message);
    $('jurisdiction-links').replaceChildren();
    const jurisdictionSources = jurisdiction.sources.length ? jurisdiction.sources
      : [{bureau: '全国の法務局', url: NATIONAL_JURISDICTION_URL}];
    jurisdictionSources.forEach(source => $('jurisdiction-links').append(
      externalLink(source.bureau + 'の公式管轄表', source.url), document.createElement('br')));
    text('deadline', result.deadline);
    text('tax', result.tax.amount === null ? result.tax.reason
      : `単純参考額：約${result.tax.amount.toLocaleString('ja-JP', {maximumFractionDigits: 2})}円。${result.tax.reason}`);
    text('result-status', result.canDraft
      ? '入力・確認項目がそろいました。下書き作成後も専門家確認が必要です。'
      : `確認が必要な項目：${result.errors.length}件`);
    list('errors', result.errors);
    list('warnings', result.warnings);
    list('shares', result.shares.length
      ? result.shares.map(person => `${person.name || '氏名未入力'}：${person.fraction}（参考）`)
      : ['対象範囲・戸籍との照合が済むまで参考持分を表示しません。']);
    $('agreement-fields').hidden = state.method !== 'agreement';
    $('agreement-check').hidden = state.method !== 'agreement';
    paintChecklist(state);
    $('draft-section').hidden = !preview;
    text('application', preview?.application || '');
    text('agreement', preview?.agreement || '');
    $('agreement-output').hidden = !preview?.agreement;
  }
  return {paint};
}
