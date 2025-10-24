import {
  createConnection,
  TextDocuments,
  DiagnosticSeverity,
  ProposedFeatures,
} from 'vscode-languageserver/node.js';

import { TextDocument } from 'vscode-languageserver-textdocument';

import { YantraParser } from './YantraParser.js';

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
  let documentParser = parserCache.get(document.uri);

  if (!documentParser) {
    documentParser = new YantraParser();
    parserCache.set(document.uri, documentParser);
  }

  const text = document.getText();
  documentParser.parse(text);

  const diagnostics = documentParser.errors().map((yantraerror) => {
    return {
      severity: yantraerror.severity,
      range: yantraerror.range,
      message: yantraerror.message,
      source: 'yantra-language-server',
    }
  });

  connection.sendDiagnostics({ uri: document.uri, diagnostics });
}

connection.console.info('Yantra Language Server starting...');

documents.listen(connection);
connection.listen();
