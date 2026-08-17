const load = async () => { const response = await fetch('./dashboard-data.json'); if (!response.ok) throw new Error(`数据加载失败：${response.status}`); return response.json() }
const data = await load()
const $ = (selector) => document.querySelector(selector)
const $$ = (selector) => [...document.querySelectorAll(selector)]
const esc = (value='') => String(value).replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
const count = (value) => value === null || value === undefined ? '未知' : value >= 10000 ? `${(value/10000).toFixed(value%10000===0?0:1)}万` : new Intl.NumberFormat('zh-CN').format(value)
const tierLabels = {all:'全部',high:'高表现',median:'中位数附近',average:'平均值附近',low:'低表现',other:'其他'}
const dateText = (value) => value ? String(value).replace('T',' ').slice(0,16) : '未知'
let view = 'list', filter = 'all', selectedDeep = data.deepDives?.[0]?.postId ?? null

document.title = data.title
$('#title').textContent = data.title
$('#heroSentence').textContent = data.positioning?.sentence ?? ''
$('#profileFacts').innerHTML = [["粉丝",data.creator.publicStats?.followers],["获赞与收藏",data.creator.publicStats?.likesAndCollections],["公开快照",data.generatedAt?.slice(0,10)]].map(([k,v])=>`<span>${esc(k)}<b>${typeof v==='number'?count(v):esc(v??'未知')}</b></span>`).join('')
$('#railCoverage').innerHTML = `<small>公开内容覆盖</small><strong>${count(data.overview.postCount)}</strong><span>${count(data.overview.videoCount)} 条视频 · ${count(data.deepDives.length)} 条深度还原</span>`

const contract = data.analysisContract
$('#analysisContract').innerHTML = [["为什么",contract.why],["方法",contract.method],["支持决策",(contract.decisions??[]).join('；')],["不支持",(contract.nonDecisions??[]).join('；')]].map(([k,v])=>`<article><b>${k}</b><p>${esc(v)}</p></article>`).join('')
const p = data.positioning
$('#positionCard').innerHTML = `<div><span class="eyebrow">账号本质</span><h3>${esc(p.name)}</h3><p>${esc(p.sentence)}</p></div><div class="position-facts">${[["服务谁",p.audience],["解决什么",p.job],["承诺什么",p.promise],["如何证明",p.proofSystem],["可信成本",p.credibilityDebt]].map(([k,v])=>`<div><span>${k}</span><b>${esc(v)}</b></div>`).join('')}</div>`

$('#metricStrip').innerHTML = [["公开内容",data.overview.postCount,"全量基本盘"],["视频",data.overview.videoCount,"公开视频"],["点赞中位数",data.overview.medianLikes,"典型表现"],["点赞平均值",data.overview.meanLikes,"长尾敏感"],["最高点赞",data.overview.maxLikes,"公开上限"]].map(([k,v,n])=>`<article><span>${k}</span><strong>${count(v)}</strong><small>${n}</small></article>`).join('')
const maxBucket = Math.max(1,...data.overview.distribution.map(x=>x.count??0))
$('#distribution').innerHTML = data.overview.distribution.map(x=>`<div class="distribution-row"><span>${esc(x.label)}</span><div class="track"><i style="width:${Math.max(2,(x.count??0)/maxBucket*100)}%"></i></div><b>${count(x.count)}</b><small>${esc(x.share)}%</small></div>`).join('')

const renderClusters = (items) => items.map(x=>`<div class="cluster-row"><div><b>${esc(x.name)}</b><small>${count(x.count)} 条 · 万赞 ${count(x.hits10k??0)}</small></div><span><small>中位</small><b>${count(x.medianLikes)}</b></span><span><small>均值</small><b>${count(x.meanLikes)}</b></span><span><small>最高</small><b>${count(x.maxLikes)}</b></span></div>`).join('')
$('#topicClusters').innerHTML = renderClusters(data.topicClusters)
$('#formatClusters').innerHTML = renderClusters(data.formatClusters)

const average = data.tiers.find(x=>x.tier==='average')
$('#averageDiagnostic').innerHTML = average?.diagnostic?.status === 'mean_gap'
  ? `<b>平均值落在断层中：</b>最近样本与均值相差 ${count(average.diagnostic.nearestDistance)} 赞。本档不伪造“典型平均内容”，改看下边界 ${count(average.diagnostic.lowerNeighbor?.likes)} 与上边界 ${count(average.diagnostic.upperNeighbor?.likes)}。`
  : `<b>平均值附近存在自然样本：</b>它与中位数附近内容分开呈现，用于观察头部样本如何抬高整体水平。`
$('#crossFindings').innerHTML = (data.crossTierFindings??[]).map((item,index)=>`<article><span>${String(index+1).padStart(2,'0')}</span><div><h3>${esc(item.finding)}</h3><p>${esc(item.evidence)}</p></div></article>`).join('')
$('#tierGrid').innerHTML = data.tiers.map(t=>`<article class="tier-card"><header><span class="tier-tag ${t.tier}">${esc(t.label)}</span><small>${count(t.sampleSize)} 条</small></header><h3>${t.medianLikes===null?'边界诊断':`中位 ${count(t.medianLikes)}`}</h3><p>${esc(t.patterns?.[0]??'尚待补充本档观察。')}</p><b>机制</b><ul>${(t.mechanisms??[]).map(x=>`<li>${esc(x)}</li>`).join('')||'<li>待验证</li>'}</ul><b>失效风险</b><ul>${(t.failures??[]).map(x=>`<li>${esc(x)}</li>`).join('')||'<li>尚未观察到稳定失效模式</li>'}</ul></article>`).join('')

$('#tierFilters').innerHTML = ['all','high','median','average','low','other'].map(t=>`<button class="${t==='all'?'active':''}" data-tier="${t}">${tierLabels[t]}</button>`).join('')
const postDetailLink = (post) => data.deepDives.some(d=>d.postId===post.id) ? `<button data-deep="${esc(post.id)}">看证据</button>` : ''
function renderPosts(){
  const rows = data.posts.filter(p=>filter==='all'||p.tier===filter)
  if(view==='list'){
    $('#posts').className='posts table-wrap'
    $('#posts').innerHTML=`<table><thead><tr><th>层级</th><th>视频</th><th>主题 / 形式</th><th>发布时间</th><th>时长</th><th>点赞</th><th>核心内容</th><th>机制</th><th>证据</th></tr></thead><tbody>${rows.map(p=>`<tr><td><span class="tier-tag ${p.tier}">${tierLabels[p.tier]}</span></td><td><b>${esc(p.title)}</b></td><td>${esc([...p.topicTags,...p.formatTags].join(' · '))}</td><td>${esc(dateText(p.publishedAt))}</td><td>${p.durationSec===null?'未知':`${Math.round(p.durationSec)}秒`}</td><td class="metric">${count(p.likes)}</td><td>${esc(p.coreMessage)}</td><td>${esc(p.mechanism)}</td><td>${postDetailLink(p)||esc(p.evidenceStatus)}</td></tr>`).join('')}</tbody></table>`
  } else {
    $('#posts').className='posts gallery'
    $('#posts').innerHTML=rows.map(p=>`<article class="post-card"><div class="post-cover">${p.cover?`<img src="${esc(p.cover)}" alt="${esc(p.title)}真实贴片" loading="lazy" />`:'暂无贴片'}</div><div class="post-card-body"><span class="tier-tag ${p.tier}">${tierLabels[p.tier]}</span><h3>${esc(p.title)}</h3><p>${esc(p.coreMessage)}</p><p><b>机制：</b>${esc(p.mechanism)}</p><footer><b>${count(p.likes)} 赞</b><span>${esc(dateText(p.publishedAt))}</span></footer>${postDetailLink(p)}</div></article>`).join('')
  }
  $$('[data-deep]').forEach(button=>button.addEventListener('click',()=>{selectedDeep=button.dataset.deep;renderDeepDive();location.hash='evidence'}))
}
$$('[data-view]').forEach(button=>button.addEventListener('click',()=>{view=button.dataset.view;$$('[data-view]').forEach(x=>x.classList.toggle('active',x===button));renderPosts()}))
$$('[data-tier]').forEach(button=>button.addEventListener('click',()=>{filter=button.dataset.tier;$$('[data-tier]').forEach(x=>x.classList.toggle('active',x===button));renderPosts()}))
renderPosts()

$('#deepSelect').innerHTML = data.deepDives.length ? data.deepDives.map(d=>`<option value="${esc(d.postId)}">${esc(data.posts.find(p=>p.id===d.postId)?.title??d.postId)}</option>`).join('') : '<option>暂无完成的深度还原</option>'
$('#deepSelect').addEventListener('change',e=>{selectedDeep=e.target.value;renderDeepDive()})
function renderDeepDive(){
  const d=data.deepDives.find(x=>x.postId===selectedDeep), post=data.posts.find(x=>x.id===selectedDeep)
  if(!d){$('#deepDive').innerHTML='<div class="deep-empty">当前尚无通过硬闸的深度重建。</div>';return}
  $('#deepSelect').value=d.postId
  const shift=d.viewerChange??{}
  $('#deepDive').innerHTML=`<div class="deep-summary"><article class="panel"><span class="tier-tag ${post?.tier??'other'}">${tierLabels[post?.tier??'other']}</span><h3>${esc(post?.title??d.postId)}</h3><p><b>为什么选：</b>${esc(d.selectionReason)}</p><p><b>代表机制：</b>${esc(d.representedMechanism)}</p><p><b>认知变化：</b>${esc(shift.before??'未知')} → ${esc(shift.after??shift.change??'未知')}</p><p><b>硬闸：</b>${esc(d.gateStatus)}</p>${d.reportPath?`<a href="${esc(d.reportPath)}">打开完整还原稿 ↗</a>`:''}</article><article class="panel"><header class="panel-head"><h3>内容架构与知识单元</h3></header><div class="knowledge-grid">${(d.knowledgeUnits??[]).map(u=>`<article><small>${esc(u.timecode??u.timeRange?.start??'')}</small><h4>${esc(u.title??'知识点')}</h4><p>${esc(u.statement??u.content??'')}</p></article>`).join('')||'<p>尚未导入知识单元。</p>'}</div></article></div><div class="frames">${(d.sparseFrames??[]).map(f=>`<figure><img src="${esc(f.src??f.path??'')}" alt="关键帧" loading="lazy"><figcaption>${esc(f.timecode??f.id??'')}</figcaption></figure>`).join('')}</div><div class="transcript">${(d.transcript??[]).map(c=>`<div class="cue"><time>${esc(c.timecode??c.start??'')}</time><span>${esc(c.text??'')}</span></div>`).join('')||'<div class="cue"><span>完整文字稿尚未导入。</span></div>'}</div><div class="boundary-list">${(d.unknowns??[]).map(x=>`<article>${esc(x)}</article>`).join('')}</div>`
}
renderDeepDive()

$('#publishingConclusion').textContent=data.publishing.conclusion
const renderBars=(items)=>{const max=Math.max(1,...items.map(x=>x.medianLikes??0));return items.map(x=>`<div class="bar-row"><span>${esc(x.name)}</span><div class="track"><i style="width:${Math.max(2,(x.medianLikes??0)/max*100)}%"></i></div><b>${count(x.medianLikes)}</b><small>${count(x.count)}条</small></div>`).join('')}
$('#weekdays').innerHTML=renderBars(data.publishing.weekdays);$('#dayparts').innerHTML=renderBars(data.publishing.dayparts)
$('#visualLanguage').innerHTML=data.visualLanguage.map(x=>`<article>${esc(x)}</article>`).join('')
const launch=data.launchPlan
$('#launchPlan').innerHTML=`<p class="launch-position">${esc(launch.positioning)}</p><div class="lanes">${(launch.lanes??[]).map(x=>`<article><h3>${esc(x.name??x.title??'内容线')}</h3><p>${esc(x.promise??x.description??'')}</p></article>`).join('')}</div><div class="ideas"><h3>第一批内容</h3><ol>${(launch.firstTwelve??[]).map(x=>`<li>${esc(x)}</li>`).join('')}</ol></div><div class="experiments"><h3>单变量实验</h3>${(launch.experiments??[]).map(x=>`<article><b>${esc(x.name??x.hypothesis??'实验')}</b><p>${esc(x.method??x.description??'')}</p></article>`).join('')}</div>`
$('#boundaries').innerHTML=data.boundaries.map(x=>`<article>${esc(x)}</article>`).join('')
