# Implementation Tracker

## Step Status Overview (Reconciled 2026-02-25)

| Step | Plan ID | Status | Notes / Evidence |
|---|---|---|---|
| 1 | P0-01 | completed | Branch + tracker initialized (`feat/mvp-core-closure`). |
| 2 | P0-02 | completed | `npm ls --depth=0` passed at root/client/server on 2026-02-25. |
| 3 | P0-03 | completed | `cd client && npm run lint` and `npm run build` passed on 2026-02-25. |
| 4 | P0-04 | completed | Five-module baseline verified with successful logs for flashcards/sentence/reading/quiz/report (`code/functional_baseline.md`). |
| 5 | P0-05 | completed | Verified `/health` and `/ai/test` under invalid + valid provider config; valid `.env` provider call returned success. |
| 6 | P0-06 | completed | Added user personas doc: `code/target_users.md` (3 personas + usage frequency + success metrics). |
| 7 | P0-07 | completed | Added brand guideline doc: `code/brand_guidelines.md` (color, tone, copy, interaction rules). |
| 8 | P0-08 | completed | Rewrote `CLAUDE.md` from outdated vanilla-stack docs to current React+Express architecture. |
| 9 | P1-01 | completed | Added global design tokens in `client/src/index.css` and applied them in Home + Flashcards + Navbar layers. |
| 10 | P1-02 | completed | Added typography hierarchy tokens/classes and applied to Home/Reading/Quiz headings and body text. |
| 11 | P1-03 | completed | Contrast audit reconciled across all modules; key readability texts/buttons fixed in Home/Flashcards/Sentence/Reading/Quiz (light/dark). |
| 12 | P1-04 | completed | Button system unified: primary/secondary/destructive/disabled interaction rules standardized and outline usage migrated. |
| 13 | P1-05 | completed | Input system unified: shared form-control styles for Input/Textarea/Select, plus visible form error states in Settings dialog. |
| 14 | P1-06 | completed | Feedback system unified: Loading/Empty/Toast/Skeleton refreshed and shared inline error alert applied to all five modules. |
| 15 | P1-07 | completed | Navigation and page shell refactored: Navbar/Footer/Layout spacing and layering unified, mobile menu overlay/collapse improved, settings entry stable on both desktop and mobile. |
| 16 | P1-08 | completed | Homepage information architecture upgraded: stronger product positioning, dual CTA hierarchy, explicit five-module entry map, and guided learning path blocks. |
| 17 | P1-09 | completed | Five-module framework unified with shared section scaffold (`输入区/结果区/历史区/操作区`) and consistent ordering across Flashcards/Sentence/Reading/Quiz/Achievements. |
| 18 | P1-10 | completed | Added key motion polish (`ModuleSection` stagger + result soft-pop) and mobile tap-target upgrades on high-frequency icon controls across modules. |
| 19 | P2-F-01 | completed | Flashcard model extended with `learningStatus/nextReviewAt/accuracy/reviewCount`, including legacy localStorage migration on read. |
| 20 | P2-F-02 | completed | Flashcard extraction contract upgraded: configurable `maxWords` in UI/API, validator boundary tightened to `1..30`, and backend extraction response normalized with explicit invalid-format failure messages. |
| 21 | P2-F-03 | completed | Added flashcard tri-state actions (`生词/复习/掌握`) with immediate local updates for status, review count, accuracy, and next review time. |
| 22 | P2-F-04 | pending | Not started. |
| 23 | P2-F-05 | pending | Not started. |
| 24 | P2-F-06 | pending | Not started. |
| 25 | P2-S-01 | pending | Not started. |
| 26 | P2-S-02 | pending | Not started. |
| 27 | P2-S-03 | pending | Not started. |
| 28 | P2-S-04 | pending | Not started. |
| 29 | P2-S-05 | pending | Not started. |
| 30 | P2-R-01 | pending | Not started. |
| 31 | P2-R-02 | pending | Not started. |
| 32 | P2-R-03 | pending | Not started. |
| 33 | P2-R-04 | pending | Not started. |
| 34 | P2-R-05 | completed (out-of-order) | Reading->Quiz context persistence implemented on 2026-02-24 (see `progress.md`). |
| 35 | P2-R-06 | pending | Not started. |
| 36 | P2-Q-01 | pending | Not started. |
| 37 | P2-Q-02 | pending | Not started. |
| 38 | P2-Q-03 | pending | Not started. |
| 39 | P2-Q-04 | pending | Not started. |
| 40 | P2-Q-05 | pending | Not started. |
| 41 | P2-Q-06 | pending | Not started. |
| 42 | P2-A-01 | pending | Not started. |
| 43 | P2-A-02 | pending | Not started. |
| 44 | P2-A-03 | pending | Not started. |
| 45 | P2-A-04 | pending | Not started. |
| 46 | P3-01 | pending | Not started. |
| 47 | P3-02 | pending | Not started. |
| 48 | P3-03 | pending | Not started. |
| 49 | P3-04 | pending | Not started. |
| 50 | P3-05 | pending | Not started. |
| 51 | P3-06 | pending | Not started. |
| 52 | P3-07 | pending | Not started. |
| 53 | P3-08 | pending | Not started. |
| 54 | P3-09 | pending | Not started. |
| 55 | P4-01 | completed (out-of-order) | Centralized request validation landed on 2026-02-25. |
| 56 | P4-02 | pending | Not started. |
| 57 | P4-03 | pending | Not started. |
| 58 | P4-04 | pending | Not started. |
| 59 | P4-05 | pending | Not started. |
| 60 | P4-06 | pending | Not started. |
| 61 | P4-07 | pending | Not started. |
| 62 | P5-01 | pending | Not started. |
| 63 | P5-02 | pending | Not started. |
| 64 | P5-03 | pending | Not started. |
| 65 | P5-04 | pending | Not started. |

## Current Execution Pointer
- First not-yet-completed step: `P2-F-04`.
- Execution policy: continue from the first pending/partial step unless explicitly reprioritized by lyricx.
