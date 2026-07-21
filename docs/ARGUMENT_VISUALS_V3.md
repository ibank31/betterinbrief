# BinB Argument Visuals v3

## Why this layer exists

A living background is not a story. The v2 world layer removed the empty-slide problem, but a viewer still needs to see the **argument doing something**. v3 adds a `NarrativeDevice`: a concrete, animated visual metaphor that sits behind the claim without inventing facts or adding stock footage.

## Available devices

| Device | What it communicates | Best fit |
|---|---|---|
| `two_tracks` | duplication versus branching judgment | a split, choice, or divergence |
| `evidence_scan` | a report, source, or finding being examined | research and numerical proof |
| `decision_graph` | choices, dependencies, and downstream consequences | comparison, correction, trade-off |
| `task_system` | components in a system or workflow | job/task and process breakdowns |
| `priority_signal` | a rising priority or hierarchy shift | outcome, takeaway, closing claim |

## Authoring

The device is optional. Existing episodes receive a scene-type default. A new episode can deliberately choose a different metaphor inside `visualSystem`:

```json
"visualSystem": {
  "lane": "diagram_world",
  "density": "editorial",
  "seed": "supply-chain-split",
  "material": "grid",
  "device": "decision_graph"
}
```

## Global rules

1. A scene needs a **hero visual action**, not only a heading and decorative texture.
2. The chosen device must explain the sentence: it cannot be random ornament.
3. Do not repeat the same device more than twice in one episode.
4. A data claim should use `evidence_scan` or a topic-specific source capture.
5. A comparison should show a mechanism, fork, process, or consequence—not just two labels and bars.
6. A device never replaces factual proof. Source text, screenshot, or cleared real-world asset should be added when the claim requires evidence.

## Next asset phase

Code-native devices are the default because they are fast, rights-safe, and render locally. When an idea benefits from reality, the same contract can add cleared footage, genuine report excerpts, maps, screenshots, product imagery, or original photography as a topic-specific layer. Never add generic office footage merely to fill space.
