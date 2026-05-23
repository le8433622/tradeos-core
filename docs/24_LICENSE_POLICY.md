# License Policy and SBOM

**Status**: Active
**Owner**: CFO, CISO, CTO
**Last updated**: 2026-05-21

## Allowed Licenses

| License                     | Category      | Allowed          | Notes                                             |
| --------------------------- | ------------- | ---------------- | ------------------------------------------------- |
| MIT                         | Permissive    | ✅ Always        | No restrictions                                   |
| 0BSD                        | Permissive    | ✅ Always        | No restrictions                                   |
| Apache-2.0                  | Permissive    | ✅ Always        | With notice preservation                          |
| ISC                         | Permissive    | ✅ Always        | No restrictions                                   |
| BSD-2-Clause / BSD-3-Clause | Permissive    | ✅ Always        | With notice preservation                          |
| MPL-2.0                     | Weak Copyleft | ✅ With approval | Allowed only for build tools (e.g., lightningcss) |
| Python-2.0                  | Permissive    | ✅ Always        | No restrictions                                   |

## Blocked Licenses

| License                    | Risk   | Reason                                                            |
| -------------------------- | ------ | ----------------------------------------------------------------- |
| GPL-2.0 / GPL-3.0          | High   | Copyleft forces derivative work disclosure                        |
| AGPL-1.0 / AGPL-3.0        | High   | Network-use copyleft                                              |
| LGPL-3.0                   | Medium | Limited copyleft on modified library; requires explicit exception |
| SSPL                       | High   | MongoDB license, not OSI-approved                                 |
| BUSL-1.1                   | High   | Source-available with commercial restrictions                     |
| No license / "Proprietary" | High   | Legal uncertainty                                                 |

## Current SBOM

All production and dev dependencies pass the allowed license policy after the approved libvips exceptions below. No unapproved blocked licenses detected.

### License Count Summary

- MIT: 152 packages
- MPL-2.0: 2 packages (lightningcss — build tool only)
- Python-2.0: 1 package (argparse — build tool only)
- 0BSD: 1 package (tslib)
- UNLICENSED: 1 package (tradeos-core itself)

### Dependency Audit Results

- **GPL/AGPL**: 0 packages ✅
- **LGPL**: Approved `sharp`/libvips platform binary exceptions only ✅
- **Unknown license**: 0 packages ✅
- **License exceptions**: 3 approved packages ✅

## Generating SBOM

```bash
# Tabular view
pnpm licenses list

# Raw machine-readable
pnpm licenses list --json > sbom.json

# Per-package audit (recommended before production releases)
pnpm license:check
```

## Exception Process

To add an exception for a blocked license:

1. Record the package, version, and license.
2. Justify why no alternative exists.
3. Get CISO + CFO sign-off.
4. Add to the exception table below.

### Exceptions

| Package                          | License           | Version | Justification                                                                                                                                        | Approved By               | Date       |
| -------------------------------- | ----------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- | ---------- |
| @img/sharp-libvips-darwin-x64    | LGPL-3.0-or-later | 1.2.4   | Transitive prebuilt libvips binary for Sharp/Next image processing; unmodified library, license notice preserved, no static modification in app code | CTO/CISO policy exception | 2026-05-22 |
| @img/sharp-libvips-linux-x64     | LGPL-3.0-or-later | 1.2.4   | Linux CI/Vercel platform binary for the same unmodified Sharp/libvips dependency; exception is package-specific, not a blanket LGPL allowance        | CTO/CISO policy exception | 2026-05-23 |
| @img/sharp-libvips-linuxmusl-x64 | LGPL-3.0-or-later | 1.2.4   | Linux musl optional binary reported by pnpm on GitHub runners; exception is package-specific, not a blanket LGPL allowance                           | CTO/CISO policy exception | 2026-05-23 |

## CI Gate

Before production releases, the CI pipeline should run:

```bash
pnpm license:check
```
