const {
  createConnection,
  TextDocuments,
  DiagnosticSeverity,
  ProposedFeatures,
  Location,
  Range,
  URI
} = require('vscode-languageserver/node');

const { TextDocument } = require('vscode-languageserver-textdocument');

const { ParserStatus, YantraParser } = require('./YantraParser');

const connection = createConnection(ProposedFeatures.all);
const documents = new TextDocuments(TextDocument);

// Server properties

/** 
 * Per-document parser cache
 * @type {Map<URI, YantraParser>} */
const parserCache = new Map();

/**
 * @typedef {object} ServerConfig
 * @property {Number} errThreshold - Number of errors allowed before the Yantra parser stops
 */

/** Server configuration 
 * @type {ServerConfig}
 */
const serverConfig = {
  errThreshold: 25
};

// Utilities
function debounce(fn, delay) {
  const timers = new Map(); // uri → timeout

  return (uri, ...args) => {
    if (timers.has(uri)) {
      clearTimeout(timers.get(uri));
    }

    const timeout = setTimeout(() => {
      timers.delete(uri);
      fn(uri, ...args);
    }, delay);

    timers.set(uri, timeout);
  };
}

// Handlers
connection.onInitialize((params) => {
  serverConfig.errThreshold = params.initializationOptions?.errorThreshold ?? 25;

  return {
    capabilities: {
      textDocumentSync: documents.syncKind,
      definitionProvider: true,
      completionProvider: {
        resolveProvider: false,
        triggerCharacters: ['@', '%']
      },
      documentFormattingProvider: true,
      referencesProvider: true
    }
  };
});

documents.onDidOpen((event) => {
  const doc = event.document;
  connection.console.info(`Opened document ${doc.uri}`);
  updateDiagnostics(doc);
});

documents.onDidChangeContent((change) => {
  const doc = change.document;
  debouncedUpdateDiagnostics(doc);
});

documents.onDidClose((event) => {
  const doc = event.document;
  connection.sendDiagnostics({ uri: doc.uri, diagnostics: [] });
  parserCache.delete(doc.uri);
  connection.console.info(`Closed document ${doc.uri}`);
});

connection.onNotification('yantra/errorThresholdChanged', (params) => {
  if (serverConfig.errThreshold !== params.value) {
    serverConfig.errThreshold = params.value;
    parserCache.forEach((parser) => {
      parser.errorThreshold = serverConfig.errThreshold;
    });
  }
  connection.console.info(`Error threshold updated to ${params.value}`);
});

connection.onDefinition((params) => {
  const { textDocument, position } = params;
  const document = documents.get(textDocument.uri);
  if (!document) return null;

  const documentParser = parserCache.get(document.uri);
  if (!documentParser || documentParser.status !== ParserStatus.Ready) return null;

  const definitions = documentParser.getDefinitionsAt(position.line, position.character);

  return definitions.map(def => Location.create(
    textDocument.uri,
    Range.create(def.start, def.end)
  ));
});

connection.onCompletion((params) => {
  const { textDocument, position } = params;
  const document = documents.get(textDocument.uri);
  if (!document) return [];

  const parser = parserCache.get(textDocument.uri);
  if (!parser || parser.status !== ParserStatus.Ready) return [];

  const lineText = document.getText({
    start: { line: position.line, character: 0 },
    end: { line: position.line + 1, character: 0 }
  });

  return parser.getCompletionsAt(position.line, position.character, lineText);
});

connection.onDocumentFormatting((params) => {
  const { textDocument } = params;
  const document = documents.get(textDocument.uri);
  if (!document) return [];

  const parser = parserCache.get(textDocument.uri);
  if (!parser || parser.status !== ParserStatus.Ready) return [];

  const lines = parser.getFormattedLines();
  if (lines.length === 0) return lines;

  return [{
    range: {
      start: { line: 0, character: 0 },
      end: { line: document.lineCount, character: 0 }
    },
    newText: lines.join('\n')
  }];
});

connection.onReferences((params) => {
  const { textDocument, position, context } = params;
  const document = documents.get(textDocument.uri);
  if (!document) return [];

  const parser = parserCache.get(textDocument.uri);
  if (!parser || parser.status !== ParserStatus.Ready) return [];

  const references = parser.getReferencesForElementAt(
    position.line, position.character
  );

  return references.map(def => Location.create(
    textDocument.uri,
    Range.create(def.start, def.end)
  ));
});

function updateDiagnostics(document) {
  let documentParser = parserCache.get(document.uri);

  if (!documentParser) {
    documentParser = new YantraParser();
    documentParser.errorThreshold = serverConfig.errThreshold;
    parserCache.set(document.uri, documentParser);
  }

  const text = document.getText();
  documentParser.parse(text);

  const diagnostics = documentParser.getErrors().map((yantraerror) => ({
    severity: yantraerror.severity,
    range: yantraerror.range,
    message: yantraerror.message,
    source: 'yantra-language-server'
  }));

  connection.sendDiagnostics({ uri: document.uri, diagnostics });
}

const debouncedUpdateDiagnostics = debounce(updateDiagnostics, 300);

connection.console.info('Yantra Language Server starting...');

documents.listen(connection);
connection.listen();
