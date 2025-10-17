export default function exportCaptcha(captcha: string) {
  const parts = 12;
  const maxLenPerPart = 200;
  if(captcha.length > parts * maxLenPerPart) {
    alert('Captcha too long, length: ' + captcha.length+ ', max length: ' + parts * maxLenPerPart);
    return;
  }
  const prefix = 'captchaP';
  let output = {} as any;
  for(let i = 0; i < parts; i++) {
    const part = captcha.slice(i * maxLenPerPart, (i + 1) * maxLenPerPart);
    output[prefix + i] = part;
  }
  return output;
}