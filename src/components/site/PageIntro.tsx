import { BookOpen, Code2 } from "lucide-react";
import { Fact } from "./Fact";

interface Props {
  title: string;
  lede: string;
  facts?: { value: string; from?: string; label: string }[] | undefined;
  /** while the model loads: reserve room for this many facts so nothing jumps */
  pendingFacts?: number;
  notebook?: string | undefined;
  code?: string | undefined;
}

const btn =
  "inline-flex items-center gap-2 rounded-sm border border-rule-strong px-3 py-2 text-sm font-medium text-ink hover:bg-surface";

export function PageIntro({ title, lede, facts, pendingFacts = 0, notebook, code }: Props) {
  return (
    <section className="pt-12 pb-10 sm:pt-16">
      <h1 className="font-condensed text-4xl leading-[1.05] text-ink sm:text-6xl">{title}</h1>
      <p className="mt-5 max-w-3xl font-serif text-xl leading-relaxed text-ink-2 sm:text-2xl">
        {lede}
      </p>
      {facts && facts.length > 0 ? (
        <div className="mt-10 grid grid-cols-1 gap-8 border-t border-rule pt-8 sm:grid-cols-2 lg:grid-cols-4">
          {facts.map((f) => (
            <Fact key={f.label} {...f} />
          ))}
        </div>
      ) : pendingFacts > 0 ? (
        <div
          className="mt-10 grid grid-cols-1 gap-8 border-t border-rule pt-8 sm:grid-cols-2 lg:grid-cols-4"
          aria-hidden
        >
          {Array.from({ length: pendingFacts }, (_, i) => (
            <div key={i}>
              <div className="h-12 w-32 animate-pulse rounded-sm bg-surface-2 motion-reduce:animate-none" />
              <div className="mt-2 h-5 w-44 animate-pulse rounded-sm bg-surface motion-reduce:animate-none" />
            </div>
          ))}
        </div>
      ) : null}
      {(notebook || code) && (
        <div className="mt-8 flex flex-wrap gap-3">
          {notebook && (
            <a className={btn} href={notebook} target="_blank" rel="noreferrer">
              <BookOpen className="h-4 w-4" aria-hidden /> Notebook
            </a>
          )}
          {code && (
            <a className={btn} href={code} target="_blank" rel="noreferrer">
              <Code2 className="h-4 w-4" aria-hidden /> Model code
            </a>
          )}
        </div>
      )}
    </section>
  );
}
