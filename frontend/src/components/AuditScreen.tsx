import { useEffect, useMemo, useState } from "react";
import { ScrollText, Filter } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import { api, type AuditList, type Lookups } from "@/lib/api";
import { money, signedMoney, dateTime, text } from "@/lib/format";

type Row = Record<string, unknown>;
const ALL = "all";

export default function AuditScreen({ lookups }: { lookups: Lookups }) {
  const accounts = (lookups.accounts ?? []) as Row[];
  const products = (lookups.products ?? []) as Row[];

  const accountLabel = useMemo(() => {
    const m = new Map<string, string>();
    for (const a of accounts) m.set(String(a.id), `${text(a.account_number)} · ${text(a.holder_name)}`);
    return m;
  }, [accounts]);
  const productLabel = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of products) m.set(String(p.id), String(p.code));
    return m;
  }, [products]);

  const [accountId, setAccountId] = useState(ALL);
  const [productId, setProductId] = useState(ALL);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [rows, setRows] = useState<AuditList>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    setBusy(true);
    setError(null);
    try {
      const res = await api.audit({
        account_id: accountId === ALL ? undefined : Number(accountId),
        product_id: productId === ALL ? undefined : Number(productId),
        from_ms: from ? Date.parse(`${from}T00:00:00`) : undefined,
        to_ms: to ? Date.parse(`${to}T23:59:59.999`) : undefined,
      });
      setRows(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load audit log.");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const list = (rows ?? []) as Row[];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ScrollText className="size-5" /> Quote audit log
          </CardTitle>
          <CardDescription>
            Every quote issued, with the fee, schedule version, and tier that were applied. This is the same governed
            number every calling system received.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 lg:items-end">
            <div className="space-y-2">
              <Label>Account</Label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All accounts</SelectItem>
                  {accounts.map((a) => (
                    <SelectItem key={String(a.id)} value={String(a.id)}>
                      {text(a.account_number)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Product</Label>
              <Select value={productId} onValueChange={setProductId}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All products</SelectItem>
                  {products.map((p) => (
                    <SelectItem key={String(p.id)} value={String(p.id)}>
                      {text(p.code)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="from">From</Label>
              <Input id="from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="to">To</Label>
              <Input id="to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
            <Button onClick={load} disabled={busy}>
              <Filter /> {busy ? "Filtering…" : "Apply filters"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Account</TableHead>
                <TableHead>Product</TableHead>
                <TableHead className="text-center">Version</TableHead>
                <TableHead className="text-right">Base</TableHead>
                <TableHead className="text-right">Adjustment</TableHead>
                <TableHead className="text-right">Quoted fee</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-muted-foreground py-8 text-center text-sm">
                    No quotes match these filters.
                  </TableCell>
                </TableRow>
              )}
              {list.map((r) => (
                <TableRow key={String(r.id)}>
                  <TableCell className="text-muted-foreground whitespace-nowrap">{dateTime(r.created_at)}</TableCell>
                  <TableCell>{accountLabel.get(String(r.account_id)) ?? `#${text(r.account_id)}`}</TableCell>
                  <TableCell>{productLabel.get(String(r.product_id)) ?? `#${text(r.product_id)}`}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary">v{text(r.schedule_version)}</Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{money(r.base_fee)}</TableCell>
                  <TableCell className="text-right tabular-nums">{signedMoney(r.tier_adjustment)}</TableCell>
                  <TableCell className="text-right font-medium tabular-nums">{money(r.quoted_fee)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
