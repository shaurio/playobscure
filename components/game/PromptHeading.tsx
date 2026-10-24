type PromptHeadingProps = {
  title: string;
  round: number;
  label?: string;
  tags?: readonly string[];
};

/** Shared Daily/Unlimited prompt presentation. Rules stay in each mode. */
export function PromptHeading({ title, round, label = "WORD CHALLENGE", tags = [] }: PromptHeadingProps) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3 text-xs font-semibold uppercase tracking-widest text-[#CCF28A]">
        <span>{label}</span>
        <span className="text-white/40">{round + 1} / 5</span>
      </div>
      <h2 className="mt-10 text-3xl font-black leading-tight tracking-tight sm:text-4xl">{title}</h2>
      {tags.length > 0 && (
        <div className="mt-5 flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span key={tag} className="rounded-full border border-white/15 px-3 py-1.5 text-xs text-white/55">{tag}</span>
          ))}
        </div>
      )}
    </div>
  );
}

export function promptConstraints(prompt: { startsWith?: string; contains?: string; length?: number } | null | undefined): string[] {
  if (!prompt) return [];
  const tags: string[] = [];
  if (prompt.startsWith) tags.push(`Starts with ${prompt.startsWith.toUpperCase()}`);
  if (prompt.contains) tags.push(`Contains ${prompt.contains.toUpperCase()}`);
  if (prompt.length !== undefined) tags.push(`${prompt.length} letters`);
  return tags;
}
