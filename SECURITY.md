# Security policy

SheetFix processes files entirely in the browser and has no server component. Reports about any of the following are especially welcome:

- file contents leaving the browser (network requests, URLs, logs);
- imported text being executed or rendered as HTML;
- spreadsheet formula injection that bypasses the spreadsheet-safe export mode;
- silent data corruption (values changed, rows dropped or truncated without being shown).

Please report privately through GitHub's **Security → Report a vulnerability** on this repository, or open an issue without sensitive details and ask for a private channel. Include a **synthetic** CSV that reproduces the problem. Never send real customer or business records.

Only the latest release is supported.
