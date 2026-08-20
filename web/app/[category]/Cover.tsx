import Image from "next/image";
import { coverArt, monogram } from "@/lib/cover";

// Missing covers fall back to a deterministic duotone tile + monogram
// (see @/lib/cover), so a gap never looks broken.
export function Cover({
  cover,
  title,
  variant,
}: {
  cover: string | null;
  title: string;
  variant: "poster" | "thumb";
}) {
  if (cover)
    return (
      <Image
        src={cover}
        alt=""
        fill
        sizes={variant === "poster" ? "(max-width:560px) 30vw, 160px" : "48px"}
        className="object-cover"
      />
    );
  return (
    <div className="absolute inset-0 flex items-center justify-center" style={{ background: coverArt(title) }}>
      <span
        className="select-none font-semibold leading-none text-white/[.10]"
        style={{ fontSize: variant === "poster" ? "clamp(38px,7vw,54px)" : "22px" }}
        aria-hidden="true"
      >
        {monogram(title)}
      </span>
    </div>
  );
}
