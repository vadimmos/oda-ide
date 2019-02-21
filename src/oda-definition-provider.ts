import * as vsc from 'vscode';
import * as fs from 'fs';
import * as pu from 'path';
const positionInFile = require('position-in-file')


const PREFIX = 'oda-';
const _ROOT = pu.normalize(vsc.workspace.rootPath || '/');

export class OdaDefinitionProvider implements vsc.DefinitionProvider {
    async provideDefinition(document: vsc.TextDocument, position: vsc.Position, token: vsc.CancellationToken) {
        const docDir = document.fileName.replace(pu.basename(document.fileName), '');
        const componnetName = getComponnetName(document, position);
        if (!componnetName) return null;

        const reg = new RegExp(`<link rel="import" href="(.*/(${componnetName}|${componnetName.replace(PREFIX, '')}).html)">`);
        const match = document.getText().match(reg);
        let linkPath = pu.normalize(match && match[1] || '');

        if (pu.isAbsolute(linkPath)) {
            linkPath = _ROOT + linkPath;
        } else {
            linkPath = pu.normalize(document.fileName.replace(pu.basename(document.fileName), '') + linkPath);
        }

        const pos = positionInFile(new RegExp(`is ?: ?("|')${componnetName}("|')`), linkPath, { deep: false, ignore:[] });

        const startPos = new vsc.Position(Number(pos.length && Object.keys(pos[0].lines)[0]) - 1, 0);
        const endPos = new vsc.Position(Number(pos.length && Object.keys(pos[0].lines)[0])+10, 0);

        const componnetFilePath = await getComponentFilePath(componnetName, linkPath);
        if (!componnetFilePath) return null;
        const range = new vsc.Range(startPos, endPos);
        if (componnetFilePath && range) {
            return new vsc.Location(vsc.Uri.file(componnetFilePath), range);
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
        const check = checkFile(linkPath, componnetName);
        if (check) {
            return linkPath;
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
    try {
        const data = fs.readFileSync(filePath, 'utf8');
        const reg = new RegExp(`is\\s?:\\s?[\\"\\']${componnetName}[\\"\\']`, 'i');
        return reg.test(data);
    } catch (e) {
        console.error(e);
        return false;
    }
}
