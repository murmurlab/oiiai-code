"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
const vscode = require("vscode");
const panelViewProvider_1 = require("./panelViewProvider");
const floatingImagePanel_1 = require("./floatingImagePanel");
const flyingCat_1 = require("./flyingCat");
function activate(context) {
    const provider = new panelViewProvider_1.PanelViewProvider(context.extensionUri);
    context.subscriptions.push(vscode.window.registerWebviewViewProvider('oiiai-code.panelView', provider));
    context.subscriptions.push(vscode.commands.registerCommand('oiiai-code.openFloatingImage', async () => {
        const fileUri = await vscode.window.showOpenDialog({
            canSelectMany: false,
            filters: { 'Images': ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'] },
            title: 'Select an image'
        });
        if (fileUri && fileUri[0]) {
            floatingImagePanel_1.FloatingImagePanel.createOrShow(context.extensionUri, fileUri[0]);
        }
    }));
    context.subscriptions.push(vscode.commands.registerCommand('oiiai-code.toggleFlyingCat', () => {
        flyingCat_1.FlyingCat.toggle(context.extensionUri, provider);
    }));
}
exports.activate = activate;
function deactivate() { }
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map