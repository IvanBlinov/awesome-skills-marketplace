# Notices

`architecture-reviewer` is MIT-licensed (see `LICENSE`). Parts of it are adapted from the
projects below, used under their licenses. Paths are relative to each repository at the
listed commit.

| Our file | Adapted from | Commit | License |
|---|---|---|---|
| `agents/architecture-reviewer.md`, `skills/architecture-review-rubric/SKILL.md` | [anthropics/claude-plugins-official](https://github.com/anthropics/claude-plugins-official) `plugins/code-modernization/agents/architecture-critic.md` | `465f09344424225c25d438f2e052732c3d688d2f` | Apache-2.0 (full text in `LICENSE-APACHE-2.0`) |
| `agents/architecture-reviewer.md` | [wshobson/agents](https://github.com/wshobson/agents) `plugins/comprehensive-review/agents/architect-review.md` (impact rating, ADR suggestions) | `0874a27b17a22e2b7c2e2bcd725768e0803cad06` | MIT, Copyright (c) 2024 Seth Hobson |
| `skills/architecture-review-rubric/SKILL.md` | [bmad-code-org/BMAD-METHOD](https://github.com/bmad-code-org/BMAD-METHOD) `skills/bmad-architecture/references/reviewer-gate.md` (checklist items, tiered reporting) | `61e01f82644c4bb533750cfa0d6d61ab61d2cc9b` | MIT, Copyright (c) 2025 BMad Code, LLC |

## Changes to Apache-2.0 material

The architecture-critic agent was modified: generalised from modernization reviews to any
design, plan or code review; added the rubric, impact rating, ADR suggestions and a fixed
return format. Both derived files state this in a header comment, as section 4(b) of the
Apache License requires. The source plugin ships no NOTICE file.

## Trademarks

"BMad" and "BMAD" are trademarks of BMad Code, LLC. This plugin is not affiliated with
or endorsed by BMad Code, LLC, and does not use those names for any component.

## MIT License text (applies to the MIT sources above)

Permission is hereby granted, free of charge, to any person obtaining a copy of this
software and associated documentation files (the "Software"), to deal in the Software
without restriction, including without limitation the rights to use, copy, modify,
merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit
persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or
substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR
PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE
FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
DEALINGS IN THE SOFTWARE.
