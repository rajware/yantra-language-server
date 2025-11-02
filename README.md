# Yantra Language Server

![Yantra Logo](icon.png)

The Yantra Language Server is a Visual Studio Code extension that brings intelligent editing support to the grammar language of [Yantra](https://github.com/TantrixAuto/yantra) — a powerful LALR(1) parser generator and compiler compiler written in C++.

This extension is a companion product to the core Yantra toolchain, offering real-time feedback and authoring assistance for `.yantra` grammar files.


## ✨ Features

- **Syntax Highlighting**: Powered by a TextMate grammar and semantic tokens.
- **Diagnostics**: Inline error reporting based on Yantra’s parser feedback.
- **Formatting**: Document-wide formatting for consistent layout and readability.
- **Structured Editing**: Go To Definition, Find All References, Rename Symbol, Outline View
- **Completions**: Intelligent suggestions for grammar constructs and keywords.

## 📦 Installation

1. Download the .vsix file from the [latest release](https://github.com/rajware/yantra-language-server/releases/latest).
2. Run the following:

    ```bash
      code --install-extension yantra-language-server-VERSION.vsix
    ```

3. Open Visual Studio Code.
4. Open any `.yantra` or `.y` file to activate the extension.


## 🧠 About Yantra

Yantra is a modern LALR(1) parser generator with built-in support for:

- Unicode-aware lexing
- AST construction and traversal
- Multi-mode lexers and lexer-driven parsing
- Optional amalgamated output for single-file deployment

Learn more at the [Yantra GitHub repository](https://github.com/TantrixAuto/yantra).

## 🏷️ Release Management

This repository will generally shadow the major and minor releases of Yantra itself. Patch versions may be different.

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
