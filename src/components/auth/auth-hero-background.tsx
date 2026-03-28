'use client';

/** Full-height hero image for auth split (login / signup). */
const HERO_IMG = '/assets/2019_FedEx_777_S6A1175.jpg';

export function AuthHeroBackground() {
  return (
    <img
      src={HERO_IMG}
      alt=""
      className="pointer-events-none h-full w-full object-cover"
      decoding="async"
    />
  );
}
