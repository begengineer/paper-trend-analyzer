const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');

class AuthManager {
    constructor() {
        // 環境変数から設定を読み込み
        this.jwtSecret = process.env.JWT_SECRET || 'default-secret-change-in-production';
        this.passwordHash = process.env.ADMIN_PASSWORD_HASH || this.generateDefaultHash();
        this.sessionTimeout = process.env.SESSION_TIMEOUT || '24h';
        
        // 本番環境での警告
        if (process.env.NODE_ENV === 'production' && this.jwtSecret === 'default-secret-change-in-production') {
            console.warn('⚠️  WARNING: Using default JWT secret in production!');
        }
    }

    // デフォルトパスワード "jsai2025trend" のハッシュを生成
    generateDefaultHash() {
        const defaultPassword = 'jsai2025trend';
        return bcrypt.hashSync(defaultPassword, 12);
    }

    // レート制限ミドルウェア
    createLoginRateLimit() {
        return rateLimit({
            windowMs: parseInt(process.env.LOGIN_WINDOW_MS) || 15 * 60 * 1000, // 15分
            max: parseInt(process.env.LOGIN_RATE_LIMIT) || 5, // 5回まで
            message: {
                error: 'Too many login attempts',
                message: 'ログイン試行回数が上限に達しました。15分後に再試行してください。',
                retryAfter: '15 minutes'
            },
            standardHeaders: true,
            legacyHeaders: false,
            // IPアドレスベースの制限
            keyGenerator: (req) => {
                return req.ip || req.connection.remoteAddress;
            }
        });
    }

    // バリデーションルール
    getLoginValidation() {
        return [
            body('password')
                .isLength({ min: 1 })
                .withMessage('パスワードは必須です')
                .isLength({ max: 100 })
                .withMessage('パスワードが長すぎます')
        ];
    }

    // パスワード検証
    async verifyPassword(inputPassword) {
        try {
            return await bcrypt.compare(inputPassword, this.passwordHash);
        } catch (error) {
            console.error('Password verification error:', error);
            return false;
        }
    }

    // JWTトークン生成
    generateToken(payload = {}) {
        return jwt.sign(
            {
                authenticated: true,
                timestamp: Date.now(),
                ...payload
            },
            this.jwtSecret,
            {
                expiresIn: this.sessionTimeout,
                issuer: 'paper-trend-analyzer',
                audience: 'authenticated-users'
            }
        );
    }

    // JWTトークン検証
    verifyToken(token) {
        try {
            return jwt.verify(token, this.jwtSecret);
        } catch (error) {
            console.error('Token verification error:', error.message);
            return null;
        }
    }

    // 認証ミドルウェア
    requireAuth() {
        return (req, res, next) => {
            const token = req.cookies.authToken || 
                         req.headers.authorization?.replace('Bearer ', '');

            if (!token) {
                return res.status(401).json({
                    error: 'Authentication required',
                    message: '認証が必要です'
                });
            }

            const decoded = this.verifyToken(token);
            if (!decoded) {
                return res.status(401).json({
                    error: 'Invalid or expired token',
                    message: 'トークンが無効または期限切れです'
                });
            }

            req.user = decoded;
            next();
        };
    }

    // ログイン処理
    async handleLogin(req, res) {
        try {
            // バリデーションエラーチェック
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    error: 'Validation error',
                    message: '入力値に問題があります',
                    details: errors.array()
                });
            }

            const { password } = req.body;

            // パスワード検証
            const isValid = await this.verifyPassword(password);
            if (!isValid) {
                // セキュリティのため、詳細なエラー情報は返さない
                return res.status(401).json({
                    error: 'Authentication failed',
                    message: 'パスワードが正しくありません'
                });
            }

            // JWTトークン生成
            const token = this.generateToken({
                loginTime: new Date().toISOString(),
                userAgent: req.get('User-Agent'),
                ip: req.ip
            });

            // HTTPOnlyクッキーでトークンを送信
            res.cookie('authToken', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 24 * 60 * 60 * 1000 // 24時間
            });

            res.json({
                success: true,
                message: 'ログインに成功しました',
                expiresIn: this.sessionTimeout
            });

        } catch (error) {
            console.error('Login error:', error);
            res.status(500).json({
                error: 'Internal server error',
                message: 'サーバーエラーが発生しました'
            });
        }
    }

    // ログアウト処理
    handleLogout(req, res) {
        res.clearCookie('authToken');
        res.json({
            success: true,
            message: 'ログアウトしました'
        });
    }

    // 認証状態確認
    checkAuthStatus(req, res) {
        const token = req.cookies.authToken;
        
        if (!token) {
            return res.json({ authenticated: false });
        }

        const decoded = this.verifyToken(token);
        if (!decoded) {
            res.clearCookie('authToken');
            return res.json({ authenticated: false });
        }

        res.json({
            authenticated: true,
            expiresAt: new Date(decoded.exp * 1000).toISOString()
        });
    }
}

module.exports = AuthManager;