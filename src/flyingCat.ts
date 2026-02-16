import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { PanelViewProvider } from './panelViewProvider';

type CatState = 'idle' | 'typing' | 'dvd';

export class FlyingCat {
	private static instance: FlyingCat | undefined;
	private static extensionPath: string;
	private decorationType: vscode.TextEditorDecorationType | undefined;
	private renderInterval: ReturnType<typeof setInterval> | undefined;
	private idleTimeout: ReturnType<typeof setTimeout> | undefined;
	private dvdTimeout: ReturnType<typeof setTimeout> | undefined;
	private x = 300;
	private y = 200;
	private dx = 3;
	private dy = 2;
	private idleDataUri = '';
	private typingDataUri = '';
	private dvdDataUri = '';
	private disposables: vscode.Disposable[] = [];
	private size = 80;
	private state: CatState = 'idle';
	private typingStartTime = 0;
	private lastRenderedState: CatState | null = null;
	private lastRenderedX = -1;
	private lastRenderedY = -1;
	private needsRender = true;
	private panelProvider: PanelViewProvider | undefined;
	private pulseTimeMs = 0;
	private pulseScale = 1;

	private static readonly IDLE_AFTER_MS = 2000;   // 2sn yazmayınca idle
	private static readonly DVD_AFTER_MS = 5500;    // 5sn yazınca dvd
	private static readonly DVD_PULSE_MAX_SCALE = 2; // 300%
	private static readonly DVD_PULSE_PERIOD_MS = 8000; // 4s up + 4s down

	public static toggle(extensionUri: vscode.Uri, panelProvider?: PanelViewProvider) {
		FlyingCat.extensionPath = extensionUri.fsPath;
		if (FlyingCat.instance) {
			FlyingCat.instance.dispose();
			FlyingCat.instance = undefined;
			panelProvider?.setState('idle');
			vscode.window.showInformationMessage('Kedi uçup gitti!');
		} else {
			FlyingCat.instance = new FlyingCat(panelProvider);
			vscode.window.showInformationMessage('Kedi uçmaya başladı!');
		}
	}

	private loadImage(filename: string): string {
		const filePath = path.join(FlyingCat.extensionPath, 'media', filename);
		const buffer = fs.readFileSync(filePath);
		const encoded = buffer.toString('base64');
		const ext = path.extname(filename).slice(1);
		const mime = ext === 'png' ? 'image/png' : ext === 'gif' ? 'image/gif' : `image/${ext}`;
		return `data:${mime};base64,${encoded}`;
	}

	private constructor(panelProvider?: PanelViewProvider) {
		this.panelProvider = panelProvider;
		this.idleDataUri = this.loadImage('cat-idle.png');
		this.typingDataUri = this.loadImage('cat-impulse.gif');
		this.dvdDataUri = this.loadImage('cat-spin.gif');

		// Typing detection
		this.disposables.push(
			vscode.workspace.onDidChangeTextDocument(() => this.onType())
		);
		this.disposables.push(
			vscode.window.onDidChangeActiveTextEditor(() => {
				this.needsRender = true;
			})
		);

		// Render loop — movement only in dvd state
		this.renderInterval = setInterval(() => {
			if (this.state === 'dvd') {
				this.x += this.dx;
				this.y += this.dy;
				if (this.x > 1200 || this.x < 20) { this.dx = -this.dx; }
				// Use editor's visible range or viewport height estimate
				const editor = vscode.window.activeTextEditor;
				const editorHeight = editor ? editor.document.lineCount * 18 : 700; // ~18px per line
				const maxHeight = Math.max(editorHeight, 700) - this.size - 20;
				if (this.y > maxHeight || this.y < 20) { this.dy = -this.dy; }
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

	private onType() {
		const now = Date.now();

		// Reset idle timer
		if (this.idleTimeout) { clearTimeout(this.idleTimeout); }
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
			if (this.dvdTimeout) { clearTimeout(this.dvdTimeout); }
			this.dvdTimeout = setTimeout(() => {
				if (this.state === 'typing') {
					this.state = 'dvd';
					this.needsRender = true;
					this.panelProvider?.setState('dvd');
				}
			}, FlyingCat.DVD_AFTER_MS);
		} else if (this.state === 'typing') {
			// Still typing — check if 5s passed
			if (now - this.typingStartTime >= FlyingCat.DVD_AFTER_MS) {
				this.state = 'dvd';
				this.needsRender = true;
				this.panelProvider?.setState('dvd');
			}
		}
		// dvd state stays dvd until idle
	}

	private render() {
		const editor = vscode.window.activeTextEditor;
		if (!editor) { return; }

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
		if (!visibleRange) { return; }
		const line = visibleRange.start.line;
		const range = new vscode.Range(line, 0, line, 1);
		editor.setDecorations(this.decorationType, [{ range }]);
	}

	public dispose() {
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
