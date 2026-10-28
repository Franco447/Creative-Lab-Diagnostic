// Exact approved email markup adapted from existing reviewer-only test function.
import { deflateSync, inflateSync } from 'node:zlib';

const LOGO_PNG = 'iVBORw0KGgoAAAANSUhEUgAAAOgAAABTCAYAAACVpEvOAAAAAXNSR0IArs4c6QAAAARzQklUCAgICHwIZIgAABMxSURBVHhe7V29klQ3Fmb4KwfUAukmbjZ0wtiQM34C7NQJQ7yBhyfwEGzscbqJmyfw8AT0bLCJsT0kpAxF4BBcRVFbYMN+30W6pavWz5Gu7u3bPeqqLnto/Rydo0/n6OjoaOtM/UySAzdv3vyQQNh9lF3g+wjfLx8/fsz/935U2205/M3yt2L9ffjw4e+//PLL77Fy9fdyHNgq11RtqSQHAJodR3uP3r9/f+/s2bPH5m9//vnnyfnz52d9AArwnWxtbc1DY3jz5s1/nz59+rbkOGtbYQ5UgK7RDLE1n0m6AnQfDbqA5t1fI3acClIrQNdIzBWgaySsQqRWgBZi5BjNVICOweVp9bH2AN3e3r5y7ty5xqECB8Yf02JvWWoqQMvycx1aywIoQXHhwoXrcFhsw7FwxRwonA2v6MR49+7dk+Pj41d9mYC+ZnCA3FHtHNFDqUD5PfreNdvHb1nj6UvjWPWFAKUDKcb3HZSxvbhc5Ba+sUDWz3/99df5WGOt/XzkgHhCK1DcUaDYFjLwGICd//XXXw8B1hNhnU4x9guAvlT/eB8eywP8TWfIEg2lAMo+SywuOeMN1ZEAFPx+ABnFeP2dDVDUm4Xq4fdjWCh7pcdU2wtzIApQBZBvIaA9W1smMncf4PohZ+IbZ4I87+Pqfwv0PMf3wDxyiJ3/mfRiXNsA+m22pybnLDCeBY8hqGHUYhPTUImskRWXANQEnq9Vzzlo9eLKxDBqqSBA6brHxPypJzDbAXGSY4J/DZB2zvFiIzYAynrb1BJoZy8V7MZis4sxhQDpJYkmPH48RP/3c62C2HilwDLLbcIxyxdffEG53KImz13Mc3k71XpegJJZ0E4/2oRjgtIRc6gm6YkNNu4Z4bSh+fkVv2D2ZbMNTnBM7i9TQGpG1aD+E5haUhO77frGjRvf4o99x2JzRM2oC6J9tr1j0+0R4D60NrX6KJ9N1qCQzxw8176GM2qefD72IjiKIBM6cQLUB0602+wBpZpL7VsPTMaTNsX8a9J2LIB+DYBygRB9FA0/ggYuGJ0P6HC2pTQt91vcq8U+x+AJF5zBzd5NBSjAyYX8J4d8HkLWS3KLCWSTfl8CqItZ1FrQerspWs9kkgvwNFPB/F0JMzVAqb1Rp+M1jtVHXTqUdlzlYjSg7r4UpNCkn8do6fv7pgI0wGd67Z2y68vLdanfAajSNs9MM1CBc6evhnAJAZqHWvQkxixDgyYJLAYw7okB+Guh/rFgMUb10xiNjJHFMcRBrFyf3wcGaPCYhXSDX/8eIlh+yhpUHyn2kVtu3Z9//vk/HYCCUXQItSYFNRY056wvODWBjsl+XxL/aWjQJJMH/b2MObhii0QM5HpsNNsxea/mCkNSj44g0EtDZsmcVmb5tu93s327HeXRjlomCJZ/jGD51xJaU8tAVseQ1XWzHsbCPWiSQzG131h5WH978MV8Hys3xO/AxsUWoIYXsO3Lt0fLJcYxWJFGNI9ZJIAmfa7xeOgOXs9KaIfNR6965fJu0+txgQEQ6Jj8Snn76etYKTjJcywctChnq+B/B6Ag5BCE8FxQf0TgSSFcrdS/pWqdgQEa1OI2zZHxiiyCFJ7VsqvjgF6cc3wfpahuNKgKp3s2hnmhBt12JQkuyAGoFFjYO96NhbCZXuQK0FJTb/rtaKUFgP6wqiiqBqC5pudYLM4BqDJPog6e2B7UCjUMDnkMR9FYPD/t/ZhKKzZHhuRVA1AAgGZne/gv0SpDEmW3nQvQ2P5RsjLG2ihldagAj9tqv9MJxFBhhsdw2B1NYV82puxX1ZfhHMza6hmhpHS+NfKkIxHyZXw6g3VE8elbLg2BFeNqKc9tCQbnAlRpUXqlGaXSRjSpON79mGmr67sO0e1xsU2YQbPU8aoFgAERO8K6FPD9lGANYbtLxUDbAv+ocxVlTdTcvlddTzuHUpUVgQ358FKJZC5QlgeQ5QPfeLfsM6jcULohGdoHoJoufZQgOYYwxwL+MBKKYYKxT7KDyA5vi3Vg/X6A/fu9xDpJxU8rQHVgTcqiq+YXQ2OTw1BRZ4F5edcVE7Bln/PFomuSJFyocAmA5pIicbPnLGoucHJCUFj2tS9ffDD+fY7V927u2GL1VgFQNdHvYGy0fHju7bziBtokYZhnMPEfSIJhTF6gbR19Jlp0fQ5JJU+ejrTn1gFZOmPUqUE7xytTdHSsCqCBmORWnjmRVrZTjm58fPdCJncgPniws9cxAEoTH2NnpNYOv5Zp6AWI1LMu8TOY4Ex1DhGcuBzyyI6+w997oRMKdXOHlzfaKDW1N+1cJKEGXYBAMyfqYAKPrdi+31cBUBfjHfQdYYX+KnW/jkWRzoJmT6yitRhKKTqUd4A7KboqRQZDAVTxllFrswg9QQ0mceClRnjpLQ3qRfmqQmN/M8eRYoGqRZcXP0z88V7ul5ov1KB2pMSpBqhaQWlieS+oK9NlL8dRY2vlHIvFDpkslUnCBstQAJUAS9ESNTHtLZoL8CmOHh0eChlHb03Z/okUcFomdUdJmn1Tg3YymK/yzGdsDarAYt5BXMqxpGky9odzSXCFbyz23jPHY+44tx5kUR0KoI6FgGYut1qdu8MoFwWo0mI877brmt10tJJPNinOITu4h/MDRyfbqdYUaVFHbIxF1lZVe4ljCaBDrcYpppVnJT+DlXAuORqR9iVZfZUZeogY0YMSidDUJGhNO2lssbXi7uBvOjL0Z60BykE4tlr85yhAVd19/DfoNJIE3hvxANF+7bmToqVd89NuT9O7FgCVAi61nBSgVrs8u+JqdwhwPUzts0R5x9l1dELl9DuWBvUBVGJmKg3E1KtBLRozP01PrMSKNLcZKccxPjk4NHITXniqAaq02a7NNLrCJSlPUO4EdfdDB805wJDUsbYmGwlQ8EFsGcTOq5WH1JvFQ289hM4hJpwzL30UidW1rtw1gSFLAE1himQirWsZBnAQfPYdRc94eNDMZGiDpz3R/VeAdiXhuvBhy8pnhqp9rE5UEF0UHJ70qENJggN7keF2k15c+6JslEBJZ5tSJiHap3duIk4UJgTHKt7Gb3r4yN/NA/xN0KCufWTSXHRcmbTZd+xKTZPiHGKDDkefKDNIDBP2lgu0Xlg6B5Xa/bHONul3RyYI5/DoiYS5+3XK2PWxDupQY+eEibG7CtCPwHEmHzPl4XIWGXG3orQ1DofWIkXmgbKdhbm5sO2w3QcRdqEBrKQZSUSRJky6wCmzaun5iswBRmWW6RDLJKetFqXLMNl7a1Cl3YJXDG1nkXkmKz3y8nic+/JqqX4D0DEjU4qPYKQGU+6ESp0MdniYPRS088SM4cTv9iptHitEgXBaABrLIWQ7iwznkDjLpNSi6js9X7x4cYkm7g4aas/UUkOj+hKxLvVThBI6S/aFEBKQ+M7hyFhIwv5SnUSnBaCSxVQ7i6yy4v2uQ4MOkrwc8+hf+sK2HU208mxqJYHLfV7qjQa7/xSzJnSOZjvleIYGTbmbGp2UAVAuxPyKP6CNTzE0wdyKzrm48seCjOCxNb+zCc8CIgaN2ajAsdc4i3SfqeeY9lwYMrinAajt/QLBRc51EoVZtLhrj0frABPuIOfdjxSAYiDOiWXvZak1ER6WlXM4FaA5zB05UGEfNNrRQFkAlcT60lmEbUYTsJ8aDz06QB0TJ5rQOUfgY9YxwrZc3SYfiZQAqOMYoNQEjO5Bc3i/rgBVSifmLOJi3eQCljqHNA8d2j5LjhKZ6Kx+S6FSfWMLfZ077p9Gs+pJBmKWkey3YqFfdp8pAPWZPKbWSzWrLBPOPk5Ye4B6zjCzJ37MWaT5mToPFPg7/E/VwCnz2Uxc3TExGMYG84t70aLRMZZpxtWryCGvBVDue8w7dks8SXWG2XT7mBwCntVGE8qVIqzACr72APUsgNkAlTiLlPZM9rc4opZEt2VisjYXKcyj5h2iFqCuazul96KOI52spwRjA5WCSbq596W08NDhBItjwmQD1BH9VQHqEEbMWUQfQM5TluzKXlD6Khp7fmjN3nmbxWUWlDJ1rXjHhp2l2rZlIzkSSTExJSYzaeCqF3rLxlo4nGFnscXHs1hUgDoYF3MW9Zl/Dr9NchRZZFvWWA9Lzw+6TI0+AyERanXgWWsbytZn9YpNYkFMJsEUTWmhaYe3r/Pim6//GJ9szZez6npMwQpQj1B8i3VsMY3NMf7uaDvLJHcsuq11tQTQwA11Hk/w2fekPamy1/k4qwlOahpxHh4Js6zViHs780LzUhPSjT2E0HnxzUeLxNlgh1Wmxu4GrlRtJEClMgrNj8BL8eLIIV/7duyvilJKej3eE7jSAt35wraqxPSP9vP1JyD2AOBiKsMgUBUwmU92KW0iBlLkek5IMLH9h0R7oQ2+zL0bWyAk4FTaeAZt3Ka2UGbxHPy8F+KnfaZL34CVq3cjAQr+9B6XT+FIMizE5K60KJOit2lzVJ19yVk7t5So+52VEbATg+AEqJpMTCfIzjtvNhpEL/D/zET3ih5f/rvKbsazJWqwpZsZNCvw77s5ybYkzLLL+EAa23+qBYqM4w0T74fjwTeYLtOu7Nrnk3/oi7xe4NHWI9bh/gl/f4AW4QJBt35zZqeDG3Bh+KXRdu+J7BrkyOegnWg2RU8p72gHRKW3Vw6nXfPMA8bAPEtNXlymy+GYeJ0QMiU2CM6ZyXfXQu8FKCuq1YeXliWZ1WMYYorKPUmcaayhlN9V/lFmh7etATKuSXVJZioAeBcXu08yE5pvPyeEMKbdfePT4KS2XedIIn3vFRN1pibpDsbMr+tDGR1yEUNeqBO9gKXMAXuPF/MVpLRt4ISLgPl8Z1IzPissCFDdA81VaFMC1VblUSI4qfA9KJnsK9qpVUA5qfao7SSpTAIAoQVwCGD2flzWt3C4+qamZoiimWCs1JlqiJdDadCYdzVEk/RozG5DaznykueLqXNIUp57UpTrvAMUq0drLhSLLQKoAVS+gkxzi6sd8/b4zF+aaUwDcji2xowxRDGxuRwdoL9pRgGDK/gC/39c2jTnwkF+8mVp9LEUWEFPMx1JWPHJx86eX03yhk7w+dUQfFaaR4fDFetD+Sc4Zn4WMZnRJASPGjpysiCynpE1YfA4czXHOD7OsTZzvDHOI84nLPTzmNySAOpjJBnO33LMvZhwhv7dnIS6L0z4k1WNhfTEhDY0T2r7ZTnAhVjhI+kEhHWKALTscGprlQOVA5oDFaB1LlQOTJgDFaATFk4lrXKgArTOgcqBCXOgAnTCwqmkVQ5UgNY5UDkwYQ5UgE5YOJW0yoEK0DoHKgcmzIEK0AkLp5JWOVABWueAlwNGDPNLhDn+UJJVKtyvie1G5NbDlOgpFeYYzDmlaGXWipW84VqKVxWgpTi5ge0YybGeYaL/o+QQzTQyjDnGAhC82mf2LU1BwzrqKuS90nHUJXkRaqsCdCxOr2E/QwKU6ULAEsao8i7sdckFes1CDVBe0eI9Wg9rd/B7mxm/9BWzscRZAToWp9ewn6EAqlOFEGC81YGbKt+DPeJL54YGjdYxHkd6hdsj3he2pyqeCtCpSmYCdA0IUF6Wv820I9SgzA5BUxRm6DXJsFMAyvZ0cq911KIVoJIZcUrLDAFQ3aaZdsTQcqJcVRkAbRaEFC09FZFXgE5FEhOkYwiAanCZ2swweUXOogyA6pxEUZN4amKoAJ2aRCZEzxAA1c4hO8G3NkMlzqIMgOqHlLLy1q5SJBWgq+T+xPsuDVDTOYT95q45/BTQpZQ18uJmP7WxSjFVgK6S+xPvewCAalNzSZMZe9Oos0gCUJU69Vsm5FLZEHdTgiGmIpoK0KlIYoJ0lASoikqit/Y5tOfMNVydRRBlgs4i4xyUpuuJ1RbPVpuczDobIsxmZmFMzgc0BZFUgE5BChOloSRAdcLu0HMORua9oLNIGkmkkkcvwF4+83A4UTYHyaoAXUepjURzSYAaTqCrPm2mEqVTK14OOYskJi7jdZmuE20xF/KnAGv0iY2R2JrUTQVoErtOV+FSANWJqn3Z002uGln3vUciEoCmtjlVyVaATlUyE6CrFEAN0PF1Apqc3o/SegehyKJUgOr9LzuVHONMgPUtCRWgU5LGxGgpAVATHKnD8zmLUgHKfo1nLNbqLLQCNHXWnKLyJQBqvObWPAciYR+Ayb3jbd81tJ4AXatoogpQyYw5pWVKANRwDn0uPYeMmaR9AFriUeAxp0MF6JjcXrO++gLUcA49wTHH0nuxIXaEnEWpADXGwT2oeKGYgrgqQKcghYnS0BegGmQ517wMcC9FFqUAVGnjR2AxF4i1C/erAJ0oOKZAlhF+9zv2hN9IaUJ6lCPUvazuef5hB8ZL29Hmse0sMiKJ5rjsPXe1p16xJiib18kZVQQ6dqRmtpTGoctVgA7N4TVu3zQNU4YBMFzE95/MlCA5+/S1bQCxE1kkjSQy2l3J6+4pPPOVrQAtwcXNbeMsQPq31OExUuizzz67dPHixfNv37598/Tp07epbajy59H/Jf6/GX00m80+uXLlyiexNl+/fv0eNPyvR/+xLgb//f+57RSjr04X3gAAAABJRU5ErkJggg==';
const FROM = 'The Creative Lab | Brand Pulse <brandpulse@mail.thec-lab.co.uk>';
const CREAM='#F5F0E8', SAGE='#A8AEA0', PLUM='#6B4D59', DARK='#343434';
const esc = v => String(v ?? '').replace(/[&<>"']/g, ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const clean = v => esc(v).replace(/\r?\n/g,'<br>');
const first = name => String(name || '').trim().split(/\s+/)[0] || 'there';
const num = v => Math.round(Math.min(100,Math.max(0,Number(v)||0)));
function p(s){return `<p style="font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.55;margin:0 0 16px;color:${DARK};">${s}</p>`}
function head(s){return `<h3 style="font-family:Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:.025em;text-transform:uppercase;margin:25px 0 10px;color:${DARK};">${s}</h3>`}
function rule(){return '<div style="height:1px;border-top:1px solid #aaa;margin:25px 0;"></div>'}
const CATEGORY_COLOURS = Object.freeze({
  'Strategic Fitness':'#E5D8C7',
  'Consumer Intelligence':'#CCCEC7',
  'Market Influence':'#C6B8BC',
  'Growth Engine':'#ECE5D9',
  'Commercial Endurance':'#DCDDD8'
});
function area(label,score,headline,body){
 const categoryIndex=Object.keys(CATEGORY_COLOURS).indexOf(label);
 if(categoryIndex<0)throw Error('Unknown diagnostic area: '+label);
 const circle=`<img src="cid:brand-pulse-category-${categoryIndex}" width="62" height="62" alt="${num(score)} out of 100" style="display:block;width:62px;height:62px;border:0;outline:none;text-decoration:none;">`;
 // Approved compact layout: circle on left; category name, heading and commentary in one cell on right.
 // Explicit widths and cell padding provide predictable sizing in Apple Mail and Outlook.
 return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;border-bottom:1px solid #aaa;"><tr><td width="78" valign="top" style="width:78px;padding:19px 8px 18px 0;vertical-align:top;">${circle}</td><td valign="top" style="padding:18px 0 18px 0;vertical-align:top;font-family:Arial,Helvetica,sans-serif;color:#343434;"><div style="font-size:13px;font-weight:700;line-height:1.35;margin:0 0 5px 0;">${esc(label.toUpperCase())}</div><div style="font-size:13px;font-weight:700;line-height:1.35;margin:0 0 5px 0;">${clean(headline)}</div><div style="font-size:12px;font-weight:400;line-height:1.5;margin:0;">${clean(body)}</div></td></tr></table>`;
}
const hex = h => [1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
const rgb = (a,b,t)=>a.map((v,i)=>Math.round(v+(b[i]-v)*t));
// Lightweight PNG renderer — chart is embedded with CID; Outlook need not support SVG/CSS conic gradients.
function crc32(buf){let c=0xffffffff;for(const byte of buf){c^=byte;for(let j=0;j<8;j++) c=(c>>>1)^((c&1)?0xedb88320:0)}return (c^0xffffffff)>>>0}
function chunk(type,data){const a=Buffer.from(type),size=Buffer.alloc(4),crc=Buffer.alloc(4);size.writeUInt32BE(data.length);crc.writeUInt32BE(crc32(Buffer.concat([a,data])));return Buffer.concat([size,a,data,crc])}
function donutPng(score){
 const w=294,h=294,v=num(score),rows=Buffer.alloc((w*4+1)*h),a=hex('#C7B3BB'),b=hex(PLUM),cream=hex(CREAM);
 for(let y=0;y<h;y++){const row=y*(w*4+1);for(let x=0;x<w;x++){const dx=x+0.5-w/2,dy=y+0.5-h/2,r=Math.hypot(dx,dy),angle=((Math.atan2(dx,-dy)*180/Math.PI)+360)%360;
  let col=hex(SAGE),alpha=255;if(r>=90&&r<=135){col=cream;alpha=255;}
  if(v>0&&r>=90&&r<=135&&angle<=v*3.6){const t=v===100?angle/360:angle/(v*3.6);col=rgb(a,b,t);alpha=255;}
  const idx=row+1+x*4; rows[idx]=col[0];rows[idx+1]=col[1];rows[idx+2]=col[2];rows[idx+3]=alpha;
 }}
 // Central number, fine divider, denominator (approved score hierarchy).
 drawDigits(rows,w,String(v),w/2,87,1,[255,255,255]);
 for(let x=99;x<195;x++) writePixel(rows,w,x,173,[70,70,70]);
 drawDigits(rows,w,'100',w/2,185,0.55,[52,52,52]);
 const pngsig=Buffer.from([137,80,78,71,13,10,26,10]),ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(w,0);ihdr.writeUInt32BE(h,4);ihdr[8]=8;ihdr[9]=6;
 return Buffer.concat([pngsig,chunk('IHDR',ihdr),chunk('IDAT',deflateSync(rows)),chunk('IEND',Buffer.alloc(0))]).toString('base64');
}
// Antialiased raster numeral masks. No runtime font or CSS overlay is required.
const DIGIT_MASKS = {"0": "eJxjYBgFowAEDHf/h4M/q5XxqmWs//MfGXxPxaOYafF/dNCMW3U/xAELnIVYxLzXQJTn4lLsD5Z+agblur0HcX+ZYFfM9Qgk+0EdLmDxEyRwmhGr6gqw0XFIIuVgkXBsitmeg6TOIZvE9hAkdBab6iCwQbEoYmVgMUMsqleDJL5yo4jJ/AMJdmEqZv4AktiMJnoWJHgZU7UZ2NJiNNEesKgYhupssLgDmmgkWNQLQ/VssLgImqguWLQKQ/UBcNSgi3KBVc/HUA0O2isYwu9AwgcwhMGxvBdD+DpI+Ca6KA/YyrUYqo+DhF+ji8qAVS/AUL0LnIbRRVXAqmdiqN4MFmdGE9UEi07FUL0eLM5BpOp1YHFOilwigyMadmL1JS9Y9RoM1cdAwm8whHHEzjWssUNizJOWqrCnWB2waDWGakhusEcTxZUbzPHkNHEM1dhz8RkcuRhaQnChiEmDS4huLKohpU8MilgpztIHZ8l2DotiBoZKsEGYpWYEVtXcj8ERhFEiM2FVTVppD69J5jsLsojCapI8XIoZmJb8RwetOBUDa8DGvyhqv6fhUQwERki16981+GtXENCs2v7gy5/PtzcWyhNUOwpGCgAAN5kIcg==", "1": "eJxjYBgFo4AkwGmRPffC7/9wYIJX9YL/qIDqqn+cmZVuWk2E6mknpiYbsoJYJUSoRoBR1aOqR1WPqh5VPaRUX/iPHfQMctWjYBTgAgACEFe7", "2": "eJxjYBgFowAIJEI7dt96+/vdnRPTYmTwK9WoOfnvPwL8We+AUylXwpH/GGC5IA7VFZhqgeCpDl7VP9alGwuwCOnlnIDwnynjVv2oUAAu4PcGrPwaKw7VbwvZkEUUn4GVF2FXvUQUTcj0L0j1ezYsqlMCMcUWgg13w+pyTOAEVj2RSNVs4MjaQqRqhtcg1WeIVf0SpPoGkYo5/4BUHyJStSPYl6uIVD0Dd/RgAtEvYNWqxKmeDlZ8njjFNpCsEU6UYoH7YMXHGIlRzLgBkt5xZAc00AjJDcVEKY6BKN5ElDvcfkHCg48YxWaQkL4tToxi7bdgxY/liVGs+BSs+KU6MYol74AVvzcgRrHQFbDizxbEKOY9BVb83ZEYxZwHwYp/eRGjmHUbpHgNJkYx8yqw4n+xxChmnAuJ73RiFDP0QxQXEqW4HqK4mijFeRDFbUQpjoVkrAlEKfb9DVY8iyjFDAf+4wQSg1n1KBhhAABevqtg", "3": "eJxjYBgFIx0wWzYc//UfGfzZ7IFTdcB/LGC9LCmq/7/Uw6P63/GeMC0xVl5Z97pbEOXvNHGpPpkrjSQQ+was/DgTNtVey8zRRLRfgZXH4vQqKogAq95BpGqGeyDVvzmJVD0dbLgykaqrwKqtiVRdClZtQqTqPrBqCSJVXwApvkOkYnuw0bXEKZa4DVL8XJAoxQ53QIp/uRJUyCFmlX8M7IxPvvjUeaCk13+bFPGaiqz6XZs2ATegmP1oIn6j0Vzy/88EDgLGMzAw8it4t96HqD8vTFA5CDBHvQUrP8dFlHIG6Rtg5ROIU80gD86Zf1WIVF4ANryfSNUcX0GqbxKpmmEL2HAhIlX3gFUTilIYKCcpY9aDVZsSqXoqWLUCkapPgBT/YCZOsehfkOqDRBrdD3ZIEaZEqQOmmCW4Zvkqhikz5W83D5qQxXuw0S1YLJ0CzFmt4kgCIp1/wIovsmNXDSx8jzW7aYmy8MpY5a79CckND7DWU1P+YwVHpbEpxq76cy7WSoeBgSdo3lM0tVcKRbCrhQD58I41555++vPl6bVDk+O18CkdBSMLAADDOaZF", "4": "eJzt1C0PQWEYxvHbS7CZ2Y5TTDBFMFFSbKKdbERFEW26T0D1EtlMkRTNRFNpFGOzIQiCeXmuCQrbdSSz56r/X7x3i+jpfb/W/bk2gzN3G9rY2NE95W6szsE1SB3cK7YIkXqo1DVpcroIVRdOR04KLb2cdo6B0sLpMkxTOB07K7L2c9o9A7GE01WIrnA6cVFgZ3LaMwfICqdr6APhdApndwxy2rdCLgin26gj4bSFeApzOrBFLAmn+2gTB6fzSOeoUNo4IFWE03GUqcuO/rzOr+o3I/+J1n+n9fReewBS2MwM", "5": "eJxjYBgFIx7s+Y8N7BgaqhtI8uWo6sGsek3Tzjvvfr+5eWxauCRh1Ujg32ZrElQDwXYxUlT/f2qDR/W9mak20nwsIhrRcz5ClP9wxqF6YYcGEk+w+TdY+QdlvJ6FA4fXYOWHiFPNYP0TrDyQSOWlYNVHiFTN+RysXI5I5a1g1QlEqnYEq55CpGpesOptRKpm+AFSfZJY1S9Bqi/SxGyIu7cTqRoSJtOJVA0J7xTiFHM8A6smMhWWgBWfwiKTY48hZAVJg5FYVHf8nSaIKmIPSd+nmLCpBmaTRqRCQaAJknc+a2JzYwdI6s+JFldNERZh9Sh4vvTE6qMOLDn+///HdlgVY1e9QhC7YgbugLlPUZV+naWDQy0EKEZ1r7/4/POfjw8ubK525sGrdhSMKAAAZBa5RQ==", "6": "eJxjYBgFowACRLre/EeAv/sTePAozvn4Hw004FTLvQldLR7V/KfA8j+2ZZvIsguoh895iUc1236w4pXyCJHYizhVTwKp/ROLIsaUmYtdsRtI8b9QnJ5CAaw3QKpnEKeYIR2k+BkfcYoZb4JU1xFptCPYi9JEqp4FUr2PSMUMT0Gqm4hUrAaOGHcgSyBl1fVPv19e2VGuj1N1DFi1GINg31dEErngiUN1B0j2J6PtU9QktY0fq+q1ILl7Xj/QU+BlGWyqj4Pj5guIvFmmK8ilHLsLovwGNxbV9+CmtbJBhQLfg/kLsKh+CVNchhCz+AwPKDTwAap4M7JgBlhoL6ZqaHb8rYgsyHQeLGiAoRqa0begimaCBWsxVD+BqI5GFRX8BxLchaH6CkS1KprwLZDgJ0Z01QfBir+ii68GCwuhq14GFn6ILjwNLKyCLtwKiWd04XawsBm6cDxY+BK6MDix/TdFF9bF5xIldGHmz3h8iZlsIeWlGprobZDgOwzFkOLkP2qxxiAMjp0NmKoFf4LzCqpgNtiIAkzVDItBEn+UkYWYLoJTmjwW1Tr/MAyHGL0Ii2IGhtlguUqEgCU44/3Wwqpa6DFYeRsspwVBclopVsXAnPUdLA3MxQKcSjHQXLwRIwHCgNu3/+hgFxcuxQwMBndQ1f7tZsGtmIGBo/oVQu2/LUb41IIAe8D0469+/Pl4bU2+HCG1o2CkAADEex+R", "7": "eJztzjFIQlEAheGrJkkhgkRTEgQJkeBS0BA0hIST4CC4NOTS4lC7EC05ODjl4OJk4NTU4BbkUEMgOQYhEUQIEQqpoMk9c8L/9vfPH4djjJubg/b/5jZwpN8d6SJ7tzGVjjJ9KXzPsLcrfcx0Qvhniem6dIXh0K/0DtOnwm2GzZN0nuFt4WGY6ZL0DcMLn9KHTKeE3zxM30oXGF4dWzxZY/pc03cMmxfpNMO7wl9+pq+lSwwHvqW3mM4Ktxg2TekThiMTi/vLTBc0XWXY8yq9x/SBcIdhU5M+Yzg4sHi0wnRO0w145EH6iOFN4a6X6SvpC4Z9HxZP15lOarrJsGlIZxgODy3uLTKd13QZHnmWjjEcF36E025u/zYD46s4qA==", "8": "eJztlc9LFGEYx19rUtqkcg2hFQMhWdYl0i08dIhNDBILQjAi6WCClYWKhyi6BEmX6FoHJU8qevEmFWviD1DYVBBBK2xrM/OQrVuBPzZ32vc7ssy8zzPzD7TPbT7fDzPP8848jBCZypQQWdcndVMlQ5ccZO+Yrtagx04+/ZPIuv65mJdL1o18pLH0sOYuvzttXEbdrB1CuHo+Dep/gXRxchWidb8JBbcwawljd8Jus7BnYA8Y+5MMNg9Y2DHYw4y9KYNxBS5JuEjlg7jNgELHJVyjtpaUQT9nR5lOlm07GWPsHkzpsrAitPeYsY3zbrWwpxLtHGds8VZGMZ+JnMXb6eRkUfRdZiuVaXA1LsF8LmsLbwTNhBp8h7S8suYwrqYLeDl15s+3lO/1T0e2nZyqwvvvTe5sa76DK7KbJnZMdiJ0bY+9XBMlq7N4xk7uMITROyfy9xUE2o3dSTTz8iOkK1VpUIfVSzZwchCfVaTQhHxrEm14qZy1IJPtgAVewONeUbsaQbdC34D6iN0FXqHQy6APiY1G4nsVmofjHyL2hsRhgr9JvKDS/Xjka2LPSbyqUmMt6fRz/GLGHDqZIfiDw5S0wT72BGtBnxD7BvhLhQ6DniO2Zxtv/qQFXoT8I4fY4gWSpaMm5Mfo+j0qC89vRMvBNLmCnde/uhhb1Pw1tmHktt+tHSlvn9ld5AAnC9GYIIuWkqt5WYiKj0QOc7+R3XLdmre4U/WavSzrVEvv7Jd4IhZ5132z1FnN1P9T/wCxgkmE", "9": "eJxjYBgFowAIbPf+R4CHOcz41HLO/o8KziriVix08j86eGuISzHrUYiK9aGKHCLGDY/AnDdKOFT3gqWfOUO5PLPA/PNsWBXbgyVfayFEJoFFKrGq3g2WC0ISYToDEvkijEWxEVjxbhQxC7BYExbVnRhGA8F5sE+whDo49D6jeakUbIQrhmLu3yDxQ2iiEJ9PwFCtARafjCbKDxa9iqHaGixeiy78CyT6jxdd2A+sOh9d+DVY2BZd2B8snIcu/AYsnIwubIfHJf9b0YV1wMKT0EQhvvw/H1214D+Q8EGsNv7fhK6a4RpI+BMrqmAJRPVhDNWQ9BmAKngWovoUhmpfsPgOFDFTaA66gKGa6RZYwh9Z6CRO1QzpYIlXGgiRPljuPIGpmukAWOapI5TPPR2m+P9eTNUM0pBo/r8uWIFd2KgOnIuffwGRy7GoZjB48h8NfLD8A6L6sKlmkDmNqviWnjSYzsCqmoEp5h5C7admbgYz7GkQBpgtG/ffePvn09WlcTywgPrFjUs1GlgEUn2MSMUMYIdVE6nYHOxsZSJVzwMp3kOkYtmvINUeRKreClK8n0jFBSDFP/WwSzaFovIhxVoJDqMW/D/owwTnae8AK17BiFP1//93J/go83DKmxXvBSen/9vZcTlzAXoKBBYNrLgUY6p+HYNTLQODcC5Kgn3WwIdHMQhIJsw48vTLn8/3d7U7sxBQOwpGEgAAr/Ufog=="};
function writePixel(rows,w,x,y,color,coverage=255){
 if (x<0 || y<0 || x>=w || y>=w || coverage===0) return;
 const i=y*(w*4+1)+1+x*4,blend=coverage/255;
 rows[i]=Math.round(rows[i]*(1-blend)+color[0]*blend);
 rows[i+1]=Math.round(rows[i+1]*(1-blend)+color[1]*blend);
 rows[i+2]=Math.round(rows[i+2]*(1-blend)+color[2]*blend);
 rows[i+3]=255;
}
function drawDigits(rows,w,text,cx,top,scale,color){
 const glyphW=46,glyphH=65,sp=1,total=text.length*(glyphW+sp)*scale-sp*scale;
 const left=Math.round(cx-total/2);
 for(let n=0;n<text.length;n++) {
  const mask=inflateSync(Buffer.from(DIGIT_MASKS[text[n]],'base64'));
  for(let y=0;y<glyphH;y++) for(let x=0;x<glyphW;x++) {
   const coverage=mask[y*glyphW+x];
   if(coverage) writePixel(rows,w,Math.round(left+n*(glyphW+sp)*scale+x*scale),Math.round(top+y*scale),color,coverage);
  }
 }
}

// Rasterised score circles: fixed category colours, no email-client CSS dependency.
function categoryPng(score, colour){
 // Large antialiased embedded PNG. All five categories use exactly the same rendering.
 // 320px output at 62px display avoids pixelated scores in retina email clients.
 const w=320,h=320,rows=Buffer.alloc((w*4+1)*h),bg=hex(colour),dark=hex('#343434');
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const i=y*(w*4+1)+1+x*4,d=Math.hypot(x+0.5-w/2,y+0.5-h/2);
  const a=Math.max(0,Math.min(1,159.5-d));
  rows[i]=bg[0];rows[i+1]=bg[1];rows[i+2]=bg[2];rows[i+3]=Math.round(255*a);
 }
 const plot=(text,scale,centreY)=>{
  const glyphW=46,glyphH=65,spacing=4;
  const total=(text.length*glyphW+(text.length-1)*spacing)*scale;
  const left=(w-total)/2, top=centreY-glyphH*scale/2;
  for(let k=0;k<text.length;k++){
   const mask=inflateSync(Buffer.from(DIGIT_MASKS[text[k]],'base64'));
   const x0=left+k*(glyphW+spacing)*scale;
   for(let y=Math.floor(top)-2;y<Math.ceil(top+glyphH*scale)+2;y++)for(let x=Math.floor(x0)-2;x<Math.ceil(x0+glyphW*scale)+2;x++){
    const u=(x+0.5-x0)/scale-0.5,v=(y+0.5-top)/scale-0.5;
    if(u<-.5||u>=glyphW-.5||v<-.5||v>=glyphH-.5)continue;
    const ix=Math.floor(u),iy=Math.floor(v),fx=u-ix,fy=v-iy;
    const sample=(xx,yy)=>xx>=0&&xx<glyphW&&yy>=0&&yy<glyphH?mask[yy*glyphW+xx]:0;
    const coverage=(sample(ix,iy)*(1-fx)+sample(ix+1,iy)*fx)*(1-fy)+(sample(ix,iy+1)*(1-fx)+sample(ix+1,iy+1)*fx)*fy;
    if(coverage>0&&x>=0&&y>=0&&x<w&&y<h){
     const at=y*(w*4+1)+1+x*4,alpha=coverage/255;
     for(let c=0;c<3;c++)rows[at+c]=Math.round(dark[c]*alpha+rows[at+c]*(1-alpha));
    }
   }
  }
 };
 plot(String(num(score)),1.65,127);
 for(let y=192;y<195;y++)for(let x=102;x<218;x++){
  const at=y*(w*4+1)+1+x*4;
  for(let c=0;c<3;c++)rows[at+c]=dark[c];
 }
 plot('100',0.85,230);
 const sig=Buffer.from([137,80,78,71,13,10,26,10]),ihdr=Buffer.alloc(13);
 ihdr.writeUInt32BE(w,0);ihdr.writeUInt32BE(h,4);ihdr[8]=8;ihdr[9]=6;
 return Buffer.concat([sig,chunk('IHDR',ihdr),chunk('IDAT',deflateSync(rows)),chunk('IEND',Buffer.alloc(0))]).toString('base64');
}
function render(row){
 const r=typeof row.report_json==='string' ? JSON.parse(row.report_json) : (row.report_json||{}),score=num(row.overall_score),label=esc(row.company_name);
 const scorePanel=`<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${SAGE};border-radius:13px;margin:21px 0 27px;"><tr><td valign="middle" style="padding:20px;font-family:Arial,sans-serif;color:#222;"><div style="font-size:26px;line-height:1.1;font-weight:900;">Your Brand Pulse</div><div style="font-size:25px;line-height:1.1;font-weight:400;">Performance Score</div></td><td width="147" valign="middle" style="padding:12px 16px 12px 0;"><table role="presentation" width="147" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:0;"><img src="cid:brand-pulse-donut" width="147" height="147" alt="Brand Pulse performance ${score} out of 100" style="display:block;max-width:147px;width:147px;height:147px;"></td></tr></table></td></tr></table>`;
 const intro=[`Hi ${esc(first(row.client_name))},`,'Thank you for completing Brand Pulse: our Performance Diagnostic.',"We’ve reviewed your responses and looked at your brand to create the personalised report below. It highlights what’s working, where growth may be getting constrained and where we think your attention should go next.","The report is deliberately high level. The real value comes from looking at the findings in context and deciding what to prioritise. That’s where our <strong>Now, Next and Nurture</strong> growth pathway comes in.","But first, here’s what your diagnostic is telling us."].map(p).join('');
 const copy=intro+scorePanel+head('What Your Score Means')+p(clean(r.score_meaning))+rule()+head('What Stands Out')+p(clean(r.stands_out))+rule()+head('The Five Areas')+
 area('Strategic Fitness',row.strategic_score,r.strategic_headline,r.strategic_commentary)+area('Consumer Intelligence',row.consumer_score,r.consumer_headline,r.consumer_commentary)+area('Market Influence',row.market_score,r.market_headline,r.market_commentary)+area('Growth Engine',row.growth_score,r.growth_headline,r.growth_commentary)+area('Commercial Endurance',row.commercial_score,r.commercial_headline,r.commercial_commentary)+
 head('Where To Focus Next')+p(clean(r.focus_next_intro))+['now','next','nurture'].map(k=>`<div style="padding:15px 0;border-top:1px solid #aaa;">${head(k)}${p(clean(r[k]))}</div>`).join('')+rule()+
 p('We hope this report has given you a clearer picture of where your brand stands today and where the opportunities for growth might lie.')+
 p("Once you've had a chance to look through it, we'd love to spend 30 minutes talking you through the findings and exploring what you'd prioritise to move your business forward.")+
 p('Just click below to find a time that works for you.')+
 `<table role="presentation" align="center" cellpadding="0" cellspacing="0" style="margin:24px auto;"><tr><td align="center" bgcolor="${PLUM}" style="background:${PLUM};border-radius:4px;"><a href="https://calendly.com/paultcl/30min" style="display:block;padding:12px 28px;color:#fff;font:bold 12px Arial,sans-serif;text-decoration:none;">Book a Call</a></td></tr></table>`+
 p('Look forward to speaking soon.')+p('Kind regards,<br><strong>The Creative Lab</strong>')+
 `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#D6D9D1;border-radius:14px;margin-top:24px;"><tr><td width="50%" align="center" valign="top" style="padding:24px 9px;font:11px/1.6 Arial,sans-serif;border-right:1px solid #8f918c;"><strong>Michael Miley, CEO</strong><br><br><a href="mailto:michael@thec-lab.co.uk" style="color:#343434;">michael@thec-lab.co.uk</a><br>+44 (0)7860 441128</td><td width="50%" align="center" valign="top" style="padding:24px 9px;font:11px/1.6 Arial,sans-serif;"><strong>Paul Cope, MD</strong><br><br><a href="mailto:paul@thec-lab.co.uk" style="color:#343434;">paul@thec-lab.co.uk</a><br>+44 (0)7900 900704</td></tr></table>`;
 const html=`<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><meta charset="utf-8"></head><body style="margin:0;padding:0;background:#ffffff;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:20px 10px;"><table role="presentation" width="620" cellspacing="0" cellpadding="0" style="width:100%;max-width:620px;background:#ffffff;"><tr><td align="center" bgcolor="#ffffff" style="background:#ffffff;padding:24px 20px 22px 20px;"><img src="cid:brand-pulse-logo" width="160" height="57" alt="The Creative Lab" style="display:block;width:160px;height:57px;border:0;"></td></tr><tr><td bgcolor="${CREAM}" style="background:${CREAM};padding:30px;"><div style="font:bold 11px Arial,sans-serif;letter-spacing:.12em;text-transform:uppercase;margin-bottom:24px;">${label}</div>${copy}</td></tr></table></td></tr></table></body></html>`;
 return {html,attachment:donutPng(score),logoAttachment:LOGO_PNG,categoryAttachments:Object.entries(CATEGORY_COLOURS).map(([name,colour],i)=>({filename:`brand-pulse-area-${i}.png`,content:categoryPng(row[({"Strategic Fitness":"strategic_score","Consumer Intelligence":"consumer_score","Market Influence":"market_score","Growth Engine":"growth_score","Commercial Endurance":"commercial_score"})[name]],colour),content_id:`brand-pulse-category-${i}`}))};
}

export { render, FROM };
