import {
  createConnection,
  TextDocuments,
  DiagnosticSeverity,
  ProposedFeatures,
  Location,
  Range,
  URI,
} from 'vscode-languageserver/node.js';

import { TextDocument } from 'vscode-languageserver-textdocument';

import { ParserStatus, YantraParser } from './YantraParser.js';

const connection = createConnection(ProposedFeatures.all);
const documents = new TextDocuments(TextDocument);

// Per-document parser cache
/** @type {Map<URI, YantraParser} */
const parserCache = new Map();

connection.onInitialize(() => {
  return {
    capabilities: {
      textDocumentSync: documents.syncKind,
      definitionProvider: true
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

  const diagnostics = documentParser.getErrors().map((yantraerror) => {
    return {
      severity: yantraerror.severity,
      range: yantraerror.range,
      message: yantraerror.message,
      source: 'yantra-language-server',
    }
  });

  connection.sendDiagnostics({ uri: document.uri, diagnostics });
}

// Handle Go to Definition
connection.onDefinition((params) => {
  const { textDocument, position } = params;
  const document = documents.get(textDocument.uri);
  if (!document) return null;

  const documentParser = parserCache.get(document.uri);
  if (!documentParser || documentParser.status != ParserStatus.Ready) return null;

  const word = documentParser.getWordAt(position.line, position.character);
  if (!word) return null;

  const definitions = documentParser.getDefinitionLocationsFor(word);
  if (!definitions || definitions.length === 0) return null;

  return definitions.map(def => Location.create(
    textDocument.uri,
    Range.create(def.start, def.end)
  ));
});

connection.console.info('Yantra Language Server starting...');

documents.listen(connection);
connection.listen();
