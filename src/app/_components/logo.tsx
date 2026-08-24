import Image from "next/image";

/**
 * The Fund Room lockup.
 *
 * Two artwork variants exist because the wordmark is brand navy, which
 * disappears against a dark ground. `surface="dark"` swaps to the variant
 * whose wordmark is lifted to near-white; the gold and teal are identical
 * in both, so the mark reads the same either way.
 *
 * Only a lossy raster of the logo exists, so these were derived from it:
 * the white background was keyed out and the dark variant reconstructed by
 * recolouring the navy. If a vector ever turns up, replacing the files in
 * `public/brand/` is the whole job — nothing here changes.
 */

type Surface = "light" | "dark" | "auto";

const ASPECT = 1772 / 463;

export function Logo({
  height = 34,
  surface = "light",
  priority = false,
}: {
  height?: number;
  surface?: Surface;
  priority?: boolean;
}) {
  const width = Math.round(height * ASPECT);
  const alt = "The Fund Room";

  // `auto` follows the viewer's colour scheme. Two <source> elements rather
  // than a CSS swap so only the needed file is fetched.
  if (surface === "auto") {
    return (
      <picture>
        <source
          srcSet="/brand/logo-dark-400.png 400w, /brand/logo-dark-800.png 800w"
          media="(prefers-color-scheme: dark)"
          sizes={`${width}px`}
        />
        <img
          src="/brand/logo-400.png"
          srcSet="/brand/logo-400.png 400w, /brand/logo-800.png 800w"
          sizes={`${width}px`}
          alt={alt}
          width={width}
          height={height}
          style={{ height, width: "auto", display: "block" }}
        />
      </picture>
    );
  }

  const src = surface === "dark" ? "/brand/logo-dark-400.png" : "/brand/logo-400.png";

  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      priority={priority}
      style={{ height, width: "auto", display: "block" }}
    />
  );
}

/** The badge on its own, for tight spaces and avatars. */
export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <Image
      src="/brand/mark-180.png"
      alt="The Fund Room"
      width={size}
      height={size}
      style={{ display: "block" }}
    />
  );
}
