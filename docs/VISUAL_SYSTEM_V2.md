# BinB Visual Operating System v2

## Purpose

The renderer must produce a recognizable BinB episode without turning every idea into the same black-or-white slide. The system keeps the core brand (Inter, black / warm white / orange, kinetic captions) and varies the **world** behind each argument.

## Visual lanes

Each scene may provide an optional `visualSystem` object. If it is omitted, the renderer assigns a type-safe default based on scene type.

| Lane | Use when the argument needs | Default scene use |
|---|---|---|
| `editorial_collage` | tension, juxtaposition, cultural context | correction |
| `evidence_desk` | an auditable fact, report, or source | data proof |
| `diagram_world` | mechanism, task flow, comparison | task / comparison |
| `object_metaphor` | a conceptual opening image | hook |
| `interface_reality` | tools, platforms, AI, digital workflows | optional author choice |
| `cinematic_context` | real-world atmosphere or human stakes | optional author choice |
| `data_theatre` | a high-stakes number or ranking | optional author choice |
| `editorial_type` | a clear statement, payoff, or close | outcome / close |

## Authoring contract

```json
{
  "id": "S03",
  "type": "data_proof",
  "surface": "dark",
  "visualSystem": {
    "lane": "evidence_desk",
    "density": "editorial",
    "seed": "labor-report",
    "material": "scan"
  }
}
```

All four keys are optional. When a key is omitted, the engine uses a deterministic default. `seed` is stable per scene and prevents repeated procedural background arrangements.

## Mandatory rules

1. A scene is never only a flat color: it receives atmosphere, material, editorial marks, and depth.
2. A visual lane is chosen for the **argument**, not for decoration.
3. Use `quiet` for payoff or reflection, `editorial` for standard explanation, and `dense` only for escalation or data-heavy proof.
4. Do not repeat the same lane more than twice in a row; use a contrasting lane to create rhythm.
5. Captions remain the primary accessibility layer. Visual texture must stay behind captions and text.
6. Real footage, source captures, or images added later must be rights-cleared and specific to the claim. Never insert generic office B-roll simply to fill the frame.

## Visual QC checklist

- Background has at least three active layers: atmosphere, material, and context/marks.
- Hero information remains legible in the 9:16 safe area.
- The background does not compete with kinetic captions.
- No repeated seed inside one episode.
- A data claim uses `evidence_desk` or `data_theatre`.
- A mechanism/comparison uses `diagram_world` or an explicit alternative.
- A final statement uses a quieter lane than the immediately preceding proof scene.

## Current implementation

`VisualWorld.tsx` provides procedural editorial worlds that are lightweight enough for the Termux/Remotion build target: paper, scan, grid, grain, halftone, evidence frames, diagram nodes, interface marks, depth overlays, and deterministic scene variation. It does not invent fake sources or fake photography.

The next asset phase can add rights-cleared photography, genuine source screenshots, and topic-specific footage under the same lane contract without changing scene APIs.
