# Yantra Language Server

The Yantra Language Server is a Visual Studio Code extension that brings intelligent editing support to the [Yantra grammar language](https://github.com/TantrixAuto/yantra) — a powerful LALR(1) parser generator and compiler compiler written in C++.

This extension is a companion product to the core Yantra toolchain, offering real-time feedback and authoring assistance for `.yantra` grammar files.


## ✨ Features

- **Syntax Highlighting**: Powered by a TextMate grammar for `.y` and `.yantra` files.
- **Completions**: Intelligent suggestions for grammar constructs and keywords.
- **Diagnostics**: Inline error reporting based on Yantra’s parser feedback.
- **Configuration**: Adjustable error threshold via `yantra.errorThreshold`.
- **Formatting**: Document-wide formatting for consistent layout and readability.
- **Go To Definition**: Finding definitions for tokens, rules, functions and walkers.


## 🧠 About Yantra

Yantra is a modern LALR(1) parser generator with built-in support for:

- Unicode-aware lexing
- AST construction and traversal
- Multi-mode lexers and lexer-driven parsing
- Optional amalgamated output for single-file deployment

Learn more at the [Yantra GitHub repository](https://github.com/TantrixAuto/yantra).


## 📁 File Support

This extension activates for files with the following extensions:

- `.yantra`
- `.y`


## ⚙️ Settings

You can configure the extension via VS Code settings:

```json
"yantra.errorThreshold": 25
```

This controls how many diagnostics are shown before suppression.
