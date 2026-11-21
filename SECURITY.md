# Security and privacy

## Do not post personal information

This repository is public-facing. **Never post any of the following** in an issue,
pull request, discussion, or comment:

- Photos or scans of real letters, bills, notices, or documents
- Real names, addresses, phone numbers, email addresses, or account numbers
- Birth dates or birth details, ID numbers, health or financial details
- Anything about a minor
- Passwords, API keys, tokens, keystores, or screenshots that show them

If you need to show a problem, make up the details (for example "Jane Example,
123 Sample St"). Anything posted publicly may be copied or cached even after
it is deleted.

## Reporting a security problem privately

Please **do not open a public issue** for a security problem.

Use GitHub's private reporting instead: go to this repository's **Security**
tab and choose **Report a vulnerability**. Only the maintainer can see the
report. Include what you found, how to reproduce it, and what it affects.
Do not include real personal data in the report either.

You can expect an acknowledgement within 7 days. Please give the maintainer a
reasonable time to fix the problem before talking about it publicly.

## Scope

This repository holds Soul Mark themes: the theme files and their schema, the
command line tool, the MCP server, the checks that keep all text readable, and the
workflows that build and test them. In scope: anything that lets a theme make text
unreadable without a check failing, any way the CLI or MCP server could change, send
or delete something without a person's confirmation, and anything in the workflows
that could leak a secret or run untrusted code.
