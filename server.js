const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const AuthManager = require('./auth');

// 環境変数の読み込み
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const authManager = new AuthManager();

// セキュリティミドルウェア
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"],
            imgSrc: ["'self'", "data:", "https:"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            connectSrc: ["'self'"],
            frameSrc: ["'none'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            workerSrc: ["'self'", "blob:", "https://cdnjs.cloudflare.com"]
        }
    }
}));

// 圧縮
app.use(compression());

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Cookie parser
app.use(cookieParser());

// CORS設定
app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
        ? ['https://your-domain.com'] // 本番環境のドメインに変更
        : ['http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true
}));

// レート制限（ログインページのみ）
const loginRateLimit = authManager.createLoginRateLimit();
app.use('/api/auth/login', loginRateLimit);

// 静的ファイルの提供
app.use(express.static(path.join(__dirname), {
    maxAge: process.env.NODE_ENV === 'production' ? '1d' : 0,
    etag: true,
    lastModified: true
}));

// ルートパスでログインページにリダイレクト
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
});

// ログインページ
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
});

// 認証APIエンドポイント
app.post('/api/auth/login', authManager.getLoginValidation(), (req, res) => {
    authManager.handleLogin(req, res);
});

app.post('/api/auth/logout', (req, res) => {
    authManager.handleLogout(req, res);
});

app.get('/api/auth/status', (req, res) => {
    authManager.checkAuthStatus(req, res);
});

// 保護されたルート - メインアプリページ
app.get('/app', authManager.requireAuth(), (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/index.html', authManager.requireAuth(), (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 保護されたリソース - PDFファイル
app.get('/jsai2025_30_all.pdf', authManager.requireAuth(), (req, res) => {
    const filePath = path.join(__dirname, 'jsai2025_30_all.pdf');
    res.sendFile(filePath, (err) => {
        if (err) {
            console.error('PDF file not found:', err);
            res.status(404).send('PDF file not found');
        }
    });
});

// ログイン関連ファイルは認証不要
app.get('/login.css', (req, res) => {
  res.sendFile(path.join(__dirname, 'login.css'));
});

app.get('/login-secure.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'login-secure.js'));
});

// 保護されたリソース
app.get('/style.css', authManager.requireAuth(), (req, res) => {
  res.sendFile(path.join(__dirname, 'style.css'));
});

app.get('/app.js', authManager.requireAuth(), (req, res) => {
  res.sendFile(path.join(__dirname, 'app.js'));
});

// ヘルスチェックエンドポイント
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// APIエンドポイント（将来の拡張用）
app.get('/api/status', (req, res) => {
    res.json({
        service: 'Paper Trend Analyzer',
        version: '1.0.0',
        status: 'running'
    });
});

// 404ハンドラー
app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, 'login.html'));
});

// エラーハンドラー
app.use((err, req, res, next) => {
    console.error('Server error:', err.stack);
    res.status(500).json({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'production' 
            ? 'Something went wrong!' 
            : err.message
    });
});

// サーバー起動
app.listen(PORT, () => {
    console.log(`
🚀 Paper Trend Analyzer Server is running!
📊 Port: ${PORT}
🌐 URL: http://localhost:${PORT}
🔐 Default Password: jsai2025trend
🏃 Environment: ${process.env.NODE_ENV || 'development'}
    `);
});

// グレースフルシャットダウン
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    process.exit(0);
});

module.exports = app;
