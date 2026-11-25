import {createCaseStore} from './state.js?v=0.2.4';
import {createView} from './view.js?v=0.2.4';
import {evaluate, SOURCES} from './rules.js?v=0.2.4';

const store = createCaseStore();
const $ = id => document.getElementById(id);
function setText(id,text){$(id).textContent=text;}
const view = createView({onAction, sources: SOURCES});
function paint() {
  const state = store.getSnapshot();
  view.paint(state, evaluate(state), store.getPreview());
}
function onAction(action) {
  try {
    store.dispatch(action);
    setText('generate-status', '入力が変更されました。資料と再照合してから下書きを作成してください。');
  } catch {
    setText('generate-status', '入力形式を確認してください。元の入力は変更していません。');
  }
  paint();
}
$('case-form').addEventListener('submit', event => event.preventDefault());
$('generate').addEventListener('click', () => {
  const preview = store.generatePreview();
  paint();
  setText('generate-status', preview
    ? '確認用の下書きを生成しました。提出不可・専門家レビュー未実施です。'
    : '下書きは生成できません。不足項目・対象範囲を確認してください。');
  if (preview) $('draft-section').scrollIntoView({behavior: 'smooth'});
});
$('export').addEventListener('click', () => {
  const blob = new Blob([store.exportJSON()], {type: 'application/json'});
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'souzoku-support-backup.json';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  setText('file-status', '個人情報を含むJSONを保存しました。共有端末での保管に注意してください。');
});
$('import').addEventListener('change', async event => {
  const file = event.target.files[0];
  if (!file) return;
  try {
    if (file.size > 1000000) throw new Error('File too large');
    store.importJSON(await file.text());
    paint();
    setText('generate-status', '');
    setText('file-status', '入力を復元しました。証明資料の確認チェックは安全のため解除しました。');
  } catch {
    setText('file-status', '読み込みできません。このアプリのJSON（1MB以下）を選択してください。元の入力は変更していません。');
  }
  event.target.value = '';
});
$('clear').addEventListener('click', () => {
  if (!confirm('この画面の入力をすべて消去します。保存していない入力は復元できません。')) return;
  store.reset();
  paint();
  setText('generate-status', '');
  setText('file-status', '画面の入力を消去しました。端末に保存したJSON・PDFは必要に応じて別途削除してください。');
});
$('print').addEventListener('click', () => {
  if (store.getPreview()) window.print();
});
paint();
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('./service-worker.js')
    .then(() => setText('offline-status', 'オフライン用の保存を準備します。次回以降は保存済み画面を利用できます。'))
    .catch(() => setText('offline-status', 'オフライン用の保存ができませんでした。オンラインでご利用ください。'));
} else {
  setText('offline-status', 'PWA・オフライン利用にはHTTPSまたはlocalhostが必要です。');
}
