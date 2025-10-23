import {
  createConnection,
  TextDocuments,
  DiagnosticSeverity,
  ProposedFeatures,
} from 'vscode-languageserver/node.js';

import { TextDocument } from 'vscode-languageserver-textdocument';

// Placeholder: replace with your actual parser module
// import { parseYantra } from './parser.js';

const connection = createConnection(ProposedFeatures.all);
const documents = new TextDocuments(TextDocument);

// Per-document parser cache
const parserCache = new Map();

connection.onInitialize(() => {
  return {
    capabilities: {
      textDocumentSync: documents.syncKind,
    },
  };
});

// Handle document open
documents.onDidOpen((event) => {
  const doc = event.document;
  updateDiagnostics(doc);
});

// Handle document change
documents.onDidChangeContent((change) => {
  const doc = change.document;
  updateDiagnostics(doc);
});

// Handle document close
documents.onDidClose((event) => {
  parserCache.delete(event.document.uri);
});

// Diagnostic logic
function updateDiagnostics(document) {
  const text = document.getText();

  // Replace this with your actual parser logic
  const diagnostics = [];

  if (text.includes('TODO')) {
    diagnostics.push({
      severity: DiagnosticSeverity.Warning,
      range: {
        start: document.positionAt(text.indexOf('TODO')),
        end: document.positionAt(text.indexOf('TODO') + 4),
      },
      message: 'Found TODO comment',
      source: 'yantra',
    });
  }

  parserCache.set(document.uri, { parsed: true }); // Placeholder cache entry
  connection.sendDiagnostics({ uri: document.uri, diagnostics });
}

connection.console.info('Yantra Language Server starting...');

documents.listen(connection);
connection.listen();
