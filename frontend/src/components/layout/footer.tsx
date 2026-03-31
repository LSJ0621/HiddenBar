import Link from 'next/link';

const FOOTER_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/search', label: 'Search Bars' },
  { href: '/directions', label: 'Directions' },
  { href: '/bars/new', label: 'Register Bar' },
] as const;

/** Site footer with compact single-row layout */
export function Footer() {
  return (
    <footer className="hidden border-t border-border/50 bg-background lg:block">
      <div className="container mx-auto flex flex-wrap items-center justify-between gap-y-2 px-4 py-4 md:px-6 lg:px-8">
        <Link href="/" className="font-display text-sm tracking-tight text-primary">
          Hidden Bar
        </Link>
        <nav className="flex items-center gap-x-1 text-xs text-muted-foreground" aria-label="Footer navigation">
          {FOOTER_LINKS.map(({ href, label }, index) => (
            <span key={href} className="flex items-center gap-x-1">
              {index > 0 && <span aria-hidden="true">&middot;</span>}
              <Link href={href} className="transition-colors hover:text-foreground">
                {label}
              </Link>
            </span>
          ))}
        </nav>
        <p className="text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} Hidden Bar
        </p>
      </div>
    </footer>
  );
}
