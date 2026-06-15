export function LoginLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <path
        d="M20 72V28C20 24 24 20 30 20H54C58 20 60 22 60 26V74C60 78 58 80 54 80H30C24 80 20 76 20 72Z"
        fill="#064e3b"
      />
      <path
        d="M60 26C60 22 62 20 66 20H90C96 20 100 24 100 28V72C100 76 96 80 90 80H66C62 80 60 78 60 74V26Z"
        fill="#0d7a5f"
      />
      <path
        d="M58 26V74"
        stroke="#fdf8f0"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M60 18C72 10 84 12 88 22C82 20 70 18 60 22"
        fill="#d4a853"
      />
      <circle cx="74" cy="14" r="5" fill="#d4a853" />
      <path
        d="M74 9L75 12L78 12L76 14L77 17L74 15L71 17L72 14L70 12L73 12L74 9Z"
        fill="#064e3b"
      />
    </svg>
  );
}
