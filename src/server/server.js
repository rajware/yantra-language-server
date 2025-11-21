const {
  createConnection,
  TextDocuments,
  ProposedFeatures,
  Location,
  Range,
  URI,
  TextDocumentSyncKind
} = require('vscode-languageserver/node');

const { TextDocument } = require('vscode-languageserver-textdocument');

const { ParserStatus, YantraParser } = require('./parser/yantraparser');

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
      textDocumentSync: TextDocumentSyncKind.Full,
      definitionProvider: true,
      completionProvider: {
        resolveProvider: false,
        triggerCharacters: ['@', '%']
      },
      documentFormattingProvider: true,
      referencesProvider: true,
      renameProvider: true,
      documentSymbolProvider: true,
      semanticTokensProvider: {
        legend: {
          tokenTypes: YantraParser.semanticTokenTypes,
          tokenModifiers: YantraParser.semanticTokenModifiers
        },
        full: true
      }
    }
  };
});

// Document synchronization and diagnostics
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

/**
 * 
 * @param {TextDocument} document 
 */
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

// Custom notification for settings
connection.onNotification('yantra/errorThresholdChanged', (params) => {
  if (serverConfig.errThreshold !== params.value) {
    serverConfig.errThreshold = params.value;
    parserCache.forEach((parser) => {
      parser.errorThreshold = serverConfig.errThreshold;
    });
  }
  connection.console.info(`Error threshold updated to ${params.value}`);
});

// Go to Definition
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

// Autocomplete

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

// Format document
connection.onDocumentFormatting((params) => {
  const { textDocument, options } = params;
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

// Get all references
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

// Rename Symbol
connection.onRenameRequest((params) => {
  const { textDocument, position, newName } = params;
  const document = documents.get(textDocument.uri);
  if (!document) return null;

  const parser = parserCache.get(textDocument.uri);
  if (!parser || parser.status !== ParserStatus.Ready) return null;

  const edits = parser.renameSymbolAt(
    position.line,
    position.character,
    newName
  );

  const workspaceEdit = { changes: {} };
  workspaceEdit.changes[document.uri] = edits;
  return workspaceEdit;
});

// Outline View
connection.onDocumentSymbol((params) => {
  const { textDocument } = params;
  const document = documents.get(textDocument.uri);
  if (!document) return [];

  const parser = parserCache.get(textDocument.uri);
  if (!parser || parser.status !== ParserStatus.Ready) return [];

  return parser.getDocumentSymbols();
});

// Semantic tokens
connection.languages.semanticTokens.on((params) => {
  const document = documents.get(params.textDocument.uri);
  if (!document) return { data: [] };

  const parser = parserCache.get(params.textDocument.uri);
  if (!parser || parser.status !== ParserStatus.Ready) return { data: [] };

  return encodeSemanticTokens(parser.getSemanticTokens());
});

function encodeSemanticTokens(tokens) {
  const data = [];
  let prevLine = 0;
  let prevChar = 0;

  for (const token of tokens) {
    const { start, end } = token.range;
    const line = start.line;
    const char = start.character;
    const length = end.character - start.character;

    const deltaLine = line - prevLine;
    const deltaChar = deltaLine === 0 ? char - prevChar : char;

    const modifierMask = token.tokenModifiers.reduce((mask, mod) => mask | (1 << mod), 0);

    data.push(deltaLine, deltaChar, length, token.tokenType, modifierMask);

    prevLine = line;
    prevChar = char;
  }

  return { data };
}

connection.console.info('Yantra Language Server starting...');

documents.listen(connection);
connection.listen();
