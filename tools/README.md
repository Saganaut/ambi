# doc-lint

A zero-dependency markdown linter that checks cross-file documentation integrity. Runs as a VS Code task and reports problems directly to the Problems panel.

## Requirements

- Node.js 18.17+
- `"type": "module"` in your `package.json`, or rename `doc-lint.js` to `doc-lint.mjs`

## Setup

Drop these three files into your project:

```
your-project/
├── doc-lint.js
├── .doc-lintrc.json
└── .vscode/
    └── tasks.json
```

## Running

**One-shot:** `Cmd/Ctrl+Shift+P` → `Tasks: Run Task` → `Lint Docs`

**Watch mode** (reruns on every `.md` save): `Tasks: Run Task` → `Watch Docs`  
Requires `nodemon`: `npm install -g nodemon`

Errors appear in the **Problems panel** (`Cmd/Ctrl+Shift+M`). Clicking an entry navigates to the file.

## What it checks

Every `.md` file must be **reachable from `README.md`** (configurable via `rootDoc`) through any chain of links. A file doesn't need to be linked directly from the root — it just needs a path back to it.

```
README.md → docs/setup.md → docs/api/auth.md   ✅  auth.md is reachable
README.md                   docs/orphan.md      ❌  orphan.md has no path back
```

### How to link files

Use a standard markdown link. The path is **relative to the file containing the link** (same as how links work in any markdown renderer):

```md
<!-- In README.md, linking to docs/setup.md -->

[Setup guide](docs/setup.md)

<!-- In docs/setup.md, linking to a sibling file -->

[Configuration](config.md)

<!-- In docs/setup.md, linking to a file in a subdirectory -->

[Auth reference](api/auth.md)

<!-- In docs/api/auth.md, linking back up a level -->

[Back to setup](../setup.md)
```

Both of these forms are accepted:

```md
[Setup guide](docs/setup.md) ✅
[Setup guide](./docs/setup.md) ✅
```

### What doesn't count

External URLs are ignored — only local `.md` file links are followed:

```md
[Setup](https://example.com/setup.md) ❌ external URL, skipped
```

## Ignoring a file

Add this comment anywhere in the **first 5 lines** of a file:

```md
<!-- doc-lint-ignore -->
```

That file will be silently skipped by the linter.

## Configuration

Create a `.doc-lintrc.json` in your project root. All fields are optional.

```json
{
  "rootDoc": "README.md",
  "excludeFolders": ["node_modules", ".git", "archive", "drafts"],
  "excludeFiles": ["CHANGELOG.md", "LICENSE.md"],
  "ignoreComment": "doc-lint-ignore"
}
```

| Field            | Type     | Default                    | Description                                    |
| ---------------- | -------- | -------------------------- | ---------------------------------------------- |
| `rootDoc`        | string   | `"README.md"`              | The file that must reference all others        |
| `excludeFolders` | string[] | `["node_modules", ".git"]` | Folders to skip entirely (not walked)          |
| `excludeFiles`   | string[] | `[]`                       | Specific files to skip (relative paths)        |
| `ignoreComment`  | string   | `"doc-lint-ignore"`        | Comment text that suppresses errors for a file |

### Custom config path

```bash
node doc-lint.js --config path/to/custom.json
```

## CI usage

The script exits with code `1` on errors and `0` on success, so it works as a standard CI step:

```yaml
# GitHub Actions example
- name: Lint docs
  run: node doc-lint.js
```

## Output format

Errors follow the standard `file:line:col: severity: message` pattern, which is what the VS Code problem matcher reads:

```
docs/setup.md:1:1: error: Not referenced in README.md — add a link or exclude this file
```

## Place .vscode/tasks.json in your project with this content to set up the lint and watch tasks:

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Lint Docs",
      "type": "shell",
      "command": "node doc-lint.js",
      "group": "build",
      "presentation": {
        "reveal": "always",
        "panel": "shared",
        "showReuseMessage": false,
        "clear": true
      },
      "problemMatcher": {
        "owner": "doc-lint",
        "fileLocation": ["relative", "${workspaceFolder}"],
        "pattern": {
          "regexp": "^(.*?):(\\d+):(\\d+):\\s+(error|warning):\\s+(.*)$",
          "file": 1,
          "line": 2,
          "column": 3,
          "severity": 4,
          "message": 5
        }
      }
    },
    {
      "label": "Watch Docs",
      "type": "shell",
      // Reruns the linter whenever any .md file or the config changes
      "command": "npx nodemon --watch '**/*.md' --watch '.doc-lintrc.json' --ext md,json --exec 'node doc-lint.js'",
      "group": "build",
      "isBackground": true,
      "presentation": {
        "reveal": "always",
        "panel": "dedicated",
        "showReuseMessage": false,
        "clear": true
      },
      "problemMatcher": {
        "owner": "doc-lint",
        "fileLocation": ["relative", "${workspaceFolder}"],
        // Background tasks need to know when a new lint cycle starts/ends
        // so VS Code can clear stale problems before showing new ones
        "background": {
          "activeOnStart": true,
          "beginsPattern": "^\\[nodemon\\] starting",
          "endsPattern": "^doc-lint:"
        },
        "pattern": {
          "regexp": "^(.*?):(\\d+):(\\d+):\\s+(error|warning):\\s+(.*)$",
          "file": 1,
          "line": 2,
          "column": 3,
          "severity": 4,
          "message": 5
        }
      }
    }
  ]
}
```
