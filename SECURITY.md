# Security policy

## Supported versions

| Version | Branch | Status                                                      | Security fixes |
| ------- | ------ | ----------------------------------------------------------- | -------------- |
| v4      | `dev`  | Current (prereleases only)                                  | Yes            |
| v3      | `v3`   | Previous (bug fixes; security fixes only once v4 is stable) | Yes            |

The lines are defined in [`.github/release-lines.json`](./.github/release-lines.json). A fix is released on each supported line; it is not backported to older releases of a line, so update to the latest release of the line you use. The policy of the current line, `dev`, is in [`SECURITY.md` on `dev`](https://github.com/d-zero-dev/BurgerEditor/blob/dev/SECURITY.md).

## Reporting a vulnerability

Do not open a public Issue. Report it privately through GitHub: [Report a vulnerability](https://github.com/d-zero-dev/BurgerEditor/security/advisories/new). Include the affected package and version, how to reproduce it, and the impact you expect.

A fix is released for every supported version that is affected, and the advisory is published with the release.
