export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4">
      <h1 className="text-3xl font-bold">Nifty Leads</h1>
      <p className="mt-2 text-muted-foreground">
        Find business leads, manage your CRM, and run AI outreach.
      </p>
      <nav className="mt-6 flex gap-4">
        <a href="/login" className="underline">
          Sign in
        </a>
        <a href="/admin" className="underline">
          Admin
        </a>
      </nav>
    </main>
  );
}
