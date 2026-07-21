/**
 * Start loading bundled Inter faces without blocking Remotion's root.
 *
 * On Android/PRoot, Chromium can restart a renderer tab late in a long render.
 * A module-level delayRender then waits for a new FontFace request that may never
 * settle, turning a recoverable tab restart into a 5–10 minute timeout. Local
 * fonts normally resolve before the first frame; if a restarted tab is slow,
 * Chromium can safely use the declared fallback for that frame instead of
 * stalling the entire episode.
 */
import {staticFile} from "remotion";

const faces: ReadonlyArray<[string, string, string]> = [
  ["Inter", "Inter-Regular.ttf", "400"],
  ["Inter", "Inter-SemiBold.ttf", "600"],
  ["Inter", "Inter-Bold.ttf", "700"],
  ["Inter", "Inter-Black.ttf", "900"],
];

if (typeof document !== "undefined" && "fonts" in document) {
  void Promise.all(
    faces.map(async ([family, file, weight]) => {
      const face = new FontFace(family, `url(${staticFile(`fonts/${file}`)})`, {weight});
      await face.load();
      document.fonts.add(face);
    }),
  ).catch((error: unknown) => {
    // Never block a long production render on a recoverable renderer-tab reload.
    console.warn(`BinB bundled font preload did not finish: ${String(error)}`);
  });
}
