# Internoun — DAO Deck v5 Refactor Spec

> **Target file:** ` index.html` (the existing Internoun DAO Deck prototype)
> **Goal:** Re-skin the current "high-score + combo" card game into a Reigns-style survival/resource-arbitrage roguelite about running a DAO on a week-by-week Timeline.
> **Do NOT throw away the current art / typography / motion system.** Keep the brutalist paper-punk UI, the mascot, the sticker stack, the sound/haptic cues. We are swapping the **game loop**, not the **look**.

---

## 0. Design Thesis (read this before touching code)

The current game optimizes for a single scalar (Score) with a Combo multiplier. That rewards memorization and fast tapping — it does not feel like running a DAO.

We are shifting the fantasy to **"you are the founder of a fragile DAO, and every tweet / ship / partnership is a trade-off."** The player is not trying to max a score. The player is trying to **stay alive on the Timeline for as many turns (weeks) as possible** while four volatile meters wobble between collapse and overheating.

Think: **Reigns × Balatro × CT drama.**

- Reigns → binary swipe, resource-juggling, death by any meter.
- Balatro → run-based, escalating risk, big combo blow-ups.
- Crypto Twitter → the flavor.

---

## 1. The Four Meters (replace the single Score)

Remove the top-right "Score" readout. Replace it with **four fragile meters** rendered directly on each active card (Reigns-like layout, card-first composition). Each meter is a 0–100 integer. **A run ends instantly if any meter hits 0 OR 100.** Both extremes are fatal — this is the core of the design.

| Meter | Emoji or design some icons | 0% = Death | 100% = Death |
|---|---|---|---|
| **Treasury** | 💰 | Bankrupt. DAO dissolves. | Honeypot. Hacked / regulators move in. |
| **Vibe** | 🗣️ | Ghost town. Nobody cares. | Overhyped. Expectations crash the token. |
| **Tech** | 💻 | Exploited. Contract drained. | Over-engineered. Ship date = never. |
| **Sanity** | 🔋 | Burnout. Founder deletes account. | Zombie DAO. Only meetings, no code. |

### UI requirements for meters
- Card should occupy most of the viewport height/width (mobile-first portrait framing, Reigns-like).
- Show all four meters persistently on the active card (near the card top region), not in a global top HUD.
- Each meter: icon + numeric value + compact bar (label optional if iconography is clear).
- Color the bar dynamically: green-zone (30–70), warning yellow (15–30 / 70–85), danger red (<15 / >85).
- When a meter changes, animate a **delta chip** (e.g. `+8`, `-12`) popping out of the bar and fading up. Reuse the existing sticker / score-popup motion.
- During swipe preview/decision, any meter that will be affected by the current option should have its icon **jump/bounce** (small punch-scale + y-hop loop) to telegraph risk.
- On death, the offending meter **flashes + screen-shakes + plays the rug sound**, and the Game Over card names the failure mode ("RUGGED BY THE SEC", "GHOST TOWN", "EXPLOITED IN PROD", "FOUNDER DELETED TWITTER", etc.).

---

## 2. The Binary Swipe (replace "drag card to center")

Keep the physical card feel, but change the input grammar.

- Every turn, **one event card** appears center-stage (from the existing deck UI).
- The card should dominate the screen, with minimal surrounding chrome (mimic Reigns composition rhythm).
- The card has a headline, a flavor line, and **two response options**: one anchored to the left edge of the card, one to the right.
- The player **swipes the card left or right** (or clicks a left/right zone, or uses ← / → keys) to commit a response.
- The current **week counter** is shown on the left side of the card (e.g. `WEEK 07`), always visible while deciding.
- Each response applies a **vector of deltas** to the four meters. Both options are trade-offs — never a free win.
- After commit: animate card fly-off in swipe direction, update meters, tick turn counter, deal next card.

### Card data shape (authoring schema)

```ts
type Meter = 'treasury' | 'vibe' | 'tech' | 'sanity';
type Delta = Partial<Record<Meter, number>>; // values in [-20, +20] roughly

interface CardOption {
  label: string;          // e.g. "Quote Retweet"
  flavor?: string;        // one-line outcome text shown briefly after swipe
  effects: Delta;         // base deltas, BEFORE combo leverage
  tags?: string[];        // e.g. ['aggressive', 'hype', 'degen'] — used for combo chaining
}

interface EventCard {
  id: string;
  kind: 'green' | 'red' | 'neutral'; // keeps existing color system
  title: string;          // e.g. "Subtweeted by a peer"
  subtitle?: string;
  detail: string;         // 2-4 sentence incident narrative shown in the card body
  contextBullets?: string[]; // optional 2-3 short "intel" bullets: wallet move, governance thread, audit note, etc.
  sourceTag?: string;     // e.g. "Snapshot", "Discord Leak", "On-chain Alert", "CT Thread"
  left:  CardOption;
  right: CardOption;
  weight?: number;        // draw weight
  requires?: Partial<Record<Meter, [number, number]>>; // optional gating, e.g. only appears when treasury > 60
}
```

### Card body content requirement (for large-card layout)

Because the card takes most of the screen, each event must include meaningful narrative content. Avoid empty whitespace by default.

- Every card must have a `detail` block with **2-4 sentences** describing what happened, who is involved, and why it matters this week.
- Prefer concrete web3 signals over vague copy:
  - wallet flow, governance vote dynamics, multisig behavior, CEX listing rumors, audit notes, token unlock pressure, bridge incidents.
- Add `contextBullets` (2-3 lines) for high-signal fragments, such as:
  - `0x8f... withdrew 1.9M USDC from treasury-safe`
  - `3 delegates switched vote in final 20 mins`
  - `Audit partner flagged reentrancy risk as "high"`
- Keep style diegetic: this should read like a live operations incident feed, not game tutorial text.
- Minimum per card body:
  - 1 incident paragraph (`detail`)
  - 1 attribution chip (`sourceTag`)
  - Optional intel bullets (`contextBullets`) when the event is red/high severity

### Seed cards (ship at least 30 for the first pass; here are the canonical examples)

**RED — `subtweeted_by_peer`**
- Title: *Subtweeted by a peer*
- Detail: *A respected founder posted a thread implying your DAO fakes growth with incentives. Two KOLs quote-posted it, and your replies are getting dunked on by anon accounts. Core contributors ask whether to respond or let the cycle pass.*
- SourceTag: `CT Thread`
- ContextBullets:
  - *The thread hit 180k impressions in 40 minutes*
  - *Two angel investors asked for "clarification" in DM*
- ← **Ignore** — "Stay classy." → `{ vibe: -4, sanity: -6 }`
- → **Quote-dunk** — "We ride at dawn." → `{ vibe: +10, treasury: -6, tags: ['aggressive'] }`

**GREEN — `shipped_at_3am`**
- Title: *Shipped at 3AM*
- Detail: *Your team pushed a late-night release that fixes a long-standing execution bug in the strategy vault. It works in production, but docs are incomplete and no public post has been made. You can stabilize quietly or farm momentum immediately.*
- SourceTag: `Deploy Log`
- ← **Silent launch** — "Real devs ship quiet." → `{ tech: +10, sanity: -10 }`
- → **Hype thread** — "🧵 1/ buckle up." → `{ vibe: +9, tech: -6, tags: ['hype'] }`

**RED — `audit_findings`**
- Title: *Auditor found 3 criticals*
- Detail: *The external audit came back with three critical findings in governance execution and fee routing. A patch path exists, but timeline will slip and budget will stretch. Marketing wants to spin this as "responsible transparency" before patch lands.*
- SourceTag: `Audit Memo`
- ← **Patch quietly** → `{ tech: +8, sanity: -6, treasury: -4 }`
- → **Spin it on stage** → `{ vibe: +8, tech: -6, tags: ['hype'] }`

**GREEN — `vc_cold_dm`**
- Title: *A tier-1 VC slid in*
- Detail: *A major fund offered a fast strategic round with distribution support and exchange intros. The term sheet gives runway, but the community may read it as capture. If you decline, treasury pressure returns within weeks.*
- SourceTag: `Investor DM`
- ← **Take the check** → `{ treasury: +12, vibe: -4, sanity: -4, tags: ['degen'] }`
- → **Stay community-owned** → `{ vibe: +8, treasury: -6 }`

**NEUTRAL — `anon_contributor_appears`**
- Title: *An anon wants commit access*
- Detail: *An anonymous dev shipped two high-quality PRs and claims prior work on a top rollup team. They want direct write access to move faster before your governance vote. Trusting them could accelerate delivery, but also expands your attack surface overnight.*
- SourceTag: `Git + Discord`
- ← **Gate them** → `{ tech: +4, sanity: -3 }`
- → **Give them the keys** → `{ tech: +8, sanity: +4, treasury: -3, tags: ['degen'] }`

(Continue in this pattern. Balance so that **neither option is a pure win**. If an option only has positives, it's a broken card — rewrite it.)

---

## 3. Combo as Leverage / Volatility (keep the multiplier, weaponize it)

Do not delete the combo system — **repurpose it**. Rename internally to `leverage` (keep "COMBO x5" as the HUD label for vibes).

### Rules
- `leverage` starts at `1.0` at run start.
- Every swipe increments leverage: `leverage = min(leverage + 0.5, 5.0)` when the chosen option's `tags` overlaps with the previous card's chosen tags (i.e. you are **chaining a playstyle**, e.g. hype → hype → hype).
- Breaking the chain (different tag family, or neutral card) **snaps** leverage back to `1.0` with a little "DEGEN RESET" sticker animation.
- **All meter deltas are multiplied by `leverage`** at apply time.
  - So at `x1`, a `-6` is a scratch.
  - At `x5`, that same `-6` becomes `-30` and almost certainly ends the run.
- The combo indicator stays in the top-right but is re-skinned as **"LEVERAGE x1.0 → x5.0"**, with color ramping from cool blue (safe) → neon yellow (spicy) → red/glitch (lethal).

### Why this works
- `x1` = boring but survivable. New players can't accidentally die.
- `x5` = hero moment. Positive plays send meters soaring; one wrong swipe wipes the run.
- This restores the dopamine of the current combo system while making it **meaningful** instead of decorative.

---

## 4. Victory Condition: Weeks Survived (replace Score)

The only scoreboard is **turns survived** (display as `WEEK 007 / TIMELINE`).

Milestones (show as unlockable stickers on the run-end screen):
- **Week 5** — *Shipped an MVP.*
- **Week 10** — *Survived an L2 outage.*
- **Week 15** — *Bear market survivor.* (first "win" threshold)
- **Week 25** — *Season 1 narrative captured.*
- **Week 30** — *Blue-chip DAO.* (canonical win)
- **Week 50+** — *Legend-tier, roll credits.*

After the canonical win at Week 30 the player can choose to **cash out** (end run with a trophy) or **keep riding** (infinite mode with escalating card severity).

### Escalation
- Every 5 turns (weeks), draw weights shift toward harsher events (rug attempts, SEC subpoenas, depeg cascades).
- Every 10 turns (weeks), introduce a new card tag and a new Mascot reaction.
- Keep the pace — one card per ~3–6 seconds feels right.

---

## 5. Minimal State Model (reference)

```ts
interface RunState {
  alias: string;                            // operator alias captured on start screen
  week: number;                             // starts at 1
  meters: Record<Meter, number>;            // all start at 50
  leverage: number;                         // 1.0 .. 5.0
  lastTags: string[];                       // from previous chosen option
  deck: EventCard[];                        // shuffled draw pile
  discard: EventCard[];
  history: {
    card: string;
    title: string;
    choice: 'L'|'R';
    choiceLabel: string;
    tags: string[];
    delta: Delta;
    scaledDelta: Delta;
    week: number;
  }[];
  finalBlow?: {
    cardId: string;
    cardTitle: string;
    choiceLabel: string;
    killedMeter: Meter;
    cause: 'zero'|'max';
  };
  dead: null | { meter: Meter; cause: 'zero'|'max' };
}
```

Initial values: `meters = { treasury: 50, vibe: 50, tech: 50, sanity: 50 }`.

### Start-of-run prompt (terminal style)
- At run start (before Week 1 card), show a compact terminal-like input panel:
  - `> ENTER OPERATOR ALIAS: [________]`
- Alias is required (trimmed, 2–18 chars, uppercase display preferred). If empty, use fallback `ANON`.
- Store alias in `runState.alias` and reuse it in HUD and Game Over narrative.

### Turn pipeline
1. `drawCard()` — respect `requires` gates.
2. Wait for swipe input (L or R).
3. `option = card[direction]`.
4. `scaledDelta = option.effects * runState.leverage` (clamp each meter to [0, 100] after apply).
5. Update meters with animated delta chips.
6. Update `leverage` based on tag overlap with `lastTags`.
7. `lastTags = option.tags ?? []`.
8. `week += 1`.
9. If any meter hit 0 or 100 in step 4 → trigger Game Over with the correct death flavor.
10. Otherwise loop to step 1.

---

## 6. Personalized Post-Mortem (viral Game Over layer)

Replace plain result text with a stylized post-mortem card that reads like a shareable timeline autopsy.

### Output requirements
- Header includes alias and lifespan:
  - `OPERATOR: {alias}`
  - `DAO SURVIVED: {week - 1} WEEKS`
- Include the exact final decision that killed the run:
  - Example: `Collapse trigger: You chose "{choiceLabel}" during "{cardTitle}", causing {killedMeter} to hit {0|100}.`
- Include a short roast verdict derived from swipe history:
  - `You play like a degen chasing yield.`
  - `You run risk like a Big Four auditor. Safe to a fault.`
- Keep it concise: 3–5 lines total, optimized for screenshot sharing.

### Local-only narrative generation (no AI API)
- Build a deterministic template function:
  - `buildPostMortem(runState): { title, lines[], archetype, shareText }`
- Infer `archetype` from history aggregates:
  - Tag mix (`hype`, `aggressive`, `degen`, `defensive`, etc.)
  - Average leverage at pick time
  - Metric pressure tendencies (e.g., repeatedly sacrificing sanity for tech)
- Map archetypes to fixed string templates (8–12 variants is enough).
- Use `finalBlow` object for the exact death sentence line.

### Aesthetic behavior
- Keep current sticker/paper style, but present post-mortem as a premium "incident report" panel.
- Animate line reveal typewriter-style (fast, <1.2s total) for drama.
- Add a one-tap `COPY EPITAPH` or `SHARE TEXT` action (clipboard text only, no backend required).

---

## 7. What to Keep From v4 (do not rebuild)

- Brand, colors, typography (JetBrains Mono + Inter).
- Sticker / stamp / flash motion language.
- Mascot + its reactions (just rewire triggers to meter thresholds, not to score tiers).
- Section transitions, nav, scroll behavior.
- Card render styling (borders, shadow offsets, paper texture).
- Sound and haptic hooks (just remap events).

## 8. What to Remove

- Single `score` counter and all its UI.
- "Drag to center to play" interaction — replaced by L/R swipe.
- Any card that has an objectively-best option (audit pass; rewrite as a trade-off).

---

## 9. Implementation Checklist (PR-sized chunks)

1. **State refactor.** Introduce `RunState` (with alias/history/finalBlow) and a pure `applySwipe(state, card, dir) → state` function. Unit-testable, no DOM.
2. **Start prompt.** Add terminal-style alias capture (`> ENTER OPERATOR ALIAS`) before Week 1.
3. **Card HUD swap.** Build the four meters on-card with animated delta chips and affected-icon jump preview. Keep leverage chip visible but subordinate to the card.
4. **Input swap.** Implement L/R swipe + keyboard ← / → + click-zones. Remove center-drop logic.
5. **Card schema + content.** Port 30 seed cards as JSON. Load from an inline `<script type="application/json">` for now; externalize later.
6. **Leverage re-skin.** Rename combo logic, apply multiplier to deltas, add chain-break reset animation.
7. **Post-mortem system.** Add local template engine that generates personalized run obituary from `history + finalBlow` (no external API).
8. **Game Over flow.** Four distinct death screens (one per meter-extreme pair, so eight flavor variants total), plus Week counter + post-mortem + stickers.
9. **Escalation tuning.** Weight curves by `week`. Playtest until Week 15 is reachable ~40% of runs and Week 30 ~10%.
10. **Polish.** Re-trigger existing sticker/sound cues on meter thresholds (e.g. any meter entering the red zone triggers a warning stamp).

---

## 10. Tone Guide (for card writing + post-mortem)

- Every line should read like a CT shitpost, not a tutorial.
- Prefer specificity over abstraction: "a16z partner liked your tweet" > "received attention".
- Trade-offs should feel **morally spicy**, not mechanically sterile. "Burn the treasury to pump the vibe" is the archetype.
- The DAO always dies from its own excess. Losses should feel earned, not random.
- Roast lines should sting but stay playful (never hateful or personal).
- Keep post-mortem lines short and screenshot-friendly.
- Event detail copy must sound like real operations chatter: include actors, timing, and concrete chain/governance signals.
- Avoid filler one-liners like "something happened". If detail is not specific, rewrite.

---

## 11. Done Definition

The refactor is shipped when:
- A fresh player can open the page, understand the four meters in < 10 seconds, and die on their first run in a way that feels like their fault.
- A skilled player can chain leverage to `x5`, hit Week 30, and feel like a genius.
- No single stat is displayed. **The Timeline is the score.**
