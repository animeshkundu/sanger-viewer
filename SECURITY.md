# Security Policy

## Supported version

Security fixes are applied to the latest version on the default branch and deployed site.

## Threat model

sanger-viewer is a static, client-side application hosted on GitHub Pages. It has no application
server, user accounts, database, or server-side storage. Sanger trace files are parsed and rendered
locally in the browser and must never be uploaded or transmitted. The project intentionally has no
phone-home analytics or telemetry.

Security concerns include:

- malformed `.ab1` or `.scf` files causing unsafe parsing, denial of service, or unexpected output;
- untrusted file metadata or exported content reaching HTML, URLs, or downloads without safe handling;
- dependencies or build artifacts introducing script execution or supply-chain risk;
- changes that transmit trace contents, metadata, sequence data, or derived results off-device; and
- deployment or configuration changes that break the static-site trust boundary.

Opening a trace from an untrusted source should be treated like opening any untrusted local file.
Do not include confidential patient, sample, or sequence data in public reports.

## Reporting a vulnerability

Do not open a public issue. Use GitHub's private vulnerability reporting flow:

<https://github.com/animeshkundu/sanger-viewer/security/advisories/new>

Include the affected version or commit, reproduction steps, impact, and a minimal redacted or
synthetic proof of concept. Never submit real confidential trace data. You can expect an initial
acknowledgement within seven days; timing for a fix and disclosure will depend on severity and
complexity.

If private vulnerability reporting is unavailable, contact the repository owner through the
contact options on <https://github.com/animeshkundu> and ask for a private reporting channel
without sharing vulnerability details publicly.
