import { useState } from "react";
import { Landmark, LogIn } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api, setToken, type User } from "@/lib/api";

/** Seeded demo credentials (public fixtures). */
export const DEMO = {
  admin: { email: "admin@bank.example", password: "admin-pass-123" },
  viewer: { email: "viewer@bank.example", password: "viewer-pass-123" },
};

export async function signIn(email: string, password: string): Promise<User> {
  const res = await api.login({ email, password });
  setToken(res.token as string);
  return api.me();
}

export default function Login({ onAuthed }: { onAuthed: (u: User) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      onAuthed(await signIn(email, password));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed.");
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center p-6">
      <div className="mb-6 flex items-center gap-3">
        <div className="bg-primary text-primary-foreground flex size-10 items-center justify-center rounded-lg">
          <Landmark className="size-5" />
        </div>
        <div>
          <h1 className="text-lg leading-tight font-semibold tracking-tight">Banking Fee &amp; Pricing Service</h1>
          <p className="text-muted-foreground text-sm">One governed rule set. One quoted number.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
          <CardDescription>Access is API-layer RBAC. Sign in as an admin or a read-only viewer.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@bank.example"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <Button type="submit" className="w-full" disabled={busy}>
              <LogIn /> {busy ? "Signing in…" : "Sign in"}
            </Button>
          </form>

          <div className="mt-6 border-t pt-4">
            <p className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">Demo accounts</p>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setEmail(DEMO.admin.email);
                  setPassword(DEMO.admin.password);
                }}
              >
                Fill admin
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setEmail(DEMO.viewer.email);
                  setPassword(DEMO.viewer.password);
                }}
              >
                Fill viewer
              </Button>
            </div>
            <p className="text-muted-foreground mt-2 text-xs">
              admin@bank.example / admin-pass-123 (publish rights) · viewer@bank.example / viewer-pass-123 (read only)
            </p>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
