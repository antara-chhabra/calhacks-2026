import { useState } from 'react';
import type { RouteObject } from 'react-router-dom';
import { ForgeDone, ForgeWizard, MyFighters, useMyFighters } from '@/ui/forge';
import { AppShell } from '@/ui/shell';

function ForgePage() {
  const [doneId, setDoneId] = useState<string | null>(null);
  const active = useMyFighters().filter((f) => f.status !== 'retired').length;
  return (
    <AppShell title="The Forge">
      <div className="space-y-6">
        {doneId ? <ForgeDone id={doneId} onAgain={() => setDoneId(null)} /> : <ForgeWizard activeCount={active} onDone={setDoneId} />}
        <MyFighters />
      </div>
    </AppShell>
  );
}

export const order = 50;
export const routes: RouteObject[] = [{ path: '/forge', element: <ForgePage /> }];
