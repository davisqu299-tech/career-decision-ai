import Image from "next/image";
import { cn } from "@/lib/utils";

interface LycheeLogoProps {
  className?: string;
}

const sizeMap = {
  header: { width: 36, height: 41, className: "h-9 w-auto" },
} as const;

export function LycheeLogo({ className }: LycheeLogoProps) {
  const { width, height, className: sizeClass } = sizeMap.header;

  return (
    <Image
      src="/lychee-logo.png"
      alt=""
      width={width}
      height={height}
      className={cn(sizeClass, className)}
      priority
    />
  );
}
