'use strict';
function parseMoney(value){
 const s=String(value).trim();
 if(!/^(?:\d+|\d{1,3}(?:,\d{3})+)$/.test(s)) throw new Error('금액은 원 단위의 양의 정수로 입력해 주세요.');
 const n=Number(s.replaceAll(',',''));
 if(!Number.isSafeInteger(n)||n<=0) throw new Error('금액은 0보다 크고 정확히 계산 가능한 정수여야 합니다.');
 return n;
}
function parseLoanPrincipal(value){
 if(/^(?:0+|0{1,3}(?:,000)+)$/.test(String(value).trim()))return 0;
 return parseMoney(value);
}
function propertyProjection(purchase,current,months,years,strength=100){
 if(!Number.isSafeInteger(purchase)||purchase<=0||!Number.isSafeInteger(current)||current<=0)throw new Error('매수가액과 현재 가격을 확인해 주세요.');
 if(!Number.isInteger(months)||months<=0)throw new Error('매수월과 기준월이 같아 집값 연평균 상승률을 계산할 수 없습니다.');
 if(!Number.isInteger(years)||years<1||years>20)throw new Error('미래 기간은 1~20년으로 선택해 주세요.');
 if(!Number.isInteger(strength)||strength<50||strength>150||strength%10!==0)throw new Error('상승률 강도는 50~150% 사이에서 10%씩 선택해 주세요.');
 const historicalRate=Math.expm1(Math.log(current/purchase)*12/months);
 const appliedRate=historicalRate*strength/100;
 if(!Number.isFinite(appliedRate)||appliedRate<=-1)throw new Error('적용한 연간 하락률이 100% 이상이어서 미래 가격을 계산할 수 없습니다. 강도를 낮춰 주세요.');
 const value=current*Math.exp(years*Math.log1p(appliedRate));
 if(!Number.isFinite(value)||value>Number.MAX_SAFE_INTEGER)throw new Error('미래 가격이 계산 가능한 금액 범위를 초과합니다. 기간이나 강도를 낮춰 주세요.');
 return {historicalRate,appliedRate,value,years,strength};
}
function validateRows(rows){
 if(!Array.isArray(rows)||!rows.length) throw new Error('자산 데이터가 없습니다.');
 const keys=new Set();
 for(const r of rows){if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(r.date)||keys.has(r.date))throw new Error('데이터의 월 형식 또는 중복을 확인해 주세요.');keys.add(r.date);}
 return [...rows].sort((a,b)=>a.date.localeCompare(b.date));
}
function housingSchedule(purchase,rate,growth,months){
 if(!Number.isFinite(rate)||rate<0||rate>100)throw new Error('연간 주거서비스 비율은 0~100%로 입력해 주세요.');
 if(rate===0||months===0)return Array(months).fill(0);
 if(months>1&&(!Number.isFinite(growth)||growth<=-100||growth>1000))throw new Error('월세 상승률은 -100% 초과, 1,000% 이하로 입력해 주세요.');
 const first=purchase*rate/100/12,logGrowth=months>1?Math.log1p(growth/100)/12:0;
 return Array.from({length:months},(_,i)=>first*Math.exp(i*logGrowth));
}
function chartGeometry(values){
 const min=Math.min(0,...values),max=Math.max(0,...values),span=max-min||1;
 return {zero:-min/span*100,bars:values.map(value=>({left:(Math.min(0,value)-min)/span*100,width:Math.abs(value)/span*100,negative:value<0}))};
}
function calculate(rows,month,purchase,current,housingRate=0,housingGrowth=0){
 if(!Number.isFinite(housingRate)||housingRate<0||housingRate>100)throw new Error("연간 주거서비스 비율은 0~100%로 입력해 주세요.");
 if(!Number.isSafeInteger(purchase)||purchase<=0||!Number.isSafeInteger(current)||current<=0)throw new Error('매수가액과 현재 가격을 올바르게 입력해 주세요.');
 if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))throw new Error('매수 연월을 선택해 주세요.');
 const end=rows.at(-1),start=rows.find(r=>r.date===month);
 if(!start||month>end.date)throw new Error(`선택한 월의 데이터가 없습니다. ${rows[0].date}~${end.date} 중에서 선택해 주세요.`);
 for(const r of [start,end])for(const k of ['usdkrw','gold_krw_per_gram','qqq_close'])if(typeof r[k]!=='number'||!Number.isFinite(r[k])||r[k]<=0)throw new Error(`${r.date}의 ${k} 데이터가 없거나 올바르지 않아 계산할 수 없습니다.`);
 const monthsHeld=(Number(end.date.slice(0,4))-Number(month.slice(0,4)))*12+Number(end.date.slice(5))-Number(month.slice(5));
 const housingBenefit=housingSchedule(purchase,housingRate,housingGrowth,monthsHeld).reduce((sum,v)=>sum+v,0);
 const values=[current+housingBenefit,purchase*(end.gold_krw_per_gram/start.gold_krw_per_gram),purchase*(end.qqq_close/start.qqq_close)*(end.usdkrw/start.usdkrw)];
 if(values.some(v=>!Number.isFinite(v)||v>Number.MAX_SAFE_INTEGER))throw new Error('계산 결과가 너무 큽니다. 더 작은 금액으로 입력해 주세요.');
 const months=(Number(end.date.slice(0,4))-Number(month.slice(0,4)))*12+Number(end.date.slice(5))-Number(month.slice(5));
 return values.map((value,i)=>({name:['부동산','금','QQQ'][i],value,profit:value-purchase,rate:(value/purchase-1)*100,cagr:months>0?Math.expm1(Math.log(value/purchase)*12/months)*100:null,housingBenefit:i===0?housingBenefit:0,color:['#247858','#ccaa54','#6488a9'][i]}));
}
function purchasingPower(rows,month,purchase,current){
 calculate(rows,month,purchase,current);
 const start=rows.find(r=>r.date===month),end=rows.at(-1);
 return [{name:'금',unit:'kg',before:purchase/start.gold_krw_per_gram/1000,after:current/end.gold_krw_per_gram/1000},{name:'QQQ',unit:'주',before:purchase/start.usdkrw/start.qqq_close,after:current/end.usdkrw/end.qqq_close}];
}

function currencyComparison(rows,month,purchase,current){
 const assets=calculate(rows,month,purchase,current),start=rows.find(r=>r.date===month),end=rows.at(-1);
 const before=purchase/start.usdkrw,after=current/end.usdkrw;
 const months=(Number(end.date.slice(0,4))-Number(month.slice(0,4)))*12+Number(end.date.slice(5))-Number(month.slice(5));
 return {before,after,rate:(after/before-1)*100,cagr:months>0?Math.expm1(Math.log(after/before)*12/months)*100:null,krwRate:assets[0].rate,krwCagr:assets[0].cagr,fxChange:(end.usdkrw/start.usdkrw-1)*100};
}

function loanSchedule(principal,years,annualRate,elapsedMonths){
 if(!Number.isSafeInteger(principal)||principal<=0)throw new Error('대출금은 0보다 큰 원 단위 정수로 입력해 주세요.');
 if(!Number.isInteger(years)||years<1||years>50)throw new Error('상환기간은 1~50년의 정수로 입력해 주세요.');
 if(!Number.isFinite(annualRate)||annualRate<0||annualRate>100)throw new Error('연이율은 0~100%로 입력해 주세요.');
 if(!Number.isInteger(elapsedMonths)||elapsedMonths<0)throw new Error('대출 보유기간을 확인해 주세요.');
 const n=years*12,r=annualRate/1200;
 const payment=r===0?principal/n:principal*r/(-Math.expm1(-n*Math.log1p(r)));
 let balance=principal,interestPaid=0,principalPaid=0,totalPaid=0;const payments=[];
 const paymentsMade=Math.min(elapsedMonths,n);
 for(let i=0;i<paymentsMade;i++){
  const interest=balance*r;
  const repayment=i===n-1?balance:Math.min(balance,Math.max(0,payment-interest));
  payments.push(interest+repayment);interestPaid+=interest;principalPaid+=repayment;totalPaid+=interest+repayment;balance=Math.max(0,balance-repayment);
 }
 return {payments,payment,balance,interestPaid,principalPaid,totalPaid,paymentsMade,totalMonths:n,remainingMonths:n-paymentsMade};
}
function annualIrr(flows){
 if(flows.length<2)return {value:null,reason:'같은 달은 계산 불가'};
 const signs=flows.filter(v=>Math.abs(v)>1e-8).map(v=>Math.sign(v));
 let changes=0;for(let i=1;i<signs.length;i++)if(signs[i]!==signs[i-1])changes++;
 if(changes!==1)return {value:null,reason:changes>1?'복수 IRR 가능 · 단일 수익률 표시 불가':'IRR 계산 가능한 현금흐름 없음'};
 const scale=Math.max(...flows.map(v=>Math.abs(v))),n=flows.length-1;
 const npv=x=>flows.reduce((sum,v,t)=>sum+v/scale*Math.exp(x>=0?-t*x:(n-t)*x),0);
 let lo=-20,hi=20,fl=npv(lo),fh=npv(hi);
 if(fl*fh>0)return {value:null,reason:'IRR 계산 범위 초과'};
 for(let i=0;i<160;i++){const mid=(lo+hi)/2,fm=npv(mid);if(fm===0){lo=hi=mid;break;}if((fm>0)===(fl>0)){lo=mid;fl=fm;}else hi=mid;}
 const value=Math.expm1(12*(lo+hi)/2)*100;
 if(value<=-100)return {value:null,reason:'연환산 수익률이 −100%에 너무 가까워 정밀도 범위 초과'};
 return Number.isFinite(value)?{value,reason:null}:{value:null,reason:'IRR 계산 범위 초과'};
}
function equityComparison(rows,month,purchase,current,housingRate,housingGrowth,loan){
 if(loan&&loan.principal===0)loan=null;
 const base=calculate(rows,month,purchase,current,housingRate,housingGrowth);
 const last=rows.at(-1),start=rows.find(r=>r.date===month);
 const months=(Number(last.date.slice(0,4))-Number(month.slice(0,4)))*12+Number(last.date.slice(5))-Number(month.slice(5));
 if(loan&&loan.principal>=purchase)throw new Error('대출금은 매수가액보다 작아야 합니다.');
 const debt=loan?loanSchedule(loan.principal,loan.years,loan.rate,months):{payment:0,payments:[],balance:0,interestPaid:0,principalPaid:0,totalPaid:0,paymentsMade:0,remainingMonths:0};
 const initialEquity=purchase-(loan?loan.principal:0),cashContributed=initialEquity+debt.totalPaid;
 const currentEquity=current-debt.balance,economicEquity=currentEquity+base[0].housingBenefit;
 const propertyFlows=[-initialEquity],goldFlows=[-initialEquity],qqqFlows=[-initialEquity];
 let goldGrams=initialEquity/start.gold_krw_per_gram,qqqShares=initialEquity/start.usdkrw/start.qqq_close;
 const byMonth=new Map(rows.map(r=>[r.date,r]));
 const startIndex=Number(month.slice(0,4))*12+Number(month.slice(5))-1;
 const benefits=housingSchedule(purchase,housingRate,housingGrowth,months);
 for(let t=1;t<=months;t++){
  const paid=debt.payments[t-1]||0,rent=benefits[t-1];
  propertyFlows.push(rent-paid);goldFlows.push(-paid);qqqFlows.push(-paid);
  if(paid>0){const index=startIndex+t,date=`${Math.floor(index/12)}-${String(index%12+1).padStart(2,'0')}`,r=byMonth.get(date);
   if(!r||['gold_krw_per_gram','usdkrw','qqq_close'].some(k=>!Number.isFinite(r[k])||r[k]<=0))throw new Error(`${date}의 추가 투자 가격이 없어 비교할 수 없습니다.`);
   goldGrams+=paid/r.gold_krw_per_gram;qqqShares+=paid/r.usdkrw/r.qqq_close;
  }
 }
 const values=[economicEquity,goldGrams*last.gold_krw_per_gram,qqqShares*last.qqq_close*last.usdkrw];
 if(!Number.isFinite(cashContributed)||cashContributed>Number.MAX_SAFE_INTEGER||values.some(v=>!Number.isFinite(v)||Math.abs(v)>Number.MAX_SAFE_INTEGER))throw new Error('계산 결과가 너무 큽니다.');
 propertyFlows[months]+=currentEquity;goldFlows[months]+=values[1];qqqFlows[months]+=values[2];
 const flows=[propertyFlows,goldFlows,qqqFlows];
 const assets=values.map((value,i)=>({...base[i],value,profit:value-cashContributed,rate:(value/cashContributed-1)*100,irr:annualIrr(flows[i]),cagr:null,invested:cashContributed}));
 return {assets,details:{...debt,initialEquity,cashContributed,currentEquity,economicEquity,profit:economicEquity-cashContributed},holdings:{goldInitial:initialEquity/start.gold_krw_per_gram,goldTotal:goldGrams,qqqInitial:initialEquity/start.usdkrw/start.qqq_close,qqqTotal:qqqShares},flows,benefits};
}
function ownMoneyCurrencies(rows,month,comparison){
 const start=rows.find(r=>r.date===month),end=rows.at(-1),d=comparison.details,n=comparison.flows[0].length-1;
 const index=Number(month.slice(0,4))*12+Number(month.slice(5))-1,byMonth=new Map(rows.map(r=>[r.date,r]));
 let investedUsd=d.initialEquity/start.usdkrw,benefitUsd=0;
 const usdFlows=[-d.initialEquity/start.usdkrw];
 for(let t=1;t<=n;t++){
  const paid=d.payments[t-1]||0;
  const rent=comparison.benefits[t-1];
  const date=`${Math.floor((index+t)/12)}-${String((index+t)%12+1).padStart(2,'0')}`,r=byMonth.get(date);
  if((paid!==0||Math.abs(rent)>1e-8)&&(!r||!Number.isFinite(r.usdkrw)||r.usdkrw<=0))throw new Error(`${date}의 환율이 없어 달러 기준 내 돈 수익률을 계산할 수 없습니다.`);
  const fx=r&&Number.isFinite(r.usdkrw)&&r.usdkrw>0?r.usdkrw:end.usdkrw;
  investedUsd+=paid/fx;benefitUsd+=rent/fx;usdFlows.push((rent-paid)/fx);
 }
 const valueUsd=d.currentEquity/end.usdkrw+benefitUsd;
 usdFlows[n]+=d.currentEquity/end.usdkrw;
 return {krw:{initial:d.initialEquity,invested:d.cashContributed,value:d.economicEquity,profit:d.profit,rate:comparison.assets[0].rate,irr:comparison.assets[0].irr},usd:{initial:d.initialEquity/start.usdkrw,invested:investedUsd,value:valueUsd,profit:valueUsd-investedUsd,rate:(valueUsd/investedUsd-1)*100,irr:annualIrr(usdFlows)},usdFlows};
}
if(typeof module!=='undefined')module.exports={propertyProjection,parseLoanPrincipal,housingSchedule,chartGeometry,parseMoney,validateRows,calculate,purchasingPower,currencyComparison,loanSchedule,annualIrr,equityComparison,ownMoneyCurrencies};
if(typeof document!=='undefined'){
 const $=id=>document.getElementById(id);const won=v=>Math.round(v).toLocaleString('ko-KR')+'원';
 const short=v=>{const n=Math.round(Math.abs(v));const e=Math.floor(n/1e8);const m=Math.round((n%1e8)/1e4);if(n<1e4)return n.toLocaleString('ko-KR')+'원';if(m===10000)return (e+1).toLocaleString('ko-KR')+'억 원';return [e?e.toLocaleString('ko-KR')+'억':'',m?m.toLocaleString('ko-KR')+'만':''].filter(Boolean).join(' ')+' 원';};
 const ym=m=>`${m.slice(0,4)}년 ${Number(m.slice(5))}월`;
 const percent=v=>(v>0?'+':'')+v.toLocaleString('ko-KR',{minimumFractionDigits:1,maximumFractionDigits:1})+'%';
 const quantity=(v,unit)=>v.toLocaleString('ko-KR',{minimumFractionDigits:unit==='kg'?2:0,maximumFractionDigits:unit==='달러'?0:2})+unit;
 let rows,forecastInput;
 function renderForecast(){
  const years=Number($('forecast-years').value),strength=Number($('forecast-strength').value);
  $('forecast-years-value').textContent=years+'년 후';$('forecast-strength-value').textContent=strength+'%';
  for(const id of ['forecast-years','forecast-strength']){const el=$(id);el.style.setProperty('--fill',((Number(el.value)-Number(el.min))/(Number(el.max)-Number(el.min))*100)+'%');}
  if(!forecastInput)return;
  const {purchase,current,months,endMonth}=forecastInput;
  const sameMonth=months===0;$('forecast-years').disabled=sameMonth;$('forecast-strength').disabled=sameMonth;
  $('forecast-base').textContent=`현재 ${short(current)} · ${ym(endMonth)} 기준`;
  try{
   const projected=propertyProjection(purchase,current,months,years,strength);
   $('forecast-selected-rate').textContent='연 '+percent(projected.appliedRate*100);
   $('forecast-rate').textContent=`과거 CAGR ${percent(projected.historicalRate*100)} → 적용 CAGR ${percent(projected.appliedRate*100)} · 강도 ${strength}%`;
   $('forecast-value').textContent=short(projected.value);$('forecast-exact').textContent=won(projected.value);
   $('forecast-story').textContent=`앞으로 ${years}년 동안 과거 연평균 상승률의 ${strength}%${strength===100?' (과거와 같은 상승률)':''}가 유지된다면, 현재 ${short(current)}인 집의 ${years}년 뒤 가격은 ${short(projected.value)}입니다.`;
   $('forecast-date').textContent=`${years}년 후 가정 · ${Number(endMonth.slice(0,4))+years}년 ${Number(endMonth.slice(5))}월`;
   const count=years*12,prices=Array.from({length:count+1},(_,i)=>current*Math.exp(i/12*Math.log1p(projected.appliedRate))),min=Math.min(...prices),max=Math.max(...prices),span=max-min;
   const coords=prices.map((price,i)=>[10+i/count*300,span?116-(price-min)/span*100:66]);
   const path=coords.map(([x,y],i)=>(i?'L':'M')+x.toFixed(2)+' '+y.toFixed(2)).join(' '),first=coords[0],last=coords.at(-1);
   $('forecast-line').innerHTML=`<svg viewBox="0 0 320 132" role="img" aria-label="현재 ${won(current)}에서 ${years}년 후 ${won(projected.value)}까지의 가정 가격 경로"><path d="${path}" fill="none" stroke="#247858" stroke-width="3"/><circle cx="${first[0]}" cy="${first[1]}" r="4" fill="#247858"/><circle cx="${last[0]}" cy="${last[1]}" r="4" fill="#247858"/></svg><div class="line-labels"><span>현재 ${short(current)}</span><span>${years}년 후 ${short(projected.value)}</span></div>`;
   $('forecast-error').hidden=true;$('forecast-output').hidden=false;
  }catch(e){$('forecast-selected-rate').textContent='계산 불가';$('forecast-output').hidden=true;$('forecast-rate').textContent='';$('forecast-error').textContent=e.message;$('forecast-error').hidden=false;}
 }
 for(const id of ['forecast-years','forecast-strength'])$(id).addEventListener('input',renderForecast);
 function error(message){$('error').textContent=message;$('error').hidden=false;$('results').hidden=true;$('empty').hidden=true;}
 try{rows=validateRows(window.ASSET_DATA);const end=rows.at(-1).date;$('period').textContent=`비교 기준 · ${ym(end)}`;$('range').textContent=`${rows[0].date} ~ ${end}`;$('month').min=rows[0].date;$('month').max=end;
 const years=[...new Set(rows.map(r=>r.date.slice(0,4)))];
 $('year-select').innerHTML='<option value="">연도 선택</option>'+years.map(y=>`<option value="${y}">${y}년</option>`).join('');
 function updateMonthOptions(){const year=$('year-select').value,previous=$('month-select').value;const available=rows.filter(r=>r.date.startsWith(year+'-'));$('month-select').innerHTML='<option value="">월 선택</option>'+available.map(r=>`<option value="${r.date.slice(5)}">${Number(r.date.slice(5))}월</option>`).join('');$('month-select').disabled=!year;if(available.some(r=>r.date.slice(5)===previous))$('month-select').value=previous;syncDate();}
 function syncDate(){const year=$('year-select').value,m=$('month-select').value;$('month').value=year&&m?year+'-'+m:'';$('date-caption').textContent=$('month').value?ym($('month').value)+'에 매수':'집을 산 시점을 선택하세요';$('form').dispatchEvent(new Event('input',{bubbles:true}));}
 $('year-select').addEventListener('change',updateMonthOptions);$('month-select').addEventListener('change',syncDate);
 $('current-hint').textContent=`${ym(end)} 기준 가격을 입력해 주세요`;}
 catch(e){error(e.message);$('submit').disabled=true;}
 $('loan-toggle').addEventListener('change',()=>{const active=$('loan-toggle').checked;$('loan-fields').hidden=!active;for(const id of ['loan-amount','loan-years','loan-rate'])$(id).disabled=!active;$('form').dispatchEvent(new Event('input',{bubbles:true}));});
 for(const id of ['purchase','current','loan-amount']){
  $(id).addEventListener('input',()=>{try{$(id+'-amount').textContent=short((id==='loan-amount'?parseLoanPrincipal:parseMoney)($(id).value));}catch{$(id+'-amount').textContent='';}});
  $(id).addEventListener('blur',()=>{try{$(id).value=(id==='loan-amount'?parseLoanPrincipal:parseMoney)($(id).value).toLocaleString('ko-KR');}catch{}});
 }
 $('form').addEventListener('input',()=>{if(!$('results').hidden){$('results').hidden=true;$('empty').hidden=false;}$('error').hidden=true;});
 function rentGrowth(){
  if(Number($('housing-rate').value)===0)return 0;
  const start=$('month').value,end=rows.at(-1).date;
  const months=(Number(end.slice(0,4))-Number(start.slice(0,4)))*12+Number(end.slice(5))-Number(start.slice(5));
  if(months<=1)return 0;
  const mode=$('rent-growth-mode').value;
  if(mode==='fixed')return 0;
  if(mode==='manual')return $('rent-growth-rate').value.trim()===''?NaN:Number($('rent-growth-rate').value);
  return months>1?Math.expm1(Math.log(parseMoney($('current').value)/parseMoney($('purchase').value))*12/months)*100:0;
 }
 $('rent-growth-mode').addEventListener('change',()=>{const manual=$('rent-growth-mode').value==='manual';$('rent-growth-manual').hidden=!manual;$('rent-growth-rate').disabled=!manual;$('form').dispatchEvent(new Event('input',{bubbles:true}));});
 $('form').addEventListener('submit',event=>{
  event.preventDefault();try{
   let result=calculate(rows,$('month').value,parseMoney($('purchase').value),parseMoney($('current').value),$('housing-rate').value.trim()===''?NaN:Number($('housing-rate').value),rentGrowth());
   const appliedRentGrowth=rentGrowth();
   const purchase=parseMoney($('purchase').value),current=parseMoney($('current').value);
   const endMonth=rows.at(-1).date,startMonth=$('month').value;
   const elapsed=(Number(endMonth.slice(0,4))-Number(startMonth.slice(0,4)))*12+Number(endMonth.slice(5))-Number(startMonth.slice(5));
   const loanPrincipal=$('loan-toggle').checked?parseLoanPrincipal($('loan-amount').value):0;
   const loan=loanPrincipal>0?{principal:loanPrincipal,years:$('loan-years').value.trim()===''?NaN:Number($('loan-years').value),rate:$('loan-rate').value.trim()===''?NaN:Number($('loan-rate').value)}:null;
   const financed=equityComparison(rows,$('month').value,purchase,current,Number($('housing-rate').value),appliedRentGrowth,loan);result=financed.assets;
   $('loan-results').hidden=false;
   {const d=financed.details;
   $('loan-details-title').textContent=loan?'자기자본·대출 상환 상세':'자기자본·주거 혜택 상세';
   const common=[['최초 자기자본',d.initialEquity],['누적 투입금',d.cashContributed],['현재 집 순자산',d.currentEquity],['주거 혜택 포함 순손익',d.profit]];
   const metrics=loan?[['월 원리금',d.payment],['갚은 원금',d.principalPaid],['낸 이자',d.interestPaid],['남은 대출',d.balance],...common]:common;
   $('loan-results').innerHTML=`<div class="loan-metrics">${metrics.map(([label,value])=>`<div><span>${label}</span><strong>${value<0?'−':''}${short(value)}</strong><small>${won(value)}</small></div>`).join('')}</div>${loan?`<p>${d.paymentsMade}회 상환 · ${d.remainingMonths}개월 남음. 고정금리, 거치·중도상환 없음. 매수 다음 달부터 월 1회 상환합니다.</p>`:''}<p>내 돈 = 최초 자기자본${loan?' + 누적 원리금':''}. 순손익 = 집값${loan?' − 남은 대출':''} + 주거 혜택 − 내 돈.${loan?' 납입 원금·이자는 투입금에서 한 번 차감하고 다시 빼지 않습니다.':''}</p>`;}

   const hasAdditional=financed.details.totalPaid>0;
   const h=financed.holdings;
   forecastInput={purchase,current,months:elapsed,endMonth};renderForecast();
   $('power-note').textContent=hasAdditional?'금·QQQ 수량은 최초 자기자본과 매월 추가 투입금으로 계산합니다. QQQ는 현재 분할 기준 환산 수량·가격이며 배당은 제외합니다.':'금·QQQ 수량은 처음 투입한 자기자본만으로 매수한 보유 수량입니다. QQQ는 현재 분할 기준 환산 수량·가격이며 배당은 제외합니다.';
   $('funding-note').textContent=hasAdditional?'부동산은 대출 잔액과 원리금 납입을 반영하고 주거 혜택을 더합니다. 금·QQQ는 원리금에 쓴 금액을 같은 달 추가 투자합니다.':'세 자산 모두 처음 투입한 내 돈으로 비교합니다. 부동산에는 누적 주거 혜택을 더합니다.';
   $('extra-funding-note').hidden=!hasAdditional;
   const power=[{name:'금',unit:'kg',before:h.goldInitial/1000,after:h.goldTotal/1000},{name:'QQQ',unit:'주',before:h.qqqInitial,after:h.qqqTotal}];
   $('error').hidden=true;$('empty').hidden=true;$('results').hidden=false;
   $('housing-summary').textContent=Number($('housing-rate').value)===0?'주거 혜택 미반영 · 0원':elapsed===0?'보유기간 0개월 · 누적 주거 혜택 0원':`월세 연간 변화 ${percent(appliedRentGrowth)}${$('rent-growth-mode').value==='property'?' (집값 CAGR 가정)':''} · 주거 혜택 누적 ${short(result[0].housingBenefit)}`;
   const baseRent=financed.benefits[0]||0;
   const lastRent=financed.benefits.at(-1)||0;
   $('rent-detail').textContent=elapsed===0?'매수월과 기준월이 같아 원리금 납입·추가 투자·주거 혜택은 발생하지 않습니다.':Number($('housing-rate').value)===0?'주거 혜택을 0%로 입력하여 월세 상승률은 계산에 적용하지 않습니다.':`첫 달 월세·주거 혜택 ${won(baseRent)} → 마지막 달 ${won(lastRent)}. 입력한 연간 상승률을 월복리로 적용해 매월 혜택을 합산합니다. 받은 혜택의 재투자는 가정하지 않습니다.`;
   $('comparison-period').textContent=`${ym($('month').value)} → ${ym(rows.at(-1).date)}`;
   $('power').innerHTML=power.map(a=>{return `<article class="power-card"><h3>내 돈을 ${a.name}에 투자했다면</h3><div class="quantities"><div><span>${hasAdditional?'최초 자기자본':'보유 수량'}</span><strong>${quantity(a.before,a.unit)}</strong></div>${hasAdditional?`<span class="arrow" aria-hidden="true">→</span><div><span>추가 투입금까지 매수</span><strong>${quantity(a.after,a.unit)}</strong></div>`:''}</div><details class="compact-details price-details"><summary>단위 가격·투입금</summary><p class="price-reference">${a.name==='금'?'금 1kg':'QQQ 1주 (현재 분할 기준)'} 가격<br>당시 ${won(a.name==='금'?rows.find(r=>r.date===$('month').value).gold_krw_per_gram*1000:rows.find(r=>r.date===$('month').value).qqq_close*rows.find(r=>r.date===$('month').value).usdkrw)} → 현재 ${won(a.name==='금'?rows.at(-1).gold_krw_per_gram*1000:rows.at(-1).qqq_close*rows.at(-1).usdkrw)}${a.name==='QQQ'?`<br>달러 기준 $${rows.find(r=>r.date===$('month').value).qqq_close.toFixed(2)} → $${rows.at(-1).qqq_close.toFixed(2)}`:''}</p><p>${hasAdditional?`처음 내 돈 ${short(financed.details.initialEquity)} + 추가 투입금 ${short(financed.details.totalPaid)}을 함께 투자한 총 수량입니다.`:`처음 내 돈 ${short(financed.details.initialEquity)}으로 매수한 수량을 그대로 보유합니다.`}</p></details></article>`;}).join('');
   const start=rows.find(r=>r.date===$('month').value),end=rows.at(-1);
   const houseUnits=purchasingPower(rows,$('month').value,purchase,current);
   $('house-units').innerHTML=houseUnits.map(a=>{const rate=(a.after/a.before-1)*100;return `<article class="power-card"><h4>${a.name==='금'?'금으로 본 집값':'QQQ로 본 집값'}</h4><div class="quantities"><div><span>최초</span><strong>${quantity(a.before,a.unit)}</strong></div><span class="arrow" aria-hidden="true">→</span><div><span>현재</span><strong>${quantity(a.after,a.unit)}</strong></div></div><p class="relative-change ${rate<0?'negative':'positive'}">${a.name} 기준 ${percent(rate)}</p></article>`;}).join('');
   const houseFx=currencyComparison(rows,$('month').value,purchase,current),houseBase=calculate(rows,$('month').value,purchase,current)[0];
   const houseCagr=houseBase.cagr===null?'계산 불가':percent(houseBase.cagr)+' / 년';
   $('price-summary').innerHTML=`<div class="house-prices"><div><span>최초 집값</span><strong title="${won(purchase)}">${short(purchase)}</strong></div><span class="arrow" aria-hidden="true">→</span><div><span>현재 집값</span><strong title="${won(current)}">${short(current)}</strong></div></div><div class="house-rates"><div><span>총 상승률</span><strong>${percent(houseBase.rate)}</strong></div><div><span>집값 CAGR</span><strong>${houseCagr}</strong></div></div><p class="power-note">${Math.floor(elapsed/12)}년 ${elapsed%12}개월 보유 · 대출·주거 혜택 제외</p>`;
   const houseUsd=v=>'$'+v.toLocaleString('ko-KR',{maximumFractionDigits:0});
   $('house-usd').innerHTML=`<h4>달러로 본 집값</h4><div class="quantities"><div><span>최초</span><strong>${houseUsd(houseFx.before)}</strong></div><span class="arrow" aria-hidden="true">→</span><div><span>현재</span><strong>${houseUsd(houseFx.after)}</strong></div></div><p class="relative-change ${houseFx.rate<0?'negative':'positive'}">달러 기준 ${percent(houseFx.rate)}</p><small>집값 CAGR ${houseFx.cagr===null?'계산 불가':percent(houseFx.cagr)+' / 년'}</small>`;

   const currency=ownMoneyCurrencies(rows,$('month').value,financed);
   const usd=v=>(v<0?'−':'')+'$'+Math.abs(v).toLocaleString('ko-KR',{maximumFractionDigits:0});
   const signedShort=v=>(v<0?'−':'')+short(v);
   const returnText=r=>r.value===null?'계산 불가':percent(r.value);
   $('currency-results').innerHTML=`<p class="currency-label">순자산 + 누적 주거 혜택 · 실제 내 돈 기준</p><div class="currency-columns">${[['원화 기준','KRW',currency.krw,signedShort],['달러 기준','USD',currency.usd,usd]].map(([title,unit,c,f])=>`<article><h4>${title} <span>${unit}</span></h4><details class="compact-details capital-initial"><summary>최초 자기자본</summary><p>${f(c.initial)}</p></details><div class="capital-flow-labels"><span>누적 투입한 내 돈</span><span>순자산 + 누적 주거 혜택</span></div><div class="currency-prices">${f(c.invested)} <span>→</span> ${f(c.value)}</div><div class="metric"><span>순손익 · 납입비용 차감 완료</span><strong>${f(c.profit)}</strong></div><div class="currency-metrics"><div><span>누적 수익률</span><strong>${percent(c.rate)}</strong></div><div><span>연환산 · IRR</span><strong title="${c.irr.reason||'월별 현금흐름 기준'}">${returnText(c.irr)}</strong></div></div></article>`).join('')}</div><details class="compact-details"><summary>원화·달러 수익률 계산 기준</summary><p class="currency-explanation">원화·달러 모두 최초 자기자본과 매월 원리금 납입을 기준으로 계산합니다. 달러는 각 납입·주거 혜택이 발생한 달의 환율, 남은 집 순자산은 마지막 달의 환율을 적용합니다. 주거 혜택은 현금 잔고가 아닌 경제적 가치일 수 있습니다.</p></details>`;
   $('fx-note').textContent=`1달러 환율: 매수 당시 ${start.usdkrw.toLocaleString('ko-KR',{maximumFractionDigits:2})}원 → 현재 ${end.usdkrw.toLocaleString('ko-KR',{maximumFractionDigits:2})}원`;
   $('cards').innerHTML=result.map(a=>`<article class="card" style="--asset:${a.color}"><div class="asset-label"><span class="swatch" aria-hidden="true"></span>${a.name}${a.name==='부동산'?' · 내 돈 기준':''}</div><div class="value">${a.value<0?'−':''}${short(a.value)}</div><details class="compact-details exact"><summary>원 단위 금액</summary><p>${won(a.value)} · ${a.name==='부동산'?'순자산 + 주거 혜택':'최종 평가액'}</p></details><div class="metric"><span>누적 투입한 내 돈</span><strong>${short(a.invested)}</strong></div><div class="metric"><span>손익</span><strong class="${a.profit<0?'negative':'positive'}">${a.profit>0?'+':a.profit<0?'−':''}${short(a.profit)}</strong></div><div class="metric"><span>누적 수익률</span><strong class="${a.rate<0?'negative':'positive'}">${percent(a.rate)}</strong></div><div class="metric"><span>연환산 수익률 · IRR</span><strong title="${a.irr.reason||'월별 현금흐름 기준'}">${a.irr.value===null?'계산 불가':percent(a.irr.value)}</strong></div></article>`).join('');
   const geometry=chartGeometry(result.map(a=>a.value));$('chart').innerHTML=result.map((a,i)=>`<div class="bar-row"><span>${a.name}</span><div class="track"><span class="zero-line" style="left:${geometry.zero}%"></span><div class="bar ${geometry.bars[i].negative?'bar-negative':''}" style="--asset:${a.color};--left:${geometry.bars[i].left}%;--width:${geometry.bars[i].width}%"></div></div><strong>${a.value<0?'−':''}${short(a.value)}</strong></div>`).join('');
   $('basis-note').textContent=`처음 내 돈 ${short(financed.details.initialEquity)}${loan?' + 매월 원리금에 쓴 돈을 금·QQQ에도 같은 달 투자':''}. 누적 수익률은 순손익 ÷ 누적 투입금, 연환산 IRR은 돈이 들어가고 나온 시점을 반영합니다. 부동산 주거 혜택은 재투자하지 않고 매월 받은 경제적 가치로 반영합니다.`;
   $('chart').setAttribute('aria-label',result.map(a=>`${a.name} ${won(a.value)}`).join(', '));
   $('irr-notes').textContent=(elapsed>0&&elapsed<12?'보유기간이 1년 미만이므로 연환산 IRR이 크게 보일 수 있습니다. 실제 1년간 얻은 수익률이나 향후 수익 예측이 아닙니다. ':'')+[...result,{name:'달러 기준 부동산',irr:currency.usd.irr}].filter(a=>a.irr.reason).map(a=>a.name+': '+a.irr.reason).join(' · ');
   $('differences').innerHTML=result.slice(1).map(a=>{const diff=result[0].value-a.value;return `<p>부동산은 ${a.name}보다<br><strong>${diff===0?'같은 금액입니다.':short(diff)+' '+(diff>0?'앞섰습니다.':'뒤처졌습니다.')}</strong></p>`;}).join('');
  }catch(e){error(e.message);}
 });
}


