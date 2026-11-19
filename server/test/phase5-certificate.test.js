const test = require('node:test');
const assert = require('node:assert/strict');
const { makeCertificatePdf, pdfEscape } = require('../src/modules/projects/certificate.pdf');

test('certificate PDF has a valid PDF header, xref and trailer', () => {
  const pdf = makeCertificatePdf({
    member_name: 'Asha Sharma', team_name: 'Green Builders',
    university_name: 'GLA University', problem_title: 'Drainage repair',
    solution_type: 'pilot', issued_at: new Date('2026-11-18T00:00:00Z'),
    verification_code: 'a'.repeat(64),
  }, 'https://civicpulse.example/verify/' + 'a'.repeat(64));
  const text = pdf.toString('ascii');
  assert.ok(text.startsWith('%PDF-1.4'));
  assert.ok(text.includes('xref'));
  assert.ok(text.includes('%%EOF'));
  assert.ok(text.includes('Asha Sharma'));
  assert.ok(text.includes('Drainage repair'));
});

test('PDF text escaping prevents literal delimiters from breaking PDF strings', () => {
  assert.equal(pdfEscape('Team (A) \\ B'), 'Team \\(A\\) \\\\ B');
});

test('PDF generation handles non-ASCII names without corrupting PDF byte structure', () => {
  const pdf = makeCertificatePdf({
    member_name: 'रोशिका मिश्रा', team_name: 'Team',
    university_name: 'University', problem_title: 'Road repair',
    issued_at: new Date('2026-11-18T00:00:00Z'), verification_code: 'b'.repeat(64),
  }, 'https://example.com/verify/' + 'b'.repeat(64));
  assert.ok(pdf.toString('ascii').startsWith('%PDF-1.4'));
  assert.ok(pdf.toString('ascii').endsWith('%%EOF'));
});
