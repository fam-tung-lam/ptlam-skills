# Interactive flow patterns

Compose the reusable
[flowchart component](../../components/diagrams/flowchart.md) with supporting
components only when the learning case requires synchronized observation or
playback:

- [Flowchart with state](flowchart-with-state.md) pairs the flow with observable
  state.
- [Flowchart with state and control plane](flowchart-with-state-and-control-plane.md)
  adds reversible playback for a step-by-step learning case.

Keep component ownership intact: the flowchart owns nodes and edges, the state
panel owns observable values, and the control plane owns progression.
