# 2026-07-21 — Phred quality heatmap

## Summary

The existing variable-height quality bars now include a fixed-height,
color-coded heatmap strip with exact per-base Phred scores on hover.

## Impact

Low-confidence calls are visible as color changes without comparing bar
heights. The heatmap follows the same quality-track toggle, viewport, strand,
and trim state as the existing bars.

## Root cause / decision path

Variable-height bars communicate relative quality but make isolated
low-confidence calls harder to scan. Replacing them would have removed a
working visualization and its established contract, so the heatmap was added
to the same track instead.

## Fix / outcome

Pure CSS-pixel cell geometry is shared by canvas rendering and pointer hit
testing. Cells use the existing four quality-tier theme tokens and repaint with
theme changes. Missing quality arrays produce an empty heatmap, and hover
tooltips report the exact integer score and 1-based base position.

## Follow-ups

None.

## Links

- PR: Not yet opened
- Issue: Not provided
- ADR / plan / research: None
