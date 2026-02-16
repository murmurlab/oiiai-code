import * as vscode from 'vscode';
import { PanelViewProvider } from './panelViewProvider';
import { FloatingImagePanel } from './floatingImagePanel';
import { FlyingCat } from './flyingCat';

export function activate(context: vscode.ExtensionContext) {
	const provider = new PanelViewProvider(context.extensionUri);

	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider('oiiai-code.panelView', provider)
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('oiiai-code.openFloatingImage', async () => {
			const fileUri = await vscode.window.showOpenDialog({
				canSelectMany: false,
				filters: { 'Images': ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'] },
				title: 'Select an image'
			});
			if (fileUri && fileUri[0]) {
				FloatingImagePanel.createOrShow(context.extensionUri, fileUri[0]);
			}
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('oiiai-code.toggleFlyingCat', () => {
			FlyingCat.toggle(context.extensionUri, provider);
		})
	);
}

export function deactivate() {}
