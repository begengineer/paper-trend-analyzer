# 🚀 Vercelデプロイ手順

## 自動デプロイ（推奨）

1. **GitHubリポジトリを作成**
   ```bash
   # GitHubで新しいリポジトリを作成後
   git remote add origin https://github.com/yourusername/paper-trend-analyzer.git
   git branch -M main
   git push -u origin main
   ```

2. **Vercel Dashboard**
   - https://vercel.com にアクセス
   - GitHubアカウントでログイン
   - "New Project" → GitHubリポジトリを選択
   - "Deploy" をクリック

3. **環境変数設定** (Vercel Dashboard)
   ```
   JWT_SECRET = paper-trend-analyzer-super-secret-jwt-key-2025-production
   NODE_ENV = production
   ```

## 手動デプロイ

ターミナルで以下を実行：

```bash
# Vercel CLI にログイン
vercel login

# デプロイ
vercel --prod
```

## デプロイ後の確認事項

1. **アクセステスト**
   - ログインページが表示される
   - パスワード: `jsai2025trend`
   - 分析機能が正常動作する

2. **セキュリティ確認**
   - HTTPS接続
   - 認証なしでのリソースアクセス拒否
   - レート制限動作

## トラブルシューティング

### よくある問題

1. **404エラー**
   - vercel.json の設定を確認
   - ルート設定の問題

2. **認証エラー**
   - JWT_SECRET環境変数を確認
   - クッキー設定の問題

3. **PDF読み込みエラー**
   - ファイルサイズ制限を確認
   - 認証が必要なリソースへのアクセス

### サポート情報

- **デフォルトパスワード**: `jsai2025trend`
- **セッション期限**: 24時間
- **ログイン試行制限**: 15分間で5回

---

🔐 **セキュリティ**: 本番環境では必ずパスワードを変更してください。