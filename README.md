# Eight Agents, One Ticket

A statistical article and visualization generator that reads a completed Implementation Tournament run record, computes key development metrics, and renders them into an accessible, bilingual static HTML page with sequential-hue SVG charts.

## Features
- **Deterministic Prose Generation**: Resolves all figure placeholders in the prose from a structured JSON run record, ensuring no numbers are hand-typed.
- **Accessible SVG Charts**: Renders charts (time to first green, diff size, token spend, final rubric) using high-contrast, WCAG-compliant colors and sequential fills.
- **Data Table Fallbacks**: Embeds readable accessibility data tables behind details disclosure tags.
- **Theme support**: Supports responsive light and dark theme styling.

## Getting Started

### Prerequisites
- Node.js >= 22
- pnpm >= 9

### Installation
\`\`\`bash
pnpm install
\`\`\`

### Run Tests
\`\`\`bash
pnpm test
\`\`\`

### Generate Article
\`\`\`bash
pnpm build
\`\`\`

### Run Preview Server
\`\`\`bash
pnpm server
\`\`\`
