export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6">
        <h1 className="text-2xl font-bold">Sign in</h1>
        <p className="text-muted-foreground">
          Enter your email to receive a login code.
        </p>
        <form className="space-y-4">
          <div>
            <label className="block text-sm font-medium">Email</label>
            <input type="email" className="mt-1 block w-full border rounded-md p-2" />
          </div>
          <button type="submit" className="btn-primary w-full py-2">
            Send code
          </button>
        </form>
      </div>
    </div>
  );
}
