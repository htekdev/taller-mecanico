# Complete multi-page quotation downloads

## Root cause and scope

The quotation exporter drew every row at an increasing `y` on one Letter page.
It never called `addPage`, including for job descriptions, notes or signatures.
The unchanged base exporter reproduced the bug with 45 synthetic parts: one PDF
page, only 12 part identifiers visible to a PDF reader, no final item or totals.

The fix keeps jsPDF, Letter size, existing branding, table colors and font sizes.
Rows that fit a page stay together. An individually oversized description flows
by wrapped lines across pages; continuation pages repeat the section/column
headers. Quantities/prices are not duplicated on row continuations. Subtotals,
the complete tax/total block, observations and authorization have page-space
checks. Page numbers occupy a reserved bottom margin. There is no page limit or
whole-document shrinking.

UI/PDF labels remain Spanish, as in the current exporter. Regression fixtures
include accented Spanish and English free text; no locale behavior is changed.
No database, authentication, deployment-policy or platform changes are needed.
Existing governed branch/commit/PR/review tools remain the guardrails.

## Regression verification

```powershell
npm run test:coverage
npx tsc --noEmit
npm run lint
npm run build
# Start the built app separately. No real account or database data is required.
$env:BASE_URL = 'http://localhost:3108'
npx playwright test --config=e2e/pdf.playwright.config.ts
```

- Unit/integration tests call the actual exporter and parse its actual PDF bytes.
- Cases: all three short templates, 45 wrapped parts, page-boundary row counts,
  a description taller than one page, multi-page job descriptions/notes, IVA
  enabled/disabled, empty sections, filenames and authorization.
- Assertions check preserved text, amounts, page count, font sizes, actual PDF
  glyph positions within page edges and totals staying together.
- The structured browser test opens Cotizaciones, opens a synthetic quotation,
  clicks **Descargar PDF**, captures the real download and checks every item,
  description line, note, tax, total and authorization.
- It renders **every downloaded PDF page**, attaches the synthetic PDF and page
  images to the report, and displays the rendered pages in the recorded proof.
  These are not screenshots of the quotation DOM.
- Its auth/database responses are intercepted within the browser test. The
  dedicated config omits the shared suite's account provisioning/cleanup.
  No production account, client quote or authentication setting is modified.
- PDF.js and canvas are test-only, pinned to releases compatible with the
  repository's existing Node 20 CI. The production PDF library is unchanged.

Local validation after review repairs: 480 tests pass; existing project coverage thresholds pass
(71.26% statements/lines, 76.63% branches, 92.78% functions; pagination helper
100% across all four). Lint has no errors; existing warnings remain. The isolated
download test passes and produces a four-page sample; all four rendered page
boundaries were visually inspected without clipping/overlap. The repository's
existing coverage scope excludes UI modules; it has not been weakened here.

## Review repairs

- Reserve the complete signature block before drawing its rule: 10 mm gap,
  4 mm label offset and 4 mm for each wrapped line (18 mm for one line).
  Real-PDF tests with 11/12/13 notes compare the signing-path stream's page to
  the authorization text's page. The 12-note case failed before this repair:
  the rule was on page 1 and the name alone on page 2.
- Catch failures in this download handler and show an accessible Spanish alert.
  Keep the button disabled while pending, clear the alert on retry and restore
  the enabled state after failure. Component tests reproduce initialization
  and serialization failures; both failed with unhandled rejections before repair.
- Only this export control receives a minimum 44×44 CSS-pixel target.
  The structured E2E measures it at 375/768/1280px, fails one native PDF save,
  verifies the alert, then retries successfully without reloading and parses/
  renders the actual four-page download. No other buttons or shared UI changed.

## Primary API references

- jsPDF `addPage`, `getNumberOfPages`, `setPage`, text and page dimensions:
  https://parallax.github.io/jsPDF/docs/jsPDF.html
- jsPDF font-aware wrapping:
  https://parallax.github.io/jsPDF/docs/module-split_text_to_size.html
- PDF.js actual-document loading, text extraction and rendering:
  https://mozilla.github.io/pdf.js/examples/
  and https://github.com/mozilla/pdf.js/blob/master/examples/node/getinfo.mjs
- React event-handler errors are not captured by error boundaries:
  https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary
- React Testing Library rendering and async state updates:
  https://testing-library.com/docs/react-testing-library/api/

Publication remains gated by the working Vercel preview, current-HEAD CI,
required independent reviews, proof and the repository's native merge contract.
