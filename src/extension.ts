'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vsc from 'vscode';
import { OdaDefinitionProvider } from './oda-definition-provider';

export function activate(context: vsc.ExtensionContext) {
	console.log('Congratulations, "oda-framework" extension is now active!');

	const disposable = vsc.languages.registerDefinitionProvider(
		{ language: 'html', scheme: 'file' },
		new OdaDefinitionProvider()
	)
	context.subscriptions.push(disposable);
}
export function deactivate() { }

