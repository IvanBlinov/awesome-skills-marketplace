# Spec: <Feature name>

- **Slug:** <slug>
- **Date:** <YYYY-MM-DD>
- **Status:** Draft | Approved
- **Input:** "<the idea as the user gave it>"

## Intent

<Two or three sentences: what changes for whom, and why now.>

## Goals

- <Outcome this feature must achieve>

## Non-goals

- <Related things this feature deliberately does not do>

## Anti-goals

- <Outcomes to actively avoid, e.g. "no new runtime dependency">

## User Stories

<!-- Ordered by priority. Each story is independently testable and delivers value alone. -->

### Story 1 — <title> (Priority: P1)

<The journey in plain language.>

**Why this priority:** <value>

**Independent test:** <how to verify this story alone>

**Acceptance scenarios:**

1. **Given** <state>, **When** <action>, **Then** <outcome>

## Functional Requirements

<!-- Testable, technology-agnostic. Unclear points: [NEEDS CLARIFICATION: <question>] — at most 3. -->

- **FR-001**: <The system MUST …>
- **FR-002**: <…>

### Key Entities

- **<Entity>**: <what it represents, key attributes, relationships>

## Success Criteria

<!-- Measurable and technology-agnostic: "users finish checkout in under 2 minutes", not "API p95 < 200 ms". -->

- **SC-001**: <measurable outcome>

## Edge Cases

- <What happens when …?>

## Constraints

- <Technical, legal, budget, compatibility, deadline>

## Approaches

<!-- 2–3 options considered, with the recommended one first and why. -->

1. **<Recommended approach>** — <summary>. Chosen because <reason>.
2. **<Alternative>** — <summary>. Not chosen because <reason>.

## Decided / Left to the builder

- **Decided:** <decisions the implementer must not reopen>
- **Left to the builder:** <choices the implementer may make>

## Assumptions

- <Reasonable defaults chosen where the input was silent; in auto mode, every question answered without the user>

## Clarifications

<!-- Appended by spec-creator after each round of answers. -->

### Session <YYYY-MM-DD>

- Q: <question> → A: <answer> (changed: <sections>)
