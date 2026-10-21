export const MOUNTAIN_GOAT_URL = 'https://www.mountaingoatsoftware.com/';
export const PLANNING_POKER_TM_NOTICE = 'Planning Poker is a registered trademark of Mike Cohn, and Mountain Goat ' +
    'Software, LLC.';

/** "Planning Poker®" with a tooltip crediting the trademark holder. */
export function PlanningPokerTerm() {
  return (
    <>
      Planning Poker
      <sup className="tm-mark" tabIndex={0} title={PLANNING_POKER_TM_NOTICE} aria-label={PLANNING_POKER_TM_NOTICE}>
        ®
      </sup>
    </>
  );
}
