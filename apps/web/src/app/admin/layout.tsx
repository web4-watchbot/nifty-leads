/**
 * Admin layout (SPEC Section 8).
 * Only users with the `admin` role can open Admin pages.
 * Auth enforcement happens in middleware.ts; this layout renders
 * the admin shell without performing a build-time session check.
 */

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b px-6 py-4 flex items-center justify-between bg-background">
        <div className="text-lg font-semibold">Nifty Leads — Admin</div>
        <div className="text-sm text-muted-foreground">Admin</div>
      </header>
      <nav className="border-b px-6 py-2 flex gap-4 text-sm font-medium">
        <a href="/admin" className="underline">
          Dashboard
        </a>
        <a href="/admin/users" className="underline">
          Users
        </a>
        <a href="/admin/plans" className="underline">
          Plans
        </a>
        <a href="/admin/llm" className="underline">
          LLM Providers
        </a>
        <a href="/admin/sources" className="underline">
          Lead Sources
        </a>
        <a href="/admin/taxonomy" className="underline">
          Taxonomy
        </a>
        <a href="/admin/system-email" className="underline">
          System Email
        </a>
        <a href="/admin/jobs" className="underline">
          Jobs
        </a>
        <a href="/admin/audit" className="underline">
          Audit Log
        </a>
      </nav>
      <main className="p-6">{children}</main>
    </div>
  );
}
