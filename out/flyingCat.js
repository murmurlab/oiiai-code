"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FlyingCat = void 0;
const vscode = require("vscode");
const path = require("path");
const fs = require("fs");
class FlyingCat {
    static toggle(extensionUri, panelProvider) {
        FlyingCat.extensionPath = extensionUri.fsPath;
        if (FlyingCat.instance) {
            FlyingCat.instance.dispose();
            FlyingCat.instance = undefined;
            panelProvider?.setState('idle');
            vscode.window.showInformationMessage('Kedi uçup gitti!');
        }
        else {
            FlyingCat.instance = new FlyingCat(panelProvider);
            vscode.window.showInformationMessage('Kedi uçmaya başladı!');
        }
    }
    loadImage(filename) {
        const filePath = path.join(FlyingCat.extensionPath, 'media', filename);
        const buffer = fs.readFileSync(filePath);
        const encoded = buffer.toString('base64');
        const ext = path.extname(filename).slice(1);
        const mime = ext === 'png' ? 'image/png' : ext === 'gif' ? 'image/gif' : `image/${ext}`;
        return `data:${mime};base64,${encoded}`;
    }
    constructor(panelProvider) {
        this.x = 300;
        this.y = 200;
        this.dx = 3;
        this.dy = 2;
        this.idleDataUri = '';
        this.typingDataUri = '';
        this.dvdDataUri = '';
        this.disposables = [];
        this.size = 80;
        this.state = 'idle';
        this.typingStartTime = 0;
        this.lastRenderedState = null;
        this.lastRenderedX = -1;
        this.lastRenderedY = -1;
        this.needsRender = true;
        this.pulseTimeMs = 0;
        this.pulseScale = 1;
        this.panelProvider = panelProvider;
        this.idleDataUri = this.loadImage('cat-idle.png');
        this.typingDataUri = this.loadImage('cat-impulse.gif');
        this.dvdDataUri = this.loadImage('cat-spin.gif');
        // Typing detection
        this.disposables.push(vscode.workspace.onDidChangeTextDocument(() => this.onType()));
        this.disposables.push(vscode.window.onDidChangeActiveTextEditor(() => {
            this.needsRender = true;
        }));
        // Render loop — movement only in dvd state
        this.renderInterval = setInterval(() => {
            if (this.state === 'dvd') {
                this.x += this.dx;
                this.y += this.dy;
                if (this.x > 1200 || this.x < 20) {
                    this.dx = -this.dx;
                }
                // Use editor's visible range or viewport height estimate
                const editor = vscode.window.activeTextEditor;
                const editorHeight = editor ? editor.document.lineCount * 18 : 700; // ~18px per line
                const maxHeight = Math.max(editorHeight, 700) - this.size - 20;
                if (this.y > maxHeight || this.y < 20) {
                    this.dy = -this.dy;
                }
                this.pulseTimeMs += 30;
                const periodMs = FlyingCat.DVD_PULSE_PERIOD_MS;
                const phase = (this.pulseTimeMs % periodMs) / periodMs;
                const maxScale = FlyingCat.DVD_PULSE_MAX_SCALE;
                this.pulseScale = phase < 0.5
                    ? 1 + (phase / 0.5) * (maxScale - 1)
                    : maxScale - ((phase - 0.5) / 0.5) * (maxScale - 1);
                this.needsRender = true;
            }
            if (this.needsRender) {
                this.render();
                this.needsRender = false;
            }
        }, 30);
    }
    onType() {
        const now = Date.now();
        // Reset idle timer
        if (this.idleTimeout) {
            clearTimeout(this.idleTimeout);
        }
        this.idleTimeout = setTimeout(() => {
            this.state = 'idle';
            this.typingStartTime = 0;
            this.needsRender = true;
            this.panelProvider?.setState('idle');
        }, FlyingCat.IDLE_AFTER_MS);
        if (this.state === 'idle') {
            // Start typing — activate cat animation, stay in place
            this.state = 'typing';
            this.typingStartTime = now;
            this.needsRender = true;
            this.panelProvider?.setState('typing');
            // Schedule DVD mode after 5s of typing
            if (this.dvdTimeout) {
                clearTimeout(this.dvdTimeout);
            }
            this.dvdTimeout = setTimeout(() => {
                if (this.state === 'typing') {
                    this.state = 'dvd';
                    this.needsRender = true;
                    this.panelProvider?.setState('dvd');
                }
            }, FlyingCat.DVD_AFTER_MS);
        }
        else if (this.state === 'typing') {
            // Still typing — check if 5s passed
            if (now - this.typingStartTime >= FlyingCat.DVD_AFTER_MS) {
                this.state = 'dvd';
                this.needsRender = true;
                this.panelProvider?.setState('dvd');
            }
        }
        // dvd state stays dvd until idle
    }
    render() {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return;
        }
        if (this.decorationType) {
            this.decorationType.dispose();
        }
        const currentImage = this.state === 'dvd' ? this.dvdDataUri
            : this.state === 'typing' ? this.typingDataUri
                : this.idleDataUri;
        const flip = this.dx > 0 ? '' : ' scaleX(-1)';
        const pulse = this.state === 'dvd' ? ` scale(${this.pulseScale.toFixed(3)})` : '';
        const cssText = `
			font-size: 0 !important;
			letter-spacing: -9999px !important;
			position: fixed !important;
			top: ${Math.round(this.y)}px !important;
			left: ${Math.round(this.x)}px !important;
			z-index: 2147483647 !important;
			pointer-events: none !important;
			width: ${this.size}px !important;
			height: ${this.size}px !important;
			display: inline-block !important;
			background-image: url("${currentImage}") !important;
			background-size: contain !important;
			background-repeat: no-repeat !important;
			background-position: center !important;
			transform:${flip}${pulse};
			filter: drop-shadow(0 4px 12px rgba(0,0,0,0.5));
		`.replace(/\n/g, ' ').replace(/\t/g, '');
        this.decorationType = vscode.window.createTextEditorDecorationType({
            before: {
                contentText: '',
                textDecoration: `none; ${cssText}`
            },
            textDecoration: 'none; position: relative;'
        });
        const visibleRange = editor.visibleRanges[0];
        if (!visibleRange) {
            return;
        }
        const line = visibleRange.start.line;
        const range = new vscode.Range(line, 0, line, 1);
        editor.setDecorations(this.decorationType, [{ range }]);
    }
    dispose() {
        if (this.renderInterval) {
            clearInterval(this.renderInterval);
            this.renderInterval = undefined;
        }
        if (this.idleTimeout) {
            clearTimeout(this.idleTimeout);
            this.idleTimeout = undefined;
        }
        if (this.dvdTimeout) {
            clearTimeout(this.dvdTimeout);
            this.dvdTimeout = undefined;
        }
        if (this.decorationType) {
            this.decorationType.dispose();
            this.decorationType = undefined;
        }
        if (this.panelProvider) {
            this.panelProvider.setState('idle');
            this.panelProvider = undefined;
        }
        this.disposables.forEach(d => d.dispose());
        this.disposables = [];
    }
}
exports.FlyingCat = FlyingCat;
FlyingCat.IDLE_AFTER_MS = 2000; // 2sn yazmayınca idle
FlyingCat.DVD_AFTER_MS = 5500; // 5sn yazınca dvd
FlyingCat.DVD_PULSE_MAX_SCALE = 2; // 300%
FlyingCat.DVD_PULSE_PERIOD_MS = 8000; // 4s up + 4s down
//# sourceMappingURL=flyingCat.js.map