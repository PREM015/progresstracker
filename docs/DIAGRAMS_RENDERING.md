# Diagram Rendering

This repository includes Mermaid diagrams at:

- `.azure/architecture.copilotmd` (Markdown-wrapped version used for developer preview)
- `.azure/architecture.mmd` (clean mermaid source used for rendering images)
- `.azure/architecture-azure.mmd` (Azure topology variant in clean mermaid format)

Use these instructions to export visual images (SVG/PNG) from the Mermaid source.

Recommended (one-time) install:

- If you prefer a global install:

```bash
# macOS / Linux
npm install -g @mermaid-js/mermaid-cli
# Windows (cmd.exe)
npm install -g @mermaid-js/mermaid-cli
```

- Or use npx (recommended and simple; no permanent install):

Export the main architecture to both SVG and PNG from the clean `.mmd` source:

```bash
npx @mermaid-js/mermaid-cli -i .azure/architecture.mmd -o docs/architecture.svg
npx @mermaid-js/mermaid-cli -i .azure/architecture.mmd -o docs/architecture.png
```

Or run individually:

```bash
npm run diagrams:export:svg
npm run diagrams:export:png
```

Output files will be created in `docs/architecture.svg` and `docs/architecture.png`.

If the rendering fails because of Mermaid CLI or Node missing on your machine, you can install the CLI or run with `npx` directly:

```bash
npx @mermaid-js/mermaid-cli -i .azure/architecture.mmd -o docs/architecture.svg
```

Render the Azure topology variant from the clean `.mmd` source:

```bash
npx @mermaid-js/mermaid-cli -i .azure/architecture-azure.mmd -o docs/architecture-azure.svg
```

If you'd like, I can add pre-rendered images into `docs/` (SVG/PNG) — but rendering requires mermaid-cli in the environment. Let me know and I can attempt to pre-render and commit images here if allowed to run the generator in this workspace.

CI automatic rendering
---------------------

This repository includes a GitHub Actions workflow that automatically renders the Mermaid diagrams on push to `main` and for pull requests. The workflow will run `npm ci` and `npm run diagrams:render-all` and commit any changed outputs (`docs/architecture*.svg/png`) back to `main` so rendered diagrams are kept in sync.

If you prefer not to auto-commit generated files to `main`, we can update the workflow to only run validations in CI and leave image updates out of the repository.