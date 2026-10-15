
import Link from "next/link";

type Mode = "daily" | "unlimited";

type GameHeaderProps = {
  mode: Mode;
};

export function GameHeader({ mode }: GameHeaderProps) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-5 border-b border-white/10 py-6">
      <Link
        href="/"
        aria-label="Play Obscure home"
        className="text-[27px] font-black tracking-[-0.075em] text-[#F0F2EA]"
      >
        obscure<span className="text-[#CCF28A]">.</span>
      </Link>

      <nav
        aria-label="Game navigation"
        className="flex flex-wrap items-center gap-5 text-sm sm:gap-7"
      >
        <Link
          href="/daily"
          aria-current={mode === "daily" ? "page" : undefined}
          className={
            mode === "daily"
              ? "font-semibold text-[#CCF28A]"
              : "text-white/50 transition hover:text-white"
          }
        >
          Daily
        </Link>
        <Link
          href="/words"
          aria-current={mode === "unlimited" ? "page" : undefined}
          className={
            mode === "unlimited"
              ? "font-semibold text-[#CCF28A]"
              : "text-white/50 transition hover:text-white"
          }
        >
          Unlimited
        </Link>
        <Link
          href="/arcade"
          className="text-white/50 transition hover:text-white"
        >
          Arcade
        </Link>
      </nav>
    </header>
  );
}

type GameProgressProps = {
  completed: number;
  total?: number;
  score: number;
  best?: number | null;
  finished?: boolean;
};

export function GameProgress({
  completed,
  total = 5,
  score,
  best,
  finished = false,
}: GameProgressProps) {
  return (
    <div className="mb-7">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 text-xs">
        <span className="font-semibold uppercase tracking-[0.13em] text-white/50">
          {finished
            ? "Run complete"
            : `Question ${Math.min(completed + 1, total)} of ${total}`}
        </span>

        <div className="flex items-center gap-5">
          {best !== null && best !== undefined && (
            <span className="text-white/40">
              Best <strong className="text-white/75">{best}</strong>
            </span>
          )}

          <span className="text-white/45">
            Score{" "}
            <strong className="text-lg text-[#CCF28A]">
              {score}
            </strong>
            <span className="text-white/30"> / {total * 100}</span>
          </span>
        </div>
      </div>

      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: `repeat(${total}, minmax(0, 1fr))` }}
        aria-label={`${completed} of ${total} questions completed`}
      >
        {Array.from({ length: total }, (_, index) => (
          <div
            key={index}
            className={`h-1.5 rounded-full transition-colors duration-300 ${
              index < completed
                ? "bg-[#CCF28A]"
                : index === completed && !finished
                  ? "bg-white/45"
                  : "bg-white/10"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

type GamePanelProps = {
  children: React.ReactNode;
};

export function GamePanel({ children }: GamePanelProps) {
  return (
    <div className="relative overflow-hidden rounded-[24px] border border-white/10 bg-[#151C19] shadow-[0_20px_80px_rgba(0,0,0,0.2)]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#CCF28A]/40 to-transparent"
      />
      <div className="relative">{children}</div>
    </div>
  );
}

type DiscoveryRowProps = {
  index: number;
  word: string;
  rarity: number;
  subtitle?: string;
};

export function DiscoveryRow({
  index,
  word,
  rarity,
  subtitle,
}: DiscoveryRowProps) {
  return (
    <div className="flex items-center gap-4 border-b border-white/10 py-4 last:border-b-0">
      <span className="w-6 shrink-0 text-xs tabular-nums text-white/30">
        {String(index + 1).padStart(2, "0")}
      </span>

      <div className="min-w-0 flex-1">
        <p className="break-words font-semibold capitalize text-[#F0F2EA]">
          {word}
        </p>

        {subtitle && (
          <p className="mt-1 text-xs leading-5 text-white/40">
            {subtitle}
          </p>
        )}
      </div>

      <span className="shrink-0 text-xl font-bold tabular-nums text-[#CCF28A]">
        +{rarity}
      </span>
    </div>
  );
}
