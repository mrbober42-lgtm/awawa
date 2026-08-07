// Приложение "Калькулятор" (Calculator)

export const calculatorApp = {
  id: 'calculator',
  name: 'Калькулятор',
  icon: 'calculate',
  createWindow: () => {
    const c = document.createElement('div'); 
    c.style.cssText = 'display:flex;flex-direction:column;height:100%';
    c.innerHTML = `<div style="flex:1;display:flex;flex-direction:column;justify-content:flex-end;padding:16px;"><div id="calc-expr" style="font-size:18px;opacity:0.7;text-align:right;"></div><div id="calc-disp" style="font-size:52px;text-align:right;">0</div></div><div id="calc-btns" style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;padding:12px;"></div>`;
    const disp = c.querySelector('#calc-disp'), exprDiv = c.querySelector('#calc-expr'), btns = c.querySelector('#calc-btns');
    let expr = '', current = '0'; 
    const update = () => { disp.textContent = current; exprDiv.textContent = expr; };
    
    'C,±,%,÷,7,8,9,×,4,5,6,−,1,2,3,+,0,.,='.split(',').forEach(v => { 
      const b = document.createElement('button'); 
      b.textContent = v; 
      b.style.cssText = `background:${['÷','×','−','+','='].includes(v)?'var(--md-sys-color-primary-container)':'var(--md-sys-color-surface-container-high)'};border-radius:40px;font-size:24px;padding:16px;border:none;color:var(--md-sys-color-on-surface);`; 
      b.onclick = () => { 
        if(v==='C'){ expr=''; current='0'; } 
        else if(v==='±') current = (-parseFloat(current)).toString(); 
        else if(v==='%') current = (parseFloat(current)/100).toString(); 
        else if('÷×−+'.includes(v)){ expr = current + ' ' + v + ' '; current = '0'; } 
        else if(v==='='){ try { current = eval(expr.replace(/×/g,'*').replace(/÷/g,'/').replace(/−/g,'-')+current).toString(); expr=''; } catch { current='Ошибка'; } } 
        else { if(v==='.' && current.includes('.')) return; current = current==='0'&&v!=='.' ? v : current+v; } 
        update(); 
      }; 
      btns.appendChild(b); 
    });
    return c;
  }
};

export default calculatorApp;
