import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export class CatAudioPlayer {
	private panel: vscode.WebviewPanel | undefined;
	private playing = false;

	constructor(private extensionPath: string) {}

	public play() {
		if (this.playing) { return; }
		this.playing = true;
		this.ensurePanel();
		this.panel?.webview.postMessage({ command: 'play' });
	}

	public stop() {
		if (!this.playing) { return; }
		this.playing = false;
		this.panel?.webview.postMessage({ command: 'stop' });
	}

	public dispose() {
		this.playing = false;
		if (this.panel) {
			this.panel.dispose();
			this.panel = undefined;
		}
	}

	private ensurePanel() {
		if (this.panel) { return; }

		this.panel = vscode.window.createWebviewPanel(
			'oiiaiAudio',
			'OIIAI Audio',
			{ viewColumn: vscode.ViewColumn.Beside, preserveFocus: true },
			{ enableScripts: true, localResourceRoots: [vscode.Uri.file(path.join(this.extensionPath, 'media'))] }
		);

		// Hide it by moving focus back — it just needs to exist
		this.panel.reveal(vscode.ViewColumn.Beside, true);

		const mp3Path = path.join(this.extensionPath, 'media', 'oiiai.mp3');
		const mp3Buffer = fs.readFileSync(mp3Path);
		const mp3Base64 = mp3Buffer.toString('base64');
		const mp3DataUri = `data:audio/mpeg;base64,${mp3Base64}`;

		this.panel.webview.html = /*html*/`
			<!DOCTYPE html>
			<html>
			<head><style>body{background:var(--vscode-editor-background);color:var(--vscode-foreground);display:flex;align-items:center;justify-content:center;height:100vh;font-family:var(--vscode-font-family);font-size:14px;} .info{text-align:center;opacity:0.7;}</style></head>
			<body>
				<div class="info">🔊 OIIAI Audio Player<br><small>Bu sekmeyi kapatmayın</small></div>
				<script>
					const audio = new Audio("${mp3DataUri}");
					audio.loop = false;
					audio.playbackRate = 1.25;
					audio.volume = 0.5;
					const TRIM_END = 0.50;

					audio.addEventListener('timeupdate', () => {
						if (audio.duration && audio.currentTime >= audio.duration - TRIM_END) {
							audio.currentTime = 0;
							audio.play().catch(() => {});
						}
					});

					window.addEventListener('message', (e) => {
						const msg = e.data;
						if (msg.command === 'play') {
							audio.currentTime = 0;
							audio.play().catch(() => {});
						} else if (msg.command === 'stop') {
							audio.pause();
							audio.currentTime = 0;
						}
					});
				</script>
			</body>
			</html>
		`;

		this.panel.onDidDispose(() => {
			this.panel = undefined;
			this.playing = false;
		});
	}
}
