import path from 'path';
import { fileURLToPath } from 'url';
import * as vscode from 'vscode';
import { LanguageClient,  TransportKind } from 'vscode-languageclient/node.js';

let client;
let outputChannel;

export async function activate(context) {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const serverModule = path.join(__dirname, '..', 'server', 'server.js');

  // Create the output channel
  outputChannel = vscode.window.createOutputChannel('Yantra Language Server');
  outputChannel.appendLine('Activating Yantra Language Server extension…');

  const serverOptions = {
    run: { module: serverModule, transport: TransportKind.ipc },
    debug: { module: serverModule, transport: TransportKind.ipc }
  };

  const clientOptions = {
    documentSelector: [{ scheme: 'file', language: 'yantra' }],
    outputChannel
  };

  client = new LanguageClient('yantraLanguageServer', 'Yantra Language Server', serverOptions, clientOptions);
  context.subscriptions.push(client.start());
}

export function deactivate() {
  outputChannel.appendLine('Deactivating Yantra Language Server extension…');
  return client ? client.stop() : undefined;
}
