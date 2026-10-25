// Bet slip (U-05). Stub: screens mount <BetSlip matchId=… />; U-05 replaces the body, never the props.
export function BetSlip(props: { matchId: string | null; compact?: boolean }) {
  return <div data-stub="BetSlip" data-match={props.matchId ?? ""} />;
}
