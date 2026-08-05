#!/usr/bin/env python3
"""Validate a portable interactive HTML visualization."""

from __future__ import annotations

import argparse
import re
import shutil
import subprocess
import tempfile
from collections import Counter
from html.parser import HTMLParser
from pathlib import Path


class DocumentParser(HTMLParser):
    VOID_ELEMENTS = {
        "area",
        "base",
        "br",
        "col",
        "embed",
        "hr",
        "img",
        "input",
        "link",
        "meta",
        "param",
        "source",
        "track",
        "wbr",
    }
    RESOURCE_HREF_TAGS = {"image", "link", "script", "use"}

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.tags: Counter[str] = Counter()
        self.ids: list[str] = []
        self.hrefs: list[str] = []
        self.runtime_assets: list[str] = []
        self.attrs: list[tuple[str, dict[str, str]]] = []
        self.steppers: list[tuple[str, list[tuple[str, dict[str, str]]]]] = []
        self.stepper_noscript_text: list[list[str]] = []
        self.stepper_noscript_items: list[int] = []
        self.stepper_count_text: list[list[str]] = []
        self.svg_accessible = 0
        self.svg_total = 0
        self.title_text: list[str] = []
        self.h1_text: list[str] = []
        self._capture: str | None = None
        self._active_stepper: int | None = None
        self._scope_stack: list[int | None] = []
        self._noscript_stepper: int | None = None
        self._count_stepper: int | None = None

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        values = {key: value or "" for key, value in attrs}
        active_stepper = self._active_stepper
        if "data-stepper" in values:
            name = values["data-stepper"].strip() or f"#{len(self.steppers) + 1}"
            active_stepper = len(self.steppers)
            self.steppers.append((name, []))
            self.stepper_noscript_text.append([])
            self.stepper_noscript_items.append(0)
            self.stepper_count_text.append([])
        if active_stepper is not None:
            self.steppers[active_stepper][1].append((tag, values))
            if tag == "noscript":
                self._noscript_stepper = active_stepper
            elif tag == "li" and self._noscript_stepper == active_stepper:
                self.stepper_noscript_items[active_stepper] += 1
            if "data-step-count" in values:
                self._count_stepper = active_stepper
        if tag not in self.VOID_ELEMENTS:
            self._scope_stack.append(self._active_stepper)
            self._active_stepper = active_stepper

        self.tags[tag] += 1
        self.attrs.append((tag, values))
        if values.get("id"):
            self.ids.append(values["id"])
        if values.get("href"):
            self.hrefs.append(values["href"])
        runtime_references = [values.get("src", "")]
        if tag in self.RESOURCE_HREF_TAGS:
            runtime_references.append(values.get("href", ""))
        if tag == "video":
            runtime_references.append(values.get("poster", ""))
        if tag == "object":
            runtime_references.append(values.get("data", ""))
        for value in runtime_references:
            if value and not value.startswith(("#", "data:")):
                self.runtime_assets.append(value)
        self.runtime_assets.extend(find_srcset_assets(values.get("srcset", "")))
        self.runtime_assets.extend(find_css_assets(values.get("style", "")))
        if tag == "svg":
            self.svg_total += 1
            if values.get("role") == "img" and (values.get("aria-labelledby") or values.get("aria-label")):
                self.svg_accessible += 1
        if tag in {"title", "h1"}:
            self._capture = tag

    def handle_endtag(self, tag: str) -> None:
        if tag not in self.VOID_ELEMENTS and self._scope_stack:
            self._active_stepper = self._scope_stack.pop()
        if self._capture == tag:
            self._capture = None
        if tag == "noscript":
            self._noscript_stepper = None
        if tag == "output":
            self._count_stepper = None

    def handle_data(self, data: str) -> None:
        if self._capture == "title":
            self.title_text.append(data.strip())
        elif self._capture == "h1":
            self.h1_text.append(data.strip())
        if self._noscript_stepper is not None:
            self.stepper_noscript_text[self._noscript_stepper].append(data)
        if self._count_stepper is not None:
            self.stepper_count_text[self._count_stepper].append(data)


def find_css_assets(source: str) -> list[str]:
    assets: list[str] = []
    for match in re.finditer(r"url\(\s*(['\"]?)(.*?)\1\s*\)", source, re.I | re.S):
        value = match.group(2).strip()
        if value and not value.startswith(("#", "data:")):
            assets.append(f"css-url:{value}")
    for match in re.finditer(
        r"@import\s+(?:url\(\s*)?['\"]?([^'\"\s);]+)", source, re.I
    ):
        value = match.group(1).strip()
        if value and not value.startswith(("#", "data:")):
            assets.append(f"css-import:{value}")
    return assets


def find_srcset_assets(source: str) -> list[str]:
    assets: list[str] = []
    for candidate in re.split(r",\s+(?=\S)", source.strip()):
        if not candidate:
            continue
        value = candidate.split(maxsplit=1)[0]
        if not value.startswith("data:"):
            assets.append(f"srcset:{value}")
    return assets


def has_attr(parser: DocumentParser, tag: str | None, key: str, value: str | None = None) -> bool:
    return any(
        (tag is None or found_tag == tag) and key in attrs and (value is None or attrs[key] == value)
        for found_tag, attrs in parser.attrs
    )


def scoped_has_attr(
    attrs: list[tuple[str, dict[str, str]]],
    tag: str | None,
    key: str,
    value: str | None = None,
) -> bool:
    return any(
        (tag is None or found_tag == tag) and key in values and (value is None or values[key] == value)
        for found_tag, values in attrs
    )


def scoped_has_tag(attrs: list[tuple[str, dict[str, str]]], tag: str) -> bool:
    return any(found_tag == tag for found_tag, _ in attrs)


def validate(path: Path) -> tuple[list[str], list[str]]:
    source = path.read_text(encoding="utf-8")
    parser = DocumentParser()
    parser.feed(source)
    for style_block in re.findall(r"<style(?:\s[^>]*)?>(.*?)</style\s*>", source, re.I | re.S):
        parser.runtime_assets.extend(find_css_assets(style_block))
    errors: list[str] = []
    warnings: list[str] = []

    if not re.match(r"\s*<!doctype\s+html>", source, re.I):
        errors.append("missing HTML5 doctype")
    if not has_attr(parser, "html", "lang"):
        errors.append("html element needs a lang attribute")
    if not any(tag == "meta" and attrs.get("name") == "viewport" for tag, attrs in parser.attrs):
        errors.append("missing viewport meta tag")
    if not any(parser.title_text):
        errors.append("missing non-empty title")
    if parser.tags["main"] != 1:
        errors.append(f"expected exactly one main element, found {parser.tags['main']}")
    if parser.tags["h1"] != 1 or not any(parser.h1_text):
        errors.append("expected exactly one non-empty h1")
    if not any(tag == "a" and attrs.get("href", "").startswith("#") and "skip" in attrs.get("class", "") for tag, attrs in parser.attrs):
        errors.append("missing visible-on-focus skip link")

    duplicate_ids = sorted(key for key, count in Counter(parser.ids).items() if count > 1)
    if duplicate_ids:
        errors.append("duplicate ids: " + ", ".join(duplicate_ids))
    missing_targets = sorted({href[1:] for href in parser.hrefs if href.startswith("#") and href != "#" and href[1:] not in parser.ids})
    if missing_targets:
        errors.append("missing internal link targets: " + ", ".join(missing_targets))
    if parser.runtime_assets:
        errors.append("runtime assets must be embedded: " + ", ".join(sorted(set(parser.runtime_assets))))
    if parser.svg_accessible != parser.svg_total:
        errors.append(f"all SVGs need role=img plus aria-label/aria-labelledby ({parser.svg_accessible}/{parser.svg_total})")

    compact = re.sub(r"\s+", "", source.lower())
    if "overflow-x:hidden" not in compact:
        errors.append("missing document-level horizontal overflow guard")
    if "prefers-reduced-motion:reduce" not in compact:
        errors.append("missing prefers-reduced-motion handling")
    if ":focus-visible" not in source:
        errors.append("missing explicit keyboard focus style")

    for stepper_index, (name, attrs) in enumerate(parser.steppers):
        for action in ("next", "back", "play", "reset"):
            if not scoped_has_attr(attrs, "button", "data-action", action):
                errors.append(f'stepper "{name}" missing {action} button')
        if not scoped_has_attr(attrs, None, "data-step-caption"):
            errors.append(f'stepper "{name}" missing synchronized caption')
        if not scoped_has_attr(attrs, None, "data-step-count"):
            errors.append(f'stepper "{name}" missing step counter')
        has_noscript = scoped_has_tag(attrs, "noscript")
        if not has_noscript:
            errors.append(f'stepper "{name}" missing no-JavaScript step summary')
        else:
            summary_text = " ".join(parser.stepper_noscript_text[stepper_index]).strip()
            summary_items = parser.stepper_noscript_items[stepper_index]
            arrow_steps = summary_text.count("→") + 1 if "→" in summary_text else 0
            covered_steps = max(summary_items, arrow_steps)
            if len(summary_text.split()) < 5 or covered_steps < 2:
                errors.append(f'stepper "{name}" has an empty no-JavaScript step summary')
            count_text = " ".join(parser.stepper_count_text[stepper_index])
            count_match = re.search(r"\b\d+\s*/\s*(\d+)\b", count_text)
            if not count_match:
                errors.append(f'stepper "{name}" step counter must show current / total')
            elif covered_steps < int(count_match.group(1)):
                errors.append(
                    f'stepper "{name}" no-JavaScript summary covers '
                    f'{covered_steps}/{count_match.group(1)} steps'
                )
        if not any(
            tag == "button" and values.get("data-action") == "play" and "aria-pressed" in values
            for tag, values in attrs
        ):
            errors.append(f'stepper "{name}" play/pause button needs aria-pressed')

    if has_attr(parser, None, "data-c4"):
        levels = [attrs.get("data-c4-level") for _, attrs in parser.attrs if attrs.get("data-c4-level")]
        if len(set(levels)) < 2:
            errors.append("C4 semantic zoom needs at least two distinct maps")
        if not has_attr(parser, "button", "data-c4-back"):
            errors.append("C4 semantic zoom needs an explicit Zoom out control")

    scripts = re.findall(r"<script(?:\s[^>]*)?>(.*?)</script\s*>", source, re.I | re.S)
    node = shutil.which("node")
    if node and scripts:
        for index, script in enumerate(scripts, start=1):
            with tempfile.NamedTemporaryFile("w", suffix=".js", encoding="utf-8") as handle:
                handle.write(script)
                handle.flush()
                result = subprocess.run([node, "--check", handle.name], capture_output=True, text=True, check=False)
            if result.returncode:
                errors.append(f"JavaScript block {index} does not parse: {result.stderr.strip()}")
    elif scripts:
        warnings.append("node not found; JavaScript syntax was not checked")

    return errors, warnings


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("html_file", type=Path)
    args = parser.parse_args()
    path = args.html_file.expanduser().resolve()
    if not path.is_file():
        raise SystemExit(f"file not found: {path}")
    errors, warnings = validate(path)
    for warning in warnings:
        print(f"WARNING: {warning}")
    if errors:
        for error in errors:
            print(f"ERROR: {error}")
        return 1
    print(f"VALID: {path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
