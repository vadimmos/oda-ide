import * as vsc from 'vscode';
import * as fs from 'fs';
import * as pathUtil from 'path';

const PREFIX = 'oda-';

export class OdaDefinitionProvider implements vsc.DefinitionProvider {
    async provideDefinition(document: vsc.TextDocument, position: vsc.Position, token: vsc.CancellationToken) {
        const componnetName = getComponnetName(document, position);
        if (!componnetName) return null;

        const reg = new RegExp(`<link rel="import" href="(.*/(${componnetName}|${componnetName.replace(PREFIX, '')}).html)">`);
        const match = document.getText().match(reg);
        let linkPath = match && match[1] || '';
        if (!pathUtil.isAbsolute(linkPath)) {
            linkPath = pathUtil.resolve(document.fileName.replace(pathUtil.basename(document.fileName), ''), linkPath);
        }

        // const findedUri = vsc.Uri.file(linkPath);
        // const findedDocument = await vsc.workspace.openTextDocument(findedUri);



        const componnetFilePath = await getComponentFilePath(componnetName, linkPath);
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

async function getComponentFilePath(componnetName: string, linkPath: string) {
    if (linkPath) {
        const fullPath = pathUtil.resolve(vsc.workspace.rootPath || '', linkPath);
        const check = checkFile(fullPath, componnetName);
        if (check) {
            return fullPath;
        }
    }


    const posibleFileNames = ['index.html', `${componnetName.replace(PREFIX, '')}.html`, `${PREFIX}${componnetName}.html`, `${componnetName}.html`];
    for (let key in posibleFileNames) {
        const file = await getComponentFile(posibleFileNames[key], componnetName);
        if (file) return file.fsPath;
    }
}

async function getComponentFile(fileName: string, componnetName: string) {
    const findedFiles = await vsc.workspace.findFiles(`**/${fileName}`, '**/node_modules/**');
    const docs = vsc.workspace.textDocuments;
    const file = findedFiles.find(f => {
        return checkFile(f.fsPath, componnetName);
    });
    return file;
}
function checkFile(filePath: string, componnetName: string) {
    const data = fs.readFileSync(filePath, 'utf8');
    const reg = new RegExp(`is\\s?:\\s?[\\"\\']${componnetName}[\\"\\']`, 'i');
    return reg.test(data);
}
