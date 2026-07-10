# AGENT_SPEC -- Eight Agents, One Ticket (blog)

Build spec for the agent that constructs this deliverable. Unambiguous by design: follow it
literally. Where it references shared conventions, see the root `README.md` and `CLAUDE.md`;
do not redefine them. Where it references chart design, apply the `dataviz` skill.

## 1. Objective

Build a statically generated blog post plus a reproducible read-only analysis pipeline that
ingests one real Implementation Tournament run (and a run cohort), computes the run's
statistics, generates four accessible charts, and injects every computed number into the prose
so no figure is ever hand-typed.

Success criteria:

- [ ] `pnpm --filter @aisprint/blog analyze --fixture fixtures/run-a9f3 --cohort fixtures/cohort`
      emits `content/data/figures.json` and `public/charts/{1,2,3,4}.svg` deterministically.
- [ ] `pnpm --filter @aisprint/blog build` produces `dist/` with zero broken internal links.
- [ ] Every metric in the rendered article traces to a Firestore field path or a
      `logs/{lane}.log` line (traceability test passes).
- [ ] No numeric metric literal exists in the prose source; all come from `{{figure:...}}`
      placeholders (lint passes).
- [ ] Every score and rank equals `judge.json` for the run.
- [ ] Emoji grep over content and generated SVGs returns nothing.
- [ ] Charts pass the `dataviz` palette validator in light and dark, or ship the mandated relief.
- [ ] Deploys: analysis as a Cloud Run Job (read-only), site as a Cloud Run Service.

## 2. Non-goals / out of scope

- Do **not** run a tournament. This project reads an existing run; project 01 produces it.
- Do **not** turn the article into a tutorial or a how-to. It reports and interprets.
- Do **not** write to Firestore or GCS. Read-only, always.
- Do **not** fabricate, round-for-effect, or hand-type any metric. If a field is missing, fail
  loudly; do not synthesize a plausible value.
- Do **not** invent a finding the data does not support. The "obvious strategy lost" claim is
  only made if the cohort data shows it; otherwise report what the data shows.
- Do **not** build a live dashboard, an interactive query UI, or a CMS. Static output only.
- Do **not** add analytics, trackers, external fonts, or CDN assets to the published site.

## 3. Tech stack (pinned)

| Concern | Choice | Version |
|---|---|---|
| Runtime | Node.js | 24 LTS |
| Language | TypeScript | 5.6.x |
| Package manager | pnpm workspaces | 9.x |
| Static site generator | Astro | 4.x (content collections, zero client JS by default) |
| Content format | Markdown/MDX under `content/` | Astro content collections |
| Metrics types | shared with `@aisprint/harness-core` run schema | workspace |
| Firestore access | `@google-cloud/firestore` | 7.x |
| GCS access | `@google-cloud/storage` | 7.x |
| Charts | SVG generated from data by the pipeline (no client charting lib) | -- |
| Test runner | Vitest | matches root |
| Lint | ESLint + a custom "no hand-typed metric" rule | -- |
| Link check | built-in Astro link check plus a post-build crawler | -- |

**Charting approach:** charts are static SVG strings produced by the pipeline's chart
generators from the computed data, following the `dataviz` skill (palette, marks, spacers,
legend rules, table-view fallback, texture channel). No runtime charting library and no client
JavaScript ship with the page. Colors are defined once as CSS custom properties on the chart
root, per the `dataviz` palette reference, so light/dark swap in one place. The pipeline must
run the `dataviz` palette validator as part of its test step.

## 4. Exact repository layout

```
03-eight-agents-one-ticket/
  README.md                     # human doc (already authored)
  AGENT_SPEC.md                 # this file
  package.json                  # name: @aisprint/blog
  astro.config.mjs
  tsconfig.json
  Dockerfile.analysis           # Cloud Run Job image (runs the pipeline)
  Dockerfile.site               # Cloud Run Service image (serves dist/)
  cloudbuild.yaml               # builds + pushes both images
  src/
    analysis/
      index.ts                  # CLI entry: analyze [--run-id | --fixture] --cohort
      loader.ts                 # Firestore/GCS run loader (+ fixture loader)
      stats.ts                  # metric computation (exact definitions in section 5)
      figures.ts                # assembles figures.json (values + source pointers)
      charts/
        palette.ts              # dataviz palette as CSS custom properties + validator hook
        svg.ts                  # shared SVG primitives (axes, bars, labels, legend, hatch)
        chart1-time-to-green.ts
        chart2-diff-size.ts
        chart3-token-cost.ts
        chart4-obvious-lost.ts
        table.ts                # table-view generator (one per chart)
      assemble.ts               # injects figures into prose placeholders at build time
    types/
      run-schema.ts             # input schema (mirrors harness-core), zod-validated
      figures-schema.ts         # figures.json schema
    pages/
      index.astro               # the article page (renders content + injected figures)
    components/
      Figure.astro              # wraps an SVG chart + caption + provenance + table toggle
      Provenance.astro          # runId + source line under each chart
  content/
    article/
      eight-agents-one-ticket.md  # prose with {{figure:...}} placeholders, no raw numbers
    data/
      figures.json              # GENERATED (gitignored); computed numbers + source pointers
  public/
    charts/                     # GENERATED SVGs 1..4 (gitignored)
  fixtures/
    run-a9f3/                   # deterministic single-run fixture (Firestore doc + GCS tree)
      run.json
      judge.json
      logs/{lane}.log
    cohort/                     # deterministic multi-run cohort for the win-rate figure
      runs/*.json
  tests/
    stats.test.ts
    figures-traceability.test.ts
    no-hand-typed-metrics.test.ts
    charts-accessibility.test.ts
    determinism.test.ts
```

## 5. Component specifications

### 5.1 Run loader (`analysis/loader.ts`)

- **Input:** either `--run-id <id>` (live) or `--fixture <path>` (offline), plus `--cohort`
  (a live cohort label or a fixture cohort path).
- **Behavior (live):** read Firestore `runs/{runId}` via `@google-cloud/firestore`; read
  `judge.json`, `logs/{lane}.log` from `gs://$ARTIFACT_BUCKET/runs/{runId}/`. Read-only. For
  the cohort, query the `runs` collection (optional `cohort` equality filter) and read each
  run's `winner` and `lanes[].strategy`.
- **Behavior (fixture):** read the identical shape from local files; no network.
- **Output:** a validated `RunRecord` (zod, from `types/run-schema.ts`) plus a `CohortRecord`.
- **Edge cases:** missing run -> exit non-zero with the runId. Schema mismatch -> exit non-zero
  listing the offending field. `lanes[].status === "red"` -> keep the lane, mark it excluded,
  and expect `score === null`. Cohort of size 1 -> set `cohort.n = 1` and flag `smallSample`.

### 5.2 Statistics (`analysis/stats.ts`) -- exact metric definitions

Compute only from loaded fields. Definitions are fixed:

- **timeToFirstGreen(lane)** = `lanes[].timeToFirstGreenMs`; null for red lanes. Rendered mm:ss.
- **diffLoc(lane)** = `lanes[].diffLoc` = lines added + lines removed, as measured by ts-morph
  in the source run. Never recomputed here; taken as recorded.
- **diffDistribution(strategy)** = for a single run, the single `diffLoc`; for a cohort, the
  set of `diffLoc` values across runs with `median` and `min`/`max`.
- **tokenCost(lane)** = `lanes[].tokenCost`, total tokens for the lane's subagent.
- **score(lane)** = `lanes[].score` (judge composite); null when red.
- **rank** = dense rank of green lanes by `score` descending; ties broken by lower `diffLoc`.
- **obviousStrategy** = the constant `"minimal-diff"` (the intuitive default pick), stated in
  prose as such; its `rank` and whether it equals `winner` drive the finding.
- **winRate(strategy)** over the cohort = `count(runs where winner === strategy) / cohort.n`,
  reported with `cohort.n` disclosed.
- **spreads** = `diffSpreadRatio = max(diffLoc)/min(diffLoc)`;
  `tokenSpreadRatio = max(tokenCost)/min(tokenCost)`.
- **greenCount / laneCount / excludedCount** = counts over `lanes[]`.

Every computed value is emitted with a `source` pointer (Firestore field path such as
`runs/{id}.lanes[2].score`, or `judge.json#/ranking/0`, or `logs/type-safe.log:L42`). A value
without a resolvable source is a hard error.

### 5.3 Figures assembler (`analysis/figures.ts`)

- **Input:** stats output.
- **Output:** `content/data/figures.json`, an object of named entries
  `{ id, value, formatted, unit, source }` keyed by placeholder id (for example
  `winner.strategy`, `obvious.rank`, `winner.benchDeltaPct`, `diff.spreadRatio`).
- **Behavior:** formatting (thousands separators, mm:ss, signed percent, `n=` suffix) happens
  here so prose placeholders are pure `{{figure:id}}` tokens.
- **Edge cases:** any referenced placeholder id missing from figures -> build fails; any figure
  entry never referenced -> warning (dead figure).

### 5.4 Chart generators (`analysis/charts/chart*.ts`) -- data-to-mark specs

All four emit standalone SVG strings using shared primitives and the `dataviz` palette. All
honor: thin marks; 4px rounded data-ends on bars anchored to the baseline; recessive hairline
grid/axes; a 2px surface gap between adjacent fills; selective direct labels (never a label on
every possible point when it clutters); text in ink tokens, never the series color; a legend
present for any chart with 2+ series; a table view generated alongside; dark-mode steps from
the same ramps (not an auto-flip); a texture (45deg/135deg hatch) channel available for the
excluded lane and for forced-colors/print. Run the palette validator against light and dark
surfaces; fix any FAIL or ship the relief (visible labels + table).

- **Chart 1 -- time-to-first-green (`chart1-time-to-green.ts`).** Job: magnitude comparison.
  Form: horizontal bar, one lane per row, sorted ascending by `timeToFirstGreenMs`. Color:
  single sequential blue hue (not categorical). X: elapsed time (mm:ss) from fan-out to first
  all-green; Y: strategy. Direct end-labels. Red/excluded lane: a hatched marker at the axis
  origin labeled "did not green", never a zero-length bar. Marks: `winner` lane gets a 2px ink
  outline ring so the reader sees it was a slower lane.
- **Chart 2 -- diff size (`chart2-diff-size.ts`).** Job: magnitude / distribution. Form: single
  run -> horizontal bar sorted ascending by `diffLoc`, sequential blue, direct-labeled. Cohort
  -> horizontal dot-strip per strategy: one muted-ink dot per run, a blue median tick, min/max
  whiskers optional. X: lines changed (added+removed); Y: strategy. Annotate the spread ratio.
- **Chart 3 -- token cost (`chart3-token-cost.ts`).** Job: magnitude comparison. Form:
  horizontal bar sorted ascending by `tokenCost`, single sequential blue hue. X: total tokens
  (thousands separators); Y: strategy. Direct end-labels. Do **not** invent an input/output
  token split; the schema has one `tokenCost` per lane, so this is one bar per lane.
- **Chart 4 -- the counterintuitive finding (`chart4-obvious-lost.ts`).** Job: one series is
  the point -> emphasis form (one hue + de-emphasis gray), never categorical. Form: horizontal
  bar of `winRate(strategy)` across the cohort, sorted descending; the winning strategy in
  accent blue, all others in de-emphasis gray; a direct callout annotation on `minimal-diff`
  stating its rank/win rate. Subtitle discloses `cohort.n`. If `cohort.n === 1`, render the
  single run's ranking instead, in the same emphasis style, with a visible "n=1, single run"
  caveat and no "how often" language.

Each generator also emits, via `table.ts`, an accessible HTML table with the same data (the
mandated relief and the CVD/print fallback). Chart and table share one data object.

### 5.5 Article assembler (`analysis/assemble.ts`)

- **Input:** `content/article/eight-agents-one-ticket.md` (placeholders only) + `figures.json`
  + the four SVGs.
- **Behavior:** at build time, replace every `{{figure:id}}` with the formatted value and wire
  each `{{chart:n}}` slot to its `Figure.astro` (SVG + caption + provenance + table toggle).
- **Edge cases:** an unresolved placeholder is a hard build error (fail closed). A raw numeric
  metric literal in the prose is caught by the lint rule (section 9), not silently rendered.

### 5.6 Site builder (Astro)

- Static output (`dist/`), zero client JS by default. The article is a single page
  (`pages/index.astro`) rendering the assembled content and the four figures. Light/dark via
  CSS custom properties and `prefers-color-scheme`, with a manual theme toggle that stamps
  `data-theme` (charts must render correctly in both, per `dataviz`). No external assets.

## 6. Content spec

`content/article/eight-agents-one-ticket.md` contains the sections below, in order, with
placeholders where numbers go. No figure is ever hand-typed.

1. **Hook.** "One ticket. {{figure:agents.count}} agents. The strategy an experienced engineer
   would have reached for -- {{figure:obvious.strategy}} -- finished
   {{figure:obvious.rankOrdinal}}." Names the winner: `{{figure:winner.strategy}}`.
2. **Method.** Fields recorded per lane; rubric weights `{{figure:rubric.tests}}`,
   `{{figure:rubric.diff}}`, `{{figure:rubric.complexity}}`, `{{figure:rubric.bench}}`; data
   source (`runs/{{figure:run.id}}`, GCS artifacts).
3. **Chart 1 slot:** `{{chart:1}}` + caption referencing `{{figure:timeToGreen.min}}` and
   `{{figure:timeToGreen.max}}`.
4. **Chart 2 slot:** `{{chart:2}}` + `{{figure:diff.min}}`, `{{figure:diff.max}}`,
   `{{figure:diff.spreadRatio}}`.
5. **Chart 3 slot:** `{{chart:3}}` + `{{figure:token.min}}`, `{{figure:token.max}}`,
   `{{figure:token.spreadRatio}}`.
6. **Chart 4 slot + finding:** `{{chart:4}}` + `{{figure:obvious.winRate}}` (or the n=1
   ordinal), `{{figure:winner.benchDeltaPct}}`, `{{figure:cohort.n}}`.
7. **Safety argument.** Prose only; the guarantees (worktree isolation, per-lane token budget,
   accumulation monitor, red-lane exclusion, winner re-verified green) referenced from the
   shared architecture -- no invented mechanisms.
8. **Takeaways.** Prose only.

The set of placeholder ids in the prose must exactly match the keys produced by
`figures.ts`; the build fails on any mismatch in either direction.

## 7. Data model

### 7.1 Input -- Firestore `runs/{runId}` (read-only)

```jsonc
{
  "runId": "2026-07-08T15-02-11Z-a9f3",
  "spec": "specs/example.md",
  "rubricWeights": { "tests": 0.40, "diff": 0.20, "complexity": 0.20, "bench": 0.20 },
  "winner": "performance-first",
  "lanes": [
    {
      "strategy": "minimal-diff",         // enum, 6 values
      "status": "green",                  // "green" | "red"
      "timeToFirstGreenMs": 130000,        // number | null (null when red)
      "diffLoc": 38,                       // added + removed (ts-morph)
      "cyclomaticComplexity": 9,
      "benchmarkDeltaPct": 2.0,            // signed
      "tokenCost": 61205,
      "score": 0.861                       // number | null (null when red)
    }
    // ... one entry per lane
  ]
}
```

### 7.2 Input -- GCS `gs://$ARTIFACT_BUCKET/runs/{runId}/`

- `judge.json` -- `{ "ranking": [ { "lane", "score", "diffLoc", "cx", "benchDeltaPct" } ],
  "winner", "reasoningTrace" }`. Source of truth for scores/ranks the article renders.
- `logs/{lane}.log` -- per-lane log; figures may point at specific lines for traceability.

### 7.3 Intermediate -- `content/data/figures.json` (emitted)

```jsonc
{
  "winner.strategy":   { "value": "performance-first", "formatted": "performance-first",
                         "source": "runs/…-a9f3.winner" },
  "obvious.rank":      { "value": 3, "formatted": "3rd",
                         "source": "judge.json#/ranking/2" },
  "winner.benchDeltaPct": { "value": -18.4, "formatted": "-18.4%",
                         "source": "runs/…-a9f3.lanes[1].benchmarkDeltaPct" },
  "diff.spreadRatio":  { "value": 5.39, "formatted": "5.4x",
                         "source": "computed: max/min diffLoc" }
  // one entry per placeholder id used in the prose
}
```

`figures-schema.ts` (zod) validates that every entry has `value`, `formatted`, and a non-empty
`source`.

## 8. GCP deployment spec

Project `aisprint-agy`, region `us-central1`, Artifact Registry
`us-central1-docker.pkg.dev/aisprint-agy/aisprint`. The analysis runs as a Cloud Run **Job**
(read-only to the data source); the site runs as a Cloud Run **Service** (no data access at
runtime because figures are baked into the build).

**Service account (least privilege, read-only):**

```bash
PROJECT=aisprint-agy
gcloud iam service-accounts create blog-analysis \
  --display-name="Eight Agents blog analysis job"
ANALYSIS="blog-analysis@${PROJECT}.iam.gserviceaccount.com"
gcloud projects add-iam-policy-binding $PROJECT \
  --member="serviceAccount:${ANALYSIS}" --role=roles/datastore.viewer
gcloud projects add-iam-policy-binding $PROJECT \
  --member="serviceAccount:${ANALYSIS}" --role=roles/storage.objectViewer
```

Do **not** grant `datastore.user`, `storage.objectAdmin`, or any write/aiplatform role -- this
project neither writes data nor calls Vertex AI.

**Build both images:**

```bash
gcloud builds submit --config 03-eight-agents-one-ticket/cloudbuild.yaml \
  --substitutions=_REGION=us-central1,_REPO=aisprint
```

**Analysis job (env vars + run):**

```bash
gcloud run jobs deploy blog-analysis \
  --image us-central1-docker.pkg.dev/aisprint-agy/aisprint/blog-analysis:latest \
  --region us-central1 --service-account "$ANALYSIS" \
  --set-env-vars GOOGLE_CLOUD_PROJECT=aisprint-agy,GOOGLE_CLOUD_REGION=us-central1,\
ARTIFACT_BUCKET=aisprint-agy-artifacts,FIRESTORE_DATABASE="(default)" \
  --max-retries 0 --task-timeout 900s

gcloud run jobs execute blog-analysis --region us-central1 \
  --args="--run-id,2026-07-08T15-02-11Z-a9f3,--cohort,default"
```

**Site service:**

```bash
gcloud run deploy blog-site \
  --image us-central1-docker.pkg.dev/aisprint-agy/aisprint/blog-site:latest \
  --region us-central1 \
  --service-account "blog-site@aisprint-agy.iam.gserviceaccount.com" \
  --allow-unauthenticated
```

Runtime auth is via the service-account identity and ADC; no keys in images. `cloudbuild.yaml`
builds `Dockerfile.analysis` and `Dockerfile.site`, tags both `:latest` and `:$SHORT_SHA`, and
pushes to Artifact Registry.

## 9. Acceptance tests

1. **Determinism.** Two consecutive fixture runs produce byte-identical `figures.json` and
   identical SVGs (`determinism.test.ts` diffs `sha256sum`).
2. **Traceability.** Every `figures.json` entry has a resolvable `source`; the test resolves
   each Firestore path / `judge.json` pointer / log line reference against the fixture and
   fails on any dangling source (`figures-traceability.test.ts`).
3. **Scores match judge.** Every rendered score/rank equals `judge.json` for the run.
4. **No hand-typed metrics.** `no-hand-typed-metrics.test.ts` (and an ESLint rule) fails if a
   numeric metric literal appears in `content/article/*.md` outside a `{{figure:...}}` token.
5. **Placeholder closure.** The set of `{{figure:id}}` in the prose equals the key set of
   `figures.json`; mismatch either way fails the build.
6. **Build + links.** `pnpm --filter @aisprint/blog build` exits zero; the link crawler reports
   no broken internal links.
7. **No emojis.**
   ```bash
   grep -rlP '[\x{1F000}-\x{1FAFF}\x{2600}-\x{27BF}\x{FE0F}\x{2190}-\x{21FF}\x{2B00}-\x{2BFF}]' \
     03-eight-agents-one-ticket/content 03-eight-agents-one-ticket/public/charts \
     && echo "EMOJI FOUND -- FAIL" && exit 1 || echo "no emojis"
   ```
8. **Accessibility.** `charts-accessibility.test.ts` runs the `dataviz` palette validator for
   light and dark surfaces (pass, or relief present) and an axe check on built pages reports no
   serious violations.

## 10. Guardrails -- DO NOT

- Do **not** hardcode or fake any metric. Every number comes from the loaded run/cohort.
- Do **not** invent a finding the data does not support. If `minimal-diff` did *not* lose in
  the cohort, report the actual result; the article's framing adapts to the data, not the
  reverse.
- Do **not** invent fields the schema lacks (for example an input/output token split). One
  `tokenCost` per lane means one bar per lane.
- Do **not** add emojis anywhere -- prose, code, comments, SVG, table, commit messages.
- Do **not** require or request write access to Firestore or GCS, or any Vertex AI role.
- Do **not** run a tournament, call an LLM, or add runtime data access to the site.
- Do **not** ship a chart that fails the `dataviz` contrast/CVD checks without the mandated
  relief (visible labels + table view); do **not** use a dual-axis chart, cycle categorical
  hues, or color a series by rank.
- Do **not** ship client-side charting libraries or external/CDN assets.
- Do **not** let the prose contain a raw metric literal; the lint rule must stay enforced.

## 11. Definition of done

- All eleven success-criteria boxes in section 1 are checked.
- All eight acceptance tests in section 9 pass in CI (Cloud Build).
- The analysis Cloud Run Job runs green against the reference run with the read-only service
  account; the site Cloud Run Service serves the built article with all four charts and their
  table views.
- Every figure in the published article traces to a log line; the emoji grep is clean; the
  charts pass the `dataviz` pass in both modes.
- README section 7 (verify) and this file's section 9 (acceptance) agree and both pass.
