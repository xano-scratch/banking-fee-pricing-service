import { useEffect, useState } from "react";
import { FileClock, UploadCloud, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api, type Lookups, type ScheduleView, type User } from "@/lib/api";
import { money, signedMoney, band, text } from "@/lib/format";

type Row = Record<string, unknown>;

export default function ScheduleScreen({ lookups, user }: { lookups: Lookups; user: User }) {
  const products = (lookups.products ?? []) as Row[];
  const isAdmin = String(user.role) === "pricing_admin";

  const [productId, setProductId] = useState(products.length ? String(products[0].id) : "");
  const [view, setView] = useState<ScheduleView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  async function load(id: string) {
    if (!id) return;
    setError(null);
    try {
      setView(await api.schedule(Number(id)));
    } catch (e) {
      setView(null);
      setError(e instanceof Error ? e.message : "Failed to load schedule.");
    }
  }

  useEffect(() => {
    void load(productId);
    setNotice(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  async function publish(draftId: number, version: unknown) {
    setPublishing(true);
    setError(null);
    setNotice(null);
    try {
      await api.publish(draftId);
      setNotice(`Version ${text(version)} is now the active schedule. The prior version was retired.`);
      await load(productId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Publish failed.");
    } finally {
      setPublishing(false);
    }
  }

  const active = view?.active as Row | null | undefined;
  const draft = view?.draft as Row | null | undefined;

  return (
    <div className="space-y-6">
      <Card className="h-fit max-w-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileClock className="size-5" /> Fee schedule
          </CardTitle>
          <CardDescription>The versioned rule set behind a product's fees.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label>Product</Label>
            <Select value={productId} onValueChange={setProductId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a product" />
              </SelectTrigger>
              <SelectContent>
                {products.map((p) => (
                  <SelectItem key={String(p.id)} value={String(p.id)}>
                    {text(p.code)} — {text(p.name)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {notice && (
        <Alert>
          <CheckCircle2 />
          <AlertDescription>{notice}</AlertDescription>
        </Alert>
      )}

      {view && (
        <div className="grid gap-6 lg:grid-cols-2">
          <ScheduleCard title="Active schedule" schedule={active} tiers={(view.active_tiers ?? []) as Row[]}>
            {!active && <EmptyState>No active schedule. This product cannot be quoted until a draft is published.</EmptyState>}
          </ScheduleCard>

          <ScheduleCard title="Draft schedule" schedule={draft} tiers={(view.draft_tiers ?? []) as Row[]}>
            {!draft && <EmptyState>No draft version.</EmptyState>}
            {draft && (
              <div className="mt-4 border-t pt-4">
                {isAdmin ? (
                  <Button
                    className="w-full"
                    disabled={publishing}
                    onClick={() => publish(Number(draft.id), draft.version)}
                  >
                    <UploadCloud /> {publishing ? "Publishing…" : `Publish version ${text(draft.version)}`}
                  </Button>
                ) : (
                  <p className="text-muted-foreground text-xs">
                    Publishing is restricted to a pricing_admin. Sign in as admin to activate a draft.
                  </p>
                )}
              </div>
            )}
          </ScheduleCard>
        </div>
      )}
    </div>
  );
}

function ScheduleCard({
  title,
  schedule,
  tiers,
  children,
}: {
  title: string;
  schedule: Row | null | undefined;
  tiers: Row[];
  children?: React.ReactNode;
}) {
  const statusColor =
    schedule?.status === "active" ? "default" : schedule?.status === "draft" ? "secondary" : "outline";
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">{title}</CardTitle>
          {schedule && (
            <div className="flex items-center gap-2">
              <Badge variant="outline">v{text(schedule.version)}</Badge>
              <Badge variant={statusColor as "default" | "secondary" | "outline"}>{text(schedule.status)}</Badge>
            </div>
          )}
        </div>
        {schedule && (
          <CardDescription>
            Base fee {money(schedule.base_fee, schedule.currency)} · effective {text(schedule.effective_date)}
            {schedule.note ? ` · ${text(schedule.note)}` : ""}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent>
        {schedule && tiers.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tier</TableHead>
                <TableHead>Balance band</TableHead>
                <TableHead className="text-right">Adjustment</TableHead>
                <TableHead className="text-right">Fee</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tiers.map((t) => (
                <TableRow key={String(t.id)}>
                  <TableCell className="font-medium">{text(t.tier_name)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {band(t.min_balance, t.max_balance, schedule.currency)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {signedMoney(t.fee_adjustment, schedule.currency)}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {money(Number(schedule.base_fee) + Number(t.fee_adjustment), schedule.currency)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {children}
      </CardContent>
    </Card>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return <p className="text-muted-foreground py-6 text-center text-sm">{children}</p>;
}
