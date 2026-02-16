import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export class PanelViewProvider implements vscode.WebviewViewProvider {
	private webviewView: vscode.WebviewView | undefined;

	constructor(private readonly _extensionUri: vscode.Uri) {}

	resolveWebviewView(
		webviewView: vscode.WebviewView,
		_context: vscode.WebviewViewResolveContext,
		_token: vscode.CancellationToken
	) {
		this.webviewView = webviewView;

		webviewView.webview.options = {
			enableScripts: true,
			localResourceRoots: [vscode.Uri.joinPath(this._extensionUri, 'media')]
		};

		webviewView.webview.html = this._getHtmlContent();
	}

	/** Send cat state to the panel webview */
	public setState(state: 'idle' | 'typing' | 'dvd') {
		this.webviewView?.webview.postMessage({ command: 'setState', state });
	}

	private _loadBase64(filename: string): string {
		const filePath = path.join(this._extensionUri.fsPath, 'media', filename);
		const buffer = fs.readFileSync(filePath);
		return buffer.toString('base64');
	}

	private _getHtmlContent(): string {
		const idlePng = this._loadBase64('cat-idle.png');
		const impulseGif = this._loadBase64('cat-impulse.gif');
		const spinGif = this._loadBase64('cat-spin.gif');
		const mp3 = this._loadBase64('oiiai.mp3');
		const dvdMp3 = this._loadBase64('oiiaoiia.mp3');

		return /*html*/`
			<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<style>
					* { margin: 0; padding: 0; box-sizing: border-box; }
					body {
						padding: 12px;
						color: var(--vscode-foreground);
						font-family: var(--vscode-font-family);
						display: flex;
						flex-direction: column;
						align-items: center;
						gap: 10px;
					}
					.cat-container {
						width: 100%;
						aspect-ratio: 1;
						max-width: 200px;
						border: 1px solid var(--vscode-widget-border);
						border-radius: 10px;
						background: var(--vscode-editor-background);
						display: flex;
						align-items: center;
						justify-content: center;
						overflow: hidden;
						transition: border-color 0.3s;
					}
					.cat-container.active {
						border-color: var(--vscode-focusBorder);
					}
					.cat-container img {
						max-width: 80%;
						max-height: 80%;
						object-fit: contain;
					}
					.status {
						font-size: 11px;
						color: var(--vscode-descriptionForeground);
						text-align: center;
					}
					.status-dot {
						display: inline-block;
						width: 6px;
						height: 6px;
						border-radius: 50%;
						margin-right: 4px;
						vertical-align: middle;
					}
					.status-dot.idle { background: #888; }
					.status-dot.typing { background: #f5a623; }
					.status-dot.dvd { background: #e55; }
					.volume-row {
						display: flex;
						align-items: center;
						gap: 6px;
						font-size: 11px;
						color: var(--vscode-descriptionForeground);
						width: 100%;
						max-width: 200px;
					}
					.volume-row input {
						flex: 1;
					}
					.enable-audio {
						margin-top: 4px;
						font-size: 11px;
						border: none;
						border-radius: 6px;
						padding: 6px 10px;
						cursor: pointer;
						background: var(--vscode-button-background);
						color: var(--vscode-button-foreground);
					}
					.enable-audio:hover {
						background: var(--vscode-button-hoverBackground);
					}
					.hidden { display: none; }
				</style>
			</head>
			<body>
				<div class="cat-container" id="catBox">
					<img id="catImg" src="data:image/png;base64,${idlePng}" />
				</div>
				<div class="status">
					<span class="status-dot idle" id="statusDot"></span>
					<span id="statusText">😴 Idle</span>
				</div>
				<div class="volume-row">
					🔊 <input type="range" min="0" max="100" value="50" id="vol" />
				</div>
				<button id="enableAudio" class="enable-audio hidden">🔈 Enable Audio</button>
				<script>
					const catImg = document.getElementById('catImg');
					const catBox = document.getElementById('catBox');
					const statusDot = document.getElementById('statusDot');
					const statusText = document.getElementById('statusText');
					const volSlider = document.getElementById('vol');
					const enableBtn = document.getElementById('enableAudio');

					const images = {
						idle: "data:image/png;base64,${idlePng}",
						typing: "data:image/gif;base64,${impulseGif}",
						dvd: "data:image/gif;base64,${spinGif}"
					};

					// === Audio Settings (edit these) ===
					const TYPING_TRIM_START = 0.15;
					const TYPING_TRIM_END = 0.25;
					const DVD_TRIM_START = 0;
					const DVD_TRIM_END = 0;
					const PLAYBACK_RATE = 1.25;
					const PLAYBACK_RATE_DVD = 1.0;
					const DEFAULT_VOLUME = 0.5;

					const typingAudio = new Audio("data:audio/mpeg;base64,${mp3}");
					typingAudio.loop = false;
					typingAudio.playbackRate = PLAYBACK_RATE;
					typingAudio.volume = DEFAULT_VOLUME;

					const dvdAudio = new Audio("data:audio/mpeg;base64,${dvdMp3}");
					dvdAudio.loop = false;
					dvdAudio.playbackRate = PLAYBACK_RATE_DVD;
					dvdAudio.volume = DEFAULT_VOLUME;

					let audioUnlocked = false;

					function attachTrimLoop(audio, trimStart, trimEnd) {
						audio.addEventListener('timeupdate', () => {
							if (audio.duration && audio.currentTime >= audio.duration - trimEnd) {
								audio.currentTime = trimStart;
								audio.play().catch(() => {});
							}
						});
					}

					attachTrimLoop(typingAudio, TYPING_TRIM_START, TYPING_TRIM_END);
					attachTrimLoop(dvdAudio, DVD_TRIM_START, DVD_TRIM_END);

					volSlider.addEventListener('input', (e) => {
						const v = e.target.value / 100;
						typingAudio.volume = v;
						dvdAudio.volume = v;
					});

					function unlockAudio() {
						typingAudio.muted = true;
						dvdAudio.muted = true;
						return Promise.all([
							typingAudio.play(),
							dvdAudio.play()
						]).then(() => {
							typingAudio.pause();
							dvdAudio.pause();
							typingAudio.currentTime = 0;
							dvdAudio.currentTime = 0;
							typingAudio.muted = false;
							dvdAudio.muted = false;
							audioUnlocked = true;
							enableBtn.classList.add('hidden');
							applyAudioForState();
						}).catch(() => {
							audioUnlocked = false;
							enableBtn.classList.remove('hidden');
						});
					}

					function playTyping() {
						if (!audioUnlocked) { enableBtn.classList.remove('hidden'); return; }
						dvdAudio.pause();
						dvdAudio.currentTime = 0;
						typingAudio.currentTime = TYPING_TRIM_START;
						typingAudio.play().catch(() => {});
					}

					function playDvd() {
						if (!audioUnlocked) { enableBtn.classList.remove('hidden'); return; }
						typingAudio.pause();
						typingAudio.currentTime = 0;
						dvdAudio.currentTime = DVD_TRIM_START;
						dvdAudio.play().catch(() => {});
					}

					function stopAll() {
						typingAudio.pause();
						typingAudio.currentTime = 0;
						dvdAudio.pause();
						dvdAudio.currentTime = 0;
					}

					const statusLabels = {
						idle: '😴 Idle',
						typing: '✍️ coding murmurcat murmuring...',
						dvd: '🚀 OIIAI!'
					};

					let currentState = 'idle';

					function applyAudioForState() {
						if (currentState === 'idle') {
							stopAll();
						} else if (currentState === 'typing') {
							playTyping();
						} else if (currentState === 'dvd') {
							playDvd();
						}
					}

					enableBtn.addEventListener('click', () => {
						unlockAudio();
					});
					catBox.addEventListener('click', () => {
						if (!audioUnlocked) { unlockAudio(); }
					});
					document.addEventListener('pointerdown', () => {
						if (!audioUnlocked) { unlockAudio(); }
					}, { once: true });

					unlockAudio();

					window.addEventListener('message', (e) => {
						const msg = e.data;
						if (msg.command === 'setState') {
							const state = msg.state;
							if (state === currentState) return;
							currentState = state;

							catImg.src = images[state] || images.idle;
							statusDot.className = 'status-dot ' + state;
							statusText.textContent = statusLabels[state] || statusLabels.idle;
							catBox.classList.toggle('active', state !== 'idle');

							applyAudioForState();
						}
					});
				</script>
			</body>
			</html>
		`;
	}
}
