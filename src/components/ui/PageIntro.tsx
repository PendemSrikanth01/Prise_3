export function PageIntro({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <h1 className="text-2xl font-bold tracking-[-0.025em] text-prise-text sm:text-[28px]">{title}</h1>
      <p className="mt-1.5 max-w-2xl text-sm leading-6 text-prise-text-secondary">{description}</p>
    </div>
  );
}

export function EmptyPanel({ title, description }: { title: string; description: string }) {
  return (
    <div className="mt-6 rounded-card border border-dashed border-prise-border bg-white px-6 py-16 text-center shadow-card">
      <p className="text-sm font-semibold text-prise-text">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-prise-text-secondary">{description}</p>
    </div>
  );
}
