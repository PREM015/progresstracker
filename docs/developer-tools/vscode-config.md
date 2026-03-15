# 🛠️ VS Code Configuration

> **Last Updated**: 2026-03-15 | **Version**: 1.5.0

## ⚙️ Recommended Extensions

Add to `.vscode/extensions.json` (already in repo):

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "prisma.prisma",
    "bradlc.vscode-tailwindcss",
    "dsznajder.es7-react-js-snippets",
    "ms-vscode.vscode-typescript-next",
    "GitHub.copilot",
    "eamodio.gitlens",
    "formulahendry.auto-rename-tag",
    "usernamehw.errorlens"
  ]
}
```

---

## ⚙️ VS Code Settings

`.vscode/settings.json`:

```json
{
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.preferences.importModuleSpecifier": "non-relative",
  "tailwindCSS.experimental.classRegex": [
    ["cn\\(([^)]*)\\)", "'([^']*)'"],
    ["cva\\(([^)]*)\\)", "[\"'`]([^\"'`]*).*?[\"'`]"]
  ],
  "files.exclude": {
    "node_modules": true,
    ".next": true
  }
}
```

---

## 🔧 Useful Snippets

Create `.vscode/snippets.code-snippets`:

```json
{
  "Next.js API Route": {
    "prefix": "apiroute",
    "body": [
      "import { NextResponse } from 'next/server';",
      "import { getServerSession } from 'next-auth';",
      "import { authOptions } from '@/lib/auth';",
      "",
      "export async function GET(req: Request) {",
      "  const session = await getServerSession(authOptions);",
      "  if (!session) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });",
      "  ",
      "  try {",
      "    $0",
      "  } catch (error) {",
      "    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });",
      "  }",
      "}"
    ]
  },
  "React Server Component": {
    "prefix": "rsc",
    "body": [
      "interface Props {",
      "  $1",
      "}",
      "",
      "export default async function $2({ $3 }: Props) {",
      "  $0",
      "}"
    ]
  }
}
```

---

## 📎 Related Docs

- [Debug Guide](debug-guide.md)
- [Folder Structure](../architecture/03-folder-structure.md)
