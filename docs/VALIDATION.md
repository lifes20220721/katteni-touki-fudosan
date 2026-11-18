# 検証結果

2026-11-18、Node.js v24.22.1。

- `npm test`：23件すべて成功。
- `npm run check` と `node --check src/model.js`・`src/rules.js`・`src/documents.js`：成功。
- テストデータ：架空のみ。個人の認証JSONは使用・同梱していない。
- HTML文字列の扱い：JSON/下書きの文字列保持、DOMの安全な出力API、外部スクリプトや永続保存APIの不使用を静的・ユニットテストで確認。
- 公開後のChrome動作確認：架空の被相続人と子2名を入力し、各1/2の参考持分・下書き生成を確認。氏名にHTMLのimg/onerror文字列を入力しても画像要素が生成されず、alertダイアログも発生しないことを確認。入力変更時の確認解除・下書き消去、再読込による入力消去も確認。
- 未確認：スマホ表示、Androidインストール、オフライン更新、JSONダウンロードと読み込みの実ブラウザ往復、PDFの改ページ。デスクトップChrome確認をAndroid実機確認済みとみなさない。
- GitHub：専用リポジトリ `lifes20220721/katteni-touki-fudosan` に保存済み。GitHub ActionsのCheckは成功。
- 公開URL：https://lifes20220721.github.io/katteni-touki-fudosan/ 。2026-11-18に実ページ表示と上記の基本動作を確認。
- 法務：公式本文の確認状況は `REVIEW.md`。全項目の様式照合と専門家監修は未実施。生成物に提出不可を明示。
