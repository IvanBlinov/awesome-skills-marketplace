---
name: architecture-review-rubric
description: Checklist and severity scale for reviewing a design, implementation plan or architecture change - requirement coverage, verified technology choices, fit with the existing codebase, operational envelope, deferred items and failure modes. Use when reviewing or self-checking any design or plan before implementation.
---

<!--
Portions of this file are derived from anthropics/claude-plugins-official
plugins/code-modernization/agents/architecture-critic.md (commit 465f0934),
licensed under the Apache License, Version 2.0 (see LICENSE-APACHE-2.0).
Modified by awesome-skills-marketplace: generalised from modernization reviews to any
design, plan or code review; added the review rubric, impact rating, ADR suggestions and
a fixed return format.
The checklist also adapts items from bmad-code-org/BMAD-METHOD
skills/bmad-architecture/references/reviewer-gate.md (MIT, Copyright (c) 2025 BMad Code, LLC).
See NOTICE.md.
-->

# Architecture review rubric

Use this rubric to review a design or plan, or to self-check your own before handing it
over. A fresh reviewer finds the divergences an author talks past, so prefer running it
in an independent context (the `architecture-reviewer:architecture-reviewer` agent)
over an inline self-check when the stakes are real.

## Checklist

Walk every item. Each "no" is a finding.

1. **Requirements.** The design covers every requirement in the spec or ticket that drove
   it. List any requirement with no corresponding component, task or decision.
2. **Simplest adequate design.** No component, layer or abstraction exists without a
   requirement that needs it. Name the simpler alternative when one exists.
3. **Technology verified current.** Every named library, service, API and version was
   checked against its current documentation, not assumed from memory.
4. **Fits the existing codebase.** The design ratifies existing patterns, or says
   explicitly why it departs from them.
5. **Decisions are enforceable.** Each key decision states a rule concrete enough that two
   implementers would make the same choice.
6. **Failure modes.** At least one failure path (dependency down, slow, returns bad data)
   is traced end to end, with the behaviour the user sees.
7. **Operational envelope stated.** Deployment and environments, configuration and
   secrets, observability, and operations are decided, deferred, or listed as open
   questions. A whole dimension left silent is a finding.
8. **Deferred items are safe.** Nothing deferred could let two parts of the system
   diverge or force a rewrite later.
9. **Data and migration.** Data ownership, schema changes and migration or rollback are
   addressed where data changes.
10. **Testability.** The design can be tested at the seams the plan relies on.

## Severity

| Severity | Meaning | Typical action |
|---|---|---|
| **Blocker** | The work should not proceed as written: a missed requirement, a design that cannot work, data loss risk | Fix before continuing |
| **High** | Likely to cause rework, outages or significant cost | Fix now unless explicitly accepted |
| **Medium** | Real but contained: unclear decision, missing failure handling in one path | Fix or record as a follow-up |
| **Nit** | Style, naming, wording | Optional |

## Reporting

- Lead with a one-sentence verdict, then Blocker and High findings in full.
- Roll Medium and Nit into a short tail when there are many.
- For each finding give: what, where, why it matters, and a concrete change.
- When you are the author self-checking, apply the clear fixes yourself and surface only
  what needs someone else's decision.
