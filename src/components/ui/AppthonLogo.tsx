import { cn } from '../../lib/utils';

export function AppthonLogo({
  className,
  showMark = true,
}: {
  className?: string;
  showMark?: boolean;
}) {
  return (
    <span className={cn('inline-flex items-center gap-2.5 whitespace-nowrap shrink-0', className)}>
      {showMark && (
        <svg
          width="26"
          height="26"
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
          className="shrink-0"
        >
          <rect
            x="1.5"
            y="1.5"
            width="29"
            height="29"
            rx="8"
            fill="url(#appthon_bg)"
            stroke="rgba(255,255,255,0.28)"
            strokeWidth="1.5"
          />
          <path
            d="M16 6.5L23.5 23.5H19.8L18.2 19.6H13.8L12.2 23.5H8.5L16 6.5ZM16 12.1L14.7 16.4H17.3L16 12.1Z"
            fill="#FFFFFF"
          />
          <defs>
            <linearGradient
              id="appthon_bg"
              x1="0"
              y1="0"
              x2="32"
              y2="32"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#7024D8" />
              <stop offset="1" stopColor="#A64AFF" />
            </linearGradient>
          </defs>
        </svg>
      )}
      <span className="font-body text-[17px] font-semibold tracking-[0.14em] text-white">
        APPTHON
      </span>
    </span>
  );
}
