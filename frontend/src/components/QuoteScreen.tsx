import { useEffect, useRef, useState } from "react";
import { Calculator, ArrowRight, ShieldCheck, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api, type Lookups, type Quote } from "@/lib/api";
import { money, signedMoney, band, text } from "@/lib/format";

export default function QuoteScreen({ lookups, demo }: { lookups: Lookups; demo: boolean }) {
  const accounts = (lookups.accounts ?? []) as Array<Record<string, unknown>>;
  const products = (lookups.products ?? []) as Array<Record<string, unknown>>;

  const [accountId, setAccountId] = useState("");
  const [productId, setProductId] = useState("");
  const [result, setResult] = useState<Quote | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const didDemo = useRef(false);

  async function run(aId: string, pId: string) {
    if (!aId || !pId) return;
    setBusy(true);
    setError(null);
    try {
      setResult(await api.quote({ account_id: Number(aId), product_id: Number(pId) }));
    } catch (e) {
      setResult(null);
      setError(e instanceof Error ? e.message : "Quote failed.");
    } finally {
      setBusy(false);
    }
  }

  function pickAccount(id: string) {
    setAccountId(id);
    const acc = accounts.find((a) => String(a.id) === id);
    if (acc) setProductId(String(acc.product_id));
  }

  useEffect(() => {
    if (!demo || didDemo.current || accounts.length === 0) return;
    didDemo.current = true;
    const acc = accounts.find((a) => String(a.account_number) === "ACC-1002") ?? accounts[0];
    const aId = String(acc.id);
    const pId = String(acc.product_id);
    setAccountId(aId);
    setProductId(pId);
    void run(aId, pId);
  }, [demo, accounts]);

  return (
    <div className="grid gap-6 md:grid-cols-[360px_1fr]">
      <Card className="h-fit">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="size-5" /> Quote a fee
          </CardTitle>
          <CardDescription>
            Pick an account and product. The fee is computed by one shared function every system calls.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Account</Label>
            <Select value={accountId} onValueChange={pickAccount}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select an account" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((a) => (
                  <SelectItem key={String(a.id)} value={String(a.id)}>
                    {text(a.account_number)} — {text(a.holder_name)} ({money(a.balance)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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
          <Button className="w-full" disabled={busy || !accountId || !productId} onClick={() => run(accountId, productId)}>
            {busy ? "Computing…" : "Get quote"} <ArrowRight />
          </Button>
        </CardContent>
      </Card>

      <div className="min-w-0">
        {error && (
          <Alert variant="destructive">
            <TriangleAlert />
            <AlertTitle>Governed error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!error && !result && (
          <Card className="border-dashed">
            <CardContent className="text-muted-foreground flex min-h-40 items-center justify-center text-center text-sm">
              Choose an account and product, then Get quote. The result shows the exact schedule version and rate tier
              that produced the fee.
            </CardContent>
          </Card>
        )}

        {result && (
          <Card data-testid="quote-result">
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <CardDescription>Quoted fee</CardDescription>
                  <CardTitle className="text-4xl tracking-tight tabular-nums">
                    {money(result.quoted_fee, result.currency)}
                  </CardTitle>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge variant="secondary">Schedule v{text(result.schedule_version)}</Badge>
                  <span className="text-muted-foreground text-xs">Quote #{text(result.quote_id)}</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="bg-muted/50 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg p-3 font-mono text-sm tabular-nums">
                <span>{money(result.base_fee, result.currency)}</span>
                <span className="text-muted-foreground">base</span>
                <span className="text-muted-foreground">+</span>
                <span>{signedMoney(result.tier_adjustment, result.currency)}</span>
                <span className="text-muted-foreground">tier</span>
                <span className="text-muted-foreground">=</span>
                <span className="font-semibold">{money(result.quoted_fee, result.currency)}</span>
              </div>

              <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
                <Field label="Account">
                  {text(result.account?.account_number)} · {text(result.account?.holder_name)}
                </Field>
                <Field label="Balance">{money(result.account?.balance, result.currency)}</Field>
                <Field label="Product">
                  {text(result.product?.code)} · {text(result.product?.name)}
                </Field>
                <Field label="Rate tier">
                  {text(result.tier?.tier_name)}{" "}
                  <span className="text-muted-foreground">
                    ({band(result.tier?.min_balance, result.tier?.max_balance, result.currency)})
                  </span>
                </Field>
                <Field label="Requested by">{text(result.requested_by)}</Field>
                <Field label="Schedule id">#{text(result.fee_schedule_id)}</Field>
              </dl>

              <div className="text-muted-foreground flex items-start gap-2 border-t pt-4 text-xs">
                <ShieldCheck className="mt-0.5 size-4 shrink-0" />
                <span>
                  Every system that quotes this account and product against schedule v{text(result.schedule_version)} gets
                  the identical number. The quote is written to the audit log so the decision stays reproducible.
                </span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-muted-foreground text-xs tracking-wide uppercase">{label}</dt>
      <dd className="mt-0.5 text-sm">{children}</dd>
    </div>
  );
}
