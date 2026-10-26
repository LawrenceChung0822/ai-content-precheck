# Regression method — fixed test set + versioned attribution

> The method below is real; the numbers in this repo's demo are illustrative. The point of a precheck system is that **every change is measured, not vibed**.

## Fixed test set

- A frozen set of labeled string batches (like `data/samples.json`, but larger and versioned: `eval/testset-vN.json`).
- Labels come from human review consensus, not from the model under test.
- The set includes one-plus sample per rule and per semantic issue type, plus clean batches (to measure false positives).

## What gets measured on every change

| Change | Metric |
|---|---|
| New/modified rule in Layer 1 | Rule hit rate, false-positive rate on clean batches |
| Prompt or model swap in Layer 2 | Precision/recall vs human labels; % escalated to Layer 3 |
| Style-guide / glossary update | Previously-passing batches re-run; diffs reviewed |

## Attribution discipline (model swaps)

When the underlying model changes:

1. Run the **same** fixed test set against old and new model/prompt.
2. Diff verdicts **per sample**, not aggregate scores only.
3. Every changed verdict gets attributed to a cause: model capability, prompt wording, or label error — never "the model changed, shrug".
4. Record in a changelog entry: testset version, model id, metric deltas, accepted/rejected.

## Minimum bar before a change ships

- No rule regresses on its own positive samples.
- No clean batch newly blocked (false positive at Error).
- Layer-2 precision on error-class issues does not drop (warnings may fluctuate within tolerance).
