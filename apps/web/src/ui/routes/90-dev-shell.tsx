// /dev/shell: every shell primitive on one page (U-01 evidence).
import { useState } from "react";
import type { RouteObject } from "react-router-dom";
import { ButtonX, Modal, Money, OddsChip, Panel, Skeleton, Tabs, toast } from "@/components/fightcard/primitives";
import { BalancePill, ConnIndicator, AppShell, ModeBadge, MoneyDisclosure } from "@/ui/shell";

function DevShell() {
  const [tab, setTab] = useState("book");
  const [open, setOpen] = useState(false);
  const [pick, setPick] = useState("a");
  return (
    <AppShell title="Shell primitives">
      <div className="grid gap-4 md:grid-cols-2">
        <Panel title="Status">
          <div className="flex flex-wrap items-center gap-3">
            <BalancePill />
            {(["LIVE", "REPLAY", "DEMO", "MOCK"] as const).map((m) => <ModeBadge key={m} mode={m} />)}
            <ConnIndicator />
            <MoneyDisclosure />
          </div>
        </Panel>
        <Panel title="Buttons">
          <div className="flex flex-wrap gap-2">
            <ButtonX tone="primary">Primary</ButtonX>
            <ButtonX>Secondary</ButtonX>
            <ButtonX tone="yes">Yes</ButtonX>
            <ButtonX tone="no">No</ButtonX>
            <ButtonX tone="ghost">Ghost</ButtonX>
            <ButtonX size="sm">Small</ButtonX>
            <ButtonX size="lg" tone="primary">Large</ButtonX>
            <ButtonX loading>Loading</ButtonX>
            <ButtonX disabled>Disabled</ButtonX>
          </div>
        </Panel>
        <Panel title="Tabs / Modal / Toast">
          <Tabs onChange={setTab} tabs={[{ id: "book", label: "Order book" }, { id: "bets", label: "Bets" }, { id: "info", label: "Info" }]} value={tab} />
          <div className="mt-3 flex flex-wrap gap-2">
            <ButtonX onClick={() => setOpen(true)}>Open modal</ButtonX>
            <ButtonX onClick={() => toast("Bet placed", "success")} tone="yes">Success toast</ButtonX>
            <ButtonX onClick={() => toast("Market is locked", "error")} tone="no">Error toast</ButtonX>
          </div>
        </Panel>
        <Panel title="Money / Odds">
          <div className="flex flex-wrap items-center gap-3">
            <Money cents={125000} />
            <Money cents={4250} signed />
            <Money cents={-505} signed />
            <OddsChip label="PIP" odds={2.4} onClick={() => setPick("a")} selected={pick === "a"} />
            <OddsChip label="Sage" odds={1.8} onClick={() => setPick("b")} selected={pick === "b"} />
            <OddsChip format="percent" odds={2.4} />
          </div>
        </Panel>
        <Panel className="md:col-span-2" title="Skeleton">
          <div className="space-y-2"><Skeleton className="h-4 w-1/3" /><Skeleton className="h-16 w-full" /></div>
        </Panel>
      </div>
      <Modal onClose={() => setOpen(false)} open={open} title="Confirm bet">
        <p className="mb-4 text-[13px] text-zinc-400">Stake <Money cents={1000} /> on PIP at 2.40×. <MoneyDisclosure /></p>
        <div className="flex gap-2"><ButtonX onClick={() => setOpen(false)} tone="primary">Confirm</ButtonX><ButtonX onClick={() => setOpen(false)} tone="ghost">Cancel</ButtonX></div>
      </Modal>
    </AppShell>
  );
}

export const order = 90;
export const route: RouteObject = { path: "/dev/shell", element: <DevShell /> };
