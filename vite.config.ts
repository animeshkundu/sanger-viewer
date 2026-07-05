import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'

export default defineConfig(({ command }) => ({
  base: command === 'serve' ? '/' : '/sanger-viewer/',
  build: {
    rollupOptions: {
      input: {
        app: fileURLToPath(new URL('./index.html', import.meta.url)),
        blog: fileURLToPath(new URL('./blog/index.html', import.meta.url)),
        blogEntry: fileURLToPath(new URL('./blog/2026-07-03-v0-foundation/index.html', import.meta.url)),
        blogTabletTouchEntry: fileURLToPath(new URL('./blog/2026-07-03-v1-tablet-touch-pass/index.html', import.meta.url)),
        blogUxA11yEntry: fileURLToPath(new URL('./blog/2026-07-03-v2-ux-a11y/index.html', import.meta.url)),
        blogPerfEntry: fileURLToPath(new URL('./blog/2026-07-03-v3-performance/index.html', import.meta.url)),
        blogE2eEntry: fileURLToPath(new URL('./blog/2026-07-03-v4-e2e/index.html', import.meta.url)),
        blogStrandToggleEntry: fileURLToPath(new URL('./blog/2026-07-03-v5-strand-toggle/index.html', import.meta.url)),
        blogQualityTrimmingEntry: fileURLToPath(new URL('./blog/2026-07-03-v7-quality-trimming/index.html', import.meta.url)),
        blogMetadataEntry: fileURLToPath(new URL('./blog/2026-07-03-v9-metadata/index.html', import.meta.url)),
        blogMultiTraceEntry: fileURLToPath(new URL('./blog/2026-07-03-v10-multi-trace/index.html', import.meta.url)),
        blogMixedBaseEntry: fileURLToPath(new URL('./blog/2026-07-03-v11-mixed-base/index.html', import.meta.url)),
        blogAnnotationTrackEntry: fileURLToPath(new URL('./blog/2026-07-03-v12-annotation-track/index.html', import.meta.url)),
        blogEditableBasesEntry: fileURLToPath(new URL('./blog/2026-07-03-v13-editable-bases/index.html', import.meta.url)),
        blogQualityTrackEntry: fileURLToPath(new URL('./blog/2026-07-03-v14-quality-track/index.html', import.meta.url)),
        blogQaPolishEntry: fileURLToPath(new URL('./blog/2026-07-04-v15-qa-polish/index.html', import.meta.url)),
        blogBaseInspectorEntry: fileURLToPath(new URL('./blog/2026-07-04-v16-base-inspector/index.html', import.meta.url)),
        blogConsensusEntry: fileURLToPath(new URL('./blog/2026-07-04-v17-consensus/index.html', import.meta.url)),
        blogAuditEntry: fileURLToPath(new URL('./blog/2026-07-04-v17-perf-reliability-audit/index.html', import.meta.url)),
        blogDesignResearchEntry: fileURLToPath(new URL('./blog/2026-07-04-v17-design-research/index.html', import.meta.url)),
        blogPrintEntry: fileURLToPath(new URL('./blog/2026-07-04-v18-print/index.html', import.meta.url)),
        blogToolbarHierarchyEntry: fileURLToPath(new URL('./blog/2026-07-04-v19-toolbar-hierarchy/index.html', import.meta.url)),
        blogFirstImpressionEntry: fileURLToPath(new URL('./blog/2026-07-04-v18-first-impression/index.html', import.meta.url)),
        blogPermalinksEntry: fileURLToPath(new URL('./blog/2026-07-04-v19-permalinks/index.html', import.meta.url)),
        blogPerfHarnessEntry: fileURLToPath(new URL('./blog/2026-07-04-v19-perf-harness/index.html', import.meta.url)),
        blogPerfHotPathsEntry: fileURLToPath(new URL('./blog/2026-07-04-v20-perf-hot-paths/index.html', import.meta.url)),
        blogReferenceAlignmentEntry: fileURLToPath(new URL('./blog/2026-07-04-v21-reference-alignment/index.html', import.meta.url)),
        blogAnnotationA11yEntry: fileURLToPath(new URL('./blog/2026-07-04-v22-annotation-a11y/index.html', import.meta.url)),
        blogContigAssemblyEntry: fileURLToPath(new URL('./blog/2026-07-04-v22-contig-assembly/index.html', import.meta.url)),
        blogPrimerDesignEntry: fileURLToPath(new URL('./blog/2026-07-04-v23-primer-design/index.html', import.meta.url)),
        blogDesignSystemEntry: fileURLToPath(new URL('./blog/2026-07-04-v24-design-system/index.html', import.meta.url)),
        blogPlasmidMapEntry: fileURLToPath(new URL('./blog/2026-07-04-v25-plasmid-map/index.html', import.meta.url)),
        blogManualAssemblyControlsEntry: fileURLToPath(new URL('./blog/2026-07-04-v26-manual-assembly-controls/index.html', import.meta.url)),
        blogCloneScreenEntry: fileURLToPath(new URL('./blog/2026-07-04-v27-clone-screen/index.html', import.meta.url)),
        blogWorkspaceShellEntry: fileURLToPath(new URL('./blog/2026-07-04-v27-workspace-shell/index.html', import.meta.url)),
        blogUxGalleryEntry: fileURLToPath(new URL('./blog/2026-07-05-v28-ux-gallery/index.html', import.meta.url)),
        blogWorkspacePolishEntry: fileURLToPath(new URL('./blog/2026-07-05-v28-workspace-polish/index.html', import.meta.url)),
        blogFrontDoorPolishEntry: fileURLToPath(new URL('./blog/2026-07-05-v29-front-door-polish/index.html', import.meta.url)),
        blogNextImprovementsEntry: fileURLToPath(new URL('./blog/2026-07-05-v30-next-improvements-research/index.html', import.meta.url))
      }
    }
  },
  test: {
    include: ['tests/**/*.test.ts'],
    exclude: ['tests/e2e/**'],
    environment: 'node'
  }
}))
