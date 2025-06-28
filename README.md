# 学会論文トレンド分析Webアプリ

JSAI2025予稿集からトレンドを分析するWebアプリケーションです。パスワード認証機能付きで、論文のキーワード分析と可視化を行います。

## 🚀 機能

- **パスワード認証**: セキュアなログインシステム
- **PDF解析**: 予稿集PDFからテキストを自動抽出
- **トレンド分析**: キーワード頻度とAI技術の分布を分析
- **データ可視化**: チャート・グラフによる結果表示
- **レスポンシブデザイン**: モバイル対応

## 🔧 セットアップ

### 1. 依存関係のインストール

```bash
cd testApp
npm install
```

### 2. サーバー起動

```bash
npm start
```

または開発モード:

```bash
npm run dev
```

### 3. アクセス

ブラウザで `http://localhost:3000` にアクセス

## 🔐 認証情報

- **デフォルトパスワード**: `jsai2025trend`
- パスワードは `login.js` で変更可能

## 📁 ファイル構成

```
testApp/
├── login.html          # ログインページ
├── login.css           # ログインページスタイル
├── login.js            # 認証ロジック
├── index.html          # メインアプリページ
├── style.css           # メインスタイル
├── app.js              # 分析ロジック
├── server.js           # Node.jsサーバー
├── package.json        # 依存関係
├── jsai2025_30_all.pdf # 分析対象PDF
└── README.md           # このファイル
```

## 🌐 デプロイ

### Heroku

1. Heroku CLIをインストール
2. アプリを作成:
   ```bash
   heroku create your-app-name
   ```
3. デプロイ:
   ```bash
   git push heroku main
   ```

### Vercel

1. Vercel CLIをインストール
2. デプロイ:
   ```bash
   vercel --prod
   ```

### Railway

1. Railway アカウントでGitHubリポジトリを接続
2. 自動デプロイが開始されます

## ⚙️ 設定

### パスワード変更

`login.js` の `correctPassword` を変更:

```javascript
this.correctPassword = 'your-new-password';
```

### セキュリティ設定

`server.js` の CSP設定を本番環境に合わせて調整してください。

## 🔒 セキュリティ機能

- Helmet.jsによるセキュリティヘッダー
- CORS設定
- セッション管理（24時間有効期限）
- コンテンツセキュリティポリシー

## 📊 使用技術

- **フロントエンド**: HTML5, CSS3, JavaScript (ES6+)
- **バックエンド**: Node.js, Express
- **PDF処理**: PDF.js
- **可視化**: Chart.js
- **セキュリティ**: Helmet.js, CORS

## 🐛 トラブルシューティング

### PDFが読み込まれない
- ファイルパスを確認
- ブラウザのCORS設定をチェック

### 認証が機能しない
- localStorage/sessionStorageが有効か確認
- ブラウザの開発者ツールでエラーをチェック

### サーバーが起動しない
- Node.jsバージョンを確認（14.0.0以上）
- ポート3000が使用可能か確認

## 📝 ライセンス

MIT License

## 🤝 貢献

プルリクエストやイシューの報告を歓迎します。

---

💡 **ヒント**: パスワードを忘れた場合は、`login.js`で確認できます。