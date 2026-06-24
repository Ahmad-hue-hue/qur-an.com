export function ConfigMissing() {
  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-6">
      <div className="max-w-md w-full rounded-2xl bg-white card-shadow p-8 text-center space-y-4">
        <h1 className="font-serif text-2xl font-bold text-emerald-deep">
          App configuration missing
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          This deployment is missing Supabase environment variables. In your Vercel
          project, set{" "}
          <code className="text-xs bg-muted px-1 py-0.5 rounded">
            NEXT_PUBLIC_SUPABASE_URL
          </code>{" "}
          and{" "}
          <code className="text-xs bg-muted px-1 py-0.5 rounded">
            NEXT_PUBLIC_SUPABASE_ANON_KEY
          </code>
          , then redeploy.
        </p>
        <p className="text-xs text-muted-foreground">
          See <code className="bg-muted px-1 py-0.5 rounded">supabase/README.md</code>{" "}
          for values from your Supabase project.
        </p>
      </div>
    </div>
  );
}
