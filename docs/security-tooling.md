# Security Tooling

## Principle

Security tools should detect, report and help prioritise risks. They should not automatically rewrite application code or attempt to "neutralise" suspicious changes. Updates and fixes must stay reviewable in a pull request.

## Recommended Baseline

| Tool | Purpose | Best place to run | Notes |
| --- | --- | --- | --- |
| Renovate | Dependency updates | Gitea or a self-hosted Renovate runner | Keep it for grouped, reviewable update PRs |
| Gitleaks | Secrets committed now or in Git history | CI and pre-commit | Blocks tokens, passwords and private keys from reaching the remote |
| Semgrep Community Edition | Static security and code-quality analysis | CI and local targeted scans | Start with JavaScript/TypeScript and OWASP rules |
| OSV-Scanner | Known vulnerabilities in lockfiles and dependencies | CI | Complements `npm audit` with a separate advisory source |
| Trivy | Dependency, filesystem and container-image vulnerabilities | CI for Docker changes | Useful once images and deployment are built in CI |
| npm audit | Node dependency advisories | Backend and frontend CI jobs | Keep as a signal; do not auto-run `npm audit fix` in production branches |

## Rollout Order

1. Add Gitleaks first because the project handles sensitive data and its Git history contains generated Caddy credentials that must not be reintroduced.
2. Add Renovate with narrow schedules and grouped updates for frontend and backend dependencies.
3. Add OSV-Scanner and `npm audit` as report-only CI checks, then decide what should block a merge.
4. Add Semgrep for authentication, SQL, secrets and unsafe JavaScript patterns.
5. Add Trivy when container build jobs are present.

## Review Rules

- Every finding needs a human decision: fix, accept with a reason, or mark as false positive with evidence.
- Dependency bots may open pull requests, but they do not merge them automatically.
- Security tools never receive production credentials or real health data.
- Run new checks in report-only mode first to measure false positives before making them merge gates.
