function escapeRegex(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildAlternatives(target: string) {
  const t = target.trim().toLowerCase();
  const alternatives = new Set<string>();
  if (!t) return alternatives;

  alternatives.add(t);

  if (/^[a-z]+$/.test(t)) {
    alternatives.add(t + 's');
    alternatives.add(t + 'es');
    alternatives.add(t + 'ed');
    alternatives.add(t + 'ing');

    if (t.endsWith('e')) {
      const stem = t.slice(0, -1);
      alternatives.add(stem + 'ed');
      alternatives.add(stem + 'ing');
    }
    if (t.endsWith('y') && t.length > 2) {
      const stem = t.slice(0, -1);
      alternatives.add(stem + 'ies');
      alternatives.add(stem + 'ied');
    }
  }

  return alternatives;
}

export default function HighlightedExample({
  example,
  target,
}: {
  example: string;
  target: string;
}) {
  const alternatives = buildAlternatives(target);
  if (!example || alternatives.size === 0) return <>{example}</>;

  const pattern = Array.from(alternatives)
    .sort((a, b) => b.length - a.length)
    .map(escapeRegex)
    .join('|');
  const regex = new RegExp(`(^|[^A-Za-z0-9])(${pattern})(?=$|[^A-Za-z0-9])`, 'gi');

  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(example)) !== null) {
    const prefix = match[1];
    const word = match[2];
    const wordStart = match.index + prefix.length;

    if (wordStart > lastIndex) {
      nodes.push(<span key={`text-${lastIndex}`}>{example.slice(lastIndex, wordStart)}</span>);
    }
    nodes.push(
      <span
        key={`hit-${wordStart}`}
        className="inline-block rounded-md border-[4px] border-rose px-1 text-amber font-medium leading-none"
      >
        {word}
      </span>
    );
    lastIndex = wordStart + word.length;
  }

  if (lastIndex === 0) return <>{example}</>;
  if (lastIndex < example.length) {
    nodes.push(<span key={`text-${lastIndex}`}>{example.slice(lastIndex)}</span>);
  }

  return <>{nodes}</>;
}
