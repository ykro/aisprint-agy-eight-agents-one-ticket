# Eight Agents, One Ticket

One ticket. {{figure:agents.count}} agents. The strategy an experienced engineer
would have reached for by intuition -- {{figure:obvious.strategy}}, the smallest
and cheapest change -- finished {{figure:obvious.rankOrdinal}}. The lane that won
was {{figure:winner.strategy}}.

This is a measured writeup of a single Implementation Tournament run
(`{{figure:run.id}}`). A controller read one ordinary ticket and fanned it out to
several strategy subagents, each building the same feature in an isolated
worktree; a judge then scored the passing lanes against a fixed rubric and picked
the winner. Every number below is injected from the run's captured metrics, so no
figure in this prose is hand-typed. The run supplied here is a single one
({{figure:cohort.n}}), so the finding is reported as one run's result, not a rate.

## Method

The run built {{figure:lanes.count}} lanes: {{figure:green.count}} reached green
and {{figure:excluded.count}} was excluded for failing its tests. Each lane
records the fields this article reads: time to first green, diff size in lines
changed, cyclomatic complexity, benchmark median, token cost, pass rate, and a
final rubric score. The judge's rubric is stated up front so the verdict is
auditable: tests weigh {{figure:rubric.tests}}, diff size {{figure:rubric.diff}},
complexity {{figure:rubric.complexity}}, and benchmark {{figure:rubric.bench}}.
The winner, {{figure:winner.strategy}}, ranked {{figure:winner.rankOrdinal}} on
that rubric.

## Time to first green

{{chart:1}}

The lanes reached green at very different times, from
{{figure:timeToGreen.minStrategy}} at {{figure:timeToGreen.min}} to
{{figure:timeToGreen.maxStrategy}} at {{figure:timeToGreen.max}}. The eventual
winner, {{figure:winner.strategy}}, went green at {{figure:winner.timeToGreen}} --
one of the slower lanes, not the first. First green is not best: the lane that
crossed the line earliest is not the one the judge merged.

## Diff size per strategy

{{chart:2}}

Eight agents solve one ticket very differently. The leanest change,
{{figure:diff.minStrategy}}, touched {{figure:diff.min}} lines; the largest,
{{figure:diff.maxStrategy}}, touched {{figure:diff.max}} -- a spread of
{{figure:diff.spreadRatio}} for the same ticket. The smallest diff is the
intuitive pick, yet a smaller diff did not translate into a higher rank.

## Token cost per lane

{{chart:3}}

Parallel exploration has a price. The cheapest lane,
{{figure:token.minStrategy}}, spent {{figure:token.min}} tokens; the most
expensive, {{figure:token.maxStrategy}}, spent {{figure:token.max}} -- a
{{figure:token.spreadRatio}} spread. The cheapest lane is at one end and the most
expensive at the other, and neither was the winner: spend did not buy the win, and
cheapness did not secure it.

## The counterintuitive finding

{{chart:4}}

Here is the point. The obvious minimal-diff pick scored {{figure:obvious.score}}
and placed {{figure:obvious.rankOrdinal}} of the green lanes. The winner,
{{figure:winner.strategy}}, scored {{figure:winner.score}} and earned its rank in
part on a measured benchmark: its median of {{figure:winner.benchMs}} milliseconds
came in {{figure:winner.benchDeltaPct}} against the obvious lane's
{{figure:obvious.benchMs}} milliseconds. That gap is a real improvement the small
diff never attempted. With a single run ({{figure:cohort.n}}) this is one result,
not a win rate; the honest claim is that on this ticket the obvious strategy lost.

## The safety argument

None of this is safe to run unattended without isolation. Each lane builds in its
own worktree, so no lane can corrupt the trunk or another lane. A per-lane token
budget and an accumulation monitor bound both blast radius and spend. A red lane
is excluded, never merged, and the winner is re-verified green before the
fast-forward. Concurrency without isolation is a hazard; concurrency with it is a
control. That is why the excluded lane appears in the charts as an excluded
marker rather than a silent omission.

## Takeaways

Running several divergent implementations in parallel and letting a judge pick on
measured evidence is a quality control, not just a speed hack. The implementation
a senior engineer would reach for by intuition is frequently not the one that wins
on the rubric, and the cheapest way to learn that is to run the alternatives at
once. Read the rubric weights as a policy lever: change what the organization
values and the winner can change with it. The tournament is worth the token spend
exactly when correctness matters more than the tokens, which is precisely when an
architect is most reluctant to trust autonomous tooling.
