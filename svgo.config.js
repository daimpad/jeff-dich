// SVG-Optimierung für shared/brand (npm run svg). Bewusst schonend:
// IDs, Gruppen und einzelne Pfade bleiben erhalten, damit Teile animierbar bleiben.
export default {
  multipass: true,
  plugins: [
    {
      name: 'preset-default',
      params: {
        overrides: {
          cleanupIds: false,
          collapseGroups: false,
          mergePaths: false,
          // Illustrator-Klassen (.st0, .cls-1) in Attribute umwandeln – verhindert Kollisionen
          // zwischen mehreren inline eingebundenen SVGs
          inlineStyles: { onlyMatchedOnce: false },
        },
      },
    },
    'convertStyleToAttrs',
    // IDs mit Dateinamen präfixen (z. B. vulkan__Ebene_6), damit sie seitenweit eindeutig sind
    { name: 'prefixIds', params: { delim: '__', prefixClassNames: true } },
  ],
};
