import { useEffect, useState } from "react";
import { Landmark, LogOut, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Login, { DEMO, signIn } from "@/components/Login";
import QuoteScreen from "@/components/QuoteScreen";
import ScheduleScreen from "@/components/ScheduleScreen";
import AuditScreen from "@/components/AuditScreen";
import { api, clearToken, getToken, type Lookups, type User } from "@/lib/api";

export default function App() {
  const [booting, setBooting] = useState(true);
  const [demo, setDemo] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [lookups, setLookups] = useState<Lookups | null>(null);

  // Boot: self-seed a fresh ephemeral, then restore a session (or demo sign-in).
  useEffect(() => {
    void (async () => {
      try {
        const status = await api.seedStatus();
        if (!status || Number(status.products) === 0) await api.seedRun();
      } catch {
        /* seeding is best-effort */
      }
      const isDemo = new URLSearchParams(window.location.search).get("demo") === "1";
      setDemo(isDemo);
      try {
        if (isDemo && !getToken()) {
          setUser(await signIn(DEMO.admin.email, DEMO.admin.password));
        } else if (getToken()) {
          setUser(await api.me());
        }
      } catch {
        clearToken();
      }
      setBooting(false);
    })();
  }, []);

  // Lookups (products + accounts) power every selector; load once authed.
  useEffect(() => {
    if (!user) {
      setLookups(null);
      return;
    }
    void (async () => {
      try {
        setLookups(await api.lookups());
      } catch {
        /* handled per-screen */
      }
    })();
  }, [user]);

  function signOut() {
    clearToken();
    setUser(null);
  }

  if (booting) {
    return (
      <main className="text-muted-foreground flex min-h-screen items-center justify-center gap-2 text-sm">
        <Loader2 className="size-4 animate-spin" /> Loading the pricing service…
      </main>
    );
  }

  if (!user) return <Login onAuthed={setUser} />;

  const isAdmin = String(user.role) === "pricing_admin";

  return (
    <div className="min-h-screen">
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="bg-primary text-primary-foreground flex size-9 items-center justify-center rounded-lg">
              <Landmark className="size-5" />
            </div>
            <div>
              <h1 className="leading-tight font-semibold tracking-tight">Banking Fee &amp; Pricing Service</h1>
              <p className="text-muted-foreground text-xs">One versioned rule set. Every system quotes the same number.</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-sm leading-tight">{String(user.email)}</div>
              <Badge variant={isAdmin ? "default" : "secondary"} className="mt-0.5">
                {String(user.role)}
              </Badge>
            </div>
            <Button variant="outline" size="sm" onClick={signOut}>
              <LogOut /> Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        {!lookups ? (
          <div className="text-muted-foreground flex items-center gap-2 py-16 text-sm">
            <Loader2 className="size-4 animate-spin" /> Loading data…
          </div>
        ) : (
          <Tabs defaultValue="quote" className="space-y-6">
            <TabsList>
              <TabsTrigger value="quote">Quote</TabsTrigger>
              <TabsTrigger value="schedule">Schedule</TabsTrigger>
              <TabsTrigger value="audit">Audit</TabsTrigger>
            </TabsList>
            <TabsContent value="quote">
              <QuoteScreen lookups={lookups} demo={demo} />
            </TabsContent>
            <TabsContent value="schedule">
              <ScheduleScreen lookups={lookups} user={user} />
            </TabsContent>
            <TabsContent value="audit">
              <AuditScreen lookups={lookups} />
            </TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  );
}
