# Content and Campaign System

## Default: original BinB content

BetterInBrief exists to earn repeat attention from Tier 1–2 audiences. The normal production path is self-contained: original script, narration, captions, motion, argument devices, data treatment, packaging, and QC are produced locally. A source is required for factual claims; an external visual is not.

## Optional Evidence & Context Asset Layer

`visualAssets` is an optional scene-level brief. It exists only when an asset adds proof or real-world context. It must never be used to fill an empty composition.

Supported roles:

- `evidence`: proves a specific claim.
- `context`: grounds the argument in a real product, place, document, or system.
- `metaphor`: supports a defined narrative action without asserting a fact.

Supported direct-first kinds:

- `original_data_visual`
- `original_diagram`

External kinds are deliberate exceptions: `source_excerpt`, `ui_capture`, `map`, `public_domain`, `cc_licensed`, and `original_photo`. They require local files under `episodes/<id>/assets/`, rights metadata, and—where relevant—an episode `sourceId`.

Every declared asset has an `editorialPurpose`; factual assets also link to `claimIds`. CC material requires both `licenseUrl` and `attribution`. The validator rejects unknown claims, untracked external files, and incomplete rights records.

## Campaign adapter

A `campaign` episode remains separate from BinB original content. It may only run in the mature account phase and must use `formatFamily: campaign_clip`. Before lock, it requires a verified brief, verified rights, platform, brief URL, and disclosure text.

The campaign brief is carried through compile and is emitted as `campaign-brief.json` inside the publish package. It is a manual review artifact—not an uploader and not proof that a campaign has been approved.

## Efficient production commands

```bash
# Render one complete scene after compile, without rendering the episode.
node app/cli/binb.mjs preview Seed_003 --scene S03

# Render a short frame range to inspect a boundary or transition.
node app/cli/binb.mjs preview Seed_003 --frames 300-389

# Reuse existing visual mezzanine; only mix, encode, QC, and package.
node app/cli/binb.mjs remix Seed_003
```

Preview and chunk render use the renderer health guard. It logs a warning after 45 seconds without renderer output and terminates a stalled chunk after 120 seconds; only that chunk is retried. Chunk cache compatibility remains tied to render props, frame count, chunk size, and renderer cache version.
