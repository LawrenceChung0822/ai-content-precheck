# AI Content Precheck

An interactive demo of a **three-layer content pre-review architecture** for localization: deterministic rules → LLM semantic review → human arbitration.

三层内容审核架构交互演示：**程序化规则 → LLM 语义审核 → 人工兜底**。

> **Disclaimer / 声明**
> All sample data is synthetic. The product "CloudNotes" and every string in this demo are invented; no company-internal information is included. Layers 2–3 results are pre-set and labeled **SIMULATED** — this demo never calls a real model. Layer 1 rules genuinely run in your browser.
>
> 全部样例数据均为虚构（产品 CloudNotes 及所有字符串为演示而造），不含任何公司内部信息。Layer 2/3 为预置结果并标注 **SIMULATED**；Layer 1 规则在浏览器中真实运行。

**Live demo → https://lawrencechung0822.github.io/ai-content-precheck/**

## Why not just let the LLM review everything? / 为什么不直接让 LLM 全审？

LLM-direct review hits three walls:

1. **Unreliable** — no guaranteed check for programmable issues (empty fields, placeholder loss, duplicate keys). A model can *describe* a missing `{count}`; a regex *never misses* it.
2. **Not gateable** — "the model said it's fine" is not an auditable gate. Enterprises need Error/Warning severity with recorded dispositions.
3. **Too expensive** — running every string through a model burns tokens on issues a rules engine settles in milliseconds for free.

LLM 直审三死穴：**不可靠**（可程序化问题没有确定性保证）、**不可门禁**（"模型说没问题"无法作为审计依据）、**太贵**（可规则化的检查不该烧 Token）。

## Architecture / 架构

```
                 strings in
                     │
        ┌────────────▼────────────┐
 Layer 1 │  Deterministic rules   │── Error ──► BLOCK (never reaches L2)
 (live)  │  empty / placeholders  │
         │  dup keys / dates …    │── Warning ─┐
        └────────────┬────────────┘            │
                     │ pass                    │
        ┌────────────▼────────────┐            │
 Layer 2 │  LLM semantic review   │── Error ──► BLOCK
(SIM)    │  sense / tone / glossary│── Warning ─┤
        └────────────┬────────────┘            │
                     │ unsure / policy         │
        ┌────────────▼────────────┐            │
 Layer 3 │  Human arbitration     │── Reject ─► BLOCK
(SIM)    │  accept + follow-up    │── Accept ──┤
        └────────────┬────────────┘            │
                     ◄─────────────────────────┘
              approve (Warnings need a recorded reason)
```

## Design principles / 设计原则

| Principle | In practice |
|---|---|
| **Rules don't burn tokens** | Anything programmable (empty fields, placeholder integrity, duplicate keys, date formats, ellipsis style, length budgets) runs in Layer 1 — deterministic, instant, free. |
| **Gate by severity** | `Error` blocks submission. `Warning` can pass — but only with a recorded reason, which becomes audit data. |
| **Architecture over prompts** | When a model hits its capability ceiling (word sense, product tone), the answer is *where you put it in the funnel and what you let it decide* — not another prompt tweak. |

## Try these samples / 建议试看顺序

| Sample | Shows |
|---|---|
| S01–S04 | Layer 1 kills Errors before any token is spent; submission disabled |
| S05–S08 | Warnings pass only with a reason; S08 shows glossary drift caught by Layer 2 |
| S09 | Word-sense error only the semantic layer catches |
| S10 | Human arbitration: accept now, update the style guide for next time |

## Repo layout / 目录

```
index.html                     # UI shell
js/rules-engine.js             # Layer 1 — real, runs in-browser
js/mock-review.js              # Layers 2–3 — SIMULATED
data/samples.json              # 10 synthetic samples
rules/rule-catalog.md          # rule inventory
prompts/semantic-review-prompt.md  # the Layer-2 prompt (for reference)
eval/regression-notes.md       # fixed test set + versioned regression method
```

## Run locally / 本地运行

```bash
python -m http.server 8000
# open http://localhost:8000
```

(Needs HTTP — `fetch` of `samples.json` doesn't work from `file://`.)

## License

MIT
