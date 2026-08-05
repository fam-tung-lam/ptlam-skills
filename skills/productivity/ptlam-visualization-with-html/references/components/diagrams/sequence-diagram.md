# Interactive sequence diagram

Use a sequence diagram for messages between participants over time. Put the
diagram on the left, current frame/state on the right, and one control plane
below.

```html
<div class="visual-stage" data-stepper="session-sequence">
  <div class="stage-grid">
    <div class="sequence-panel">
      <svg
        class="sequence"
        viewBox="0 0 700 520"
        role="img"
        aria-labelledby="sequence-title"
      >
        <title id="sequence-title">Open and resume a session</title>
        <g class="participant" data-participant="interface">...</g>
        <g class="participant" data-participant="api">...</g>
        <!-- Keep both vertical lifelines visible. -->
        <g class="sequence-message" data-edge="ui-list-api">
          <path d="M130 130H570" />
          <text x="350" y="116">GET /sessions</text>
        </g>
        <g class="sequence-message" data-edge="api-list-ui">
          <path d="M570 200H130" />
          <text x="350" y="186">sessions[]</text>
        </g>
      </svg>
    </div>
    <aside class="state-panel">
      <h3>Current frame</h3>
      <div class="frame" data-frame aria-live="polite">
        ① UI requests the session list.
      </div>
      <dl class="state-grid">
        <div>
          <dt>channel</dt>
          <dd data-state="channel">HTTP</dd>
        </div>
        <div>
          <dt>sender</dt>
          <dd data-state="sender">Interface</dd>
        </div>
        <div>
          <dt>receiver</dt>
          <dd data-state="receiver">Agent API</dd>
        </div>
      </dl>
    </aside>
  </div>
  <div class="control-plane">...</div>
  <noscript>
    <ol class="noscript-summary" aria-label="All sequence messages">
      <li>Interface → API: request sessions; the list enters loading state.</li>
      <li>API → Interface: return sessions; the list becomes ready.</li>
    </ol>
  </noscript>
</div>
```

Give every step `sender` and `receiver` identities that match
`data-participant`. Keep lifelines visible in every frame. At each step,
emphasize one message arrow plus the sending and receiving participants, and
name both roles in the state panel. Use line weight and a distinct dash pattern
as well as color. The frame explains payload and observable consequence; it does
not repeat the arrow label. If a protocol changes mid-sequence, expose it in the
state panel. Use solid lines for calls and dashed lines for returns
consistently. Include a no-JavaScript ordered summary of every message and
observable effect.
