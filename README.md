# Java Editor for Mendix Studio Pro

A Mendix Studio Pro Extension that allows you to edit Java Action source files directly within Studio Pro, without needing to switch to an external IDE.

## Features

- **Edit Java Source in Studio Pro** - Right-click any Java Action in the App Explorer to open its source code in a dedicated editor tab
- **Monaco Editor** - Full-featured code editor (the same editor that powers VS Code) with:
  - Java syntax highlighting
  - Code folding
  - Minimap navigation
  - Bracket pair colorization
  - Find & Replace (Ctrl+F / Ctrl+H)
  - Go to line (Ctrl+G)
  - Multiple cursors (Ctrl+click)
  - Auto-indentation
- **Save Changes** - Save your edits with the Save button or Ctrl+S / Cmd+S
- **Dirty Indicator** - Visual indicator shows when you have unsaved changes
- **Status Bar** - Shows current cursor position and line count

## Installation

1. Build the extension (see [Building](#building) below) or download a release
2. Copy the contents of the `dist` directory to your Mendix app's extensions folder:
   ```
   <your-app>/extensions/JavaEditor/
   ```
3. Open your app in Mendix Studio Pro
4. Synchronize your app directory (press **F4**)

## Usage

### Prerequisites

Before you can edit a Java Action's source code, the Java file must exist on disk:

1. Create your Java Action in Studio Pro
2. Deploy to Eclipse (**F6**) - this generates the Java source files in the `javasource` folder

### Editing Java Actions

**Method 1: Context Menu (Recommended)**
1. In the App Explorer, find the Java Action you want to edit
2. Right-click on the Java Action
3. Select **"Edit Java Source"**
4. The Java file opens in a new editor tab

**Method 2: Extensions Menu**
1. Open a Java Action document in Studio Pro
2. Go to **Extensions → Java Editor → Edit Current Java Action**

### Saving Changes

- Click the **Save** button in the editor toolbar, or
- Press **Ctrl+S** (Windows) / **Cmd+S** (Mac)

The editor shows a dot (•) next to the filename when you have unsaved changes.

## Building

### Prerequisites

- Node.js 18 or later
- npm

### Build Steps

```bash
# Install dependencies
npm install

# Build the extension
npm run build

# Build with watch mode (for development)
npm run build:dev
```

The built extension will be in the `dist/JavaEditor` directory.

## Project Structure

```
JavaEditor/
├── src/
│   ├── main/
│   │   └── index.ts      # Main entry point - registers menus and handles file operations
│   ├── ui/
│   │   └── index.tsx     # UI entry point - Monaco Editor React component
│   └── manifest.json     # Extension manifest
├── dist/                 # Built extension output
├── build-extension.mjs   # Build script
└── package.json
```

## How It Works

1. The extension registers a context menu item on Java Action documents (`JavaActions$JavaAction`)
2. When triggered, it determines the Java file path based on the action name and module: `javasource/<ModuleName>/actions/<ActionName>.java`
3. Opens a new tab with the Monaco Editor
4. Uses the Mendix Extensions API Files API to read and write the Java source file

## License

MIT License - see [LICENSE](LICENSE) for details.

## Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.
