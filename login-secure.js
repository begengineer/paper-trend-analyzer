class SecureLoginManager {
    constructor() {
        this.apiBase = '/api/auth';
        this.maxRetries = 3;
        this.retryDelay = 1000;
        this.init();
    }

    init() {
        // 認証状態をチェック
        this.checkAuthStatus();
        this.setupEventListeners();
    }

    async checkAuthStatus() {
        try {
            const response = await fetch(`${this.apiBase}/status`, {
                credentials: 'include'
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.authenticated) {
                    this.redirectToApp();
                    return;
                }
            }
        } catch (error) {
            console.error('Auth status check failed:', error);
        }
    }

    setupEventListeners() {
        const loginForm = document.getElementById('loginForm');
        const passwordInput = document.getElementById('password');

        if (!loginForm || !passwordInput) {
            console.error('Login form elements not found');
            return;
        }

        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        passwordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.handleLogin();
            }
        });

        // パスワード入力時にエラーメッセージを隠す
        passwordInput.addEventListener('input', () => {
            this.hideError();
        });

        // フォーカス時にエラーをクリア
        passwordInput.addEventListener('focus', () => {
            this.hideError();
        });
    }

    async handleLogin() {
        const passwordInput = document.getElementById('password');
        const loginForm = document.getElementById('loginForm');
        const password = passwordInput.value.trim();

        if (!password) {
            this.showError('パスワードを入力してください');
            passwordInput.focus();
            return;
        }

        // ローディング状態にする
        this.setLoading(true);

        try {
            const response = await this.makeLoginRequest(password);
            
            if (response.ok) {
                const data = await response.json();
                this.showSuccess(data.message || 'ログインに成功しました');
                await this.delay(1000);
                this.redirectToApp();
            } else {
                const errorData = await response.json().catch(() => ({}));
                
                if (response.status === 429) {
                    this.showError(errorData.message || 'ログイン試行回数が上限に達しました。しばらく待ってから再試行してください。');
                } else if (response.status === 401) {
                    this.showError(errorData.message || 'パスワードが正しくありません');
                } else {
                    this.showError(errorData.message || 'ログインに失敗しました');
                }
                
                passwordInput.value = '';
                passwordInput.focus();
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showError('ネットワークエラーが発生しました。しばらく待ってから再試行してください。');
            passwordInput.focus();
        } finally {
            this.setLoading(false);
        }
    }

    async makeLoginRequest(password, retryCount = 0) {
        try {
            const response = await fetch(`${this.apiBase}/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({ password })
            });

            return response;
        } catch (error) {
            if (retryCount < this.maxRetries) {
                await this.delay(this.retryDelay * (retryCount + 1));
                return this.makeLoginRequest(password, retryCount + 1);
            }
            throw error;
        }
    }

    setLoading(isLoading) {
        const loginForm = document.getElementById('loginForm');
        const loginBtn = loginForm.querySelector('button[type="submit"]');
        const passwordInput = document.getElementById('password');

        if (isLoading) {
            loginForm.classList.add('loading');
            loginBtn.disabled = true;
            passwordInput.disabled = true;
            loginBtn.textContent = 'ログイン中...';
        } else {
            loginForm.classList.remove('loading');
            loginBtn.disabled = false;
            passwordInput.disabled = false;
            loginBtn.textContent = 'ログイン';
        }
    }

    redirectToApp() {
        // セキュリティのため、リダイレクト先を検証
        const allowedPaths = ['/app', '/index.html'];
        const redirectTo = new URLSearchParams(window.location.search).get('redirect') || '/app';
        
        if (allowedPaths.includes(redirectTo)) {
            window.location.href = redirectTo;
        } else {
            window.location.href = '/app';
        }
    }

    showError(message) {
        const errorElement = document.getElementById('errorMessage');
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
            errorElement.className = 'error-message';
            
            // アクセシビリティ
            errorElement.setAttribute('role', 'alert');
            errorElement.setAttribute('aria-live', 'polite');
        }
    }

    hideError() {
        const errorElement = document.getElementById('errorMessage');
        if (errorElement) {
            errorElement.style.display = 'none';
            errorElement.removeAttribute('role');
            errorElement.removeAttribute('aria-live');
        }
    }

    showSuccess(message) {
        const errorElement = document.getElementById('errorMessage');
        if (errorElement) {
            errorElement.style.background = '#d1edff';
            errorElement.style.color = '#0c63e4';
            errorElement.style.borderColor = '#b6d7ff';
            errorElement.textContent = message;
            errorElement.style.display = 'block';
            errorElement.className = 'success-message';
        }
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // CSRFトークンの取得（将来の拡張用）
    async getCSRFToken() {
        try {
            const response = await fetch('/api/csrf-token', {
                credentials: 'include'
            });
            
            if (response.ok) {
                const data = await response.json();
                return data.token;
            }
        } catch (error) {
            console.error('CSRF token fetch failed:', error);
        }
        return null;
    }
}

// セキュリティ強化のための追加機能
class SecurityEnhancements {
    static preventBruteForce() {
        let failedAttempts = 0;
        const maxAttempts = 5;
        const lockoutTime = 15 * 60 * 1000; // 15分

        return {
            recordFailure: () => {
                failedAttempts++;
                if (failedAttempts >= maxAttempts) {
                    const lockoutUntil = Date.now() + lockoutTime;
                    localStorage.setItem('loginLockout', lockoutUntil.toString());
                }
            },
            
            isLockedOut: () => {
                const lockoutUntil = localStorage.getItem('loginLockout');
                if (lockoutUntil && Date.now() < parseInt(lockoutUntil)) {
                    return true;
                }
                localStorage.removeItem('loginLockout');
                return false;
            },
            
            reset: () => {
                failedAttempts = 0;
                localStorage.removeItem('loginLockout');
            }
        };
    }

    static detectSuspiciousActivity() {
        const events = [];
        
        return {
            logEvent: (type, details) => {
                events.push({
                    type,
                    details,
                    timestamp: Date.now(),
                    userAgent: navigator.userAgent
                });
                
                // 100件を超えたら古いイベントを削除
                if (events.length > 100) {
                    events.shift();
                }
            },
            
            getEvents: () => events
        };
    }
}

// ページロード時に初期化
document.addEventListener('DOMContentLoaded', () => {
    // セキュリティチェック
    if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
        console.warn('⚠️ This application should be served over HTTPS in production');
    }
    
    new SecureLoginManager();
});