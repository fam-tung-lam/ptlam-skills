# State panel

Show observable state beside the diagram. Use state cards for small values and
frames for message or code-like content. Highlight only values that changed on
the current step.

```html
<aside class="state-panel" aria-labelledby="state-title">
  <h3 id="state-title">System state</h3>
  <dl class="state-grid">
    <div>
      <dt>phase</dt>
      <dd data-state="phase">received</dd>
    </div>
    <div>
      <dt>attempt</dt>
      <dd data-state="attempt">0</dd>
    </div>
    <div>
      <dt>result</dt>
      <dd data-state="result">—</dd>
    </div>
  </dl>
  <div class="frame" data-frame aria-live="polite">
    Waiting for the first transition.
  </div>
</aside>
```

```css
.state-panel {
  display: grid;
  align-content: start;
  gap: var(--gap-3);
  background: var(--ink-panel);
}
.state-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.6rem;
  margin: 0;
}
.state-grid div {
  min-width: 0;
  padding: 0.75rem;
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  background: var(--ink-2);
}
.state-grid dt {
  color: var(--muted);
  font-size: 0.72rem;
}
.state-grid dd {
  margin: 0.2rem 0 0;
  font:
    700 0.95rem/1.35 ui-monospace,
    monospace;
  overflow-wrap: anywhere;
}
.state-grid dd.is-changed {
  color: var(--signal);
}
.state-grid dd.is-changed::before {
  content: "Changed · ";
  color: var(--signal);
  font-size: 0.7em;
  text-transform: uppercase;
}
.frame {
  min-width: 0;
  padding: 0.9rem;
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  background: var(--ink-1);
  overflow-wrap: anywhere;
}
@media (max-width: 420px) {
  .state-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
```

Keep the preceding value available in the step definition so Back restores it
exactly. The visible `Changed` prefix makes the delta independent of color; the
surrounding `aria-live` caption should name the same change. Do not infer state
from CSS classes scattered across the page.
