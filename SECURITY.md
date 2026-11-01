# Security policy

This repository contains data, notes, and a small reference runtime model. It does not contain credentials, API keys, user data, or production infrastructure.

## Reporting a problem

If you find a security issue in the runtime model or in the repository configuration, email **info@powerstationlabs.com** with the subject `data-notes security`. Please do not open a public issue for a vulnerability.

For a data correction, use the **Specification correction** issue template instead.

## Scope

- No secrets should ever be committed. If you see one, email us immediately.
- The GitHub Actions workflow runs only the local validator and runtime tests; it has `contents: read` permission and no repository secrets.
