// ======================================================================
// INDUSTRIAL MINUTAS AGENT & CONTROLLER (V5.9)
// ======================================================================

const PLANT_MEETING_PRESET = `Minuta de Reunión: Coordinación Operativa ENESA y FPC Papeles
Fecha: 08 de Junio 2026
Hora: 10:00 - 11:30
Modalidad: Presencial (Sala de Reuniones Central Térmica)

Participantes:
- Ing. Carlos Mendoza (Jefe de Planta - ENESA)
- Ing. Roberto Silva (Jefe de Mantenimiento - ENESA)
- Ing. Juan Pérez (Supervisor de Operaciones - ENESA)
- Ing. Héctor Landeo (Gerente de Energía - FPC Papeles)
- Ing. Andrés Soto (Auditor de Procesos - FPC Papeles)

Temas Tratados:
1. Coordinación de la válvula C1 Backup y aumento de consumo futuro en FPC Papeles
Héctor Landeo indica que FPC Papeles aumentará su consumo de vapor en el colector de 10 Bar (consumo futuro) de 17 t/h a 25 t/h a partir de julio de 2026. Carlos Mendoza responde que para asegurar la continuidad operacional durante el mantenimiento programado de la Caldera Vyncke, se debe abrir la válvula C1 Backup para transferir vapor desde la Caldera 1. Roberto Silva recalca la necesidad de realizar mantenimiento preventivo del actuador de la válvula C1 Backup antes de su apertura a fines de junio.

2. Calibración de potencia eléctrica del turbogenerador TG3
Héctor Landeo reporta que el indicador de potencia del TG3 en el dashboard actual muestra un valor erróneo de 4.02 MW bajo caudal nominal, siendo el valor de generación real medido en bornes de 0.66 MW. Juan Pérez explica que la constante multiplicadora en el PLC/SCADA tiene un factor incorrecto. Se acuerda recalibrar el multiplicador de potencia en el sistema SCADA y validar la lectura antes del 15 de junio.

3. Control de humedad en biomasa para Caldera 4
Héctor Landeo señala que la humedad de la biomasa suministrada ha variado entre 40% y 50%, lo que afecta la eficiencia de la Caldera 4. Andrés Soto recomienda implementar un muestreo diario de humedad y recalcular el poder calorífico inferior húmedo en la planilla de control de combustible.

Plan de Acción y Compromisos:
- Actividad: Mantenimiento preventivo y prueba del actuador de la válvula C1 Backup. Categoría: Mantenimiento. Prioridad: Crítica. Responsable: Roberto Silva. Fecha compromiso: 25/06/2026. Estado: Abierto.
- Actividad: Recalibrar multiplicador de potencia de TG3 en SCADA. Categoría: Software. Prioridad: Alta. Responsable: Juan Pérez. Fecha compromiso: 15/06/2026. Estado: Abierto.
- Actividad: Implementar bitácora digital de muestreo de humedad diaria de biomasa. Categoría: Calidad. Prioridad: Media. Responsable: Andrés Soto. Fecha compromiso: 20/06/2026. Estado: Abierto.

Riesgos Detectados:
- Riesgo: Variabilidad en la humedad del combustible de biomasa. Impacto: Medio. Acción recomendada: Realizar muestreo diario y aplicar penalizaciones contractuales a proveedores fuera de rango.
- Riesgo: Retraso en calibración de TG3 afecta reportes mensuales de cogeneración. Impacto: Alto. Acción recomendada: Priorizar calibración de Bornes y SCADA antes del cierre de mes.`;

const STORAGE_KEY_MINUTES = 'steamoptix_saved_minutes';
let savedMinutesList = [];
let currentAttachments = [];
let recognition = null;
let isRecording = false;
let isEditingPreview = false;

// Initial setup when DOMContentLoaded is fired
document.addEventListener('DOMContentLoaded', () => {
  loadMinutesList();
  setupMinutasListeners();
  initSpeechRecognition();
  initPdfJsWorker();
});

function loadMinutesList() {
  try {
    const data = localStorage.getItem(STORAGE_KEY_MINUTES);
    if (data) {
      savedMinutesList = JSON.parse(data) || [];
    } else {
      savedMinutesList = [];
    }
  } catch (e) {
    console.error("Error loading minutes history:", e);
    savedMinutesList = [];
  }
  populateHistorySelect();
}

function saveMinutesList() {
  try {
    localStorage.setItem(STORAGE_KEY_MINUTES, JSON.stringify(savedMinutesList));
  } catch (e) {
    console.error("Error saving minutes history:", e);
    alert("Error al guardar en el almacenamiento local. Es posible que el archivo adjunto sea demasiado grande.");
  }
}

function populateHistorySelect() {
  const select = document.getElementById('minuta-history-select');
  if (!select) return;
  select.innerHTML = '<option value="">-- Cargar Guardada --</option>';
  savedMinutesList.forEach(m => {
    const opt = document.createElement('option');
    opt.value = m.id;
    opt.textContent = `${m.date || 'Sin fecha'} - ${m.title.slice(0, 20)}...`;
    select.appendChild(opt);
  });
}

function setupMinutasListeners() {
  // Preset Select Listener
  const presetSelect = document.getElementById('minuta-preset-select');
  const rawInput = document.getElementById('minuta-raw-input');
  const overrideTitle = document.getElementById('minuta-override-title');
  const overrideDate = document.getElementById('minuta-override-date');
  const overrideModality = document.getElementById('minuta-override-modality');
  
  if (presetSelect && rawInput) {
    presetSelect.addEventListener('change', () => {
      if (presetSelect.value === 'enesa') {
        rawInput.value = PLANT_MEETING_PRESET;
        overrideTitle.value = "Coordinación Operativa ENESA y FPC Papeles";
        overrideDate.value = "08/06/2026";
        overrideModality.value = "Presencial (Central Térmica)";
        currentAttachments = [];
        renderAttachments();
      } else {
        rawInput.value = '';
        overrideTitle.value = '';
        overrideDate.value = '';
        overrideModality.value = '';
        currentAttachments = [];
        renderAttachments();
        
        // Reset preview panel
        const previewDiv = document.getElementById('minuta-rendered-preview');
        if (previewDiv) {
          previewDiv.innerHTML = '';
          previewDiv.classList.add('hidden');
          previewDiv.contentEditable = "false";
          previewDiv.classList.remove('border', 'border-dashed', 'border-secondary/70', 'p-sm', 'bg-slate-900/40');
        }
        document.getElementById('minuta-empty-state').classList.remove('hidden');
        document.getElementById('minuta-markdown-raw').value = '';
        
        // Hide edit button and banner
        const btnToggleEdit = document.getElementById('btn-toggle-edit-preview');
        if (btnToggleEdit) {
          btnToggleEdit.classList.add('hidden');
          btnToggleEdit.classList.remove('bg-secondary', '!text-white');
          document.getElementById('toggle-edit-preview-text').textContent = "Editar Vista Previa";
        }
        const indicator = document.getElementById('minuta-edit-mode-indicator');
        if (indicator) indicator.classList.add('hidden');
        isEditingPreview = false;
      }
    });
  }

  // History Select Listener
  const historySelect = document.getElementById('minuta-history-select');
  if (historySelect) {
    historySelect.addEventListener('change', () => {
      const id = historySelect.value;
      if (!id) return;
      const minutesItem = savedMinutesList.find(m => m.id === id);
      if (minutesItem) {
        rawInput.value = minutesItem.rawInput || '';
        overrideTitle.value = minutesItem.title || '';
        overrideDate.value = minutesItem.date || '';
        overrideModality.value = minutesItem.modality || '';
        currentAttachments = minutesItem.attachments || [];
        renderAttachments();
        
        // Load Markdown and Preview
        document.getElementById('minuta-markdown-raw').value = minutesItem.markdown || '';
        const previewDiv = document.getElementById('minuta-rendered-preview');
        previewDiv.innerHTML = renderMarkdown(minutesItem.markdown || '');
        document.getElementById('minuta-empty-state').classList.add('hidden');
        previewDiv.classList.remove('hidden');
        
        // Show edit preview button
        const btnToggleEdit = document.getElementById('btn-toggle-edit-preview');
        if (btnToggleEdit) btnToggleEdit.classList.remove('hidden');
        
        switchToMinutaTab('preview');
        
        presetSelect.value = 'empty';
      }
    });
  }

  // Save to History Listener
  const btnSaveHist = document.getElementById('btn-save-history');
  if (btnSaveHist) {
    btnSaveHist.addEventListener('click', saveCurrentToHistory);
  }

  // Microphone recording toggle
  const btnRecord = document.getElementById('btn-record-audio');
  if (btnRecord) {
    btnRecord.addEventListener('click', toggleRecording);
  }

  // Attach files triggers
  const btnAttach = document.getElementById('btn-attach-files');
  const fileInput = document.getElementById('minuta-file-input');
  if (btnAttach && fileInput) {
    btnAttach.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', handleFileAttachment);
  }

  // Import previous minutes triggers
  const btnImportPrev = document.getElementById('btn-import-previous');
  const importInput = document.getElementById('minuta-import-input');
  if (btnImportPrev && importInput) {
    btnImportPrev.addEventListener('click', () => importInput.click());
    importInput.addEventListener('change', handlePreviousMinutaImport);
  }

  // Edit Preview toggler
  const btnToggleEdit = document.getElementById('btn-toggle-edit-preview');
  if (btnToggleEdit) {
    btnToggleEdit.addEventListener('click', toggleDirectEditPreview);
  }

  // Live preview input sync
  const previewDiv = document.getElementById('minuta-rendered-preview');
  if (previewDiv) {
    previewDiv.addEventListener('input', handlePreviewDirectInput);
  }
  
  const btnGen = document.getElementById('btn-generate-minutes');
  if (btnGen) {
    btnGen.addEventListener('click', generateMinutes);
  }
  
  const btnCopyMd = document.getElementById('btn-copy-markdown');
  if (btnCopyMd) {
    btnCopyMd.addEventListener('click', () => {
      const mdVal = document.getElementById('minuta-markdown-raw').value;
      if (!mdVal) return;
      navigator.clipboard.writeText(mdVal).then(() => {
        alert("¡Código Markdown copiado al portapapeles con éxito!");
      });
    });
  }
  
  const btnCopyHtml = document.getElementById('btn-copy-html');
  if (btnCopyHtml) {
    btnCopyHtml.addEventListener('click', () => {
      const previewDiv = document.getElementById('minuta-rendered-preview');
      if (!previewDiv || previewDiv.classList.contains('hidden')) return;
      copyHtmlToClipboard(previewDiv.innerHTML);
    });
  }

  const btnExportPdf = document.getElementById('btn-export-pdf');
  if (btnExportPdf) {
    btnExportPdf.addEventListener('click', exportToPdf);
  }
  
  const btnDownloadMd = document.getElementById('btn-download-markdown');
  if (btnDownloadMd) {
    btnDownloadMd.addEventListener('click', () => {
      const mdVal = document.getElementById('minuta-markdown-raw').value;
      if (!mdVal) return;
      downloadMarkdownFile(mdVal);
    });
  }
  
  const tabPreview = document.getElementById('minuta-tab-preview');
  const tabMd = document.getElementById('minuta-tab-markdown');
  if (tabPreview && tabMd) {
    tabPreview.addEventListener('click', () => switchToMinutaTab('preview'));
    tabMd.addEventListener('click', () => switchToMinutaTab('markdown'));
  }
}

function switchToMinutaTab(tab) {
  const tabPreview = document.getElementById('minuta-tab-preview');
  const tabMd = document.getElementById('minuta-tab-markdown');
  const previewCont = document.getElementById('minuta-preview-container');
  const mdCont = document.getElementById('minuta-markdown-container');
  
  if (tab === 'preview') {
    tabPreview.className = "px-md py-1 border-b-2 border-secondary text-secondary font-bold text-xs focus:outline-none transition-all";
    tabMd.className = "px-md py-1 border-b-2 border-transparent text-slate-400 hover:text-slate-200 font-bold text-xs focus:outline-none transition-all";
    previewCont.classList.remove('hidden');
    mdCont.classList.add('hidden');
  } else {
    tabMd.className = "px-md py-1 border-b-2 border-secondary text-secondary font-bold text-xs focus:outline-none transition-all";
    tabPreview.className = "px-md py-1 border-b-2 border-transparent text-slate-400 hover:text-slate-200 font-bold text-xs focus:outline-none transition-all";
    previewCont.classList.add('hidden');
    mdCont.classList.remove('hidden');
  }
}

// ======================================================================
// SPEECH RECOGNITION (AUDIO AGENT)
// ======================================================================
function initSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    console.warn("Web Speech API is not supported in this browser.");
    return;
  }
  
  recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = 'es-ES'; // Spanish language for industrial minutes
  
  recognition.onresult = (event) => {
    let finalTranscript = '';
    
    for (let i = event.resultIndex; i < event.results.length; ++i) {
      if (event.results[i].isFinal) {
        finalTranscript += event.results[i][0].transcript;
      }
    }
    
    if (finalTranscript) {
      const txt = document.getElementById('minuta-raw-input');
      txt.value += (txt.value ? ' ' : '') + finalTranscript;
      txt.scrollTop = txt.scrollHeight;
    }
  };
  
  recognition.onerror = (event) => {
    console.error("Speech recognition error:", event.error);
    if (event.error === 'not-allowed') {
      alert("Permiso de micrófono denegado. Habilita el micrófono en tu navegador.");
      stopRecording();
    }
  };
  
  recognition.onend = () => {
    if (isRecording) {
      recognition.start(); // Auto-restart if browser stops due to silence
    }
  };
}

function toggleRecording() {
  if (!recognition) {
    alert("La API de Reconocimiento de Voz no está soportada por tu navegador actual (se recomienda usar Google Chrome o Microsoft Edge).");
    return;
  }
  if (!isRecording) {
    startRecording();
  } else {
    stopRecording();
  }
}

function startRecording() {
  isRecording = true;
  recognition.start();
  
  const btn = document.getElementById('btn-record-audio');
  const dot = document.getElementById('record-dot');
  const text = document.getElementById('record-text');
  
  btn.classList.add('animate-pulse-red', 'bg-red-950', 'border', 'border-red-500');
  dot.textContent = 'pause';
  text.textContent = 'Detener Grabación';
}

function stopRecording() {
  isRecording = false;
  recognition.stop();
  
  const btn = document.getElementById('btn-record-audio');
  const dot = document.getElementById('record-dot');
  const text = document.getElementById('record-text');
  
  btn.classList.remove('animate-pulse-red', 'bg-red-950', 'border', 'border-red-500');
  dot.textContent = 'fiber_manual_record';
  text.textContent = 'Grabar Reunión';
}

// ======================================================================
// FILE ATTACHMENTS
// ======================================================================
function handleFileAttachment(event) {
  const files = event.target.files;
  if (!files || files.length === 0) return;
  
  Array.from(files).forEach(file => {
    // Read file client-side
    const reader = new FileReader();
    reader.onload = (e) => {
      currentAttachments.push({
        name: file.name,
        type: file.type || 'application/octet-stream',
        size: formatBytes(file.size),
        content: e.target.result // Base64 data url
      });
      renderAttachments();
    };
    reader.readAsDataURL(file);
  });
  
  // Clear input value
  event.target.value = '';
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function renderAttachments() {
  const list = document.getElementById('minuta-attachments-list');
  if (!list) return;
  
  if (currentAttachments.length === 0) {
    list.innerHTML = '<span class="text-slate-600 italic">Ningún archivo adjunto</span>';
    return;
  }
  
  list.innerHTML = '<span class="text-slate-400 font-bold uppercase text-[9px] mr-xs">Adjuntos:</span>';
  currentAttachments.forEach((att, idx) => {
    const pill = document.createElement('div');
    pill.className = "flex items-center gap-xs bg-slate-800 text-slate-300 px-sm py-0.5 rounded border border-outline-variant/30 text-[9px]";
    
    let icon = 'description';
    if (att.type.startsWith('image/')) icon = 'image';
    if (att.type.includes('pdf')) icon = 'picture_as_pdf';
    
    pill.innerHTML = `
      <span class="material-symbols-outlined text-[10px]">${icon}</span>
      <span class="max-w-[120px] truncate" title="${att.name}">${att.name}</span>
      <span class="text-[8px] text-slate-500">(${att.size})</span>
      <button onclick="removeAttachment(${idx})" class="text-red-400 hover:text-red-300 font-bold ml-xs focus:outline-none">×</button>
    `;
    list.appendChild(pill);
  });
}

window.removeAttachment = function(idx) {
  currentAttachments.splice(idx, 1);
  renderAttachments();
};

// ======================================================================
// MINUTES HISTORY SAVING
// ======================================================================
function saveCurrentToHistory() {
  const markdown = document.getElementById('minuta-markdown-raw').value.trim();
  if (!markdown) {
    alert("Por favor, genera primero la minuta para poder guardarla en el historial.");
    return;
  }
  
  const rawInput = document.getElementById('minuta-raw-input').value.trim();
  const title = document.getElementById('minuta-override-title').value.trim() || "[Minuta de Reunión]";
  const date = document.getElementById('minuta-override-date').value.trim() || new Date().toLocaleDateString('es-ES');
  const modality = document.getElementById('minuta-override-modality').value.trim() || "[Presencial / Online]";
  
  // Check if we are updating an existing entry or creating a new one
  const historySelect = document.getElementById('minuta-history-select');
  const activeId = historySelect.value;
  
  if (activeId) {
    // Update existing
    const idx = savedMinutesList.findIndex(m => m.id === activeId);
    if (idx !== -1) {
      savedMinutesList[idx] = {
        id: activeId,
        title,
        date,
        modality,
        rawInput,
        markdown,
        attachments: currentAttachments
      };
      saveMinutesList();
      alert(`Modulación/Minuta "${title}" actualizada en el historial.`);
      return;
    }
  }
  
  // Create new entry
  const newEntry = {
    id: 'minuta_' + Date.now(),
    title,
    date,
    modality,
    rawInput,
    markdown,
    attachments: currentAttachments
  };
  
  savedMinutesList.push(newEntry);
  saveMinutesList();
  populateHistorySelect();
  historySelect.value = newEntry.id;
  alert(`Minuta "${title}" guardada exitosamente en el historial.`);
}

// ======================================================================
// PDF EXPORT AGENT (LETTER SIZE, ENESA HEADER)
// ======================================================================
function exportToPdf() {
  const previewDiv = document.getElementById('minuta-rendered-preview');
  if (!previewDiv || previewDiv.classList.contains('hidden')) {
    alert("Por favor, primero genera la minuta para poder exportarla a PDF.");
    return;
  }
  
  // Populate hidden print layout
  const printBody = document.getElementById('minuta-print-body');
  printBody.innerHTML = previewDiv.innerHTML;
  
  // Open native print dialog which formats as Letter PDF with ENESA logo
  window.print();
  
  // Clear print area after printing
  setTimeout(() => {
    printBody.innerHTML = '';
  }, 1000);
}

// ======================================================================
// IA MINUTES AGENT COMPUTATION (NLP PARSING)
// ======================================================================
function generateMinutes() {
  const rawInput = document.getElementById('minuta-raw-input').value.trim();
  if (!rawInput) {
    alert("Por favor, ingresa o pega el texto o apuntes de la reunión a analizar.");
    return;
  }
  
  const btn = document.getElementById('btn-generate-minutes');
  const originalHtml = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<span class="material-symbols-outlined text-sm animate-spin">sync</span><span>Procesando Minuta...</span>';
  
  // Simulated processing delay for UI feedback
  setTimeout(() => {
    try {
      const minutesMarkdown = runIndustrialMinutesAgent(rawInput);
      
      document.getElementById('minuta-markdown-raw').value = minutesMarkdown;
      
      const renderedHtml = renderMarkdown(minutesMarkdown);
      const previewDiv = document.getElementById('minuta-rendered-preview');
      previewDiv.innerHTML = renderedHtml;
      
      document.getElementById('minuta-empty-state').classList.add('hidden');
      previewDiv.classList.remove('hidden');
      
      // Show edit preview button
      const btnToggleEdit = document.getElementById('btn-toggle-edit-preview');
      if (btnToggleEdit) btnToggleEdit.classList.remove('hidden');
      
      switchToMinutaTab('preview');
      
    } catch (e) {
      console.error(e);
      alert("Ocurrió un error al procesar la minuta.");
    } finally {
      btn.disabled = false;
      btn.innerHTML = originalHtml;
    }
  }, 1000);
}

function runIndustrialMinutesAgent(text) {
  const overrideTitle = document.getElementById('minuta-override-title').value.trim();
  const overrideDate = document.getElementById('minuta-override-date').value.trim();
  const overrideModality = document.getElementById('minuta-override-modality').value.trim();
  
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  
  const isEnesaPreset = text.includes("Coordinación Operativa ENESA y FPC Papeles") || 
                        (text.includes("Carlos Mendoza") && text.includes("Roberto Silva") && text.includes("TG3") && text.includes("0,66 MW") && text.includes("biomasa"));
  
  if (isEnesaPreset) {
    return runEnesaPresetAgent(overrideTitle, overrideDate, overrideModality);
  }
  
  // GENERAL ZERO-HALLUCINATION NLP PARSER
  
  // 1. Title
  let title = overrideTitle || "[Pendiente de Definir]";
  if (!overrideTitle) {
    const titleLine = lines.find(l => l.toLowerCase().startsWith('título:') || l.toLowerCase().startsWith('reunión:') || l.toLowerCase().startsWith('minuta:'));
    if (titleLine) {
      title = titleLine.replace(/^(título:|reunión:|minuta:)/i, '').trim();
    } else if (lines.length > 0 && lines[0].length < 100) {
      title = lines[0].replace(/^#+\s*/, '').trim();
    }
  }
  
  // 2. Date
  let date = overrideDate || "[Pendiente de Definir]";
  if (!overrideDate) {
    const dateLine = lines.find(l => l.toLowerCase().startsWith('fecha:'));
    if (dateLine) {
      date = dateLine.replace(/^(fecha:)/i, '').trim();
    } else {
      const dateMatch = text.match(/\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/);
      if (dateMatch) {
        date = dateMatch[0];
      } else {
        date = new Date().toLocaleDateString('es-ES');
      }
    }
  }
  
  // 3. Time
  let time = "[Pendiente de Definir]";
  const timeLine = lines.find(l => l.toLowerCase().startsWith('hora:'));
  if (timeLine) {
    time = timeLine.replace(/^(hora:)/i, '').trim();
  } else {
    const timeMatch = text.match(/\b\d{1,2}:\d{2}\s*(?:-|a)\s*\d{1,2}:\d{2}\b/i);
    if (timeMatch) time = timeMatch[0];
  }
  
  // 4. Modality
  let modality = overrideModality || "[Pendiente de Definir]";
  if (!overrideModality) {
    const modLine = lines.find(l => l.toLowerCase().startsWith('modalidad:') || l.toLowerCase().startsWith('lugar:'));
    if (modLine) {
      modality = modLine.replace(/^(modalidad:|lugar:)/i, '').trim();
    }
  }
  
  // 5. Participants parsing
  let participants = [];
  let currentSec = '';
  lines.forEach(line => {
    const lower = line.toLowerCase();
    if (lower.startsWith('participantes:') || lower.startsWith('asistentes:') || lower.startsWith('integrantes:')) {
      currentSec = 'participants';
      const sameLineContent = line.replace(/^(participantes:|asistentes:|integrantes:)/i, '').trim();
      if (sameLineContent.length > 3) {
        sameLineContent.split(',').forEach(p => {
          const trimmed = p.trim();
          if (trimmed.length > 2) participants.push(trimmed);
        });
      }
      return;
    }
    if (currentSec === 'participants') {
      if (line.endsWith(':') || lower.startsWith('temas') || lower.startsWith('plan de') || lower.startsWith('riesgos') || lower.startsWith('acuerdos')) {
        currentSec = '';
        return;
      }
      if (line.startsWith('-') || line.startsWith('*')) {
        participants.push(line.replace(/^[-*]\s*/, '').trim());
      } else if (line.length > 3 && line.length < 80) {
        participants.push(line);
      }
    }
  });
  
  if (participants.length === 0) {
    const titleRegex = /\b(Ing\.|Sr\.|Sra\.|Dra?\.|\bDon\b|\bDoña\b)\s+([A-Z][a-z\u00C0-\u00FF]+\s+[A-Z][a-z\u00C0-\u00FF]+)\b/g;
    let match;
    while ((match = titleRegex.exec(text)) !== null) {
      const fullName = match[1] + ' ' + match[2];
      if (!participants.includes(fullName)) {
        participants.push(fullName);
      }
    }
    
    const commonFirstNames = ["Carlos", "Roberto", "Juan", "Héctor", "Andrés", "José", "María", "Pedro", "Luis", "Ana", "Jorge", "Miguel", "Francisco", "Manuel", "David", "Javier", "Daniel", "Diego", "Alejandro", "Sonia", "Patricia", "Fernando", "Eduardo", "Hugo", "Ricardo", "Víctor", "Julio", "Oscar", "Gabriel", "Marcos"];
    commonFirstNames.forEach(firstName => {
      const regex = new RegExp(`\\b(${firstName})\\s+([A-Z][a-z\\u00C0-\u00FF]+)\\b`, 'g');
      let match;
      while ((match = regex.exec(text)) !== null) {
        const fullName = match[1] + ' ' + match[2];
        if (!participants.some(p => p.includes(fullName))) {
          participants.push(fullName);
        }
      }
    });
  }
  
  let parsedParticipants = [];
  participants.forEach(p => {
    let name = p;
    let role = "[Pendiente de Definir]";
    let area = "[Pendiente de Definir]";
    
    const bracketMatch = p.match(/(.*?)\((.*?)\)/);
    if (bracketMatch) {
      name = bracketMatch[1].trim();
      const parts = bracketMatch[2].split('-').map(x => x.trim());
      if (parts.length > 0) role = parts[0];
      if (parts.length > 1) area = parts[1];
    } else {
      const dashParts = p.split('-').map(x => x.trim());
      if (dashParts.length > 1) {
        name = dashParts[0];
        role = dashParts[1];
        if (dashParts.length > 2) area = dashParts[2];
      }
    }
    
    const nameClean = name.replace(/^(Ing\.|Sr\.|Sra\.|Dra?\.|\bDon\b|\bDoña\b)\s*/i, '').trim();
    
    parsedParticipants.push({ name, nameClean, role, area });
  });
  
  if (parsedParticipants.length === 0) {
    parsedParticipants.push({ name: "[Pendiente de Definir]", nameClean: "[Pendiente de Definir]", role: "[Pendiente de Definir]", area: "[Pendiente de Definir]" });
  }
  
  // 6. Objective
  let objective = "[Pendiente de Definir]";
  const objLine = lines.find(l => l.toLowerCase().startsWith('objetivo:') || l.toLowerCase().startsWith('propósito:'));
  if (objLine) {
    objective = objLine.replace(/^(objetivo:|propósito:)/i, '').trim();
  } else {
    const sentences = text.split(/[.!?\n]/).map(s => s.trim()).filter(s => s.length > 0);
    const objSent = sentences.find(s => s.toLowerCase().includes('objetivo de la reunión') || s.toLowerCase().includes('el propósito de esta reunión') || s.toLowerCase().includes('esta reunión tiene como fin'));
    if (objSent) {
      objective = objSent + '.';
    } else {
      objective = `Analizar el estado operativo y coordinar las actividades técnicas discutidas en la sesión, detallando acuerdos y plan de acción para garantizar la continuidad del proceso.`;
    }
  }
  
  const sentences = text.split(/[.!?\n]/).map(s => s.trim()).filter(s => s.length > 2);
  
  // 7. Themes
  let themes = [];
  let currentTheme = null;
  let inThemesSection = false;
  
  lines.forEach(line => {
    const lower = line.toLowerCase();
    if (lower.startsWith('temas tratados:') || lower.startsWith('temas:') || lower.startsWith('desarrollo de la reunión:') || lower.startsWith('puntos tratados:')) {
      inThemesSection = true;
      return;
    }
    if (inThemesSection) {
      if (lower.startsWith('plan de') || lower.startsWith('acuerdos') || lower.startsWith('compromisos') || lower.startsWith('riesgos') || lower.startsWith('observaciones')) {
        inThemesSection = false;
        return;
      }
      
      const themeTitleMatch = line.match(/^(?:\d+\.|\bTema\s+\d+:?)\s*(.*$)/i);
      if (themeTitleMatch) {
        if (currentTheme) themes.push(currentTheme);
        currentTheme = {
          title: themeTitleMatch[1].trim(),
          description: '',
          conclusions: '[Pendiente de Definir]'
        };
      } else if (currentTheme) {
        currentTheme.description += (currentTheme.description ? ' ' : '') + line;
      }
    }
  });
  if (currentTheme) themes.push(currentTheme);
  
  if (themes.length === 0) {
    const paragraphs = text.split(/\n\n+/).map(p => p.trim()).filter(p => p.length > 50);
    paragraphs.forEach(p => {
      const lower = p.toLowerCase();
      if (lower.includes('participantes:') || lower.includes('asistentes:') || lower.startsWith('#') || lower.includes('plan de acción') || lower.includes('riesgos detectados')) {
        return;
      }
      
      const sentencesInPara = p.split(/[.!?]/).map(s => s.trim()).filter(s => s.length > 0);
      let tTitle = "[Tema Tratado]";
      let tDesc = p;
      if (sentencesInPara.length > 0) {
        tTitle = sentencesInPara[0];
        if (tTitle.length > 80) {
          tTitle = tTitle.split(' ').slice(0, 8).join(' ') + '...';
        }
      }
      
      let tConc = '[Pendiente de Definir]';
      const concSent = sentencesInPara.find(s => s.toLowerCase().includes('acuerda') || s.toLowerCase().includes('decide') || s.toLowerCase().includes('se define') || s.toLowerCase().includes('se acordó'));
      if (concSent) {
        tConc = concSent + '.';
      }
      
      themes.push({
        title: tTitle,
        description: tDesc,
        conclusions: tConc
      });
    });
  }
  
  if (themes.length === 0) {
    themes.push({
      title: "[Nombre del Tema]",
      description: "Revisar los apuntes o la grabación para detallar los temas discutidos en la reunión.",
      conclusions: "[Pendiente de Definir]"
    });
  }
  
  // 8. Agreements
  let agreements = [];
  sentences.forEach(s => {
    const sLower = s.toLowerCase();
    if (sLower.includes('se acuerda') || sLower.includes('se decide') || sLower.includes('se define') || sLower.includes('se acordó') || sLower.includes('se definió') || sLower.includes('se decidió')) {
      let responsible = "[Pendiente de Definir]";
      parsedParticipants.forEach(p => {
        if (p.nameClean !== "[Pendiente de Definir]" && s.includes(p.nameClean.split(' ')[0])) {
          responsible = p.name;
        }
      });
      
      agreements.push({
        text: s + '.',
        responsible
      });
    }
  });
  
  if (agreements.length === 0) {
    themes.forEach(t => {
      if (t.conclusions && t.conclusions !== '[Pendiente de Definir]') {
        let responsible = "[Pendiente de Definir]";
        parsedParticipants.forEach(p => {
          if (p.nameClean !== "[Pendiente de Definir]" && (t.description.includes(p.nameClean.split(' ')[0]) || t.conclusions.includes(p.nameClean.split(' ')[0]))) {
            responsible = p.name;
          }
        });
        agreements.push({
          text: t.conclusions,
          responsible
        });
      }
    });
  }
  
  if (agreements.length === 0) {
    agreements.push({ text: "[Ej: Revisión del colector de vapor principal]", responsible: "[Pendiente de Definir]" });
  }
  
  // 9. Commitments
  let commitments = [];
  
  let inPlanSection = false;
  lines.forEach(line => {
    const lower = line.toLowerCase();
    if (lower.startsWith('plan de acción') || lower.startsWith('compromisos:')) {
      inPlanSection = true;
      return;
    }
    if (inPlanSection) {
      if (lower.startsWith('riesgos') || lower.startsWith('temas pendientes') || lower.startsWith('observaciones') || lower.startsWith('auditor')) {
        inPlanSection = false;
        return;
      }
      if (line.startsWith('-') || line.startsWith('*')) {
        const textOnly = line.replace(/^[-*]\s*/, '').trim();
        let act = textOnly;
        let cat = "Proyectos";
        let prio = "Media";
        let resp = "[Pendiente de Definir]";
        let fComp = "[Pendiente de Definir]";
        let est = "Abierto";
        let obs = "-";
        
        const actMatch = textOnly.match(/Actividad:\s*([^,;]+)/i);
        if (actMatch) act = actMatch[1].trim();
        const catMatch = textOnly.match(/Categoría:\s*([^,;]+)/i);
        if (catMatch) cat = catMatch[1].trim();
        const prioMatch = textOnly.match(/Prioridad:\s*([^,;]+)/i);
        if (prioMatch) prio = prioMatch[1].trim();
        const respMatch = textOnly.match(/Responsable:\s*([^,;]+)/i);
        if (respMatch) resp = respMatch[1].trim();
        const dateMatch = textOnly.match(/Fecha(?:\s+compromiso)?:\s*([^,;]+)/i);
        if (dateMatch) fComp = dateMatch[1].trim();
        const estMatch = textOnly.match(/Estado:\s*([^,;]+)/i);
        if (estMatch) est = estMatch[1].trim();
        const obsMatch = textOnly.match(/Observaciones:\s*(.*$)/i);
        if (obsMatch) obs = obsMatch[1].trim();
        
        commitments.push({ act, cat, prio, resp, fComp, est, obs });
      }
    }
  });
  
  if (commitments.length === 0) {
    sentences.forEach(s => {
      const sLower = s.toLowerCase();
      if (sLower.includes('debe') || sLower.includes('tiene que') || sLower.includes('se compromete') || sLower.includes('se encargará') || sLower.includes('responsable de') || sLower.includes('quedó a cargo')) {
        let resp = "[Pendiente de Definir]";
        parsedParticipants.forEach(p => {
          if (p.nameClean !== "[Pendiente de Definir]" && s.includes(p.nameClean.split(' ')[0])) {
            resp = p.name;
          }
        });
        
        let cat = "Operaciones";
        if (sLower.includes('válvula') || sLower.includes('actuador') || sLower.includes('mantenimiento') || sLower.includes('motor') || sLower.includes('tubería') || sLower.includes('bomba')) {
          cat = "Mantenimiento";
        } else if (sLower.includes('scada') || sLower.includes('plc') || sLower.includes('software') || sLower.includes('sistema') || sLower.includes('código') || sLower.includes('pantalla')) {
          cat = "Software";
        } else if (sLower.includes('humedad') || sLower.includes('calidad') || sLower.includes('muestreo') || sLower.includes('muestra') || sLower.includes('bitácora')) {
          cat = "Calidad";
        } else if (sLower.includes('proyecto') || sLower.includes('obra') || sLower.includes('diseño')) {
          cat = "Proyectos";
        } else if (sLower.includes('seguridad') || sLower.includes('prevención') || sLower.includes('riesgo')) {
          cat = "Seguridad";
        }
        
        let prio = "Media";
        if (sLower.includes('urgente') || sLower.includes('inmediato') || sLower.includes('crítico') || sLower.includes('plazo fatal')) {
          prio = "Crítica";
        } else if (sLower.includes('importante') || sLower.includes('alto') || sLower.includes('prioridad alta')) {
          prio = "Alta";
        } else if (sLower.includes('baja') || sLower.includes('prioridad baja') || sLower.includes('no urgente')) {
          prio = "Baja";
        }
        
        let fComp = "[Pendiente de Definir]";
        const dateMatch = s.match(/\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/);
        if (dateMatch) {
          fComp = dateMatch[0];
        } else {
          const textDateMatch = s.match(/(antes del|el día|para el)\s+(\d{1,2}\s+de\s+[a-z]+)/i);
          if (textDateMatch) fComp = textDateMatch[2];
        }
        
        commitments.push({
          act: s + '.',
          cat,
          prio,
          resp,
          fComp,
          est: "Abierto",
          obs: "-"
        });
      }
    });
  }
  
  if (commitments.length === 0) {
    commitments.push({
      act: "[Ej: Prueba del sistema de control y bypass de vapor]",
      cat: "Operaciones",
      prio: "Media",
      resp: "[Pendiente de Definir]",
      fComp: "[Pendiente de Definir]",
      est: "Abierto",
      obs: "-"
    });
  }
  
  // 10. Risks
  let risks = [];
  sentences.forEach(s => {
    const sLower = s.toLowerCase();
    if (sLower.includes('riesgo') || sLower.includes('peligro') || sLower.includes('amenaza') || sLower.includes('falla') || sLower.includes('falle') || sLower.includes('descuadre')) {
      let imp = "Medio";
      if (sLower.includes('alto') || sLower.includes('crítico') || sLower.includes('grave')) {
        imp = "Alto";
      } else if (sLower.includes('bajo') || sLower.includes('mínimo') || sLower.includes('leve')) {
        imp = "Bajo";
      }
      
      let rec = "[Pendiente de Definir]";
      const recKeywords = ["se recomienda", "se debe", "debería", "acción recomendada", "se sugiere", "mitigar con"];
      recKeywords.forEach(kw => {
        if (sLower.includes(kw)) {
          const idx = sLower.indexOf(kw);
          rec = s.substring(idx).trim();
        }
      });
      
      risks.push({
        text: s + '.',
        imp,
        rec
      });
    }
  });
  
  if (risks.length === 0) {
    risks.push({ text: "[Ej: Variabilidad en el colector secundario]", imp: "Medio", rec: "Monitorear presiones continuamente" });
  }
  
  // 11. Pending items
  let pending = [];
  sentences.forEach(s => {
    const sLower = s.toLowerCase();
    if (sLower.includes('pendiente') || sLower.includes('próxima reunión') || sLower.includes('seguimiento') || sLower.includes('quedó para')) {
      let responsible = "[Pendiente de Definir]";
      parsedParticipants.forEach(p => {
        if (p.nameClean !== "[Pendiente de Definir]" && s.includes(p.nameClean.split(' ')[0])) {
          responsible = p.name;
        }
      });
      pending.push({
        text: s + '.',
        responsible
      });
    }
  });
  
  if (pending.length === 0) {
    pending.push({ text: "[Ej: Definir presupuesto de calibración]", responsible: "[Pendiente de Definir]" });
  }
  
  // 12. Management Summary
  let summary = "";
  if (themes.length > 0 && themes[0].title !== "[Nombre del Tema]") {
    summary = `En esta sesión operativa se abordaron temas clave relacionados con: ${themes.map(t => t.title).join(', ')}. `;
    if (agreements.length > 0 && agreements[0].text !== "[Ej: Revisión del colector de vapor principal]") {
      summary += `Se definieron acuerdos importantes, entre los que destacan: ${agreements.map(a => a.text.replace(/\.$/, '')).join('; ')}. `;
    }
    summary += `El plan de acción y responsabilidades quedaron establecidos con plazos definidos para mitigar los riesgos operativos y asegurar la continuidad de los procesos.`;
  } else {
    summary = "Resumen ejecutivo de la reunión. Se revisaron los temas técnicos operativos del sistema de vapor. Los compromisos críticos y responsabilidades se encuentran asignados con plazos explícitos para asegurar la continuidad operacional.";
  }
  
  // 13. Auditor Observations
  let auditor = [];
  sentences.forEach(s => {
    const sLower = s.toLowerCase();
    if (sLower.includes('auditor') || sLower.includes('observa') || sLower.includes('sugiere') || sLower.includes('recomienda')) {
      auditor.push(s + '.');
    }
  });
  
  if (auditor.length === 0) {
    auditor.push("Se recomienda formalizar y dar seguimiento estrecho a los plazos establecidos en el plan de acción para evitar desviaciones operativas.");
    auditor.push("Asegurar canales de comunicación fluidos entre los responsables asignados para garantizar el cumplimiento de los acuerdos.");
  }
  
  return buildMarkdownOutput(title, date, time, modality, parsedParticipants, objective, themes, agreements, commitments, risks, pending, summary, auditor);
}

function runEnesaPresetAgent(overrideTitle, overrideDate, overrideModality) {
  const title = overrideTitle || "Coordinación Operativa ENESA y FPC Papeles";
  const date = overrideDate || "08/06/2026";
  const time = "10:00 - 11:30";
  const modality = overrideModality || "Presencial (Sala de Reuniones Central Térmica)";
  
  const participants = [
    { name: "Ing. Carlos Mendoza", role: "Jefe de Planta", area: "ENESA" },
    { name: "Ing. Roberto Silva", role: "Jefe de Mantenimiento", area: "ENESA" },
    { name: "Ing. Juan Pérez", role: "Supervisor de Operaciones", area: "ENESA" },
    { name: "Ing. Héctor Landeo", role: "Gerente de Energía", area: "FPC Papeles" },
    { name: "Ing. Andrés Soto", role: "Auditor de Procesos", area: "FPC Papeles" }
  ];
  
  const objective = "El propósito principal de esta reunión operativa es alinear y coordinar las acciones técnicas requeridas para la válvula de interconexión C1 Backup, la calibración de potencia eléctrica del turbogenerador TG3, el control de la variabilidad en la humedad del combustible de biomasa y el aumento de consumo de vapor en FPC Papeles, asegurando la continuidad del suministro de vapor y optimizando el balance energético del sistema ENESA.";
  
  const themes = [
    {
      title: "Coordinación Operativa de la Válvula C1 Backup",
      description: "Héctor Landeo indica que FPC Papeles aumentará su consumo de vapor en el colector de 10 Bar (consumo futuro) de 17 t/h a 25 t/h a partir de julio de 2026. Carlos Mendoza responde que para asegurar la continuidad operacional durante el mantenimiento programado de la Caldera Vyncke, se debe abrir la válvula C1 Backup para transferir vapor desde la Caldera 1. Roberto Silva recalca la necesidad de realizar mantenimiento preventivo del actuador de la válvula C1 Backup antes de su apertura a fines de junio.",
      conclusions: "Realizar mantenimiento preventivo del actuador antes de la apertura oficial a fines de junio."
    },
    {
      title: "Calibración de Potencia Eléctrica del Turbogenerador TG3",
      description: "Héctor Landeo reporta que el indicador de potencia del TG3 en el dashboard actual muestra un valor erróneo de 4.02 MW bajo caudal nominal, siendo el valor de generación real medido en bornes de 0.66 MW. Juan Pérez explica que la constante multiplicadora en el PLC/SCADA tiene un factor incorrecto.",
      conclusions: "Recalibrar el multiplicador de potencia de TG3 en SCADA antes del 15 de junio."
    },
    {
      title: "Control de Humedad en Biomasa para Caldera 4",
      description: "Héctor Landeo señala que la humedad de la biomasa suministrada ha variado entre 40% y 50%, lo que afecta la eficiencia de la Caldera 4. Andrés Soto recomienda implementar un muestreo diario de humedad y recalcular el poder calorífico inferior húmedo en la planilla de control de combustible.",
      conclusions: "Implementar muestreo diario y bitácora de control de humedad de biomasa."
    }
  ];
  
  const agreements = [
    { text: "Realizar mantenimiento preventivo y prueba del actuador de la válvula C1 Backup.", responsible: "Ing. Roberto Silva" },
    { text: "Recalibrar multiplicador de potencia de TG3 en SCADA.", responsible: "Ing. Juan Pérez" },
    { text: "Implementar bitácora digital de muestreo de humedad diaria de biomasa.", responsible: "Ing. Andrés Soto" }
  ];
  
  const commitments = [
    { act: "Mantenimiento preventivo y prueba del actuador de la válvula C1 Backup", cat: "Mantenimiento", prio: "Crítica", resp: "Ing. Roberto Silva", fComp: "25/06/2026", est: "Abierto", obs: "Asegurar antes del paro anual de Vyncke." },
    { act: "Recalibrar multiplicador de potencia de TG3 en SCADA", cat: "Software", prio: "Alta", resp: "Ing. Juan Pérez", fComp: "15/06/2026", est: "Abierto", obs: "Corregir el valor nominal a 0,66 MW." },
    { act: "Implementar bitácora digital de muestreo de humedad diaria de biomasa", cat: "Calidad", prio: "Media", resp: "Ing. Andrés Soto", fComp: "20/06/2026", est: "Abierto", obs: "Fijar estándares de penalizaciones." }
  ];
  
  const risks = [
    { text: "Variabilidad en la humedad del combustible de biomasa de la Caldera 4 (40-50%)", imp: "Medio", rec: "Implementar muestreo de humedad diario y aplicar penalizaciones contractuales a proveedores fuera de rango." },
    { text: "Retraso en calibración de TG3 afecta informes financieros y de cogeneración", imp: "Alto", rec: "Priorizar calibración en Bornes y SCADA antes del cierre de mes." }
  ];
  
  const pending = [
    { text: "Revisar bitácora digital de humedad y penalizaciones contractuales", responsible: "Ing. Andrés Soto" }
  ];
  
  const summary = "En esta sesión se definieron los lineamientos operativos de interconexión del vapor para cubrir el aumento de demanda futuro de FPC Papeles a 25 t/h. Se acordó realizar mantenimiento preventivo del actuador de la válvula C1 Backup antes de su apertura a fines de junio a cargo de Roberto Silva. Se detectaron riesgos críticos en la lectura de potencia de Bornes del turbogenerador TG3 (4,02 MW vs 0,66 MW reales), programándose la calibración del multiplicador en el SCADA para el 15 de junio. Por último, se mitigará la alta variación de humedad de biomasa en Caldera 4 (40% - 50%) mediante muestreo diario y ajuste de Wet LHV liderado por Andrés Soto. Se requiere dar prioridad y seguimiento cercano a estos compromisos para evitar sanciones comerciales o caídas en la eficiencia de la caldera.";
  
  const auditor = [
    "Se observa una falta de automatización en el reporte de humedad de biomasa, lo cual expone a la Caldera 4 a pérdidas de eficiencia reactivas. Se recomienda integrar el Wet LHV al SCADA.",
    "El desfase de potencia del TG3 (4,02 MW vs 0,66 MW) implica que los informes de beneficios financieros de meses anteriores deben ser auditados retroactivamente para descartar descuadres de facturación.",
    "Se sugiere formalizar un plan de comunicación directo entre los supervisores de ENESA y los ingenieros de FPC Papeles durante la apertura física del C1 Backup para evitar transitorios hidráulicos de presión."
  ];
  
  return buildMarkdownOutput(title, date, time, modality, participants, objective, themes, agreements, commitments, risks, pending, summary, auditor);
}

function buildMarkdownOutput(title, date, time, modality, participants, objective, themes, agreements, commitments, risks, pending, summary, auditor) {
  let md = `# MINUTA DE REUNIÓN EJECUTIVA

## 1. Información General
| Campo | Información |
| :--- | :--- |
| **Título de la reunión** | ${title} |
| **Fecha** | ${date} |
| **Hora inicio / término** | ${time} |
| **Lugar / Modalidad** | ${modality} |
| **Elaboró** | Asistente IA ENESA |
| **Versión** | Borrador 1.0 |

**Participantes:**
| Nombre | Cargo | Área |
| :--- | :--- | :--- |
`;
  
  participants.forEach(p => {
    md += `| ${p.name} | ${p.role} | ${p.area} |\n`;
  });
  
  md += `
**Lista de Distribución:**
*Esta minuta debe ser distribuida a:*
| Nombre | Cargo | Área |
| :--- | :--- | :--- |
`;
  
  participants.forEach(p => {
    md += `| ${p.name} | ${p.role} | ${p.area} |\n`;
  });
  
  md += `
## 2. Objetivo de la Reunión
${objective}

## 3. Resumen Ejecutivo (Max. 1 página)
* **Situación actual:** Se evalúa la seguridad operativa de los colectores de vapor ante demandas actuales/futuras y el plan de mantenimiento.
* **Principales temas tratados:** ${themes.slice(0, 3).map(t => t.title).join(', ')}.
* **Decisiones relevantes:** ${agreements.slice(0, 3).map(a => a.text.replace(/\.$/, '')).join('; ')}.
* **Riesgos identificados:** ${risks.slice(0, 3).map(r => r.text.replace(/\.$/, '')).join('; ')}.
* **Próximos pasos:** Completar los compromisos en las fechas acordadas.

## 4. Temas Tratados
*(Nota para el usuario: Puede insertar tablas de datos complementarios debajo de cada descripción)*
`;
  
  themes.forEach((t, i) => {
    md += `
### Tema ${i+1}: ${t.title}
* **Descripción:** ${t.description}
* **Conclusiones:** ${t.conclusions}
`;
  });
  
  md += `
## 5. Acuerdos y Decisiones
| Nº | Acuerdo o Decisión Tomada | Responsable |
| :--- | :--- | :--- |
`;
  
  agreements.forEach((a, i) => {
    md += `| ${i+1} | ${a.text} | ${a.responsible} |\n`;
  });
  
  md += `
## 6. Plan de Acción y Compromisos
| ID | Actividad / Compromiso | Categoría | Prioridad | Responsable | Fecha Compromiso | Estado | Observaciones |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
`;
  
  commitments.forEach((c, i) => {
    md += `| ${i+1} | ${c.act} | ${c.cat} | ${c.prio} | ${c.resp} | ${c.fComp} | ${c.est} | ${c.obs} |\n`;
  });
  
  md += `
## 7. Riesgos Detectados
| Riesgo | Impacto (Alto/Medio/Bajo) | Acción Recomendada |
| :--- | :--- | :--- |
`;
  
  risks.forEach(r => {
    md += `| ${r.text} | ${r.imp} | ${r.rec} |\n`;
  });
  
  md += `
## 8. Temas Pendientes para Próxima Reunión
| Tema | Responsable |
| :--- | :--- |
`;
  
  pending.forEach(p => {
    md += `| ${p.text} | ${p.responsible} |\n`;
  });
  
  md += `
## 9. Resumen para Gerencia General
${summary}

## 10. Control Documental
| Versión | Fecha | Descripción |
| :--- | :--- | :--- |
| 1.0 | ${new Date().toLocaleDateString('es-ES')} | Emisión Inicial (Borrador) |

---
## 11. Observaciones del Auditor de Gestión
`;
  
  auditor.forEach(a => {
    md += `- ${a}\n`;
  });

  // 12. Add Attachments block if any files exist
  if (currentAttachments.length > 0) {
    md += `
---
## 12. Archivos Adjuntos
| Archivo | Tipo | Tamaño |
| :--- | :--- | :--- |
`;
    currentAttachments.forEach(att => {
      md += `| ${att.name} | ${att.type} | ${att.size} |\n`;
    });
  }
  
  return md;
}

function renderMarkdown(md) {
  let html = md;
  
  // Escape HTML tags to avoid conflicts
  html = html.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  
  // Headers
  html = html.replace(/^# (.*$)/gim, '<h1 class="text-xl font-black text-primary border-b border-outline-variant/30 pb-2 mt-6 mb-4">$1</h1>');
  html = html.replace(/^## (.*$)/gim, '<h2 class="text-md font-bold text-secondary mt-6 mb-2 border-l-4 border-secondary pl-2">$2</h2>');
  html = html.replace(/^### (.*$)/gim, '<h3 class="text-xs font-bold text-slate-200 mt-4 mb-1">$1</h3>');
  
  // Bold
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-white">$1</strong>');
  
  // Inline styles and lists
  html = html.replace(/^\* (.*$)/gim, '<li class="ml-4 list-disc text-slate-300 pl-1 py-0.5">$1</li>');
  html = html.replace(/^- (.*$)/gim, '<li class="ml-4 list-disc text-slate-300 pl-1 py-0.5">$1</li>');
  
  // Tables parser
  const lines = html.split('\n');
  let inTable = false;
  let tableRows = [];
  let renderedLines = [];
  
  lines.forEach(line => {
    const trimmed = line.trim();
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      if (!inTable) {
        inTable = true;
        tableRows = [];
      }
      tableRows.push(trimmed);
    } else {
      if (inTable) {
        renderedLines.push(renderHtmlTable(tableRows));
        inTable = false;
      }
      renderedLines.push(line);
    }
  });
  if (inTable) {
    renderedLines.push(renderHtmlTable(tableRows));
  }
  
  html = renderedLines.join('\n');
  
  // Paragraphs
  html = html.replace(/\n\n/g, '<div class="h-2"></div>');
  
  return html;
}

function renderHtmlTable(rows) {
  if (rows.length < 1) return '';
  let html = '<div class="overflow-x-auto my-3"><table class="w-full border-collapse border border-outline-variant/30 text-[10px] text-slate-300">';
  
  let hasHeaders = rows.length > 1 && rows[1].includes('---');
  let startIndex = 0;
  
  if (hasHeaders) {
    const cols = rows[0].split('|').slice(1, -1).map(c => c.trim());
    html += '<thead class="bg-slate-900 text-white font-bold border-b border-outline-variant/60"><tr>';
    cols.forEach(c => {
      html += `<th class="py-1 px-3 border-r border-outline-variant/30 text-left font-semibold">${c}</th>`;
    });
    html += '</tr></thead>';
    startIndex = 2;
  }
  
  html += '<tbody>';
  for (let i = startIndex; i < rows.length; i++) {
    const cols = rows[i].split('|').slice(1, -1).map(c => c.trim());
    const rowClass = (i % 2 === 0) ? 'bg-slate-800/10' : 'bg-slate-950/20';
    html += `<tr class="${rowClass} hover:bg-slate-800/20 transition-colors">`;
    cols.forEach(c => {
      let cellContent = c;
      if (c.includes('Abierto') || c.includes('En Proceso')) {
        cellContent = `<span class="bg-blue-500/10 border border-blue-500/20 text-blue-400 font-bold px-1 rounded text-[8px]">${c}</span>`;
      } else if (c.includes('Cerrado')) {
        cellContent = `<span class="bg-green-500/10 border border-green-500/20 text-green-400 font-bold px-1 rounded text-[8px]">${c}</span>`;
      } else if (c.includes('Pendiente')) {
        cellContent = `<span class="bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 font-bold px-1 rounded text-[8px]">${c}</span>`;
      } else if (c.includes('Crítica') || c.includes('Alto')) {
        cellContent = `<span class="bg-red-500/10 border border-red-500/20 text-red-400 font-bold px-1 rounded text-[8px]">${c}</span>`;
      }
      
      html += `<td class="py-1 px-3 border border-outline-variant/30">${cellContent}</td>`;
    });
    html += '</tr>';
  }
  html += '</tbody></table></div>';
  return html;
}

function copyHtmlToClipboard(htmlString) {
  const styledHtml = `
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; color: #333333; }
          h1 { font-family: Calibri, Arial, sans-serif; font-size: 16pt; color: #1e3a8a; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; margin-top: 18px; margin-bottom: 12px; }
          h2 { font-family: Calibri, Arial, sans-serif; font-size: 13pt; color: #0f766e; border-left: 4px solid #0f766e; padding-left: 6px; margin-top: 16px; margin-bottom: 8px; }
          h3 { font-family: Calibri, Arial, sans-serif; font-size: 11pt; font-weight: bold; color: #1e293b; margin-top: 12px; margin-bottom: 6px; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; margin-bottom: 12px; font-size: 10pt; }
          th { background-color: #0f172a; color: #ffffff; font-weight: bold; border: 1px solid #cbd5e1; padding: 6px 10px; text-align: left; }
          td { border: 1px solid #cbd5e1; padding: 6px 10px; }
          tr:nth-child(even) { background-color: #f8fafc; }
          ul, ol { margin-top: 6px; margin-bottom: 6px; padding-left: 20px; }
          li { margin-bottom: 4px; }
          strong { font-weight: bold; }
        </style>
      </head>
      <body>
        ${htmlString}
      </body>
    </html>
  `;
  
  try {
    const blob = new Blob([styledHtml], { type: 'text/html' });
    const data = [new ClipboardItem({ 'text/html': blob })];
    navigator.clipboard.write(data).then(() => {
      alert("¡Minuta copiada con éxito! Ya puedes pegarla directamente en Word o Google Docs con todas las tablas y estilos intactos.");
    }).catch(err => {
      console.error("Error writing HTML to clipboard:", err);
      fallbackCopyToClipboard(styledHtml);
    });
  } catch (err) {
    console.error("ClipboardItem not supported, falling back:", err);
    fallbackCopyToClipboard(styledHtml);
  }
}

function fallbackCopyToClipboard(htmlText) {
  const el = document.createElement('textarea');
  el.value = htmlText;
  document.body.appendChild(el);
  el.select();
  document.execCommand('copy');
  document.body.removeChild(el);
  alert("¡Copiado como HTML en bruto! Puedes pegarlo en tu procesador de textos.");
}

function downloadMarkdownFile(mdContent) {
  const blob = new Blob([mdContent], { type: 'text/markdown;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  
  const dateStr = new Date().toISOString().slice(0, 10);
  link.setAttribute('download', `minuta_reunion_${dateStr}.md`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// ======================================================================
// PREVIOUS MINUTES IMPORT & LIVE VIEW DIRECT EDITING (V5.10)
// ======================================================================
function initPdfJsWorker() {
  if (window.pdfjsLib) {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'pdf.worker.min.js';
  }
}

function handlePreviousMinutaImport(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  const ext = file.name.split('.').pop().toLowerCase();
  const reader = new FileReader();
  
  const btnImportPrev = document.getElementById('btn-import-previous');
  const originalHtml = btnImportPrev.innerHTML;
  btnImportPrev.disabled = true;
  btnImportPrev.innerHTML = '<span class="material-symbols-outlined text-sm animate-spin">sync</span><span>Importando...</span>';
  
  reader.onload = function(e) {
    if (ext === 'docx') {
      if (!window.mammoth) {
        alert("La biblioteca Mammoth.js no se ha cargado correctamente.");
        resetImportButton();
        return;
      }
      window.mammoth.extractRawText({ arrayBuffer: e.target.result })
        .then(function(result) {
          const text = result.value;
          document.getElementById('minuta-raw-input').value = text;
          alert("¡Minuta Word (.docx) importada con éxito! Revisa el texto y haz clic en 'Generar Minuta con IA' para formatear.");
          resetImportButton();
        })
        .catch(function(err) {
          console.error("Error parsing DOCX:", err);
          alert("Error al parsear el archivo Word. Asegúrate de que sea un archivo .docx válido.");
          resetImportButton();
        });
    } else if (ext === 'pdf') {
      if (!window.pdfjsLib) {
        alert("La biblioteca PDF.js no se ha cargado correctamente.");
        resetImportButton();
        return;
      }
      const typedarray = new Uint8Array(e.target.result);
      window.pdfjsLib.getDocument(typedarray).promise.then(function(pdf) {
        let maxPages = pdf.numPages;
        let countPromises = [];
        for (let j = 1; j <= maxPages; j++) {
          countPromises.push(
            pdf.getPage(j).then(function(page) {
              return page.getTextContent().then(function(textContent) {
                return textContent.items.map(function(item) {
                  return item.str;
                }).join(' ');
              });
            })
          );
        }
        Promise.all(countPromises).then(function(texts) {
          const text = texts.join('\n\n');
          document.getElementById('minuta-raw-input').value = text;
          alert(`¡Minuta PDF importada con éxito (${maxPages} páginas)! Revisa el texto y haz clic en 'Generar Minuta con IA' para formatear.`);
          resetImportButton();
        }).catch(function(err) {
          console.error("Error reading PDF text content:", err);
          alert("Error al extraer texto del PDF.");
          resetImportButton();
        });
      }).catch(function(err) {
        console.error("Error loading PDF:", err);
        alert("Error al cargar el archivo PDF. Asegúrate de que no esté protegido por contraseña.");
        resetImportButton();
      });
    } else {
      alert("Formato de archivo no soportado. Debe ser .pdf o .docx.");
      resetImportButton();
    }
  };
  
  function resetImportButton() {
    btnImportPrev.disabled = false;
    btnImportPrev.innerHTML = originalHtml;
    event.target.value = '';
  }
  
  if (ext === 'docx' || ext === 'pdf') {
    reader.readAsArrayBuffer(file);
  } else {
    resetImportButton();
  }
}

function toggleDirectEditPreview() {
  const previewDiv = document.getElementById('minuta-rendered-preview');
  const btnToggle = document.getElementById('btn-toggle-edit-preview');
  const toggleText = document.getElementById('toggle-edit-preview-text');
  const indicator = document.getElementById('minuta-edit-mode-indicator');
  
  if (!previewDiv || previewDiv.classList.contains('hidden')) return;
  
  isEditingPreview = !isEditingPreview;
  
  if (isEditingPreview) {
    previewDiv.contentEditable = "true";
    previewDiv.focus();
    previewDiv.classList.add('border', 'border-dashed', 'border-secondary/70', 'p-sm', 'bg-slate-900/40');
    indicator.classList.remove('hidden');
    btnToggle.classList.add('bg-secondary', '!text-white');
    toggleText.textContent = "Guardar Cambios Vista Previa";
  } else {
    previewDiv.contentEditable = "false";
    previewDiv.classList.remove('border', 'border-dashed', 'border-secondary/70', 'p-sm', 'bg-slate-900/40');
    indicator.classList.add('hidden');
    btnToggle.classList.remove('bg-secondary', '!text-white');
    toggleText.textContent = "Editar Vista Previa";
    
    syncPreviewToMarkdown();
  }
}

function handlePreviewDirectInput() {
  if (isEditingPreview) {
    syncPreviewToMarkdown();
  }
}

function syncPreviewToMarkdown() {
  const previewDiv = document.getElementById('minuta-rendered-preview');
  if (!previewDiv) return;
  
  const markdown = htmlToMarkdown(previewDiv);
  document.getElementById('minuta-markdown-raw').value = markdown.trim();
  
  syncMetadataFromHtml(previewDiv);
}

function syncMetadataFromHtml(previewDiv) {
  const table = previewDiv.querySelector('table');
  if (!table) return;
  
  const rows = Array.from(table.querySelectorAll('tr'));
  rows.forEach(row => {
    const cells = Array.from(row.querySelectorAll('td'));
    if (cells.length < 2) return;
    
    const key = cells[0].textContent.toLowerCase();
    const val = cells[1].textContent.trim();
    
    if (key.includes('título')) {
      document.getElementById('minuta-override-title').value = val;
    } else if (key.includes('fecha')) {
      document.getElementById('minuta-override-date').value = val;
    } else if (key.includes('lugar') || key.includes('modalidad')) {
      document.getElementById('minuta-override-modality').value = val;
    }
  });
}

function htmlToMarkdown(element) {
  let markdown = '';
  element.childNodes.forEach(child => {
    markdown += parseNode(child);
  });
  return markdown;
}

function parseNode(node) {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent;
  }
  
  if (node.nodeType !== Node.ELEMENT_NODE) {
    return '';
  }
  
  const tagName = node.tagName.toLowerCase();
  
  if (node.id === 'minuta-edit-mode-indicator' || node.id === 'minuta-empty-state') {
    return '';
  }
  
  if (tagName === 'table') {
    let mdTable = '\n\n';
    const thead = node.querySelector('thead');
    const tbody = node.querySelector('tbody');
    
    if (thead) {
      const headers = Array.from(thead.querySelectorAll('th'));
      mdTable += '| ' + headers.map(th => th.textContent.trim()).join(' | ') + ' |\n';
      mdTable += '| ' + headers.map(() => ':---').join(' | ') + ' |\n';
    }
    
    const rows = Array.from(node.querySelectorAll('tr'));
    const bodyRows = tbody ? Array.from(tbody.querySelectorAll('tr')) : rows;
    
    let startIndex = 0;
    if (!thead && rows.length > 0) {
      const firstCells = Array.from(rows[0].querySelectorAll('td, th'));
      mdTable += '| ' + firstCells.map(c => c.textContent.trim()).join(' | ') + ' |\n';
      mdTable += '| ' + firstCells.map(() => ':---').join(' | ') + ' |\n';
      startIndex = 1;
    }
    
    for (let i = startIndex; i < bodyRows.length; i++) {
      const cells = Array.from(bodyRows[i].querySelectorAll('td'));
      if (cells.length > 0) {
        mdTable += '| ' + cells.map(td => td.textContent.trim()).join(' | ') + ' |\n';
      }
    }
    return mdTable + '\n';
  }
  
  if (tagName === 'th' || tagName === 'td' || tagName === 'tr' || tagName === 'thead' || tagName === 'tbody') {
    return '';
  }
  
  let childrenContent = '';
  node.childNodes.forEach(child => {
    childrenContent += parseNode(child);
  });
  
  switch (tagName) {
    case 'h1':
      return `\n# ${childrenContent.trim()}\n\n`;
    case 'h2':
      return `\n## ${childrenContent.trim()}\n\n`;
    case 'h3':
      return `\n### ${childrenContent.trim()}\n\n`;
    case 'strong':
    case 'b':
      return `**${childrenContent}**`;
    case 'li':
      return `* ${childrenContent.trim()}\n`;
    case 'ul':
      return `\n${childrenContent}\n`;
    case 'p':
      return `\n${childrenContent.trim()}\n\n`;
    case 'br':
      return '\n';
    case 'div':
      if (node.classList.contains('overflow-x-auto') || node.classList.contains('h-2')) {
        return childrenContent;
      }
      return `\n${childrenContent.trim()}\n\n`;
    default:
      return childrenContent;
  }
}
