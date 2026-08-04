export class HtmlValidationReport {
  constructor() {
    this.findings = [];
    this.localAssetCount = 0;
    this.totalBytes = 0;
  }

  add(severity, code, message) {
    this.findings.push({ severity, code, message });
  }

  error(code, message) {
    this.add("ERROR", code, message);
  }

  warning(code, message) {
    this.add("WARNING", code, message);
  }

  unverified(code, message) {
    this.add("UNVERIFIED", code, message);
  }

  count(severity) {
    return this.findings.filter((finding) => finding.severity === severity)
      .length;
  }

  print(output = console.log) {
    for (const finding of this.findings) {
      output(`${finding.severity} [${finding.code}] ${finding.message}`);
    }

    output(
      `SUMMARY errors=${this.count("ERROR")} warnings=${this.count("WARNING")} ` +
        `unverified=${this.count("UNVERIFIED")} local-assets=${this.localAssetCount} ` +
        `total-bytes=${this.totalBytes}`,
    );
  }
}
