import puppeteer from 'puppeteer';

async function run() {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });
  await page.goto('http://localhost:8000/#/lab/wasm', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1000));
  
  await page.screenshot({ path: 'tools/wasm_page.png' });
  
  const textareaInfo = await page.evaluate(() => {
    const el = document.getElementById('cppCodeTextarea');
    if (!el) return { error: 'Not found' };
    const rect = el.getBoundingClientRect();
    const style = window.getComputedStyle(el);
    return {
      valueLength: el.value.length,
      firstLines: el.value.split('\n').slice(0, 10),
      rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height },
      color: style.color,
      backgroundColor: style.backgroundColor,
      display: style.display,
      visibility: style.visibility,
      opacity: style.opacity,
      zIndex: style.zIndex,
      fontSize: style.fontSize,
      lineHeight: style.lineHeight,
      scrollTop: el.scrollTop,
      scrollHeight: el.scrollHeight
    };
  });

  const gutterInfo = await page.evaluate(() => {
    const el = document.getElementById('cppGutter');
    if (!el) return { error: 'Not found' };
    const rect = el.getBoundingClientRect();
    return {
      innerHTML: el.innerHTML.slice(0, 100),
      rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height }
    };
  });

  console.log('Textarea Info:', JSON.stringify(textareaInfo, null, 2));
  console.log('Gutter Info:', JSON.stringify(gutterInfo, null, 2));

  // Check what elements are positioned over the textarea
  const overlappingElements = await page.evaluate(() => {
    const textarea = document.getElementById('cppCodeTextarea');
    if (!textarea) return [];
    const rect = textarea.getBoundingClientRect();
    const x = rect.left + 50;
    const y = rect.top + 70; // around line 3
    const elAtPoint = document.elementFromPoint(x, y);
    return {
      tagName: elAtPoint?.tagName,
      id: elAtPoint?.id,
      className: elAtPoint?.className,
      outerHTML: elAtPoint?.outerHTML?.slice(0, 200)
    };
  });
  console.log('Element at point (x+50, y+70):', JSON.stringify(overlappingElements, null, 2));

  await browser.close();
}

run().catch(console.error);
