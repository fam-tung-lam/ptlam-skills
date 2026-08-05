# Search

Use a search form when filtering or finding content is a primary task. Keep the
label accessible and make clearing the query an explicit action.

```html
<form class="search" role="search">
  <label for="query">Search concepts</label><input id="query" type="search" />
</form>
```

```css
.search input {
  min-height: 3.5rem;
  inline-size: 100%;
  border-radius: var(--shape-full);
  background: var(--color-surface-container-high);
  color: var(--color-on-surface);
}
```

Source: [Material search](https://m3.material.io/components/search/overview).
