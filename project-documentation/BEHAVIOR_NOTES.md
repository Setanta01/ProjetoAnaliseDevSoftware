# Agent Behavior & Development Guidelines

When working on this codebase, all AI agents and developers should adhere to the following principles to maintain the project's health and sanity.

## 1. Code is Cognitive Debt
Every line of code added to the project increases its complexity and cognitive burden. Always consider whether a new feature, abstraction, or piece of logic is strictly necessary. If there's a simpler way to achieve the same result with fewer lines of code or less overhead, choose the simpler path.

## 2. Keep Entropy and Complexity Low
Avoid over-engineering. This is not an enterprise-grade application that needs to scale to hundreds of thousands of users. Solutions should be practical, straightforward, and direct. Do not add complex architectural patterns or highly decoupled tests that add overhead without proportionate value.

## 3. Protect the Frontend from Clutter
Frontend applications can quickly become unmanageable if left unchecked.
- Keep components focused and straightforward.
- Avoid introducing unnecessary third-party dependencies or convoluted state management.
- Ensure that the frontend structure remains easy to navigate and change in the future. Be very careful with adding new layers of abstraction.

## 4. Respect the Design System
There is an existing design system and established visual patterns in place. Do not diverge significantly from them. Re-use existing components, colors, spacing, and typography to maintain consistency across the UI instead of reinventing the wheel.

## 5. Portuguese Language (pt-BR)
Remember that this codebase uses Portuguese (pt-BR) for user-facing text, error messages, and domain logic. Maintain this standard to keep the project uniform.

## 6. Meaningful Commits
Wrap functionality changes in discrete, logical git commits grouped by feature or section. Do not push changes unless explicitly requested.
