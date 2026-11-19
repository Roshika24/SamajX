function pdfEscape(value) {
  return String(value ?? '').normalize('NFKD').replace(/[^\x20-\x7E]/g, '')
    .replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}
function makeCertificatePdf(certificate, verifyUrl) {
  const lines = [
    'CIVICPULSE', 'CERTIFICATE OF CIVIC IMPACT',
    `This certifies that ${certificate.member_name}`,
    `of ${certificate.team_name}, ${certificate.university_name}`,
    'successfully completed the civic project:', certificate.problem_title,
    `Solution type: ${certificate.solution_type || 'Civic solution'}`,
    `Issued: ${new Date(certificate.issued_at).toISOString().slice(0,10)}`,
    `Verification code: ${certificate.verification_code}`, `Verify: ${verifyUrl}`,
  ];
  const commands = ['BT','/F1 22 Tf','72 750 Td'];
  lines.forEach((line,index) => {
    if(index===1) commands.push('/F1 15 Tf');
    if(index===2) commands.push('/F1 12 Tf');
    commands.push(`(${pdfEscape(line)}) Tj`);
    if(index<lines.length-1) commands.push('0 -42 Td');
  });
  commands.push('ET');
  const stream=commands.join('\n');
  const objects=[
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${Buffer.byteLength(stream,'ascii')} >>\nstream\n${stream}\nendstream`
  ];
  let output='%PDF-1.4\n'; const offsets=[0];
  objects.forEach((obj,i)=>{offsets.push(Buffer.byteLength(output,'ascii'));output+=`${i+1} 0 obj\n${obj}\nendobj\n`;});
  const xref=Buffer.byteLength(output,'ascii');
  output+=`xref\n0 ${objects.length+1}\n0000000000 65535 f \n`;
  for(let i=1;i<offsets.length;i++) output+=`${String(offsets[i]).padStart(10,'0')} 00000 n \n`;
  output+=`trailer\n<< /Size ${objects.length+1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(output,'ascii');
}
module.exports={makeCertificatePdf,pdfEscape};
