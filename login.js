class LoginManager {
    constructor() {
        this.correctPassword = 'jsai2025trend'; // 変更可能なパスワード
        this.sessionKey = 'paperAnalysisAuth';
        this.init();
    }

    init() {
        // 既にログイン済みかチェック
        if (this.isAuthenticated()) {
            this.redirectToApp();
            return;
        }

        this.setupEventListeners();
    }

    setupEventListeners() {
        const loginForm = document.getElementById('loginForm');
        const passwordInput = document.getElementById('password');

        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        // Enterキーでもログイン
        passwordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handleLogin();
            }
        });

        // パスワード入力時にエラーメッセージを隠す
        passwordInput.addEventListener('input', () => {
            this.hideError();
        });
    }

    async handleLogin() {
        const passwordInput = document.getElementById('password');
        const loginForm = document.getElementById('loginForm');
        const password = passwordInput.value.trim();

        if (!password) {
            this.showError('パスワードを入力してください');
            return;
        }

        // ローディング状態にする
        loginForm.classList.add('loading');

        // 少し遅延を加えて本格的な認証のような体験を提供
        await this.delay(800);

        if (password === this.correctPassword) {
            this.setAuthenticated();
            this.showSuccess();
            await this.delay(500);
            this.redirectToApp();
        } else {
            this.showError('パスワードが正しくありません');
            passwordInput.value = '';
            passwordInput.focus();
        }

        loginForm.classList.remove('loading');
    }

    setAuthenticated() {
        const timestamp = new Date().getTime();
        const authData = {
            authenticated: true,
            timestamp: timestamp,
            expires: timestamp + (24 * 60 * 60 * 1000) // 24時間後に期限切れ
        };
        
        localStorage.setItem(this.sessionKey, JSON.stringify(authData));
        sessionStorage.setItem(this.sessionKey, 'true');
    }

    isAuthenticated() {
        // セッションストレージをチェック（ブラウザを閉じるまで有効）
        const sessionAuth = sessionStorage.getItem(this.sessionKey);
        if (sessionAuth === 'true') {
            return true;
        }

        // ローカルストレージをチェック（期限付き）
        const authData = localStorage.getItem(this.sessionKey);
        if (authData) {
            try {
                const data = JSON.parse(authData);
                const now = new Date().getTime();
                
                if (data.authenticated && data.expires > now) {
                    // 有効期限内の場合、セッションストレージも更新
                    sessionStorage.setItem(this.sessionKey, 'true');
                    return true;
                } else {
                    // 期限切れの場合は削除
                    localStorage.removeItem(this.sessionKey);
                }
            } catch (error) {
                localStorage.removeItem(this.sessionKey);
            }
        }

        return false;
    }

    redirectToApp() {
        window.location.href = 'index.html';
    }

    showError(message) {
        const errorElement = document.getElementById('errorMessage');
        errorElement.textContent = message;
        errorElement.style.display = 'block';
    }

    hideError() {
        const errorElement = document.getElementById('errorMessage');
        errorElement.style.display = 'none';
    }

    showSuccess() {
        const errorElement = document.getElementById('errorMessage');
        errorElement.style.background = '#d1edff';
        errorElement.style.color = '#0c63e4';
        errorElement.style.borderColor = '#b6d7ff';
        errorElement.textContent = 'ログイン成功！リダイレクト中...';
        errorElement.style.display = 'block';
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // パスワードを変更するメソッド（開発用）
    changePassword(newPassword) {
        this.correctPassword = newPassword;
        console.log('パスワードが変更されました:', newPassword);
    }
}

// ページロード時に初期化
document.addEventListener('DOMContentLoaded', () => {
    new LoginManager();
});