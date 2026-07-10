# Ocho Agentes, Un Ticket (Eight Agents, One Ticket)

Un generador estadístico de artículos y visualizaciones que lee un registro de torneo de implementación completado, calcula métricas clave de desarrollo y las genera en una página HTML estática accesible y bilingüe con gráficos SVG de tono secuencial.

## Características
- **Generación de prosa determinista**: Resuelve todos los marcadores estadísticos (placeholders) en la prosa a partir del JSON de ejecución, asegurando la trazabilidad.
- **Gráficos SVG accesibles**: Genera gráficos (tiempo hasta verde, líneas cambiadas, coste en tokens y rúbrica final) que cumplen los contrastes de accesibilidad WCAG y usan rellenos secuenciales de un solo tono.
- **Tablas de datos alternativas**: Inserta tablas HTML legibles como alternativa accesible dentro de elementos disclosure.
- **Soporte de temas**: Soporta estilos adaptables para temas claro y oscuro.

## Comenzando

### Prerrequisitos
- Node.js >= 22
- pnpm >= 9

### Instalación
\`\`\`bash
pnpm install
\`\`\`

### Ejecución de Pruebas
\`\`\`bash
pnpm test
\`\`\`

### Generación del Artículo
\`\`\`bash
pnpm build
\`\`\`

### Servidor de Vista Previa
\`\`\`bash
pnpm server
\`\`\`
