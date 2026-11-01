# Contributing

This repository is a focused, source-backed reference for legacy portable power stations. Corrections are welcome when they can be checked against a primary source.

## What we accept

- A specification correction backed by an official manufacturer document (user manual, datasheet, or product page).
- A new primary source for a model already listed.
- A documentation fix: broken link, unclear formula, typo that changes meaning.

## What we do not accept

- Active/current models. This repository focuses on legacy hardware; active models live on powerstationlabs.com.
- Edits based on memory, another review site, or a marketplace listing.
- Prices, discount codes, affiliate links, or "best product" rankings.
- Bulk rewrites without a linked source for every changed number.
- Scraped copies of manufacturer manuals, product images, or brand logos.

## How to report a correction

1. Open a **Specification correction** issue.
2. Include the station slug, the field, the current value, the proposed value, and the source URL.
3. Add a locator: page, section, table, or paragraph. If the source is a PDF, include the edition or revision when it is printed.
4. If the same document exists in several regional variants, say which one you used.

We verify the source, update the dataset through the internal export pipeline, and note the change in `CHANGELOG.md`.

## Style

- English only.
- Numbers use a decimal point, units use a space (`1,152 Wh`, `1,800 W`).
- Do not describe manufacturer data as an independent test result.
- Do not add marketing claims. State what the source says and where it says it.
- Do not paste manual text; cite the source and locator.

## Licensing of contributions

By contributing, you agree that data contributions are licensed under CC BY 4.0 and code contributions under the MIT license, matching the existing files. You confirm that you have the right to submit the contribution and that it does not reproduce third-party text or images.
