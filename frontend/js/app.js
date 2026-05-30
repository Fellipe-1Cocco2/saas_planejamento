let empresaAtivaId = null;
const token = localStorage.getItem('saas_token');

let dataAncoraCalendario = new Date();
let tarefaNaoFeitaId = null;
let tempTaskData = {}; 
let alertaTimeout = null;
let modalRevisaoJaExibido = false; // ✨ Variável que reseta a cada login/F5

let filtroHistoricoTipo = 'unica'; 

const METAS_DIARIAS = { CLIENTE: 180, ESTUDO: 60, COMERCIAL: 120, REUNIAO: 120, DEFAULT: 120 };

function formatarDataLocal(dateObj) {
  const yyyy = dateObj.getFullYear();
  const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
  const dd = String(dateObj.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function isTaskConcluida(t) { return t.obs && t.obs.includes('✅ [CONCLUÍDA'); }

// ✨ REGRA ATUALIZADA: Alerta de Prazo Master vs SLA Prioridade
function verificarAlertaSLA(t) {
  if (!t.dia || isTaskConcluida(t)) return false;
  if (t.obs && t.obs.includes('[SLA_OK]')) return false; 

  // 1. Prioridade Master: Se a data agendada ultrapassa a Data Limite do Patrão, alerta imediato!
  const prazoMatch = t.obs && t.obs.match(/\[PRAZO:\s*([\d-]+)\]/);
  if (prazoMatch && t.dia > prazoMatch[1]) return true;

  // 2. Prioridade Comum (SLA Original)
  const timestamp = parseInt(t._id.substring(0, 8), 16) * 1000;
  const dataCriacao = new Date(timestamp);
  const diasSLA = t.prio === 'P1' ? 2 : (t.prio === 'P2' ? 5 : 10);
  dataCriacao.setDate(dataCriacao.getDate() + diasSLA);
  return t.dia > formatarDataLocal(dataCriacao);
}

function mostrarAlertaAtraso(qtd) { 
  const alerta = document.getElementById('alerta-atraso'); 
  if (!alerta) return;
  if (qtd > 0) { 
    document.getElementById('qtd-atrasadas').innerText = qtd; 
    alerta.classList.remove('hidden'); 
    clearTimeout(alertaTimeout); 
    alertaTimeout = setTimeout(() => { alerta.classList.add('hidden'); }, 20000); 
  } else { alerta.classList.add('hidden'); } 
}
function fecharAlertaAtraso() { const alerta = document.getElementById('alerta-atraso'); if(alerta) alerta.classList.add('hidden'); }

function mostrarModalRevisaoDinamico(qtd) {
  let modal = document.getElementById('modal-revisao-dinamico');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'modal-revisao-dinamico';
    modal.className = 'modal';
    modal.style.zIndex = '2000';
    modal.innerHTML = `
      <div class="modal-content" style="border: 1px solid #d4a843; box-shadow: 0 20px 40px rgba(212, 168, 67, 0.15);">
        <button class="close-btn" onclick="document.getElementById('modal-revisao-dinamico').style.display='none'">✕</button>
        <div class="modal-title" style="color: #d4a843;"><span style="font-size:16px;">⚠️</span> Tarefas para Revisão</div>
        <p style="font-size: 13px; color: var(--tx); margin-bottom: 20px; line-height: 1.5;">
          O sistema identificou <strong id="qtd-revisao-modal" style="color:#d4a843; font-size:16px;">0</strong> tarefa(s) agendada(s) <b>após o Prazo Master</b> ou com <b>SLA de prioridade estourado</b>.
          <br><br>
          Os cards que precisam da sua atenção estarão destacados de amarelo. Por favor, ajuste o cronograma ou confirme o SLA para limpar este alerta.
        </p>
        <button class="btn full-width" style="background: #d4a843; color: #181817; font-weight: bold; border:none;" onclick="document.getElementById('modal-revisao-dinamico').style.display='none'">Ciente, vou revisar</button>
      </div>
    `;
    document.body.appendChild(modal);
  }
  
  // ✨ LÓGICA ATUALIZADA: Aparece em todo o carregamento se houver atrasos
  if (qtd === 0) {
    modalRevisaoJaExibido = false; // Reseta caso ele limpe tudo
  } else if (qtd > 0 && !modalRevisaoJaExibido) {
    document.getElementById('qtd-revisao-modal').innerText = qtd;
    modal.style.display = 'flex';
    modalRevisaoJaExibido = true; // Marca como visto apenas para as mudanças de aba não ficarem a abrir toda a hora
  }
}

function mudarTipoFiltro(tipo) {
  filtroHistoricoTipo = tipo;
  document.getElementById('btn-filtro-unica').className = tipo === 'unica' ? 'btn sm primary' : 'btn sm ghost';
  document.getElementById('btn-filtro-range').className = tipo === 'range' ? 'btn sm primary' : 'btn sm ghost';
  document.getElementById('filtro-ate').style.display = tipo === 'range' ? 'inline' : 'none';
  document.getElementById('filtro-data-2').style.display = tipo === 'range' ? 'block' : 'none';
  if (tipo === 'unica') document.getElementById('filtro-data-2').value = '';
}

function limparFiltroHistorico() {
  document.getElementById('filtro-data-1').value = '';
  document.getElementById('filtro-data-2').value = '';
  carregarTarefas();
}

window.onload = async function() {
  if (!token) { window.location.href = '/login'; return; }
  try {
    const res = await fetch('/api/auth/me', { headers: { 'Authorization': `Bearer ${token}` } });
    if (!res.ok) { fazerLogout(); return; }
    const data = await res.json(); 
    
    window.usuarioLogado = data.user;
    localStorage.setItem('saas_user', JSON.stringify(data.user));
    
    document.getElementById('user-display').innerText = `${data.user.name}`;
    
    const btnEquipe = document.querySelector('button[onclick="abrirModalEquipe()"]');
    if (btnEquipe) btnEquipe.style.display = data.user.role === 'empregado' ? 'none' : 'inline-block';
    
    const btnNovaEmpresa = document.querySelector('button[onclick="abrirModalEmpresa()"]');
    if (btnNovaEmpresa) btnNovaEmpresa.style.display = data.user.role === 'empregado' ? 'none' : 'inline-block';

    ocultarLoader(); 
    document.getElementById('conteudo-app').style.display = 'block';
    await carregarEmpresas(); 
    mudarAba('tarefas');
  } catch (err) { ocultarLoader(); if(typeof showToast === 'function') showToast('Erro ao iniciar o sistema.', 'error'); }
};

function mudarAba(abaId) {
  document.querySelectorAll('.aba-conteudo').forEach(el => el.style.display = 'none');
  document.querySelectorAll('.top-nav a').forEach(el => el.classList.remove('active'));
  document.getElementById(`aba-${abaId}`).style.display = 'block';
  const navAtivo = document.getElementById(`nav-${abaId}`); if(navAtivo) navAtivo.classList.add('active');

  const barraEmpresas = document.getElementById('barra-empresas');
  if (abaId === 'planejamento') { if(barraEmpresas) barraEmpresas.style.display = 'none'; renderizarGradeMensal(); } 
  else if (abaId === 'delegados' || abaId === 'historico') { if(barraEmpresas) barraEmpresas.style.display = 'none'; carregarTarefas(); } 
  else { if(barraEmpresas) barraEmpresas.style.display = 'flex'; carregarTarefas(); }
}

async function carregarEmpresas() {
  const res = await fetch('/api/companies', { headers: { 'Authorization': `Bearer ${token}` } });
  const empresas = await res.json(); const select = document.getElementById('select-empresa');
  if (empresas.length === 0) { select.innerHTML = '<option value="">Nenhuma empresa</option>'; document.getElementById('aviso-sem-empresa').style.display = 'block'; return; }
  select.innerHTML = '<option value="TODAS">🌍 Todas as Empresas</option>' + empresas.map(emp => `<option value="${emp._id}">${emp.name}</option>`).join('');
  empresaAtivaId = "TODAS"; document.getElementById('aviso-sem-empresa').style.display = 'none'; alterarEmpresaAtiva();
}
function alterarEmpresaAtiva() { empresaAtivaId = document.getElementById('select-empresa').value; carregarTarefas(); }

async function carregarTarefas() {
  if (!empresaAtivaId) return;
  const url = empresaAtivaId === "TODAS" ? '/api/tasks' : `/api/tasks/${empresaAtivaId}`;
  const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
  const tarefas = await res.json();

  const listaVertical = document.getElementById('lista-tarefas-vertical');
  const listaDelegadas = document.getElementById('lista-tarefas-delegadas');
  const listaHistorico = document.getElementById('lista-tarefas-historico');
  
  if(listaVertical) listaVertical.innerHTML = '';
  if(listaDelegadas) listaDelegadas.innerHTML = '';
  if(listaHistorico) listaHistorico.innerHTML = '';
  
  let contMinhas = 0; let contDelegadas = 0; let contHistorico = 0; let atrasadasCount = 0; let revisaoCount = 0;
  const hojeStr = formatarDataLocal(new Date());
  
  let arrHoje = [];
  let arrAtrasadas = [];
  let arrOutras = [];
  const delegadasAgrupadas = {};

  const fData1 = document.getElementById('filtro-data-1') ? document.getElementById('filtro-data-1').value : '';
  const fData2 = document.getElementById('filtro-data-2') ? document.getElementById('filtro-data-2').value : '';

  const usuarioLogado = window.usuarioLogado || JSON.parse(localStorage.getItem('saas_user')) || {};

  tarefas.forEach(t => {
    let prazoDate = null; 
    let obsVisual = t.obs || '';
    
    const prazoMatch = obsVisual.match(/\[PRAZO:\s*([\d-]+)\]/);
    if (prazoMatch) { prazoDate = prazoMatch[1]; obsVisual = obsVisual.replace(prazoMatch[0], '').trim(); }
    obsVisual = obsVisual.replace(/\[SLA_OK\]/g, '').trim(); 

    let macroMatchFound = false;
    let macroIdFromTag = '';
    const macroMatch = obsVisual.match(/\[MACRO:\s*([a-zA-Z0-9_]+)\]/);
    if (macroMatch) {
       macroMatchFound = true;
       macroIdFromTag = macroMatch[1];
       obsVisual = obsVisual.replace(macroMatch[0], '').trim(); 
    }

    const conclusaoMatch = obsVisual.match(/✅ \[CONCLUÍDA EM:\s*([\d/]+)\]/);
    const dataConclusao = conclusaoMatch ? conclusaoMatch[1] : '';
    if (conclusaoMatch) { obsVisual = obsVisual.replace(conclusaoMatch[0], '').trim(); }

    let nfTagHtml = ''; let motivoAtraso = '';
    const nfMatch = obsVisual.match(/🚨\s*\[NÃO FEITA:[^\]]+\]/);
    if (nfMatch) {
      motivoAtraso = 'sim'; 
      nfTagHtml = `<div style="font-size:11px; color:#f09595; margin-bottom: 4px; font-weight: 500;">🚨 Atrasada Anteriormente</div>`;
      obsVisual = obsVisual.replace(nfMatch[0], '').trim();
    }

    const classeCat = `cat-${(t.cat || 'CLIENTE').toLowerCase()}`;

    // --- IDENTIFICADOR DE POSSE ---
    const nomeCliente = t.cliente ? t.cliente.trim().toLowerCase() : '';
    const meuNome = (usuarioLogado.name || '').trim().toLowerCase();
    const meuEmail = (usuarioLogado.email || '').trim().toLowerCase();
    const prefixoEmail = meuEmail.split('@')[0].replace('.', ' ');

    const ehTarefaMinha = usuarioLogado.role === 'empregado' && nomeCliente !== '' && (
      nomeCliente === meuNome || 
      nomeCliente === meuEmail || 
      nomeCliente.includes(prefixoEmail)
    );

    const ehDelegadaPatrao = t.cliente && t.cliente !== "" && !ehTarefaMinha;

    // ✨ AGRUPAMENTO MÃE E FILHAS (Visão do Patrão)
    if (ehDelegadaPatrao) {
      const baseName = t.nome.replace(/\s\((Parte \d+|Conclusão|Restante)\)$/i, '').trim();
      const nomeEmpresa = (t.companyId && typeof t.companyId === 'object') ? t.companyId.name : 'Geral';
      const empresaIdLocal = (t.companyId && typeof t.companyId === 'object') ? t.companyId._id : (t.companyId || 'geral');
      
      const identificadorMae = (t.blocoId && t.blocoId.trim() !== '') ? t.blocoId : (macroMatchFound ? macroIdFromTag : baseName);
      const chave = `${empresaIdLocal}_${t.cliente}_${identificadorMae}`; 
      
      if (!delegadasAgrupadas[chave]) {
        delegadasAgrupadas[chave] = { 
          nome: baseName, 
          cliente: t.cliente, 
          empresa: nomeEmpresa,
          cat: t.cat, 
          prio: t.prio, 
          obs: obsVisual, 
          prazo: prazoDate, 
          totalMin: 0, 
          concluidosMin: 0, 
          partes: [],
          isFatiada: false 
        };
      }
      
      delegadasAgrupadas[chave].partes.push(t);
      delegadasAgrupadas[chave].totalMin += t.min;
      
      if (t.nome.match(/\s\((Parte \d+|Conclusão|Restante)\)$/i)) {
        delegadasAgrupadas[chave].isFatiada = true;
      }
      
      if (isTaskConcluida(t)) delegadasAgrupadas[chave].concluidosMin += t.min;
    }

    // --- HISTÓRICO ---
    if (isTaskConcluida(t)) {
      let passaFiltro = true;
      let dataConclusaoFormatada = '';
      if (fData1) {
        if (dataConclusao) {
          const [d, m, y] = dataConclusao.split('/');
          dataConclusaoFormatada = `${y}-${m}-${d}`;
          if (filtroHistoricoTipo === 'unica') { if (dataConclusaoFormatada !== fData1) passaFiltro = false; } 
          else { if (dataConclusaoFormatada < fData1) passaFiltro = false; if (fData2 && dataConclusaoFormatada > fData2) passaFiltro = false; }
        } else { passaFiltro = false; }
      } else if (dataConclusao) {
        const [d, m, y] = dataConclusao.split('/');
        dataConclusaoFormatada = `${y}-${m}-${d}`;
      }

      if (passaFiltro) {
        contHistorico++;
        if (listaHistorico) {
          const donoTask = t.cliente ? `👤 Feito por: ${t.cliente}` : '👤 Feito por mim';
          
          const atrasouPeloPrazo = prazoDate && dataConclusaoFormatada && dataConclusaoFormatada > prazoDate;
          let tagStatusHistorico = '';
          
          if (motivoAtraso || atrasouPeloPrazo) {
             tagStatusHistorico = `<div style="font-size:11px; color:#d4a843; margin-bottom: 4px; font-weight: bold;">✨ ✓ Feito em atraso</div>`;
          } else {
             tagStatusHistorico = `<div style="font-size:11px; color:#6daa40; margin-bottom: 4px; font-weight: bold;">✨ ✓ Feito no prazo</div>`;
          }

          const cardHist = document.createElement('div'); cardHist.className = 'task-list-item done';
          cardHist.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:flex-start;">
              <strong style="color:var(--tx); font-size:14px; text-decoration: line-through; opacity: 0.6;">${t.nome}</strong>
              <div style="display:flex; gap:8px; align-items:center;">
                <button class="btn xs" style="background:var(--s2); color:var(--tx);" onclick="reabrirTarefa('${t._id}')">🔄 Reabrir</button>
                <div style="color:var(--tm); font-size:12px; cursor:pointer;" onclick="deletarTarefa('${t._id}')">❌</div>
              </div>
            </div>
            ${tagStatusHistorico}
            <div style="font-size:12px; color:var(--tm);">${obsVisual ? obsVisual + ' | ' : ''}${donoTask} · ${t.cat} · ${t.min} min ${dataConclusao ? `· 🗓️ ${dataConclusao}` : ''}</div>`;
          listaHistorico.appendChild(cardHist);
        }
      }
      return; 
    }

    const isRelevante = (usuarioLogado.role === 'patrao') || (usuarioLogado.role === 'empregado' && ehTarefaMinha);
    if (isRelevante) {
      if (t.dia && t.dia < hojeStr) atrasadasCount++;
      if (verificarAlertaSLA(t)) revisaoCount++;
    }

    if (ehDelegadaPatrao) return; 
    if (usuarioLogado.role === 'empregado' && !ehTarefaMinha) return;

    contMinhas++;
    const nomeEmpresaRender = t.companyId ? (t.companyId.name || t.companyId) : 'Sem Empresa';
    
    let statusTexto = 'Aguardando'; let statusCor = '#aaa';
    if (t.dia) {
      if (t.dia < hojeStr) { 
        statusTexto = '⏳ Atrasado'; statusCor = '#f09595'; 
      } else if (t.dia === hojeStr) { 
        statusTexto = '⚡ Em Andamento'; statusCor = '#5ba3e8'; 
      } else if (prazoDate && t.dia > prazoDate) {
        statusTexto = '⚠️ Agendada pós-prazo'; statusCor = '#d4a843'; 
      } else { 
        statusTexto = '📅 Agendado'; statusCor = '#d4a843'; 
      }
    }

    const dAgendada = t.dia ? t.dia.split('-').reverse().slice(0,2).join('/') : 'Backlog';
    const btnNFHtml = (t.dia && t.dia <= hojeStr) ? `<button class="btn xs danger" onclick="abrirModalNaoFeito('${t._id}')">N/F</button>` : '';

    const tagPrazoHtml = prazoDate ? `<span class="tag" style="background:rgba(240, 149, 149, 0.1); color:#f09595; border:1px solid rgba(240, 149, 149, 0.3);">⏰ Limite: ${prazoDate.split('-').reverse().slice(0,2).join('/')}</span>` : '';

    const cardHTMLStr = `
      <div class="task-list-item ${classeCat}">
        <div style="display:flex; justify-content:space-between; align-items:flex-start;">
          <strong style="color:var(--tx); font-size:14px;">${t.nome}</strong>
          <div style="display:flex; gap:8px; align-items:center;">
            <button class="btn xs" style="background:#1b381b; color:#6daa40; border-color:#2c542c;" onclick="marcarComoConcluido('${t._id}')">✓ Concluir</button>
            ${btnNFHtml}
            <div style="color:var(--tm); font-size:12px; cursor:pointer;" onclick="deletarTarefa('${t._id}')">❌</div>
          </div>
        </div>
        ${nfTagHtml}
        <div style="font-size:12px; color:var(--tm); margin-bottom: 4px;">${obsVisual || (empresaAtivaId === 'TODAS' ? `🏢 ${nomeEmpresaRender}` : 'Sem observação')}</div>
        <div class="task-tags">
          <span class="tag cat">${t.cat}</span><span class="tag prio">${t.prio}</span><span class="tag time">${t.min} min</span>
          ${tagPrazoHtml}
          <span class="tag" style="background:${t.dia ? 'rgba(47,158,107,0.1)' : 'rgba(255,255,255,0.05)'}; color:${t.dia ? '#2f9e6b' : '#aaa'};">🎯 ${dAgendada}</span>
          <span class="tag" style="background:rgba(255,255,255,0.02); color:${statusCor}; border:1px solid ${statusCor}44;">${statusTexto}</span>
        </div>
      </div>`;

    if (t.dia === hojeStr) { arrHoje.push(cardHTMLStr); } 
    else if (t.dia && t.dia < hojeStr) { arrAtrasadas.push(cardHTMLStr); } 
    else { arrOutras.push(cardHTMLStr); }
  });

  if (listaVertical) {
    if (arrHoje.length > 0) { listaVertical.innerHTML += `<div class="flabel" style="margin-bottom:8px; color:#5ba3e8; font-size: 13px;">⚡ Foco de Hoje</div>`; listaVertical.innerHTML += arrHoje.join(''); }
    if (arrAtrasadas.length > 0) { listaVertical.innerHTML += `<div class="flabel" style="margin: 20px 0 8px; color:#f09595; font-size: 13px;">🚨 Em Atraso (Revisar)</div>`; listaVertical.innerHTML += arrAtrasadas.join(''); }
    if (arrOutras.length > 0) { listaVertical.innerHTML += `<div class="flabel" style="margin: 20px 0 8px; color:var(--tm); font-size: 13px;">📅 Próximas & Backlog</div>`; listaVertical.innerHTML += arrOutras.join(''); }
    if (arrHoje.length === 0 && arrAtrasadas.length === 0 && arrOutras.length === 0) { listaVertical.innerHTML = '<div class="empty-state" style="padding:2rem;">Nenhuma tarefa ativa no momento.</div>'; }
  }

  Object.keys(delegadasAgrupadas).forEach(chave => {
    contDelegadas++; const macro = delegadasAgrupadas[chave];
    const classeCat = `cat-${(macro.cat || 'CLIENTE').toLowerCase()}`;
    const porcentagem = Math.round((macro.concluidosMin / macro.totalMin) * 100) || 0;
    
    let macroTerminouAtrasada = false;
    if (macro.prazo && porcentagem === 100) {
      macro.partes.forEach(p => {
        const cMatch = p.obs && p.obs.match(/✅ \[CONCLUÍDA EM:\s*([\d/]+)\]/);
        if (cMatch) {
          const [d, m, y] = cMatch[1].split('/');
          if (`${y}-${m}-${d}` > macro.prazo) macroTerminouAtrasada = true;
        }
      });
    }

    let statusTexto = '🔄 Em andamento'; let statusCor = '#5ba3e8';
    if (porcentagem === 100) { 
      if (macroTerminouAtrasada) { statusTexto = '✓ Concluída em atraso'; statusCor = '#d4a843'; }
      else { statusTexto = '✓ Concluída'; statusCor = '#6daa40'; }
    } else if (macro.prazo && hojeStr > macro.prazo) { 
      statusTexto = '⚠️ Prazo Estourado'; statusCor = '#f09595'; 
    } 

    if (listaDelegadas) {
      const tagPrazo = macro.prazo ? `<span class="tag" style="background:rgba(240, 149, 149, 0.1); color:#f09595;">⏰ Limite: ${macro.prazo.split('-').reverse().slice(0,2).join('/')}</span>` : '';
      listaDelegadas.innerHTML += `
        <div class="task-list-item ${classeCat}" style="cursor:pointer;" onclick='abrirMacroView(${JSON.stringify(macro).replace(/'/g, "&apos;")})'>
          <div style="display:flex; justify-content:space-between; align-items:flex-start;">
            <div style="display:flex; flex-direction:column; gap:2px;">
              <strong style="color:var(--tx); font-size:14px;">${macro.nome}</strong>
              <span style="font-size:11px; color:var(--tm); font-weight:500;">🏢 Empresa: ${macro.empresa}</span>
            </div>
            <div style="color:var(--tm); font-size:12px;">Ver Detalhes ➔</div>
          </div>
          <div style="font-size:12px; color:var(--tm); margin-bottom: 4px; margin-top: 8px;"><span style="color:#e8e7e2; font-weight:500;">👤 Delegado para: ${macro.cliente}</span></div>
          <div class="task-tags"><span class="tag cat">${macro.cat}</span><span class="tag prio">${macro.prio}</span><span class="tag time">Total: ${macro.totalMin} min</span>${tagPrazo}<span class="tag" style="background:rgba(255,255,255,0.02); color:${statusCor}; border:1px solid ${statusCor}44;">${statusTexto} (${porcentagem}%)</span></div>
        </div>`;
    }
  });

  const contM = document.getElementById('contador-tarefas'); if(contM) contM.innerText = `${contMinhas} tarefa(s) ativas`;
  const contD = document.getElementById('contador-delegadas'); if(contD) contD.innerText = `${contDelegadas} macro-tarefa(s)`;
  const contH = document.getElementById('contador-historico'); if(contH) contH.innerText = `${contHistorico} tarefa(s) na listagem`;
  mostrarAlertaAtraso(atrasadasCount);
  mostrarModalRevisaoDinamico(revisaoCount);
}

function navegarMes(direcao) { dataAncoraCalendario.setMonth(dataAncoraCalendario.getMonth() + direcao); renderizarGradeMensal(); }

async function renderizarGradeMensal() {
  const container = document.getElementById('calendar-month-grid'); if(!container) return; container.innerHTML = '';
  const res = await fetch(`/api/tasks`, { headers: { 'Authorization': `Bearer ${token}` } }); 
  const tarefas = await res.json();
  const ano = dataAncoraCalendario.getFullYear(); const mes = dataAncoraCalendario.getMonth();
  const nomesMeses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  document.getElementById('nome-mes-atual').innerText = `${nomesMeses[mes]} de ${ano}`;

  const primeiroDiaDoMes = new Date(ano, mes, 1);
  const totalDiasGrade = Math.ceil((new Date(ano, mes + 1, 0).getDate() + primeiroDiaDoMes.getDay()) / 7) * 7;
  const hojeStr = formatarDataLocal(new Date());
  const usuarioLogado = window.usuarioLogado || JSON.parse(localStorage.getItem('saas_user')) || {};

  for (let i = 0; i < totalDiasGrade; i++) {
    const dataCalculada = new Date(ano, mes, 1 - primeiroDiaDoMes.getDay() + i);
    const dataIso = formatarDataLocal(dataCalculada); 
    const isMesCorrente = dataCalculada.getMonth() === mes;

    let classesCelula = 'calendar-day-cell';
    if (!isMesCorrente) classesCelula += ' other-month';
    if (dataIso === hojeStr) classesCelula += ' today';

    const celula = document.createElement('div'); celula.className = classesCelula;
    celula.innerHTML = `<div class="cell-date-num">${dataCalculada.getDate()}</div>`;

    if (isMesCorrente) {
      celula.onclick = (e) => {
        if (e.target !== celula && !e.target.classList.contains('cell-date-num')) return; 
        const tDia = tarefas.filter(t => {
          const eAtiva = t.dia === dataIso && !isTaskConcluida(t);
          if (usuarioLogado.role === 'empregado') {
            const nomeCliente = t.cliente ? t.cliente.trim().toLowerCase() : '';
            const meuNome = (usuarioLogado.name || '').trim().toLowerCase();
            const prefixoEmail = (usuarioLogado.email || '').trim().toLowerCase().split('@')[0].replace('.', ' ');
            const ehTarefaMinha = nomeCliente !== '' && (nomeCliente === meuNome || nomeCliente.includes(prefixoEmail));
            return eAtiva && ehTarefaMinha;
          }
          return eAtiva && (!t.cliente || t.cliente === "");
        });
        abrirModalDia(dataIso, tDia);
      }
      celula.addEventListener('dragover', e => { e.preventDefault(); celula.style.background = 'var(--s3)'; });
      celula.addEventListener('dragleave', () => celula.style.background = 'var(--surface)');
      celula.addEventListener('drop', async e => {
        e.preventDefault(); celula.style.background = 'var(--surface)';
        const taskId = e.dataTransfer.getData('text/plain');
        if(taskId) {
          const resB = await fetch(`/api/tasks`, { headers: { 'Authorization': `Bearer ${token}` } });
          const todas = await resB.json(); const tA = todas.find(t => t._id === taskId);
          if (tA) {
            if (tA.dia && tA.dia <= hojeStr) return showToast('Bloqueado! Use o botão N/F para reagendar.', 'error');
            if (dataIso < hojeStr) return showToast('Inválido! Datas passadas bloqueadas.', 'warning');
          }
          mostrarLoader('Movendo tarefa...');
          await fetch(`/api/tasks/${taskId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ dia: dataIso }) });
          await distribuirTarefasInfinitas(); 
        }
      });
      celula.draggable = false;
    }

    tarefas.filter(t => {
      const condicaoData = t.dia === dataIso && !isTaskConcluida(t);
      if (usuarioLogado.role === 'empregado') {
        const nomeCliente = t.cliente ? t.cliente.trim().toLowerCase() : '';
        const meuNome = (usuarioLogado.name || '').trim().toLowerCase();
        const prefixoEmail = (usuarioLogado.email || '').trim().toLowerCase().split('@')[0].replace('.', ' ');
        const ehTarefaMinha = nomeCliente !== '' && (nomeCliente === meuNome || nomeCliente.includes(prefixoEmail));
        return condicaoData && ehTarefaMinha;
      }
      return condicaoData && (!t.cliente || t.cliente === "");
    }).forEach(t => {
      const classeCat = `cat-${(t.cat || 'CLIENTE').toLowerCase()}`;
      const temAlerta = verificarAlertaSLA(t);
      const estiloAlerta = temAlerta ? 'background: rgba(212, 168, 67, 0.15) !important; border-color: #d4a843 !important;' : '';
      const iconeAlerta = temAlerta ? '⚠️ ' : '';
      celula.innerHTML += `<div class="micro-task-pill ${classeCat}" style="${estiloAlerta}" draggable="true" ondragstart="event.dataTransfer.setData('text/plain', '${t._id}'); event.stopPropagation();" title="${t.nome} (${t.min} min)">${iconeAlerta}${t.nome}</div>`;
    });
    container.appendChild(celula);
  }
}

function abrirModalDia(dataIso, tarefas) {
  const partes = dataIso.split('-'); const dataFormatada = `${partes[2]}/${partes[1]}`;
  const hojeStr = formatarDataLocal(new Date());

  const btnCriarHtml = dataIso >= hojeStr 
    ? `<button class="btn sm" style="background:#1b381b; color:#6daa40; border-color:#2c542c;" onclick="abrirModalTarefaComData('${dataIso}'); fecharModalDia();">+ Nova Tarefa Aqui</button>`
    : `<span style="font-size:11px; color:#f09595;">Data Passada</span>`;

  document.getElementById('modal-dia-titulo').innerHTML = `<div style="display:flex; justify-content:space-between; align-items:center;"><span>Agenda para ${dataFormatada}</span>${btnCriarHtml}</div>`;
  const lista = document.getElementById('modal-dia-tarefas-lista'); lista.innerHTML = '';

  if (tarefas.length === 0) { lista.innerHTML = '<div style="color:var(--tm); font-size:13px; text-align:center; padding:10px;">Livre.</div>'; } 
  else {
    tarefas.forEach(t => {
      const isAtrasadaOuHoje = t.dia && t.dia <= hojeStr;
      const btnNFHtml = isAtrasadaOuHoje ? `<button class="btn xs danger" onclick="abrirModalNaoFeito('${t._id}')">N/F</button>` : '';
      const btnConcluirHtml = `<button class="btn xs" style="background:#1b381b; color:#6daa40; border-color:#2c542c;" onclick="marcarComoConcluido('${t._id}'); fecharModalDia();">✓ Concluir</button>`;

      const temAlerta = verificarAlertaSLA(t);
      const alertaSLAHtml = temAlerta ? `
        <div style="background: rgba(212, 168, 67, 0.1); border: 1px solid #d4a843; color: #d4a843; padding: 6px; border-radius: 4px; font-size: 11px; margin-top: 8px; display: flex; justify-content: space-between; align-items: center;">
          <span>⚠️ Agendamento ultrapassa o Prazo ou SLA ideal.</span>
          <button class="btn xs" style="border-color: #d4a843; color: #d4a843;" onclick="confirmarPrazo('${t._id}')">Confirmar</button>
        </div>` : '';

      lista.innerHTML += `
        <div style="background:var(--bg); border:1px solid var(--b); padding:10px; border-radius:var(--r);">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:4px;">
            <div style="font-size:14px; color:var(--tx); font-weight:500;">${t.nome}</div>
            <div style="display:flex; gap:8px;">${btnConcluirHtml}${btnNFHtml}</div>
          </div>
          <div style="font-size:11px; color:var(--tm);">${t.cat} · ${t.min} min</div>
          ${alertaSLAHtml}
        </div>`;
    });
  }
  document.getElementById('modal-dia-expandido').style.display = 'flex';
}
function fecharModalDia() { document.getElementById('modal-dia-expandido').style.display = 'none'; }

async function distribuirTarefasInfinitas() {
  mostrarLoader('Organizando agenda...');
  const res = await fetch(`/api/tasks`, { headers: { 'Authorization': `Bearer ${token}` } }); 
  const tarefas = await res.json();
  const usoPorDia = {}; const usoFuncionarios = {}; const backlog = [];

  tarefas.forEach(t => {
    if (isTaskConcluida(t)) return; 
    if (t.dia && t.dia !== '') {
      const cat = t.cat || 'DEFAULT';
      if (t.cliente && t.cliente !== "") {
        if (!usoFuncionarios[t.cliente]) usoFuncionarios[t.cliente] = {};
        if (!usoFuncionarios[t.cliente][t.dia]) usoFuncionarios[t.cliente][t.dia] = { CLIENTE: 0, ESTUDO: 0, COMERCIAL: 0, REUNIAO: 0, DEFAULT: 0 };
        usoFuncionarios[t.cliente][t.dia][cat] = (usoFuncionarios[t.cliente][t.dia][cat] || 0) + t.min;
      } else {
        if (!usoPorDia[t.dia]) usoPorDia[t.dia] = { CLIENTE: 0, ESTUDO: 0, COMERCIAL: 0, REUNIAO: 0, DEFAULT: 0 };
        usoPorDia[t.dia][cat] = (usoPorDia[t.dia][cat] || 0) + t.min;
      }
    } else { backlog.push(t); }
  });

  if (backlog.length === 0) {
    await carregarTarefas(); if(document.getElementById('aba-planejamento').style.display === 'block') renderizarGradeMensal();
    ocultarLoader();
    showToast('A agenda já está limpa e organizada!', 'info');
    return;
  }

  backlog.sort((a, b) => (a.prio || 'P2').localeCompare(b.prio || 'P2') || (b.min || 0) - (a.min || 0));
  let dataAlvo = new Date(); dataAlvo.setDate(dataAlvo.getDate() + 1); 

  for (const tarefa of backlog) {
    let tempoRestante = tarefa.min; const cat = tarefa.cat || 'DEFAULT';
    
    const limiteDia = METAS_DIARIAS[cat] || METAS_DIARIAS.DEFAULT;
    const pedacos = [];

    while (tempoRestante > 0) {
      const diaSemana = dataAlvo.getDay(); const dataIso = formatarDataLocal(dataAlvo);
      if (diaSemana !== 0 && diaSemana !== 6) {
        let usadoHoje = 0;
        if (tarefa.cliente && tarefa.cliente !== "") {
           if (!usoFuncionarios[tarefa.cliente]) usoFuncionarios[tarefa.cliente] = {};
           if (!usoFuncionarios[tarefa.cliente][dataIso]) usoFuncionarios[tarefa.cliente][dataIso] = { CLIENTE: 0, ESTUDO: 0, COMERCIAL: 0, REUNIAO: 0, DEFAULT: 0 };
           usadoHoje = usoFuncionarios[tarefa.cliente][dataIso][cat] || 0;
        } else {
           if (!usoPorDia[dataIso]) usoPorDia[dataIso] = { CLIENTE: 0, ESTUDO: 0, COMERCIAL: 0, REUNIAO: 0, DEFAULT: 0 };
           usadoHoje = usoPorDia[dataIso][cat] || 0;
        }
        
        const livreHoje = limiteDia - usadoHoje;
        if (livreHoje > 0) {
          const tempoAlocado = Math.min(livreHoje, tempoRestante); 
          pedacos.push({ dia: dataIso, min: tempoAlocado });
          
          if (tarefa.cliente && tarefa.cliente !== "") usoFuncionarios[tarefa.cliente][dataIso][cat] += tempoAlocado;
          else usoPorDia[dataIso][cat] += tempoAlocado;
          
          tempoRestante -= tempoAlocado;
        }
      }
      dataAlvo.setDate(dataAlvo.getDate() + 1);
    }
    dataAlvo = new Date(); dataAlvo.setDate(dataAlvo.getDate() + 1);

    const macroIdMae = (tarefa.blocoId && tarefa.blocoId.trim() !== '') ? tarefa.blocoId : tarefa._id;

    if (pedacos.length === 1 && tempoRestante === 0) {
      const nomeLimpo = tarefa.nome.replace(/\s\((Parte \d+|Conclusão|Restante)\)$/i, '').trim();
      await fetch(`/api/tasks/${tarefa._id}`, { 
        method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, 
        body: JSON.stringify({ dia: pedacos[0].dia, nome: nomeLimpo, blocoId: macroIdMae }) 
      });
    } else if (pedacos.length > 1) {
      const nomeLimpo = tarefa.nome.replace(/\s\((Parte \d+|Conclusão|Restante)\)$/i, '').trim();

      for (let j = 0; j < pedacos.length; j++) {
        const sufixo = (j === pedacos.length - 1) ? ' (Conclusão)' : ` (Parte ${j + 1})`;
        if (j === 0) { 
          await fetch(`/api/tasks/${tarefa._id}`, { 
            method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, 
            body: JSON.stringify({ dia: pedacos[j].dia, min: pedacos[j].min, nome: nomeLimpo + sufixo, blocoId: macroIdMae }) 
          }); 
        } else {
          const resC = await fetch('/api/tasks', { 
            method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, 
            body: JSON.stringify({ 
              companyId: tarefa.companyId._id || tarefa.companyId, 
              nome: nomeLimpo + sufixo, 
              cat: tarefa.cat, 
              cliente: tarefa.cliente, 
              prio: tarefa.prio, 
              obs: tarefa.obs, 
              min: pedacos[j].min, 
              blocoId: macroIdMae 
            }) 
          });
          const novaT = await resC.json();
          await fetch(`/api/tasks/${novaT._id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ dia: pedacos[j].dia }) });
        }
      }
    }
  }
  await carregarTarefas(); if(document.getElementById('aba-planejamento').style.display === 'block') renderizarGradeMensal();
  ocultarLoader(); showToast('Agenda sincronizada e fatiada com sucesso!', 'success');
}

async function confirmarPrazo(id) {
  mostrarLoader('Confirmando...');
  const resBusca = await fetch(`/api/tasks`, { headers: { 'Authorization': `Bearer ${token}` } });
  const todas = await resBusca.json(); const tarefa = todas.find(t => t._id === id);
  if (tarefa) {
    let novaObs = `${tarefa.obs || ''} [SLA_OK]`.trim();
    await fetch(`/api/tasks/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ obs: novaObs }) });
    fecharModalDia(); await distribuirTarefasInfinitas();
  } else { ocultarLoader(); }
}

async function marcarComoConcluido(id) {
  mostrarLoader('Finalizando tarefa...'); const hojeStr = formatarDataLocal(new Date());
  const resBusca = await fetch(`/api/tasks`, { headers: { 'Authorization': `Bearer ${token}` } });
  const todas = await resBusca.json(); const tarefa = todas.find(t => t._id === id);
  if (tarefa && isTaskConcluida(tarefa)) { ocultarLoader(); return; } 

  let novaObs = tarefa ? (tarefa.obs || '') : '';
  novaObs = `✅ [CONCLUÍDA EM: ${hojeStr.split('-').reverse().join('/')}]\n${novaObs}`.trim();
  await fetch(`/api/tasks/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ obs: novaObs }) });
  await distribuirTarefasInfinitas();
}

async function reabrirTarefa(id) {
  mostrarLoader('Reabrindo pro backlog...');
  const resBusca = await fetch(`/api/tasks`, { headers: { 'Authorization': `Bearer ${token}` } });
  const todas = await resBusca.json(); const tarefa = todas.find(t => t._id === id);
  let novaObs = tarefa ? (tarefa.obs || '') : ''; novaObs = novaObs.replace(/✅ \[CONCLUÍDA EM: [\d/]+\]\n?/g, '').trim();
  await fetch(`/api/tasks/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ dia: '', obs: novaObs }) });
  await distribuirTarefasInfinitas();
}

async function deletarTarefa(id) {
  if(!confirm('Excluir permanentemente?')) return;
  await fetch(`/api/tasks/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
  carregarTarefas(); if(document.getElementById('aba-planejamento').style.display === 'block') renderizarGradeMensal();
}

function abrirModalNaoFeito(id) {
  tarefaNaoFeitaId = id; const am = new Date(); am.setDate(am.getDate() + 1);
  document.getElementById('nf-data').value = formatarDataLocal(am);
  document.getElementById('modal-nao-feito').style.display = 'flex'; fecharModalDia();
}
function fecharModalNaoFeito() { document.getElementById('modal-nao-feito').style.display = 'none'; tarefaNaoFeitaId = null; }

async function salvarNaoFeito() {
  const porc = document.getElementById('nf-porcentagem').value || '0'; const motivo = document.getElementById('nf-motivo').value; const novaData = document.getElementById('nf-data').value;
  if (!novaData) return showToast('Selecione uma data!', 'warning');
  mostrarLoader('Reagendando...');
  try {
    const resBusca = await fetch(`/api/tasks`, { headers: { 'Authorization': `Bearer ${token}` } });
    const todas = await resBusca.json(); const tarefa = todas.find(t => t._id === tarefaNaoFeitaId);
    if (tarefa) {
      const obsAntiga = tarefa.obs ? `\n\nContexto:\n${tarefa.obs}` : '';
      const novaObs = `🚨 [NÃO FEITA: ${porc}% | Motivo: ${motivo}]${obsAntiga}`;
      await fetch(`/api/tasks/${tarefa._id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ dia: novaData, obs: novaObs }) });
    }
    fecharModalNaoFeito(); await distribuirTarefasInfinitas();
  } catch (err) { ocultarLoader(); showToast('Erro no registro.', 'error'); }
}

function validarCriacaoTarefa() {
  tempTaskData = {
    companyId: document.getElementById('f-empresa-modal').value, nome: document.getElementById('f-nome').value.trim(), 
    cat: document.getElementById('f-cat').value, cliente: document.getElementById('f-delegar').value, 
    min: parseInt(document.getElementById('f-tempo').value), prio: document.getElementById('f-prio').value, 
    obs: document.getElementById('f-obs').value.trim(), dia: document.getElementById('modal-tarefa').dataset.dia || ''
  };
  if (!tempTaskData.nome || !tempTaskData.min || !tempTaskData.companyId) return showToast('Preencha os campos obrigatórios!', 'warning');
  if (tempTaskData.cliente && tempTaskData.cliente !== "") {
    document.getElementById('modal-tarefa').style.display = 'none'; document.getElementById('modal-prazo-delegada').style.display = 'flex';
  } else { finalizarCriacaoTarefa(); }
}
function voltarParaTarefa() { document.getElementById('modal-prazo-delegada').style.display = 'none'; document.getElementById('modal-tarefa').style.display = 'flex'; }
async function finalizarCriacaoTarefa() {
  const prazoSelecionado = document.getElementById('f-prazo-delegada').value;
  if (tempTaskData.cliente && tempTaskData.cliente !== "" && prazoSelecionado) { tempTaskData.obs = `[PRAZO: ${prazoSelecionado}]\n${tempTaskData.obs}`; }
  document.getElementById('modal-prazo-delegada').style.display = 'none'; document.getElementById('modal-tarefa').style.display = 'none';
  mostrarLoader('Processando...');
  const res = await fetch('/api/tasks', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(tempTaskData) });
  if (res.ok) { limparFormulario(); await distribuirTarefasInfinitas(); } else { ocultarLoader(); showToast('Erro ao criar tarefa.', 'error'); }
}

async function criarEmpresa() {
  const name = document.getElementById('novo-nome-empresa').value.trim(); if (!name) return showToast('Digite o nome da empresa!', 'warning');
  const res = await fetch('/api/companies', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ name }) });
  if (res.ok) { document.getElementById('novo-nome-empresa').value = ''; fecharModalEmpresa(); await carregarEmpresas(); }
}

function abrirMacroView(macro) {
  const badgeFatiada = macro.isFatiada ? `<span style="font-size:10px; background:rgba(156,39,176,0.2); color:#e040fb; border:1px solid #9c27b0; padding:3px 8px; border-radius:12px; margin-left:12px; vertical-align:middle; font-family:'DM Sans',sans-serif;">✂️ Fatiada pelo Robô</span>` : '';
  
  document.getElementById('macro-titulo').innerHTML = `🏢 ${macro.empresa} <br> <span style="color:var(--tx); font-size:14px; margin-top:6px; display:inline-block;">${macro.nome} (${macro.cliente})</span> ${badgeFatiada}`;
  document.getElementById('macro-total').innerText = `${(macro.totalMin / 60).toFixed(1)}h`;
  const porcentagem = Math.round((macro.concluidosMin / macro.totalMin) * 100) || 0;
  document.getElementById('macro-progresso').innerText = `${porcentagem}%`;
  
  const hojeStr = formatarDataLocal(new Date()); 
  const statusEl = document.getElementById('macro-status');
  
  let macroTerminouAtrasada = false;
  if (macro.prazo && porcentagem === 100) {
    macro.partes.forEach(p => {
      const cMatch = p.obs && p.obs.match(/✅ \[CONCLUÍDA EM:\s*([\d/]+)\]/);
      if (cMatch) {
        const [d, m, y] = cMatch[1].split('/');
        if (`${y}-${m}-${d}` > macro.prazo) macroTerminouAtrasada = true;
      }
    });
  }

  if (porcentagem === 100) { 
    if (macroTerminouAtrasada) {
      statusEl.innerText = 'Concluída em atraso'; 
      statusEl.style.color = '#d4a843'; 
    } else {
      statusEl.innerText = 'Concluída'; 
      statusEl.style.color = '#6daa40'; 
    }
  } else if (macro.prazo && hojeStr > macro.prazo) { 
    statusEl.innerText = 'Em atraso (Prazo estourado)'; 
    statusEl.style.color = '#f09595'; 
  } else { 
    statusEl.innerText = 'Em andamento'; 
    statusEl.style.color = '#5ba3e8'; 
  }

  const lista = document.getElementById('macro-lista-partes'); 
  lista.innerHTML = '';
  
  macro.partes.sort((a, b) => (a.dia || '').localeCompare(b.dia || '')).forEach(p => {
    const dAgendada = p.dia ? p.dia.split('-').reverse().slice(0,2).join('/') : 'Backlog';
    
    let dataConclusaoFormatada = '';
    const conclusaoMatch = p.obs && p.obs.match(/✅ \[CONCLUÍDA EM:\s*([\d/]+)\]/);
    if (conclusaoMatch) {
      const [d, m, y] = conclusaoMatch[1].split('/');
      dataConclusaoFormatada = `${y}-${m}-${d}`;
    }

    const isFeito = isTaskConcluida(p);
    const teveAtrasoCronograma = p.obs && p.obs.includes('[NÃO FEITA:');
    
    const atrasadoCronograma = !isFeito && p.dia && p.dia < hojeStr;
    
    let atrasadoLimite = false;
    if (macro.prazo) {
      if (isFeito && dataConclusaoFormatada && dataConclusaoFormatada > macro.prazo) {
        atrasadoLimite = true;
      } else if (!isFeito && (hojeStr > macro.prazo || (p.dia && p.dia > macro.prazo))) {
        atrasadoLimite = true;
      }
    }

    let finalizadoStr = '';
    
    if (isFeito) {
      if (teveAtrasoCronograma || atrasadoLimite) {
        finalizadoStr = '<span style="color:#d4a843; font-weight:bold;">✓ Feito em atraso</span>';
      } else {
        finalizadoStr = '<span style="color:#6daa40; font-weight:bold;">✓ Feito</span>';
      }
    } else {
      if (atrasadoCronograma || atrasadoLimite) {
        finalizadoStr = '<span style="color:#f09595; font-weight:bold;">Em atraso</span>';
      } else {
        finalizadoStr = '<span style="color:#aaa;">Pendente</span>';
      }
    }

    lista.innerHTML += `<div style="background:var(--surface); border:1px solid var(--bm); padding:10px; border-radius:var(--r); display:flex; justify-content:space-between; align-items:center;"><div><div style="font-size:13px; color:var(--tx);">${p.nome}</div><div style="font-size:11px; color:var(--tm);">📅 ${dAgendada} · ⏳ ${p.min} min</div></div><div style="font-size:12px;">${finalizadoStr}</div></div>`;
  });
  
  document.getElementById('modal-macro').style.display = 'flex';
}

function fecharModalMacro() { document.getElementById('modal-macro').style.display = 'none'; }
function abrirModalTarefaSemData() { document.getElementById('modal-tarefa').dataset.dia = ''; document.getElementById('tag-dia-selecionado').innerText = 'No Backlog'; document.getElementById('tag-dia-selecionado').style.cssText = 'background:rgba(255,255,255,0.05); color:var(--tm);'; abrirModalTarefa(); }
function abrirModalTarefaComData(dataIso) { document.getElementById('modal-tarefa').dataset.dia = dataIso; const p = dataIso.split('-'); document.getElementById('tag-dia-selecionado').innerText = `🎯 Começa: ${p[2]}/${p[1]}`; document.getElementById('tag-dia-selecionado').style.cssText = 'background:rgba(47,158,107,0.15); color:#2f9e6b; font-weight:bold;'; abrirModalTarefa(); }
function limparFormulario() { document.getElementById('f-nome').value = ''; document.getElementById('f-tempo').value = ''; document.getElementById('f-obs').value = ''; document.getElementById('f-prazo-delegada').value = ''; }
function abrirModalEmpresa() { document.getElementById('modal-empresa').style.display = 'flex'; }
function fecharModalEmpresa() { document.getElementById('modal-empresa').style.display = 'none'; }

async function abrirModalTarefa() { 
  const sm = document.getElementById('f-empresa-modal'); 
  const sM = document.getElementById('select-empresa'); 
  if (sm && sM) { 
    sm.innerHTML = sM.innerHTML; 
    const oT = sm.querySelector('option[value="TODAS"]'); 
    if (oT) oT.remove(); 
  } 
  await atualizarSelectDelegacao(); 
  document.getElementById('modal-tarefa').style.display = 'flex'; 
}

function mostrarLoader(msg) { const l = document.getElementById('loader'); l.innerHTML = `<div class="spinner" style="font-size:24px;">⏳</div><div>${msg}</div>`; l.style.display = 'flex'; }
function ocultarLoader() { document.getElementById('loader').style.display = 'none'; }
function fazerLogout() { localStorage.clear(); sessionStorage.clear(); window.location.href = '/login'; }

// =========================================
// MÓDULO DE EQUIPE E CONVITES (REAL API)
// =========================================
function abrirModalEquipe() {
  document.getElementById('modal-equipe').style.display = 'flex';
  carregarEquipe();
}

function fecharModalEquipe() { 
  document.getElementById('modal-equipe').style.display = 'none'; 
}

async function carregarEquipe() {
  const lista = document.getElementById('lista-membros-equipe');
  lista.innerHTML = '<div style="color:var(--tm); font-size:12px; text-align:center;">Carregando equipe...</div>';
  
  try {
    const res = await fetch(`/api/team`, { headers: { 'Authorization': `Bearer ${token}` } });
    if (!res.ok) throw new Error();
    const equipe = await res.json();
    
    lista.innerHTML = '';
    if (equipe.length === 0) {
      lista.innerHTML = '<div style="color:var(--tm); font-size:12px; text-align:center;">Você ainda não convidou ninguém para o Workspace.</div>';
      return;
    }

    equipe.forEach(m => {
      const status = m.status === 'pending' 
        ? '<span style="color:#d4a843; font-size:11px; font-weight:500;">Pendente</span>' 
        : '<span style="color:#6daa40; font-size:11px; font-weight:500;">Ativo</span>';
      
      lista.innerHTML += `
        <div style="background:var(--surface); border:1px solid var(--bm); padding:10px; border-radius:var(--r); display:flex; justify-content:space-between; align-items:center;">
          <div>
            <div style="font-size:13px; color:var(--tx); font-weight:500;">${m.name}</div>
            <div style="font-size:11px; color:var(--tm);">${m.email}</div>
          </div>
          <div style="display:flex; gap:12px; align-items:center;">
            ${status}
            <button class="btn xs danger" onclick="removerMembro('${m._id}')">Remover</button>
          </div>
        </div>`;
    });
  } catch (err) {
    lista.innerHTML = '<div style="color:#f09595; font-size:12px; text-align:center;">Ocorreu um erro ao carregar a equipe.</div>';
  }
}

async function enviarConvite() {
  const email = document.getElementById('f-email-convite').value.trim();
  if (!email || !email.includes('@')) return showToast('Digite um e-mail válido.', 'warning');
  
  mostrarLoader('Disparando e-mail de convite...');
  try {
    const res = await fetch(`/api/team/invite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ email })
    });
    
    if (res.ok) {
      document.getElementById('f-email-convite').value = '';
      showToast('Convite enviado com sucesso!', 'success');
      await carregarEquipe();
    } else {
      const data = await res.json();
      showToast(data.error || 'Erro ao enviar convite.', 'error');
    }
  } catch (err) { showToast('Falha na comunicação com o servidor.', 'error'); }
  ocultarLoader();
}

async function removerMembro(id) {
  if (!confirm('Deseja realmente remover este funcionário? Ele perderá acesso a todas as empresas do Workspace.')) return;
  mostrarLoader('Removendo acesso global...');
  try {
    await fetch(`/api/team/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
    showToast('Acesso revogado.', 'success');
    await carregarEquipe();
  } catch (err) { showToast('Erro ao remover.', 'error'); }
  ocultarLoader();
}

async function atualizarSelectDelegacao() {
  const selectDelegar = document.getElementById('f-delegar');
  selectDelegar.innerHTML = '<option value="">Apenas para Mim (Padrão)</option>';
  
  try {
    const res = await fetch(`/api/team`, { headers: { 'Authorization': `Bearer ${token}` } });
    if (res.ok) {
      const equipe = await res.json();
      equipe.forEach(m => {
        selectDelegar.innerHTML += `<option value="${m.name}">${m.name}</option>`;
      });
    }
  } catch (err) {}
}

window.onclick = function(e) { 
  if (e.target === document.getElementById('modal-empresa')) fecharModalEmpresa(); 
  if (e.target === document.getElementById('modal-tarefa')) fecharModalTarefa(); 
  if (e.target === document.getElementById('modal-dia-expandido')) fecharModalDia(); 
  if (e.target === document.getElementById('modal-nao-feito')) fecharModalNaoFeito(); 
  if (e.target === document.getElementById('modal-macro')) fecharModalMacro(); 
  if (e.target === document.getElementById('modal-equipe')) fecharModalEquipe(); 
}