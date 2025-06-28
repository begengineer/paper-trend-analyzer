class PaperTrendAnalyzer {
    constructor() {
        this.papers = [];
        this.keywords = new Map();
        this.aiKeywords = new Map();
        this.fields = new Map();
        this.sessionKey = 'paperAnalysisAuth';
        this.init();
    }

    async init() {
        // サーバーサイド認証チェック
        const isAuthenticated = await this.checkServerAuthentication();
        if (!isAuthenticated) {
            this.redirectToLogin();
            return;
        }

        this.setupEventListeners();
        this.loadSampleData();
        this.setupLogout();
    }

    async checkServerAuthentication() {
        try {
            const response = await fetch('/api/auth/status', {
                credentials: 'include'
            });
            
            if (response.ok) {
                const data = await response.json();
                return data.authenticated;
            }
        } catch (error) {
            console.error('Auth check failed:', error);
        }
        
        return false;
    }

    redirectToLogin() {
        window.location.href = 'login.html';
    }

    setupLogout() {
        // ログアウトボタンを追加
        const container = document.querySelector('.container');
        const logoutBtn = document.createElement('button');
        logoutBtn.textContent = 'ログアウト';
        logoutBtn.className = 'logout-btn';
        logoutBtn.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(255, 255, 255, 0.9);
            border: 1px solid #ddd;
            padding: 10px 20px;
            border-radius: 25px;
            cursor: pointer;
            font-size: 14px;
            color: #666;
            transition: all 0.3s ease;
            z-index: 1000;
        `;
        
        logoutBtn.addEventListener('click', () => {
            this.logout();
        });

        logoutBtn.addEventListener('mouseenter', () => {
            logoutBtn.style.background = '#f5f5f5';
            logoutBtn.style.color = '#333';
        });

        logoutBtn.addEventListener('mouseleave', () => {
            logoutBtn.style.background = 'rgba(255, 255, 255, 0.9)';
            logoutBtn.style.color = '#666';
        });

        document.body.appendChild(logoutBtn);
    }

    async logout() {
        try {
            await fetch('/api/auth/logout', {
                method: 'POST',
                credentials: 'include'
            });
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            // クライアントサイドも清掃
            localStorage.removeItem(this.sessionKey);
            sessionStorage.removeItem(this.sessionKey);
            this.redirectToLogin();
        }
    }

    setupEventListeners() {
        const fileInput = document.getElementById('pdfFile');
        const analyzeBtn = document.getElementById('analyzeBtn');
        const fileList = document.getElementById('fileList');

        fileInput.addEventListener('change', (e) => {
            this.handleFileSelection(e.target.files);
        });

        analyzeBtn.addEventListener('click', () => {
            this.startAnalysis();
        });
    }

    async loadSampleData() {
        try {
            const response = await fetch('./jsai2025_30_all.pdf');
            if (response.ok) {
                const arrayBuffer = await response.arrayBuffer();
                const file = new File([arrayBuffer], 'jsai2025_30_all.pdf (サンプル)', { type: 'application/pdf' });
                this.handleFileSelection([file]);
                
                // サンプルであることを表示
                this.showSampleNotice();
            }
        } catch (error) {
            console.log('サンプルデータの読み込みに失敗しました:', error);
        }
    }

    showSampleNotice() {
        const fileList = document.getElementById('fileList');
        const notice = document.createElement('div');
        notice.className = 'sample-notice';
        notice.innerHTML = `
            <p><strong>📄 サンプルファイルが読み込まれました</strong></p>
            <p>他の学会予稿集も分析可能です。上記のボタンから別のPDFを選択してください。</p>
        `;
        notice.style.cssText = `
            background: #e3f2fd;
            border: 1px solid #2196f3;
            border-radius: 8px;
            padding: 15px;
            margin-top: 10px;
            color: #1565c0;
            font-size: 14px;
        `;
        fileList.appendChild(notice);
    }

    handleFileSelection(files) {
        const fileList = document.getElementById('fileList');
        const analyzeBtn = document.getElementById('analyzeBtn');
        
        fileList.innerHTML = '';
        
        if (files.length > 0) {
            Array.from(files).forEach(file => {
                const fileItem = document.createElement('div');
                fileItem.className = 'file-item';
                fileItem.innerHTML = `
                    <span>${file.name}</span>
                    <span>${(file.size / 1024 / 1024).toFixed(2)} MB</span>
                `;
                fileList.appendChild(fileItem);
            });
            
            this.selectedFiles = files;
            analyzeBtn.disabled = false;
        } else {
            fileList.innerHTML = '<p>ファイルが選択されていません</p>';
            analyzeBtn.disabled = true;
        }
    }

    async startAnalysis() {
        this.showProgress();
        
        try {
            await this.extractTextFromPDFs();
            this.analyzeKeywords();
            this.categorizeFields();
            this.generateInsights();
            this.displayResults();
        } catch (error) {
            console.error('分析エラー:', error);
            alert('分析中にエラーが発生しました。');
        }
        
        this.hideProgress();
    }

    showProgress() {
        document.getElementById('progressSection').style.display = 'block';
        document.getElementById('resultsSection').style.display = 'none';
    }

    hideProgress() {
        document.getElementById('progressSection').style.display = 'none';
        document.getElementById('resultsSection').style.display = 'block';
    }

    updateProgress(percentage, text) {
        document.getElementById('progressFill').style.width = `${percentage}%`;
        document.getElementById('progressText').textContent = text;
    }

    async extractTextFromPDFs() {
        this.papers = [];
        const totalFiles = this.selectedFiles.length;
        
        for (let i = 0; i < totalFiles; i++) {
            const file = this.selectedFiles[i];
            this.updateProgress((i / totalFiles) * 50, `PDFを処理中... (${i + 1}/${totalFiles})`);
            
            try {
                const text = await this.extractTextFromPDF(file);
                const papers = this.splitIntoPapers(text);
                this.papers.push(...papers);
            } catch (error) {
                console.error(`PDF処理エラー (${file.name}):`, error);
            }
        }
        
        this.updateProgress(50, 'テキスト抽出完了');
    }

    async extractTextFromPDF(file) {
        return new Promise((resolve, reject) => {
            const fileReader = new FileReader();
            
            fileReader.onload = async function() {
                try {
                    const typedarray = new Uint8Array(this.result);
                    const pdf = await pdfjsLib.getDocument(typedarray).promise;
                    let fullText = '';
                    
                    // フルペーパーは後半部分（約890ページ以降）に含まれている
                    const startPage = Math.max(1, Math.floor(pdf.numPages * 0.5));
                    
                    for (let i = startPage; i <= pdf.numPages; i++) {
                        const page = await pdf.getPage(i);
                        const textContent = await page.getTextContent();
                        const pageText = textContent.items.map(item => item.str).join(' ');
                        fullText += pageText + '\n';
                    }
                    
                    resolve(fullText);
                } catch (error) {
                    reject(error);
                }
            };
            
            fileReader.onerror = () => reject(new Error('ファイル読み込みエラー'));
            fileReader.readAsArrayBuffer(file);
        });
    }

    splitIntoPapers(text) {
        // 複数の論文分割パターンを試行
        const separationMethods = [
            this.splitByPageMarkers.bind(this),
            this.splitByPaperIds.bind(this),
            this.splitByAbstractPattern.bind(this),
            this.splitByFixedLength.bind(this)
        ];
        
        let papers = [];
        let bestMethod = null;
        let maxPapers = 0;
        
        for (const method of separationMethods) {
            try {
                const candidatePapers = method(text);
                if (candidatePapers.length > maxPapers && candidatePapers.length > 0) {
                    papers = candidatePapers;
                    maxPapers = candidatePapers.length;
                    bestMethod = method.name;
                }
            } catch (error) {
                console.warn(`Paper splitting method ${method.name} failed:`, error);
            }
        }
        
        console.log(`📄 Found ${papers.length} papers using ${bestMethod}`);
        return papers;
    }

    // 方法1: ページマーカーパターン（JSAI形式）
    splitByPageMarkers(text) {
        const pageMarkerPattern = /-\s*1\s*-/g;
        return this.extractPapersByPattern(text, pageMarkerPattern, 'page markers');
    }

    // 方法2: 論文IDパターン（例：1A1-GS-10-01）
    splitByPaperIds(text) {
        const paperIdPattern = /(\d+[A-Z]\d+-[A-Z]+-\d+-\d+)/g;
        return this.extractPapersByPattern(text, paperIdPattern, 'paper IDs');
    }

    // 方法3: Abstract/要約パターン
    splitByAbstractPattern(text) {
        const abstractPattern = /(abstract|要約|概要)\s*[:：]/gi;
        return this.extractPapersByPattern(text, abstractPattern, 'abstract patterns');
    }

    // 方法4: 固定長分割（最後の手段）
    splitByFixedLength(text) {
        const avgPaperLength = 3000; // 平均的な論文長
        const papers = [];
        
        for (let i = 0; i < text.length; i += avgPaperLength) {
            const paperContent = text.substring(i, i + avgPaperLength);
            if (paperContent.trim().length > 1000) {
                const title = this.extractTitleFromContent(paperContent);
                const cleanedContent = this.extractPaperMainContent(paperContent);
                
                if (cleanedContent.length > 500) {
                    papers.push({
                        id: `paper_${papers.length + 1}`,
                        title: title || `論文 ${papers.length + 1}`,
                        content: cleanedContent,
                        length: cleanedContent.length
                    });
                }
            }
        }
        
        return papers;
    }

    extractPapersByPattern(text, pattern, methodName) {
        const paperStarts = [];
        let match;
        
        while ((match = pattern.exec(text)) !== null) {
            paperStarts.push(match.index);
        }
        
        if (paperStarts.length === 0) {
            throw new Error(`No ${methodName} found`);
        }
        
        const papers = [];
        for (let i = 0; i < paperStarts.length; i++) {
            const start = paperStarts[i];
            const end = paperStarts[i + 1] || text.length;
            const paperContent = text.substring(start, end);
            
            if (paperContent.length > 500) {
                const title = this.extractTitleFromContent(paperContent);
                const cleanedContent = this.extractPaperMainContent(paperContent);
                
                if (cleanedContent.length > 200) {
                    papers.push({
                        id: `paper_${i + 1}`,
                        title: title,
                        content: cleanedContent,
                        length: cleanedContent.length
                    });
                }
            }
        }
        
        return papers;
    }

    extractTitleFromContent(paperContent) {
        const lines = paperContent.split('\n').slice(0, 20);
        
        // 複数のタイトル検出パターンを試行
        const titlePatterns = [
            this.extractTitleFromPageMarker.bind(this),
            this.extractTitleFromFormat.bind(this),
            this.extractTitleFromPosition.bind(this),
            this.extractTitleFromLength.bind(this)
        ];
        
        for (const pattern of titlePatterns) {
            const title = pattern(lines);
            if (title && title !== 'タイトル不明') {
                return title;
            }
        }
        
        return 'タイトル不明';
    }

    // パターン1: ページマーカー後のタイトル
    extractTitleFromPageMarker(lines) {
        for (let line of lines) {
            line = line.trim();
            if (line.includes('- 1 -')) {
                const titlePart = line.replace(/-\s*1\s*-\s*/, '').trim();
                if (this.isValidTitle(titlePart)) {
                    return titlePart;
                }
            }
        }
        return null;
    }

    // パターン2: フォーマット特有のタイトル
    extractTitleFromFormat(lines) {
        for (let line of lines) {
            line = line.trim();
            
            // 論文ID後のタイトル（例：1A1-GS-10-01 の後）
            if (/\d+[A-Z]\d+-[A-Z]+-\d+-\d+/.test(line)) {
                const titlePart = line.replace(/\d+[A-Z]\d+-[A-Z]+-\d+-\d+\s*/, '').trim();
                if (this.isValidTitle(titlePart)) {
                    return titlePart;
                }
            }
        }
        return null;
    }

    // パターン3: 位置ベースのタイトル（最初の有効行）
    extractTitleFromPosition(lines) {
        for (let i = 0; i < Math.min(10, lines.length); i++) {
            const line = lines[i].trim();
            if (this.isValidTitle(line) && !this.isMetadata(line)) {
                return line;
            }
        }
        return null;
    }

    // パターン4: 長さベースのタイトル
    extractTitleFromLength(lines) {
        const candidates = lines
            .map(line => line.trim())
            .filter(line => this.isValidTitle(line) && !this.isMetadata(line))
            .sort((a, b) => {
                // 適度な長さのものを優先
                const scoreA = this.getTitleScore(a);
                const scoreB = this.getTitleScore(b);
                return scoreB - scoreA;
            });
        
        return candidates[0] || null;
    }

    isValidTitle(title) {
        if (!title || title.length < 10 || title.length > 200) return false;
        
        // 日本語または英語を含む
        const hasJapanese = /[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/.test(title);
        const hasEnglish = /[a-zA-Z]/.test(title);
        
        if (!hasJapanese && !hasEnglish) return false;
        
        // 記号だけではない
        const symbolRatio = (title.match(/[^\w\s\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/g) || []).length / title.length;
        if (symbolRatio > 0.3) return false;
        
        return true;
    }

    isMetadata(line) {
        const metadataPatterns = [
            /©/,
            /人工知能学会/,
            /zoom/i,
            /会議室/,
            /座長/,
            /\d{4}年/,
            /conference/i,
            /proceedings/i,
            /session/i,
            /abstract/i,
            /^\d+$/,
            /^[A-Z]$/,
            /@/,
            /https?:\/\//,
            /tel:/i,
            /fax:/i
        ];
        
        return metadataPatterns.some(pattern => pattern.test(line));
    }

    getTitleScore(title) {
        let score = 0;
        
        // 適度な長さを優先
        if (title.length >= 20 && title.length <= 80) score += 10;
        if (title.length >= 15 && title.length <= 100) score += 5;
        
        // 日本語を含む場合加点
        if (/[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/.test(title)) score += 5;
        
        // 英語の単語が含まれる場合加点
        if (/\b[a-zA-Z]{3,}\b/.test(title)) score += 3;
        
        // 記号が少ない場合加点
        const symbolCount = (title.match(/[^\w\s\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/g) || []).length;
        if (symbolCount <= 3) score += 3;
        
        return score;
    }

    extractPaperMainContent(rawContent) {
        let content = rawContent.trim();
        
        // 汎用的なノイズ除去パターン
        const removePatterns = [
            // ページマーカー
            /-\s*\d+\s*-\s*/g,
            
            // 学会・予稿集情報（汎用）
            /©.*?(学会|society|conference).*$/gmi,
            /\d{4}年度.*?(学会|大会|conference).*$/gmi,
            /(一般|general)セッション.*$/gmi,
            /座長[:：].*$/gmi,
            /(会議室|room|hall)\s*\d+.*$/gmi,
            /(zoom|teams|webex).*?(こちら|here|link).*$/gmi,
            /\d{2}:\d{2}\s*[〜~-]\s*\d{2}:\d{2}/g,
            
            // URL・連絡先
            /https?:\/\/[^\s]+/gi,
            /www\.[^\s]+/gi,
            /(問い合わせ先|contact|inquiry).*?$/gmi,
            /(連絡先|address|contact).*?$/gmi,
            /〒\d{3}-?\d{4}.*?$/gmi,
            /(tel|phone|fax).*?\d/gi,
            /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
            
            // 参考文献・図表
            /^\s*\[\d+\].*?$/gm,
            /(参考文献|references?).*$/gmi,
            /(図|fig\.?|figure)\s*\d+.*$/gm,
            /(表|table)\s*\d+.*$/gm,
            /(謝辞|acknowledgment?).*$/gmi,
            
            // 論文メタデータ
            /(abstract|要約|概要)\s*[:：]/gi,
            /(keywords?|キーワード)\s*[:：]/gi,
            /^\s*\d+\s*$/gm, // 単独数字
            /^\s*[A-Z]\s*$/gm, // 単独英字
            /^\s*[・•]\s*$/gm, // 箇条書き点
            /^\s*[\-=_]{3,}\s*$/gm, // 装飾線
            
            // 所属・著者情報
            /(大学|university|institute?)\s*(大学院|graduate)?\s*(研究科|school)?/gi,
            /(株式会社|corporation|corp\.?|ltd\.?|inc\.?)/gi,
            /(研究所|laboratory|lab\.?|center)/gi,
        ];
        
        // パターンを順次適用
        removePatterns.forEach(pattern => {
            content = content.replace(pattern, ' ');
        });
        
        // より詳細なクリーニング
        content = this.deepCleanContent(content);
        
        // 複数の空白を正規化
        content = content
            .replace(/\s+/g, ' ')
            .trim();
        
        return content;
    }

    deepCleanContent(content) {
        const lines = content.split('\n');
        const cleanedLines = [];
        
        for (let line of lines) {
            line = line.trim();
            
            // 空行をスキップ
            if (line.length === 0) continue;
            
            // 明らかにノイズな行をスキップ
            if (this.isNoiseLine(line)) continue;
            
            // 短すぎる行は除外（ただし重要な行は保持）
            if (line.length < 10 && !this.isImportantShortLine(line)) continue;
            
            cleanedLines.push(line);
        }
        
        return cleanedLines.join(' ');
    }

    isNoiseLine(line) {
        const noisePatterns = [
            /^\d+$/, // 数字のみ
            /^[A-Za-z]$/, // アルファベット1文字
            /^[・•\-=_]+$/, // 記号のみ
            /^page\s*\d+/i,
            /^p\.\s*\d+/i,
            /sessionchair/i,
            /room\s*\w+/i,
            /building/i,
            /floor/i,
        ];
        
        return noisePatterns.some(pattern => pattern.test(line));
    }

    isImportantShortLine(line) {
        // 短いが重要な行のパターン
        const importantPatterns = [
            /^(結論|conclusion)/i,
            /^(結果|results?)/i,
            /^(手法|method)/i,
            /^(実験|experiment)/i,
            /^(提案|proposal)/i,
        ];
        
        return importantPatterns.some(pattern => pattern.test(line));
    }

    extractMainText(content) {
        const lines = content.split('\n').map(line => line.trim()).filter(line => line.length > 0);
        const validLines = [];
        
        let inMainContent = false;
        let titleFound = false;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            // タイトルらしき行を検出（日本語を含み、適度な長さ）
            if (!titleFound && this.isPossibleTitle(line)) {
                titleFound = true;
                inMainContent = true;
                validLines.push(line);
                continue;
            }
            
            // 本文開始のキーワード
            if (/^(はじめに|概要|要約|abstract|introduction|背景|目的|概念)/i.test(line)) {
                inMainContent = true;
            }
            
            // 本文終了のキーワード
            if (/^(参考文献|references|謝辞|acknowledgment|問い合わせ|contact)/i.test(line)) {
                inMainContent = false;
                break;
            }
            
            if (inMainContent) {
                // ノイズとなりそうな行を除外
                if (!this.isNoiseContent(line)) {
                    validLines.push(line);
                }
            }
        }
        
        return validLines.join(' ');
    }

    isPossibleTitle(line) {
        // 日本語を含み、10-100文字程度の行をタイトルと判定
        const hasJapanese = /[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/.test(line);
        const length = line.length;
        const hasUrl = /https?:\/\//.test(line);
        const isEmail = /@/.test(line);
        const isAddress = /〒/.test(line);
        
        return hasJapanese && length >= 10 && length <= 100 && !hasUrl && !isEmail && !isAddress;
    }

    isNoiseContent(line) {
        const noisePatterns = [
            /^\d+$/, // 数字のみ
            /^[A-Za-z]$/, // アルファベット1文字
            /^\s*[・•]\s*$/, // 箇条書きの点のみ
            /university.*?japan/i,
            /zoom.*?meeting/i,
            /https?:\/\//,
            /www\./,
            /@.*\..*/, // メールアドレス
            /〒\d{3}-\d{4}/, // 郵便番号
            /tel.*?\d/i,
            /fax.*?\d/i,
            /^\s*-+\s*$/, // ダッシュのみ
            /^\s*=+\s*$/, // イコールのみ
            /^\s*\*+\s*$/, // アスタリスクのみ
        ];
        
        return noisePatterns.some(pattern => pattern.test(line));
    }

    extractTitle(text) {
        const lines = text.split('\n').filter(line => line.trim());
        for (let line of lines.slice(0, 5)) {
            if (line.length > 10 && line.length < 100) {
                return line.trim();
            }
        }
        return lines[0]?.substring(0, 50) + '...' || '不明なタイトル';
    }

    analyzeKeywords() {
        this.updateProgress(60, 'キーワード分析中...');
        
        this.keywords.clear();
        this.aiKeywords.clear();
        
        const aiTerms = [
            '機械学習', 'AI', '人工知能', 'ディープラーニング', '深層学習', 'ニューラルネットワーク',
            'CNN', 'RNN', 'LSTM', 'GAN', 'Transformer', 'BERT', 'GPT', '自然言語処理',
            'コンピュータビジョン', '画像認識', '音声認識', '強化学習', 'DQN', 'アルゴリズム',
            'データマイニング', 'ビッグデータ', 'IoT', 'エッジコンピューティング', 'クラウド',
            '分類', '回帰', 'クラスタリング', '最適化', '遺伝的アルゴリズム', 'SVM', 'ランダムフォレスト'
        ];
        
        const stopWords = new Set([
            // 日本語ストップワード
            'の', 'を', 'は', 'が', 'に', 'で', 'と', 'から', 'まで', 'より', 'として', 'による',
            'について', 'において', 'に関する', 'である', 'する', 'した', 'される', 'できる',
            'これ', 'それ', 'あれ', 'この', 'その', 'あの', 'ここ', 'そこ', 'あそこ', 'また',
            'さらに', 'しかし', 'ただし', 'なお', 'および', 'ならびに', 'もしくは', 'または',
            'こと', 'もの', 'ため', '場合', '時', '際', '上', '中', '下', '前', '後', '間', '内',
            '外', '的', '性', '化', 'つ', 'れる', 'らる', 'なる', 'ある', 'いる', 'なっ', 'あっ',
            
            // 英語ストップワード
            'the', 'of', 'and', 'a', 'to', 'in', 'is', 'you', 'that', 'it', 'he', 'was', 'for',
            'on', 'are', 'as', 'with', 'his', 'they', 'i', 'at', 'be', 'this', 'have', 'from',
            'or', 'one', 'had', 'by', 'word', 'but', 'not', 'what', 'all', 'were', 'we', 'when',
            'your', 'can', 'said', 'there', 'each', 'which', 'she', 'do', 'how', 'their', 'if',
            'will', 'up', 'other', 'about', 'out', 'many', 'then', 'them', 'these', 'so', 'some',
            'her', 'would', 'make', 'like', 'into', 'him', 'has', 'two', 'more', 'go', 'no', 'way',
            'could', 'my', 'than', 'first', 'been', 'call', 'who', 'its', 'now', 'find', 'long',
            'down', 'day', 'did', 'get', 'come', 'made', 'may', 'part',
            
            // 数字・記号・論文関連の無意味な語
            '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15',
            '16', '17', '18', '19', '20', '21', '22', '23', '24', '25', '26', '27', '28', '29', '30',
            'pp', 'th', 'st', 'nd', 'rd', 'vol', 'no', 'fig', 'table', 'section', 'chapter',
            'page', 'pages', 'p', 'japanese', 'society', 'artificial', 'intelligence', 'conference',
            'proceedings', 'annual', 'international', 'national', 'symposium', 'workshop',
            'ieee', 'acm', 'springer', 'elsevier', 'wiley', 'academic', 'press', 'publisher',
            'doi', 'isbn', 'issn', 'www', 'http', 'https', 'com', 'org', 'jp', 'pdf', 'html',
            'abstract', 'introduction', 'conclusion', 'references', 'acknowledgment', 'appendix',
            'fig', 'figure', 'table', 'equation', 'formula', 'algorithm', 'result', 'results',
            'method', 'methods', 'approach', 'proposed', 'using', 'based', 'show', 'shows',
            'present', 'presents', 'paper', 'study', 'research', 'work', 'experiment', 'evaluation',
            'analysis', 'discussion', 'related', 'previous', 'existing', 'current', 'new', 'novel',
            
            // 予稿集特有のノイズ語
            'zoom', 'meeting', 'こちら', 'university', 'japan', 'tokyo', 'osaka', 'kyoto',
            'contact', 'email', 'tel', 'fax', 'address', 'zip', '住所', '連絡先', '問い合わせ',
            'dept', 'department', 'faculty', 'graduate', 'school', 'lab', 'laboratory',
            'prof', 'professor', 'dr', 'phd', 'master', 'bachelor', 'student',
            'corp', 'corporation', 'ltd', 'inc', 'company', 'co', 'group', 'team',
            'slide', 'presentation', 'poster', 'session', 'room', 'hall', 'building',
            'date', 'time', 'schedule', 'program', 'agenda', 'timetable'
        ]);

        this.papers.forEach(paper => {
            const words = this.extractWords(paper.content);
            
            words.forEach(word => {
                const cleanWord = word.toLowerCase().trim();
                
                // 長さチェック、数字のみかチェック、ストップワードチェック
                if (cleanWord.length >= 3 && 
                    cleanWord.length <= 20 &&
                    !stopWords.has(cleanWord) && 
                    !/^\d+$/.test(cleanWord) && // 数字のみを除外
                    !/^[a-z]{1,2}$/.test(cleanWord) && // 1-2文字の英語を除外
                    !/^[\u3040-\u309f]{1}$/.test(cleanWord) && // ひらがな1文字を除外
                    this.isValidKeyword(cleanWord)) {
                    
                    this.keywords.set(cleanWord, (this.keywords.get(cleanWord) || 0) + 1);
                    
                    if (aiTerms.some(term => cleanWord.includes(term.toLowerCase()) || term.toLowerCase().includes(cleanWord))) {
                        this.aiKeywords.set(cleanWord, (this.aiKeywords.get(cleanWord) || 0) + 1);
                    }
                }
            });
        });
        
        this.updateProgress(75, 'キーワード分析完了');
    }

    isValidKeyword(word) {
        // 記号や特殊文字が多い語を除外
        const symbolCount = (word.match(/[^\w\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/g) || []).length;
        if (symbolCount > word.length * 0.3) return false;
        
        // 意味のある文字が含まれているかチェック
        const hasJapanese = /[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/.test(word);
        const hasAlpha = /[a-zA-Z]/.test(word);
        const hasNumber = /\d/.test(word);
        
        // 数字のみ、または記号のみの場合は除外
        if (hasNumber && !hasJapanese && !hasAlpha) return false;
        
        return true;
    }

    extractWords(text) {
        return text
            .replace(/[「」『』（）()【】［］\[\]]/g, ' ')
            .split(/[\s\n\r\t.,;:!?。、，．；：！？]+/)
            .filter(word => word.trim().length > 0);
    }

    categorizeFields() {
        this.updateProgress(85, '研究分野の分類中...');
        
        const fieldKeywords = {
            '機械学習・AI': ['機械学習', 'AI', '人工知能', 'ディープラーニング', '深層学習', 'アルゴリズム'],
            '自然言語処理': ['自然言語処理', 'NLP', 'テキスト', '言語', '対話', 'チャットボット'],
            'コンピュータビジョン': ['画像', '映像', 'カメラ', '認識', 'ビジョン', '顔', '物体検出'],
            'ロボティクス': ['ロボット', '制御', 'センサ', 'アクチュエータ', '移動', 'マニピュレータ'],
            'データサイエンス': ['データ', '統計', '解析', 'ビッグデータ', 'マイニング', '予測'],
            'ヒューマンインタフェース': ['インタフェース', 'UI', 'UX', 'ユーザ', 'インタラクション', 'VR', 'AR'],
            'セキュリティ': ['セキュリティ', '暗号', '認証', 'プライバシー', '攻撃', '防御'],
            'ネットワーク・システム': ['ネットワーク', 'システム', 'クラウド', 'エッジ', 'IoT', '分散']
        };

        this.fields.clear();
        
        this.papers.forEach(paper => {
            const content = paper.content.toLowerCase();
            
            Object.entries(fieldKeywords).forEach(([field, keywords]) => {
                const score = keywords.reduce((sum, keyword) => {
                    const regex = new RegExp(keyword, 'gi');
                    const matches = content.match(regex);
                    return sum + (matches ? matches.length : 0);
                }, 0);
                
                if (score > 0) {
                    this.fields.set(field, (this.fields.get(field) || 0) + score);
                }
            });
        });
        
        this.updateProgress(95, '分類完了');
    }

    generateInsights() {
        this.insights = [];
        
        const topKeywords = Array.from(this.keywords.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);
        
        const topAIKeywords = Array.from(this.aiKeywords.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);
        
        const topFields = Array.from(this.fields.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3);

        this.insights.push({
            title: '主要トレンド',
            content: `最も頻出するキーワードは「${topKeywords[0]?.[0]}」で${topKeywords[0]?.[1]}回出現しています。`
        });

        if (topAIKeywords.length > 0) {
            this.insights.push({
                title: 'AI技術の動向',
                content: `AI関連では「${topAIKeywords[0]?.[0]}」が最も注目されており、${topAIKeywords[0]?.[1]}回言及されています。`
            });
        }

        if (topFields.length > 0) {
            this.insights.push({
                title: '研究分野の傾向',
                content: `「${topFields[0]?.[0]}」分野が最も活発で、全体の${((topFields[0]?.[1] / Array.from(this.fields.values()).reduce((a, b) => a + b, 0)) * 100).toFixed(1)}%を占めています。`
            });
        }

        const avgLength = this.papers.reduce((sum, paper) => sum + paper.length, 0) / this.papers.length;
        this.insights.push({
            title: '論文の特徴',
            content: `平均文字数は${Math.round(avgLength)}文字で、${this.papers.length}件の論文が分析されました。`
        });
    }

    displayResults() {
        this.updateProgress(100, '結果表示中...');
        
        this.updateStats();
        this.createCharts();
        this.displayWordCloud();
        this.displayInsights();
    }

    updateStats() {
        document.getElementById('totalPapers').textContent = this.papers.length;
        document.getElementById('uniqueKeywords').textContent = this.keywords.size;
        
        const avgLength = this.papers.reduce((sum, paper) => sum + paper.length, 0) / this.papers.length;
        document.getElementById('avgLength').textContent = Math.round(avgLength);
    }

    createCharts() {
        this.createKeywordChart();
        this.createAIKeywordChart();
        this.createFieldChart();
    }

    createKeywordChart() {
        const ctx = document.getElementById('keywordChart').getContext('2d');
        const topKeywords = Array.from(this.keywords.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 20);

        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: topKeywords.map(item => item[0]),
                datasets: [{
                    label: '出現回数',
                    data: topKeywords.map(item => item[1]),
                    backgroundColor: 'rgba(102, 126, 234, 0.8)',
                    borderColor: 'rgba(102, 126, 234, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    createAIKeywordChart() {
        const ctx = document.getElementById('aiKeywordChart').getContext('2d');
        const topAIKeywords = Array.from(this.aiKeywords.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);

        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: topAIKeywords.map(item => item[0]),
                datasets: [{
                    data: topAIKeywords.map(item => item[1]),
                    backgroundColor: [
                        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0',
                        '#9966FF', '#FF9F40', '#FF6384', '#C9CBCF',
                        '#4BC0C0', '#FF6384'
                    ]
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    createFieldChart() {
        const ctx = document.getElementById('fieldChart').getContext('2d');
        const fieldData = Array.from(this.fields.entries())
            .sort((a, b) => b[1] - a[1]);

        new Chart(ctx, {
            type: 'polarArea',
            data: {
                labels: fieldData.map(item => item[0]),
                datasets: [{
                    data: fieldData.map(item => item[1]),
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.8)',
                        'rgba(54, 162, 235, 0.8)',
                        'rgba(255, 205, 86, 0.8)',
                        'rgba(75, 192, 192, 0.8)',
                        'rgba(153, 102, 255, 0.8)',
                        'rgba(255, 159, 64, 0.8)',
                        'rgba(199, 199, 199, 0.8)',
                        'rgba(83, 102, 255, 0.8)'
                    ]
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    displayWordCloud() {
        const wordCloud = document.getElementById('wordCloud');
        const topKeywords = Array.from(this.keywords.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 30);

        wordCloud.innerHTML = '';
        
        topKeywords.forEach(([keyword, count]) => {
            const tag = document.createElement('span');
            tag.className = 'keyword-tag';
            tag.textContent = `${keyword} (${count})`;
            tag.style.fontSize = `${Math.min(18, 10 + count / 2)}px`;
            wordCloud.appendChild(tag);
        });
    }

    displayInsights() {
        const insightsContainer = document.getElementById('insights');
        insightsContainer.innerHTML = '';
        
        this.insights.forEach(insight => {
            const insightItem = document.createElement('div');
            insightItem.className = 'insight-item';
            insightItem.innerHTML = `
                <h4>${insight.title}</h4>
                <p>${insight.content}</p>
            `;
            insightsContainer.appendChild(insightItem);
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    new PaperTrendAnalyzer();
});