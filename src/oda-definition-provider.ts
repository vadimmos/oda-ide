import * as vsc from 'vscode';
import * as fs from 'fs';
import * as pathUtil from 'path';

export class OdaDefinitionProvider implements vsc.DefinitionProvider {
    async provideDefinition(document: vsc.TextDocument, position: vsc.Position, token: vsc.CancellationToken) {
        const componnetName = getComponnetName(document, position);
        if (!componnetName) return null;

        const componnetFilePath = await getComponentFilePath(componnetName, '');
        if (!componnetFilePath) return null;

        const declarationPos = new vsc.Position(0, 0);
        if (componnetFilePath && declarationPos) {
            return new vsc.Location(vsc.Uri.file(componnetFilePath), declarationPos);
        }
        return null;
    }
}
function getComponnetName(document: vsc.TextDocument, position: vsc.Position): string {
    const targetRange = document.getWordRangeAtPosition(position, /(<|'|"|,| ).+?(-.+?)*(>|'|"|,| )/);
    if (!targetRange) return '';
    const targetText = document.getText(targetRange)
    const formatedText = targetText
        .replace('<', '')
        .replace(/['",]/g, '')
        .replace('>', '')
        .replace('extends', '')
        .replace(':', '')
        .replace('/', '')
        .trim();
    if (formatedText === 'this') return '';
    return formatedText;
}

async function getComponentFilePath(componnetName: string, rootPath: String) {
    const PREFIX = 'oda-';
    const posibleFileNames = ['index.html'];
    if (componnetName.startsWith(PREFIX)) {
        posibleFileNames.push(`${componnetName}.html`);
    } else {
        posibleFileNames.push(`${PREFIX}${componnetName}.html`);
    }
    for (let key in posibleFileNames) {
        const file = await getComponentFile(posibleFileNames[key], componnetName);
        if (file) return file.fsPath;
    }
}

async function getComponentFile(fileName: string, componnetName: string) {
    const findedFiles = await vsc.workspace.findFiles(`**/${fileName}`, '**/node_modules/**');
    const docs = vsc.workspace.textDocuments;
    const file = findedFiles.find(f => {
        const data = fs.readFileSync(f.fsPath, 'utf8');
        const reg = new RegExp(`is\\s?:\\s?[\\"\\']${componnetName}[\\"\\']`, 'i');
        return reg.test(data);
    });
    return file;
}
