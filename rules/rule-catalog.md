# Rule catalog (Layer 1)

Deterministic rules implemented in `js/rules-engine.js`. Each rule is pure: entries in → findings out. Severity `error` blocks the gate; `warning` requires a recorded reason to pass.

| ID | Severity | What it checks | Example trigger |
|---|---|---|---|
| `R-EMPTY` | error | Target is empty or whitespace-only | `""`, `"   "` |
| `R-PLACEHOLDER` | error | Placeholder set differs between source and target (`{name}`, `%s`, `%d`) | source `{count}` → target `{jours}` |
| `R-DUPKEY` | error | Same key appears more than once in the batch | TM merge accident |
| `R-DATE` | error | Ambiguous short date (2-digit year, or both parts ≤ 12) | `3/14/26` in a DD/MM market |
| `R-PUNCT` | warning | Double spaces; space before `!`/`?` | `"Conflit  de …"`, `"prêt !"` |
| `R-ELLIPSIS` | warning | Mixed or off-spec ellipsis (`...` vs `…`) | style guide requires U+2026 |
| `R-LENGTH` | warning | Target exceeds declared UI budget (chars) | 25-char German button, budget 18 |

## Adding a rule / 扩展规则

1. Add a pure function `ruleX(entries) -> findings[]` in `rules-engine.js`.
2. Append it in `runRules`.
3. Add a sample in `data/samples.json` that triggers it (and one that doesn't).
4. Bump `PrecheckRules.version`; record the change in `eval/regression-notes.md`.

## Deliberately *not* in Layer 1

Word sense, tone, glossary conformance, cultural fit — these are contextual and belong to Layer 2 (LLM) with Layer 3 (human) escalation. Putting them in rules would produce false-positive noise; leaving programmable checks to the LLM would burn tokens and lose determinism.
