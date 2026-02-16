import * as vscode from 'vscode';

export class FloatingImagePanel {
	public static currentPanel: FloatingImagePanel | undefined;
	private readonly _panel: vscode.WebviewPanel;
	private _disposables: vscode.Disposable[] = [];

	public static createOrShow(extensionUri: vscode.Uri, imageUri: vscode.Uri) {
		const column = vscode.ViewColumn.Beside;

		if (FloatingImagePanel.currentPanel) {
			FloatingImagePanel.currentPanel._panel.reveal(column);
			FloatingImagePanel.currentPanel._update(imageUri);
			return;
		}

		const panel = vscode.window.createWebviewPanel(
			'oiiaiFloatingImage',
			'🐱 Floating Image',
			{ viewColumn: column, preserveFocus: true },
			{
				enableScripts: true,
				localResourceRoots: [
					extensionUri,
					vscode.Uri.file('/')
				]
			}
		);

		FloatingImagePanel.currentPanel = new FloatingImagePanel(panel, imageUri);
	}

	private constructor(panel: vscode.WebviewPanel, imageUri: vscode.Uri) {
		this._panel = panel;
		this._update(imageUri);

		this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
	}

	public dispose() {
		FloatingImagePanel.currentPanel = undefined;
		this._panel.dispose();
		while (this._disposables.length) {
			const d = this._disposables.pop();
			if (d) { d.dispose(); }
		}
	}

	private _update(imageUri: vscode.Uri) {
		const webview = this._panel.webview;
		const imageSrc = webview.asWebviewUri(imageUri);
		webview.html = this._getHtml(imageSrc);
	}

	private _getHtml(imageSrc: vscode.Uri): string {
		return /*html*/`
			<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<style>
					* { margin: 0; padding: 0; box-sizing: border-box; }
					body {
						width: 100vw;
						height: 100vh;
						overflow: hidden;
						background: transparent;
						user-select: none;
					}
					.container {
						width: 100%;
						height: 100%;
						position: relative;
					}
					.floating-img {
						position: absolute;
						cursor: grab;
						max-width: 90%;
						max-height: 90%;
						border-radius: 8px;
						box-shadow: 0 4px 24px rgba(0,0,0,0.3);
						transition: box-shadow 0.2s;
						left: 50%;
						top: 50%;
						transform: translate(-50%, -50%);
					}
					.floating-img:active {
						cursor: grabbing;
						box-shadow: 0 8px 32px rgba(0,0,0,0.5);
					}
					.controls {
						position: fixed;
						bottom: 8px;
						left: 50%;
						transform: translateX(-50%);
						display: flex;
						gap: 6px;
						z-index: 100;
					}
					.controls button {
						background: var(--vscode-button-background);
						color: var(--vscode-button-foreground);
						border: none;
						border-radius: 4px;
						padding: 4px 10px;
						cursor: pointer;
						font-size: 12px;
					}
					.controls button:hover {
						background: var(--vscode-button-hoverBackground);
					}
				</style>
			</head>
			<body>
				<div class="container">
					<img class="floating-img" id="floatImg" src="${imageSrc}" alt="Floating Image" />
				</div>
				<div class="controls">
					<button id="zoomIn">➕</button>
					<button id="zoomOut">➖</button>
					<button id="resetBtn">↩️</button>
				</div>
				<script>
					const img = document.getElementById('floatImg');
					let isDragging = false;
					let startX, startY, imgX, imgY;
					let scale = 1;
					let positioned = false;

					img.onload = () => {
						img.style.left = '50%';
						img.style.top = '50%';
						img.style.transform = 'translate(-50%, -50%)';
					};

					img.addEventListener('mousedown', (e) => {
						isDragging = true;
						if (!positioned) {
							const rect = img.getBoundingClientRect();
							img.style.left = rect.left + 'px';
							img.style.top = rect.top + 'px';
							img.style.transform = 'scale(' + scale + ')';
							positioned = true;
						}
						startX = e.clientX - img.offsetLeft;
						startY = e.clientY - img.offsetTop;
						e.preventDefault();
					});

					document.addEventListener('mousemove', (e) => {
						if (!isDragging) return;
						imgX = e.clientX - startX;
						imgY = e.clientY - startY;
						img.style.left = imgX + 'px';
						img.style.top = imgY + 'px';
					});

					document.addEventListener('mouseup', () => {
						isDragging = false;
					});

					document.getElementById('zoomIn').addEventListener('click', () => {
						scale = Math.min(scale + 0.15, 5);
						img.style.transform = 'scale(' + scale + ')';
					});

					document.getElementById('zoomOut').addEventListener('click', () => {
						scale = Math.max(scale - 0.15, 0.1);
						img.style.transform = 'scale(' + scale + ')';
					});

					document.getElementById('resetBtn').addEventListener('click', () => {
						scale = 1;
						positioned = false;
						img.style.left = '50%';
						img.style.top = '50%';
						img.style.transform = 'translate(-50%, -50%)';
					});

					img.addEventListener('wheel', (e) => {
						e.preventDefault();
						if (e.deltaY < 0) {
							scale = Math.min(scale + 0.1, 5);
						} else {
							scale = Math.max(scale - 0.1, 0.1);
						}
						img.style.transform = 'scale(' + scale + ')';
					});
				</script>
			</body>
			</html>
		`;
	}
}
