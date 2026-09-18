"use client";

import Image from "next/image";

export function BackgroundMascot() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden select-none flex items-center justify-center opacity-[0.04] transition-opacity duration-1000"
    >
      {/* Subtle tech background circle glow */}
      <div className="absolute w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-purple-200 to-cyan-200 blur-3xl" />

      {/* Robot Mascot Watermark - guaranteed zero interference with reading */}
      <div className="relative w-[340px] h-[340px] sm:w-[480px] sm:h-[480px] md:w-[620px] md:h-[620px]">
        <Image
          src="/images/cipuy-robot.png"
          alt="Cipuy Robot Background Watermark"
          fill
          className="object-contain filter grayscale contrast-125"
          priority
        />
      </div>
    </div>
  );
}

