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

// Server properties

/** 
 * Per-document parser cache
 * @type {Map<URI, YantraParser} */
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
}

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

// Handle initialize
connection.onInitialize((params) => {
  serverConfig.errThreshold = params.initializationOptions?.errorThreshold ?? 25;

  return {
    capabilities: {
      textDocumentSync: documents.syncKind,
      definitionProvider: true,
      completionProvider: {
        resolveProvider: false,
        triggerCharacters: ['@', '%']
      }
    },
  };
});

// Handle document open
documents.onDidOpen((event) => {
  const doc = event.document;
  connection.console.info(`Opened document ${doc.uri}`);
  updateDiagnostics(doc);
});

// Handle document change
documents.onDidChangeContent((change) => {
  const doc = change.document;
  debouncedUpdateDiagnostics(doc);
});

// Handle document close
documents.onDidClose((event) => {
  const doc = event.document;
  connection.sendDiagnostics({ uri: doc.uri, diagnostics: [] });
  parserCache.delete(doc.uri);
  connection.console.info(`Closed document ${doc.uri}`);
});

// Handle settings change
connection.onNotification('yantra/errorThresholdChanged', (params) => {
  if (serverConfig.errThreshold != params.value) {
    serverConfig.errThreshold = params.value;
    parserCache.forEach((parser) => {
      parser.errorThreshold = serverConfig.errThreshold;
    });
  }
  connection.console.info(`Error threshold updated to ${params.value}`);
});

// Handle autocomplete request
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


// Diagnostic logic
function updateDiagnostics(document) {
  let documentParser = parserCache.get(document.uri);

  if (!documentParser) {
    documentParser = new YantraParser();
    documentParser.errorThreshold = serverConfig.errThreshold;
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

const debouncedUpdateDiagnostics = debounce(updateDiagnostics, 300);

// Handle Go to Definition
connection.onDefinition((params) => {
  const { textDocument, position } = params;
  const document = documents.get(textDocument.uri);
  if (!document) return null;

  const documentParser = parserCache.get(document.uri);
  if (!documentParser || documentParser.status != ParserStatus.Ready) return null;

  // const word = documentParser.getWordAt(position.line, position.character);
  // if (!word) return null;

  // const definitions = documentParser.getDefinitionLocationsFor(word);
  // if (!definitions || definitions.length === 0) return null;
  const definitions = documentParser.getDefinitionsAt(position.line, position.character);

  return definitions.map(def => Location.create(
    textDocument.uri,
    Range.create(def.start, def.end)
  ));
});

connection.console.info('Yantra Language Server starting...');

documents.listen(connection);
connection.listen();
