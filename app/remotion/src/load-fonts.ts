/**
 * Explicit font loading. Fonts MUST exist in public/fonts.
 * There is intentionally no silent fallback: a missing font fails the render.
 *
 * Hardened for low-power devices (proot/Android): Chromium can restart the
 * tab mid-render under memory pressure, re-running this module while the
 * device is busy. Loading therefore retries per face and uses a generous
 * explicit delayRender timeout instead of failing the whole render on one
 * slow load.
 */
import {continueRender, delayRender, staticFile} from "remotion";

const faces: ReadonlyArray<[string, string, string]> = [
  ["Inter", "Inter-Regular.ttf", "400"],
  ["Inter", "Inter-SemiBold.ttf", "600"],
  ["Inter", "Inter-Bold.ttf", "700"],
  ["Inter", "Inter-Black.ttf", "900"],
];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const loadFace = async (family: string, file: string, weight: string) => {
  let lastError: unknown = null;
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const face = new FontFace(family, `url(${staticFile(`fonts/${file}`)})`, {
        weight,
      });
      await face.load();
      document.fonts.add(face);
      return;
    } catch (error) {
      lastError = error;
      await sleep(attempt * 2000);
    }
  }
  throw new Error(
    `BinB font loading failed for ${file}. Run installer step 04 to bundle Inter. ${String(lastError)}`,
  );
};

if (typeof document !== "undefined") {
  const handle = delayRender("Loading bundled Inter fonts", {
    timeoutInMilliseconds: 600000,
    retries: 2,
  });
  Promise.all(faces.map(([family, file, weight]) => loadFace(family, file, weight)))
    .then(() => continueRender(handle))
    .catch((error) => {
      throw new Error(String(error));
    });
}
