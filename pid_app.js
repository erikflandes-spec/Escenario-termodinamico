// ======================================================================
// INTERACTIVE P&ID VUE APP
// ======================================================================
const { createApp, ref, computed, watch, onMounted } = Vue;

const app = createApp({
  setup() {
    // Mode toggles
    const editorMode = ref(false);
    const showSidebar = ref(false);
    const bgTheme = ref('dark');
    
    // Popup states for floating cards
    const openPopups = ref({
      vyncke: false,
      c1: false,
      c3: false,
      c4: false,
      tissue: false,
      papeles: false,
      desgasificador: false,
      secador: false,
      atemp_10_doble: false,
      atemp_3_unico: false
    });
    
    // Core structures
    const defaultCalderas = [
      { id: 'vyncke', nombre: 'Caldera Vyncke', tipo: 'Biomasa', capacity: 20, pressure: 19, operational: false, dest: '20b', isCustom: false },
      { id: 'c1', nombre: 'Caldera 1 (Gas)', tipo: 'Gas', capacity: 35, pressure: 20, operational: true, dest: '20b', isCustom: false },
      { id: 'c3', nombre: 'Caldera 3', tipo: 'Biomasa', capacity: 55, pressure: 41, operational: false, dest: '41b', isCustom: false },
      { id: 'c4', nombre: 'Caldera 4', tipo: 'Biomasa', capacity: 35, pressure: 41, operational: true, dest: '41b', isCustom: false }
    ];

    const defaultConsumidores = [
      { id: 'tissue', nombre: 'FPC Tissue', load: 15, actualLoad: 15, futuroLoad: 20, consumoMode: 'actual', dest: '20b', isCustom: false },
      { id: 'papeles-20b', nombre: 'Papeles 20 Bar', load: 3.5, actualLoad: 3.5, futuroLoad: 5.0, consumoMode: 'actual', dest: '20b', isCustom: false },
      { id: 'papeles-10b', nombre: 'Papeles 10 Bar', load: 17, actualLoad: 17, futuroLoad: 25.0, consumoMode: 'actual', dest: '10b', isCustom: false },
      { id: 'papeles-3b', nombre: 'Papeles 3 Bar', load: 7, actualLoad: 7, futuroLoad: 10.0, consumoMode: 'actual', dest: '3b', isCustom: false },
      { id: 'desgasificador', nombre: 'Desgasificador', load: 2.8, actualLoad: 2.8, futuroLoad: 2.8, consumoMode: 'actual', dest: '3b', isCustom: false },
      { id: 'secador', nombre: 'Secador Biomasa', load: 9.0, actualLoad: 9.0, futuroLoad: 9.0, consumoMode: 'actual', dest: '3b', isCustom: false }
    ];

    const defaultValves = {
      vm: true,
      c1_backup: true,
      vyncke_backup: false,
      tg3_10b_backup: false,
      tg3_3b_backup: false,
      c1_reducing: false,
      reductora_20_10: 'off',
      reductora_10_3: 'off',
      atemp_20: true,
      atemp_10: true,
      atemp_3: true
    };

    const defaultLines = [
      { id: 'vyncke_hp', points: [{x: 295, y: 70}, {x: 295, y: 150}], color: '#f66018', style: 'solid', flowKey: 'vyncke_hp' },
      { id: 'vyncke', points: [{x: 295, y: 150}, {x: 445, y: 150}, {x: 445, y: 206}], color: '#f66018', style: 'solid', flowKey: 'vyncke' },
      { id: 'c1_backup', points: [{x: 240, y: 215}, {x: 240, y: 150}, {x: 295, y: 150}], color: '#f66018', style: 'dashed', flowKey: 'c1_backup' },
      { id: 'c1_backup_hp', points: [{x: 240, y: 280}, {x: 240, y: 215}], color: '#f66018', style: 'solid', flowKey: 'c1_backup_hp' },
      { id: 'c1_reducing_hp', points: [{x: 240, y: 280}, {x: 290, y: 280}], color: '#f66018', style: 'solid', flowKey: 'c1_reducing_hp' },
      { id: 'c1_10b', points: [{x: 290, y: 280}, {x: 335, y: 280}, {x: 335, y: 322}, {x: 420, y: 322}], color: '#2563eb', style: 'solid', flowKey: 'c1_10b' },
      { id: 'c1_discharge', points: [{x: 190, y: 280}, {x: 240, y: 280}], color: '#f66018', style: 'solid', flowKey: 'c1_discharge' },
      { id: 'vyncke_backup', points: [{x: 270, y: 310}, {x: 270, y: 150}, {x: 295, y: 150}], color: '#f66018', style: 'solid', flowKey: 'vyncke_backup' },
      { id: 'vyncke_backup_hp', points: [{x: 270, y: 580}, {x: 270, y: 310}], color: '#ef4444', style: 'solid', flowKey: 'vyncke_backup_hp' },
      { id: 'c3', points: [{x: 190, y: 430}, {x: 240, y: 430}, {x: 240, y: 580}], color: '#ef4444', style: 'solid', flowKey: 'c3' },
      { id: 'c4', points: [{x: 190, y: 540}, {x: 220, y: 540}, {x: 220, y: 580}], color: '#ef4444', style: 'solid', flowKey: 'c4' },
      { id: 'tg3_inlet', points: [{x: 415, y: 580}, {x: 415, y: 562}], color: '#ef4444', style: 'solid', flowKey: 'tg3_inlet' },
      { id: 'tg3_10b', points: [{x: 415, y: 492}, {x: 415, y: 322}], color: '#2563eb', style: 'solid', flowKey: 'tg3_10b' },
      { id: 'tg3_3b', points: [{x: 445, y: 492}, {x: 445, y: 442}, {x: 635, y: 442}], color: '#94a3b8', style: 'solid', flowKey: 'tg3_3b' },
      { id: 'tg3_10b_backup', points: [{x: 330, y: 420}, {x: 330, y: 322}, {x: 400, y: 322}], color: '#2563eb', style: 'solid', flowKey: 'tg3_10b_backup' },
      { id: 'tg3_10b_backup_hp', points: [{x: 330, y: 580}, {x: 330, y: 420}], color: '#ef4444', style: 'solid', flowKey: 'tg3_10b_backup_hp' },
      { id: 'tg3_3b_backup', points: [{x: 620, y: 515}, {x: 620, y: 442}, {x: 635, y: 442}], color: '#94a3b8', style: 'solid', flowKey: 'tg3_3b_backup' },
      { id: 'tg3_3b_backup_hp', points: [{x: 620, y: 580}, {x: 620, y: 515}], color: '#ef4444', style: 'solid', flowKey: 'tg3_3b_backup_hp' },
      { id: 'tissue_line', points: [{x: 538, y: 206}, {x: 538, y: 172}], color: '#f66018', style: 'solid', flowKey: 'tissue_line' },
      { id: 'papeles_20b', points: [{x: 670, y: 206}, {x: 690, y: 206}, {x: 690, y: 132}, {x: 710, y: 132}], color: '#f66018', style: 'solid', flowKey: 'papeles_20b' },
      { id: 'papeles_10b', points: [{x: 670, y: 322}, {x: 690, y: 322}, {x: 690, y: 160}, {x: 710, y: 160}], color: '#2563eb', style: 'solid', flowKey: 'papeles_10b' },
      { id: 'papeles_3b', points: [{x: 700, y: 442}, {x: 700, y: 188}, {x: 710, y: 188}], color: '#94a3b8', style: 'solid', flowKey: 'papeles_3b' },
      { id: 'desgasificador', points: [{x: 650, y: 442}, {x: 650, y: 480}, {x: 755, y: 480}, {x: 755, y: 510}], color: '#94a3b8', style: 'solid', flowKey: 'desgasificador' },
      { id: 'secador', points: [{x: 705, y: 442}, {x: 830, y: 442}, {x: 830, y: 500}, {x: 860, y: 500}], color: '#94a3b8', style: 'solid', flowKey: 'secador' },
      { id: 'reductora_20_10_hp', points: [{x: 610, y: 206}, {x: 610, y: 264}], color: '#f66018', style: 'solid', flowKey: '' },
      { id: 'reductora_20_10_lp', points: [{x: 610, y: 264}, {x: 610, y: 322}], color: '#2563eb', style: 'solid', flowKey: 'reductora_20_10' },
      { id: 'reductora_10_3_hp', points: [{x: 640, y: 322}, {x: 640, y: 382}], color: '#2563eb', style: 'solid', flowKey: '' },
      { id: 'reductora_10_3_lp', points: [{x: 640, y: 382}, {x: 640, y: 442}], color: '#94a3b8', style: 'solid', flowKey: 'reductora_10_3' }
    ];

    const defaultLabels = [
      { id: 'lbl-man-20', x: 470, y: 195, text: 'COLECTOR 20 BAR', color: '#ffb599', size: '8.5px', isBold: true },
      { id: 'lbl-man-10', x: 450, y: 310, text: 'COLECTOR 10 BAR', color: '#b4c5ff', size: '8.5px', isBold: true },
      { id: 'lbl-man-3', x: 645, y: 430, text: 'COLECTOR 3 BAR', color: '#eef1f0', size: '8.5px', isBold: true }
    ];

    const defaultValveLabelOffsets = {
      vm: { x: 10, y: -9, w: 32, h: 18 },
      c1_backup: { x: 10, y: -9, w: 60, h: 18 },
      c1_reducing: { x: -45, y: 10, w: 90, h: 18 },
      vyncke_backup: { x: 10, y: -9, w: 90, h: 18 },
      tg3_10b_backup: { x: -72, y: -9, w: 62, h: 18 },
      tg3_3b_backup: { x: 10, y: -9, w: 60, h: 18 },
      reductora_20_10: { x: 10, y: -9, w: 96, h: 18 },
      reductora_10_3: { x: 10, y: -9, w: 92, h: 18 }
    };

    const defaultAtemp10 = {
      configType: 'double',
      pressure: 11.0,
      tempInitial: 350,
      tempIntermediate: 260,
      tempTarget: 190,
      tempWater: 100,
      flowMode: 'fixed',
      customFlow: 21.8,
      independentInit: true
    };

    const defaultAtemp3 = {
      configType: 'single',
      pressure: 3.0,
      tempInitial: 200,
      tempTarget: 145,
      tempWater: 100,
      flowMode: 'fixed',
      customFlow: 18.8,
      independentInit: true
    };

    // Load states or fallback
    const savedState = localStorage.getItem('steamoptix_pid_state_v3');
    let initialState = {};
    if (savedState) {
      try { initialState = JSON.parse(savedState) || {}; } catch(e) { console.error("Error parsing saved state:", e); }
    }

    // Robust state sanitization to prevent initialization / rendering halts from mismatching schemas or strings in localStorage
    const sanitizeState = (state) => {
      const clean = {};
      const toBool = (v, fallback) => typeof v === 'boolean' ? v : (v !== undefined && v !== null ? Boolean(v) : fallback);
      const toNum = (v, fallback) => {
        if (typeof v === 'number' && !isNaN(v)) return v;
        const p = parseFloat(v);
        return isNaN(p) ? fallback : p;
      };
      const toStr = (v, fallback) => typeof v === 'string' ? v : (v !== undefined && v !== null ? String(v) : fallback);

      // 1. Calderas
      if (state && Array.isArray(state.calderas) && state.calderas.length > 0) {
        clean.calderas = state.calderas.map((c, index) => {
          const def = defaultCalderas.find(dc => dc.id === c.id) || defaultCalderas[index] || {};
          return {
            id: toStr(c.id, 'boiler-' + index),
            nombre: toStr(c.nombre, def.nombre || 'Caldera'),
            tipo: toStr(c.tipo, def.tipo || 'Biomasa'),
            capacity: toNum(c.capacity, def.capacity || 0),
            pressure: toNum(c.pressure, def.pressure || 0),
            operational: toBool(c.operational, def.operational !== undefined ? def.operational : true),
            dest: toStr(c.dest, def.dest || '41b'),
            isCustom: toBool(c.isCustom, def.isCustom || false)
          };
        });
      } else {
        clean.calderas = JSON.parse(JSON.stringify(defaultCalderas));
      }

      // 2. Consumidores
      if (state && Array.isArray(state.consumidores) && state.consumidores.length > 0) {
        clean.consumidores = state.consumidores.map((c, index) => {
          const def = defaultConsumidores.find(dc => dc.id === c.id) || defaultConsumidores[index] || {};
          return {
            id: toStr(c.id, 'consumer-' + index),
            nombre: toStr(c.nombre, def.nombre || 'Consumidor'),
            load: toNum(c.load, def.load || 0),
            actualLoad: toNum(c.actualLoad, def.actualLoad || def.load || 0),
            futuroLoad: toNum(c.futuroLoad, def.futuroLoad || def.load || 0),
            consumoMode: toStr(c.consumoMode, def.consumoMode || 'actual'),
            dest: toStr(c.dest, def.dest || '3b'),
            isCustom: toBool(c.isCustom, def.isCustom || false)
          };
        });
      } else {
        clean.consumidores = JSON.parse(JSON.stringify(defaultConsumidores));
      }

      // 3. Valves
      clean.valves = {};
      const stateValves = (state && typeof state.valves === 'object' && state.valves !== null) ? state.valves : {};
      for (const k in defaultValves) {
        if (k === 'reductora_20_10' || k === 'reductora_10_3') {
          const val = stateValves[k];
          clean.valves[k] = (val === 'off' || val === 'auto' || val === 'manual') ? val : defaultValves[k];
        } else {
          clean.valves[k] = toBool(stateValves[k], defaultValves[k]);
        }
      }

      // 4. Lines
      if (state && Array.isArray(state.lines) && state.lines.length > 0) {
        const existing = state.lines.map((l, index) => {
          const def = defaultLines.find(dl => dl.id === l.id) || {};
          let points = (Array.isArray(l.points) && l.points.length > 0)
            ? l.points.map(p => ({ x: toNum(p?.x, 0), y: toNum(p?.y, 0) }))
            : (def.points ? JSON.parse(JSON.stringify(def.points)) : [{x: 100, y: 100}, {x: 200, y: 100}]);
          
          // Migration for vyncke line split: if it's 'vyncke' and has old 4 points schema, reset points to the new default
          if (l.id === 'vyncke' && points.length === 4 && points[0].y === 70) {
            points = def.points ? JSON.parse(JSON.stringify(def.points)) : [{x: 295, y: 150}, {x: 445, y: 150}, {x: 445, y: 206}];
          }

          const badgeOffset = l.badgeOffset ? { x: toNum(l.badgeOffset.x, 0), y: toNum(l.badgeOffset.y, 0) } : { x: 0, y: 0 };
          return {
            id: toStr(l.id, 'line-' + index),
            points: points,
            color: toStr(l.color, def.color || '#94a3b8'),
            style: toStr(l.style, def.style || 'solid'),
            flowKey: def.id ? def.flowKey : toStr(l.flowKey, ''),
            badgeOffset: badgeOffset
          };
        });
        const missing = defaultLines.filter(dl => !existing.some(el => el.id === dl.id));
        clean.lines = [...existing, ...JSON.parse(JSON.stringify(missing))];
      } else {
        clean.lines = JSON.parse(JSON.stringify(defaultLines)).map(l => ({
          ...l,
          badgeOffset: { x: 0, y: 0 }
        }));
      }

      // 5. Labels
      if (state && Array.isArray(state.labels) && state.labels.length > 0) {
        const existing = state.labels.map((lbl, index) => {
          const def = defaultLabels.find(dl => dl.id === lbl.id) || {};
          const x = (lbl.x !== undefined) ? toNum(lbl.x, def.x !== undefined ? def.x : 100) : (def.x !== undefined ? def.x : 100);
          const y = (lbl.y !== undefined) ? toNum(lbl.y, def.y !== undefined ? def.y : 100) : (def.y !== undefined ? def.y : 100);
          const text = (lbl.text !== undefined) ? toStr(lbl.text, def.text !== undefined ? def.text : '') : (def.text !== undefined ? def.text : '');
          return {
            id: toStr(lbl.id, 'label-' + index),
            x: x,
            y: y,
            text: text,
            color: toStr(lbl.color, def.color || '#ffffff'),
            size: toStr(lbl.size, def.size || '12px'),
            isBold: toBool(lbl.isBold, def.isBold || false)
          };
        });
        const missing = defaultLabels.filter(dl => !existing.some(el => el.id === dl.id));
        clean.labels = [...existing, ...JSON.parse(JSON.stringify(missing))]
          .filter(lbl => lbl.id !== 'title' && !['lbl-c1-backup-intercon', 'lbl-c_vyncke-backup-intercon', 'lbl-man-41'].includes(lbl.id));
      } else {
        clean.labels = JSON.parse(JSON.stringify(defaultLabels))
          .filter(lbl => lbl.id !== 'title' && !['lbl-c1-backup-intercon', 'lbl-c_vyncke-backup-intercon', 'lbl-man-41'].includes(lbl.id));
      }

      // 6. Equipment Positions
      if (state && state.equipmentPositions) {
        clean.equipmentPositions = {};
        const defaultPos = {
          vyncke: { x: 235, y: 15, w: 120, h: 55 },
          c1: { x: 40, y: 250, w: 150, h: 60 },
          c3: { x: 40, y: 400, w: 150, h: 60 },
          c4: { x: 40, y: 510, w: 150, h: 60 },
          tissue: { x: 478, y: 115, w: 130, h: 85 },
          papeles: { x: 710, y: 115, w: 155, h: 125 },
          desgasificador: { x: 755, y: 485, w: 110, h: 50 },
          secador: { x: 860, y: 475, w: 110, h: 50 },
          tg3: { x: 370, y: 492, w: 90, h: 70 },
          atemp_10_doble: { x: 0, y: 0, w: 0, h: 0 },
          atemp_3_unico: { x: 0, y: 0, w: 0, h: 0 }
        };
        for (const key in defaultPos) {
          const sp = state.equipmentPositions[key] || {};
          const dp = defaultPos[key];
          // Force update FPC Tissue and FPC Papeles width/height to fit new buttons
          const w = (key === 'tissue' || key === 'papeles') ? dp.w : toNum(sp.w, dp.w);
          const h = (key === 'tissue' || key === 'papeles') ? dp.h : toNum(sp.h, dp.h);
          let yVal = toNum(sp.y, dp.y);
          // Ensure TG3 has room above it for the double & single attemperators
          if (key === 'tg3' && yVal < 485) {
            yVal = 492;
          }
          clean.equipmentPositions[key] = {
            x: toNum(sp.x, dp.x),
            y: yVal,
            w: w,
            h: h
          };
        }
      } else {
        clean.equipmentPositions = {
          vyncke: { x: 235, y: 15, w: 120, h: 55 },
          c1: { x: 40, y: 250, w: 150, h: 60 },
          c3: { x: 40, y: 400, w: 150, h: 60 },
          c4: { x: 40, y: 510, w: 150, h: 60 },
          tissue: { x: 478, y: 115, w: 130, h: 85 },
          papeles: { x: 710, y: 115, w: 155, h: 125 },
          desgasificador: { x: 755, y: 485, w: 110, h: 50 },
          secador: { x: 860, y: 475, w: 110, h: 50 },
          tg3: { x: 370, y: 492, w: 90, h: 70 },
          atemp_10_doble: { x: 0, y: 0, w: 0, h: 0 },
          atemp_3_unico: { x: 0, y: 0, w: 0, h: 0 }
        };
      }

      // Migrate tg3 lines if tg3_10b still had old short points so both attemperators fit cleanly
      const tg3Line10 = clean.lines.find(l => l.id === 'tg3_10b');
      if (tg3Line10 && tg3Line10.points && tg3Line10.points.length >= 2) {
        const maxY = Math.max(tg3Line10.points[0].y, tg3Line10.points[tg3Line10.points.length - 1].y);
        if (maxY < 485) {
          const cx = clean.equipmentPositions.tg3.x + 45;
          const topY = clean.equipmentPositions.tg3.y;
          tg3Line10.points = [{ x: cx, y: topY }, { x: cx, y: 322 }];
          const tg3In = clean.lines.find(l => l.id === 'tg3_inlet');
          if (tg3In) tg3In.points = [{ x: cx, y: 580 }, { x: cx, y: topY + 70 }];
          const tg3Line3 = clean.lines.find(l => l.id === 'tg3_3b');
          if (tg3Line3 && tg3Line3.points[0]?.y < 485) {
            tg3Line3.points = [{ x: cx + 30, y: topY }, { x: cx + 30, y: 442 }, { x: 635, y: 442 }];
          }
        }
      }

      // Ensure tg3_3b and Bypass 3B have space for the Single Attemperator and two flowmeters on 3 Bar
      const tg3Line3M = clean.lines.find(l => l.id === 'tg3_3b');
      if (tg3Line3M && tg3Line3M.points && tg3Line3M.points.length >= 2) {
        const lastPt = tg3Line3M.points[tg3Line3M.points.length - 1];
        if ((lastPt && lastPt.x < 620) || tg3Line3M.points[0]?.y < 485) {
          const cx = clean.equipmentPositions.tg3.x + 45;
          const topY = clean.equipmentPositions.tg3.y;
          tg3Line3M.points = [{ x: cx + 30, y: topY }, { x: cx + 30, y: 442 }, { x: 635, y: 442 }];
        }
      }
      const tg3Bkp3M = clean.lines.find(l => l.id === 'tg3_3b_backup');
      if (tg3Bkp3M && tg3Bkp3M.points && tg3Bkp3M.points[0]?.x < 610) {
        tg3Bkp3M.points = [{ x: 620, y: 515 }, { x: 620, y: 442 }, { x: 635, y: 442 }];
      }
      const tg3Bkp3HpM = clean.lines.find(l => l.id === 'tg3_3b_backup_hp');
      if (tg3Bkp3HpM && tg3Bkp3HpM.points && tg3Bkp3HpM.points[0]?.x < 610) {
        tg3Bkp3HpM.points = [{ x: 620, y: 580 }, { x: 620, y: 515 }];
      }
      const lblMan3 = clean.labels.find(l => l.id === 'lbl-man-3');
      if (lblMan3 && lblMan3.x < 630) {
        lblMan3.x = 645;
      }

      // 7. Valve Label Offsets
      if (state && state.valveLabelOffsets) {
        clean.valveLabelOffsets = {};
        for (const key in defaultValveLabelOffsets) {
          const sp = state.valveLabelOffsets[key] || {};
          const dp = defaultValveLabelOffsets[key];
          const wasNarrow = toNum(sp.w, 0) < dp.w;
          clean.valveLabelOffsets[key] = {
            x: wasNarrow ? dp.x : toNum(sp.x, dp.x),
            y: toNum(sp.y, dp.y),
            w: dp.w,
            h: dp.h
          };
        }
      } else {
        clean.valveLabelOffsets = JSON.parse(JSON.stringify(defaultValveLabelOffsets));
      }

      // 8 & 9. Double (10 Bar) and Single (3 Bar) Attemperator Configurations (with priority to steamoptix_attemperator_state_v2)
      let dualSaved = null;
      try {
        const rawDual = localStorage.getItem('steamoptix_attemperator_state_v2');
        if (rawDual) dualSaved = JSON.parse(rawDual);
      } catch (e) {}

      const sa = (state && typeof state.atemp10 === 'object' && state.atemp10 !== null && state.atemp10.independentInit === true) ? state.atemp10 : {};
      clean.atemp10 = {
        configType: 'double',
        pressure: toNum(dualSaved?.double?.pressure !== undefined ? dualSaved.double.pressure : sa.pressure, defaultAtemp10.pressure),
        tempInitial: toNum(dualSaved?.double?.tempInitial !== undefined ? dualSaved.double.tempInitial : sa.tempInitial, defaultAtemp10.tempInitial),
        tempIntermediate: toNum(dualSaved?.double?.tempIntermediate !== undefined ? dualSaved.double.tempIntermediate : sa.tempIntermediate, defaultAtemp10.tempIntermediate),
        tempTarget: toNum(dualSaved?.double?.tempTarget !== undefined ? dualSaved.double.tempTarget : sa.tempTarget, defaultAtemp10.tempTarget),
        tempWater: toNum(dualSaved?.double?.tempWater !== undefined ? dualSaved.double.tempWater : sa.tempWater, defaultAtemp10.tempWater),
        flowMode: dualSaved?.double?.steamFlow !== undefined ? 'fixed' : ((sa.flowMode === 'auto' || sa.flowMode === 'fixed') ? sa.flowMode : defaultAtemp10.flowMode),
        customFlow: toNum(dualSaved?.double?.steamFlow !== undefined ? dualSaved.double.steamFlow : sa.customFlow, defaultAtemp10.customFlow),
        independentInit: true
      };

      const sa3 = (state && typeof state.atemp3 === 'object' && state.atemp3 !== null && state.atemp3.independentInit === true) ? state.atemp3 : {};
      clean.atemp3 = {
        configType: 'single',
        pressure: toNum(dualSaved?.single?.pressure !== undefined ? dualSaved.single.pressure : sa3.pressure, defaultAtemp3.pressure),
        tempInitial: toNum(dualSaved?.single?.tempInitial !== undefined ? dualSaved.single.tempInitial : sa3.tempInitial, defaultAtemp3.tempInitial),
        tempTarget: toNum(dualSaved?.single?.tempTarget !== undefined ? dualSaved.single.tempTarget : sa3.tempTarget, defaultAtemp3.tempTarget),
        tempWater: toNum(dualSaved?.single?.tempWater !== undefined ? dualSaved.single.tempWater : sa3.tempWater, defaultAtemp3.tempWater),
        flowMode: dualSaved?.single?.steamFlow !== undefined ? 'fixed' : ((sa3.flowMode === 'auto' || sa3.flowMode === 'fixed') ? sa3.flowMode : defaultAtemp3.flowMode),
        customFlow: toNum(dualSaved?.single?.steamFlow !== undefined ? dualSaved.single.steamFlow : sa3.customFlow, defaultAtemp3.customFlow),
        independentInit: true
      };

      return clean;
    };

    const cleanState = sanitizeState(initialState);

    const calderas = ref(cleanState.calderas);
    const consumidores = ref(cleanState.consumidores);
    const valves = ref(cleanState.valves);
    const lines = ref(cleanState.lines);
    const valveLabelOffsets = ref(cleanState.valveLabelOffsets);
    const labels = ref(cleanState.labels);
    const atemp10 = ref(cleanState.atemp10);
    const atemp3 = ref(cleanState.atemp3);

    // Filter customs
    const customBoilers = computed(() => calderas.value.filter(c => c.isCustom));
    const customConsumers = computed(() => consumidores.value.filter(c => c.isCustom));

    // Element selection
    const selectedElement = ref(null);
    const selectedLine = computed(() => {
      if (!selectedElement.value || selectedElement.value.type !== 'line') return null;
      return lines.value.find(l => l.id === selectedElement.value.id);
    });
    const selectedLabel = computed(() => {
      if (!selectedElement.value || selectedElement.value.type !== 'label') return null;
      return labels.value.find(l => l.id === selectedElement.value.id);
    });

    // Modals
    const showAddBoilerModal = ref(false);
    const showAddConsumerModal = ref(false);
    const newBoilerForm = ref({ nombre: '', tipo: 'Biomasa', capacity: 10, pressure: 20, dest: '20b' });
    const newConsumerForm = ref({ nombre: '', load: 5, dest: '3b' });

    // Drag-and-drop mechanics
    const svgRef = ref(null);
    const containerRef = ref(null);
    const scale = ref(1);
    const activeDrag = ref(null);
    let dragOffset = { x: 0, y: 0 };

    const equipmentPositions = ref(cleanState.equipmentPositions || {
      vyncke: { x: 235, y: 15, w: 120, h: 55 },
      c1: { x: 40, y: 250, w: 150, h: 60 },
      c3: { x: 40, y: 400, w: 150, h: 60 },
      c4: { x: 40, y: 510, w: 150, h: 60 },
      tissue: { x: 478, y: 115, w: 130, h: 85 },
      papeles: { x: 710, y: 115, w: 155, h: 125 },
      desgasificador: { x: 755, y: 485, w: 110, h: 50 },
      secador: { x: 860, y: 475, w: 110, h: 50 },
      tg3: { x: 370, y: 492, w: 90, h: 70 },
      atemp_10_doble: { x: 0, y: 0, w: 0, h: 0 },
      atemp_3_unico: { x: 0, y: 0, w: 0, h: 0 }
    });

    // Thermodynamic properties for Double Attemperator on 10 Bar TG3 extraction line
    const atemp10Props = computed(() => {
      const cfg = atemp10.value || defaultAtemp10;
      const pMan = Number(cfg.pressure) || 11.0;
      const pAbsVal = pMan + 1.013;
      const t1 = Number(cfg.tempInitial) || 350;
      const tInt = Number(cfg.tempIntermediate) || 260;
      const t3 = Number(cfg.tempTarget) || 190;
      const tw = Number(cfg.tempWater) || 100;

      let tSat = 188.0;
      let h1 = 3154.1;
      let h2 = 420.3;
      let hInt = 2957.0;
      let h3 = 2801.9;

      try {
        if (window.interpSat) {
          const sat = window.interpSat(pAbsVal);
          if (sat && sat.t) tSat = sat.t;
        }
        if (window.calculatePointProperties) {
          h1 = window.calculatePointProperties(pAbsVal, t1, 1).h || 3154.1;
          h2 = window.calculatePointProperties(pAbsVal, tw, 2).h || 420.3;
          hInt = window.calculatePointProperties(pAbsVal, tInt, 9).h || 2957.0;
          if (t3 <= tSat && window.interpSat) {
            h3 = window.interpSat(pAbsVal).hg || 2784.0;
          } else {
            h3 = window.calculatePointProperties(pAbsVal, t3, 3).h || 2801.9;
          }
        }
      } catch (e) {
        // Use reference defaults on error
      }

      const r1 = Math.max(0, (h1 - hInt) / Math.max(1, hInt - h2));
      const r2 = Math.max(0, (hInt - h3) / Math.max(1, h3 - h2));
      const rTotal = cfg.configType === 'double'
        ? ((1 + r1) * (1 + r2) - 1)
        : Math.max(0, (h1 - h3) / Math.max(1, h3 - h2));

      return { tSat, h1, h2, hInt, h3, r1, r2, rTotal };
    });

    // Dynamic canvas position of the Double Attemperator along the tg3_10b line
    const atemp10Pos = computed(() => {
      const line = lines.value.find(l => l.id === 'tg3_10b');
      let cx = 415;
      let cy = 398;
      if (line && line.points && line.points.length >= 2) {
        const p0 = line.points[0];
        const p1 = line.points[line.points.length - 1];
        cx = Math.round((p0.x + p1.x) / 2);
        const yMin = Math.min(p0.y, p1.y);
        const yMax = Math.max(p0.y, p1.y);
        cy = (yMax - yMin >= 110) ? Math.round(yMin + 76) : Math.round((yMin + yMax) / 2);
      }
      const off = equipmentPositions.value.atemp_10_doble || { x: 0, y: 0 };
      return {
        x: cx + (off.x || 0),
        y: cy + (off.y || 0)
      };
    });

    // Thermodynamic properties for Single Attemperator on 3 Bar TG3 extraction line
    const atemp3Props = computed(() => {
      const cfg = atemp3.value || defaultAtemp3;
      const pMan = Number(cfg.pressure) || 3.0;
      const pAbsVal = pMan + 1.013;
      const t1 = Number(cfg.tempInitial) || 200;
      const t3 = Number(cfg.tempTarget) || 145;
      const tw = Number(cfg.tempWater) || 100;

      let tSat = 143.7;
      let h1 = 2862.0;
      let h2 = 419.4;
      let h3 = 2745.0;

      try {
        if (window.interpSat) {
          const sat = window.interpSat(pAbsVal);
          if (sat && sat.t) tSat = sat.t;
        }
        if (window.calculatePointProperties) {
          h1 = window.calculatePointProperties(pAbsVal, t1, 1).h || 2862.0;
          h2 = window.calculatePointProperties(pAbsVal, tw, 2).h || 419.4;
          if (t3 <= tSat && window.interpSat) {
            h3 = window.interpSat(pAbsVal).hg || 2738.0;
          } else {
            h3 = window.calculatePointProperties(pAbsVal, t3, 3).h || 2745.0;
          }
        }
      } catch (e) {
        // Use reference defaults on error
      }

      const rTotal = Math.max(0, (h1 - h3) / Math.max(1, h3 - h2));
      return { tSat, h1, h2, h3, rTotal };
    });

    // Dynamic canvas position of the Single Attemperator along the tg3_3b horizontal line
    const atemp3Pos = computed(() => {
      const line = lines.value.find(l => l.id === 'tg3_3b');
      let cx = 518;
      let cy = 442;
      if (line && line.points && line.points.length >= 2) {
        const pLast = line.points[line.points.length - 1];
        const pPrev = line.points[line.points.length - 2];
        if (pLast && pPrev) {
          cy = pLast.y;
          cx = Math.round(pPrev.x + 73);
        }
      }
      const off = equipmentPositions.value.atemp_3_unico || { x: 0, y: 0 };
      return {
        x: cx + (off.x || 0),
        y: cy + (off.y || 0)
      };
    });

    const updateScale = () => {
      if (containerRef.value) {
        const cw = containerRef.value.clientWidth;
        const ch = containerRef.value.clientHeight;
        scale.value = Math.min(cw / 1000, ch / 650);
      }
    };

    onMounted(() => {
      updateScale();
      window.addEventListener('resize', updateScale);
      setTimeout(updateScale, 200);
    });

    // Solver logic
    const flows = computed(() => {
      // Initialize flows
      const f = {
        vyncke_hp: 0, vyncke: 0, c1_backup: 0, c1_reducing_hp: 0, c1_10b: 0, vyncke_backup: 0,
        c3: 0, c4: 0, tg3_inlet: 0, tg3_10b: 0, tg3_3b: 0,
        tg3_10b_backup: 0, tg3_3b_backup: 0,
        tissue_line: 0, papeles_20b: 0, papeles_10b: 0, papeles_3b: 0,
        desgasificador: 0, secador: 0,
        reductora_20_10: 0, reductora_10_3: 0
      };

      // Add custom flow keys if present
      lines.value.forEach(l => {
        if (l.flowKey && !(l.flowKey in f)) f[l.flowKey] = 0;
      });

      // Boiler productions safely
      const cVyncke = calderas.value.find(c => c.id === 'vyncke');
      const p_vyncke = cVyncke && cVyncke.operational ? cVyncke.capacity : 0;
      
      const cC1 = calderas.value.find(c => c.id === 'c1');
      const p_c1 = cC1 && cC1.operational ? cC1.capacity : 0;
      
      const cC3 = calderas.value.find(c => c.id === 'c3');
      const p_c3 = cC3 && cC3.operational ? cC3.capacity : 0;
      
      const cC4 = calderas.value.find(c => c.id === 'c4');
      const p_c4 = cC4 && cC4.operational ? cC4.capacity : 0;
      
      const custom_41b = customBoilers.value.filter(cb => cb.dest === '41b' && cb.operational).reduce((acc, cb) => acc + cb.capacity, 0);
      const custom_20b = customBoilers.value.filter(cb => cb.dest === '20b' && cb.operational).reduce((acc, cb) => acc + cb.capacity, 0);
      const custom_10b = customBoilers.value.filter(cb => cb.dest === '10b' && cb.operational).reduce((acc, cb) => acc + cb.capacity, 0);
      const custom_3b = customBoilers.value.filter(cb => cb.dest === '3b' && cb.operational).reduce((acc, cb) => acc + cb.capacity, 0);

      // Consumers demands safely
      const cTissue = consumidores.value.find(c => c.id === 'tissue');
      const d_tissue = cTissue ? cTissue.load : 15;

      const cPap20 = consumidores.value.find(c => c.id === 'papeles-20b');
      const d_pap20 = cPap20 ? cPap20.load : 3.5;

      const cPap10 = consumidores.value.find(c => c.id === 'papeles-10b');
      const d_pap10 = cPap10 ? cPap10.load : 17;

      const cPap3 = consumidores.value.find(c => c.id === 'papeles-3b');
      const d_pap3 = cPap3 ? cPap3.load : 7;

      const cDesg = consumidores.value.find(c => c.id === 'desgasificador');
      const d_desg = cDesg ? cDesg.load : 2.8;

      const cSec = consumidores.value.find(c => c.id === 'secador');
      const d_sec = cSec ? cSec.load : 9.0;

      const custom_dem_20b = customConsumers.value.filter(cc => cc.dest === '20b').reduce((acc, cc) => acc + cc.load, 0);
      const custom_dem_10b = customConsumers.value.filter(cc => cc.dest === '10b').reduce((acc, cc) => acc + cc.load, 0);
      const custom_dem_3b = customConsumers.value.filter(cc => cc.dest === '3b').reduce((acc, cc) => acc + cc.load, 0);
      const custom_dem_41b = customConsumers.value.filter(cc => cc.dest === '41b').reduce((acc, cc) => acc + cc.load, 0);

      const total_41b_supply = p_c3 + p_c4 + custom_41b;

      // Get water ratios from attemperator global app if active
      const attApp = window.steamoptix_attemperator_app;

      const getLineAtempRatio = (pVal, tIn, tOut, tWat) => {
        if (!window.calculatePointProperties) return 0.16; // default 16% ratio
        try {
          const pAbsVal = pVal + 1.013;
          const hIn = window.calculatePointProperties(pAbsVal, tIn, 1).h || 2700;
          const hWat = window.calculatePointProperties(pAbsVal, tWat, 2).h || 370;
          
          let hOut;
          if (window.interpSat) {
            const tS = window.interpSat(pAbsVal).t;
            if (tOut <= tS) {
              hOut = window.interpSat(pAbsVal).hg || 2778;
            } else {
              hOut = window.calculatePointProperties(pAbsVal, tOut, 3).h || 2700;
            }
          } else {
            hOut = window.calculatePointProperties(pAbsVal, tOut, 3).h || 2700;
          }
          const denom = hOut - hWat;
          if (denom <= 0) return 0;
          return Math.max(0, (hIn - hOut) / denom);
        } catch(e) {
          return 0.16; // fallback 16% water injection ratio
        }
      };

      // Attemperator line activations: default to true if not initialized
      if (valves.value.atemp_20 === undefined) valves.value.atemp_20 = true;
      if (valves.value.atemp_10 === undefined) valves.value.atemp_10 = true;
      if (valves.value.atemp_3 === undefined) valves.value.atemp_3 = true;

      let ratio_20 = 0;
      if (valves.value.atemp_20 && d_pap20 > 0) {
        let sim20 = attApp?.savedSimulations?.find(s => s.name.includes("20 bar"));
        let p = sim20 ? sim20.pressure : 20;
        let t1 = sim20 ? sim20.tempInitial : 300;
        let t3 = sim20 ? sim20.tempTarget : 220;
        let tw = sim20 ? sim20.tempWater : 90;
        ratio_20 = (sim20 && sim20.steamFlow > 0) ? getLineAtempRatio(p, t1, t3, tw) : 0.16;
      }

      let ratio_10 = 0;
      let r1_10 = 0;
      let r2_10 = 0;
      if (valves.value.atemp_10) {
        r1_10 = atemp10Props.value.r1;
        r2_10 = atemp10Props.value.r2;
        ratio_10 = atemp10Props.value.rTotal;
      }

      let ratio_3 = 0;
      if (valves.value.atemp_3) {
        ratio_3 = atemp3Props.value.rTotal;
      }

      // Solver loop for converging flows
      let f_reductora_20_10 = 0;
      let f_reductora_10_3 = 0;
      let f_c1_backup = 0;
      let f_c1_10b = 0;
      let f_vyncke_backup = 0;
      let f_tg3_inlet = 0;
      let f_tg3_10b_inlet = 0;
      let f_tg3_10b = 0;
      let f_tg3_3b_inlet = 0;
      let f_tg3_3b = 0;
      let f_tg3_10b_backup = 0;
      let f_tg3_3b_backup = 0;

      let desired_20_10 = 0;
      let desired_10_3 = 0;

      for (let iter = 0; iter < 8; iter++) {
        // --- 41 BAR ALLOCATION ---
        let left_41 = Math.max(0, total_41b_supply - custom_dem_41b);

        // Vyncke backup (reduces 41 Bar to 20 Bar)
        let dem_20_total = d_tissue + d_pap20 + custom_dem_20b + desired_20_10;
        let desired_vyncke_backup = 0;
        if (valves.value.vyncke_backup) {
          let supply_20_base = (valves.value.vm ? (p_vyncke + custom_20b) : 0) + f_c1_backup;
          desired_vyncke_backup = Math.max(0, dem_20_total - supply_20_base);
        }
        f_vyncke_backup = Math.min(desired_vyncke_backup, left_41);
        left_41 = Math.max(0, left_41 - f_vyncke_backup);

        // TG3 Inlet
        f_tg3_inlet = Math.min(45, left_41);
        left_41 = Math.max(0, left_41 - f_tg3_inlet);

        // TG3 Extractions: prioritize direct 10 Bar and 3 Bar demands, then allocate remaining TG3 steam to Reductora 10/3 only after accounting for available 20->10 support
        let dem_10_direct = d_pap10 + custom_dem_10b;
        let dem_3_total = d_pap3 + d_desg + d_sec + custom_dem_3b;
        let dem_10_total = dem_10_direct + desired_10_3;

        if (atemp10.value && atemp10.value.flowMode === 'fixed') {
          f_tg3_10b_inlet = Math.max(0, Number(atemp10.value.customFlow) || 20.0);
          let tg3_rem_after_10 = Math.max(0, f_tg3_inlet - f_tg3_10b_inlet);
          if (atemp3.value && atemp3.value.flowMode === 'fixed') {
            f_tg3_3b_inlet = Math.max(0, Number(atemp3.value.customFlow) || 8.0);
          } else {
            f_tg3_3b_inlet = Math.min(dem_3_total, tg3_rem_after_10);
          }
          f_tg3_3b = f_tg3_3b_inlet * (1 + ratio_3);
          f_tg3_10b = f_tg3_10b_inlet * (1 + ratio_10);
        } else {
          // 1 t/h extracted from TG3 at 10B produces (1 + ratio_10) t/h after the double attemperator
          let req_tg3_10_inlet_direct = dem_10_direct / (1 + ratio_10);
          let tg3_10_inlet_direct = Math.min(req_tg3_10_inlet_direct, f_tg3_inlet);
          let tg3_rem_after_10_direct = Math.max(0, f_tg3_inlet - tg3_10_inlet_direct);

          // Cover 3 Bar extraction with TG3 steam, then add single attemperator water contribution downstream
          if (atemp3.value && atemp3.value.flowMode === 'fixed') {
            f_tg3_3b_inlet = Math.max(0, Number(atemp3.value.customFlow) || 8.0);
          } else {
            f_tg3_3b_inlet = Math.min(dem_3_total, tg3_rem_after_10_direct);
          }
          f_tg3_3b = f_tg3_3b_inlet * (1 + ratio_3);
          let tg3_rem_after_3 = Math.max(0, tg3_rem_after_10_direct - f_tg3_3b_inlet);

          // Any remaining TG3 capacity can help cover desired_10_3 on the 10 Bar header
          let req_tg3_10_inlet_for_red = desired_10_3 / (1 + ratio_10);
          let tg3_10_inlet_for_red = Math.min(req_tg3_10_inlet_for_red, tg3_rem_after_3);
          f_tg3_10b_inlet = tg3_10_inlet_direct + tg3_10_inlet_for_red;
          f_tg3_10b = f_tg3_10b_inlet * (1 + ratio_10);
        }

        // --- C1 (GAS) ALLOCATION ---
        let left_c1 = p_c1;
        let desired_c1_backup = 0;
        if (valves.value.c1_backup) {
          let supply_20_base = (valves.value.vm ? (p_vyncke + custom_20b) : 0);
          desired_c1_backup = Math.max(0, dem_20_total - supply_20_base);
        }
        f_c1_backup = Math.min(desired_c1_backup, left_c1);
        left_c1 = Math.max(0, left_c1 - f_c1_backup);

        // C1 to 10 Bar Reducing (limited to 10 Bar deficit before C1 reducing)
        let deficit_10_before_c1 = Math.max(0, dem_10_total - (f_tg3_10b + custom_10b));
        f_c1_10b = valves.value.c1_reducing ? Math.min(left_c1, deficit_10_before_c1) : 0;
        left_c1 = Math.max(0, left_c1 - f_c1_10b);

        // --- 10 BAR BACKUPS AND INTER-MANIFOLD REDUCTIONS ---
        let supply_10_base = f_tg3_10b + f_c1_10b + custom_10b;
        let deficit_10 = Math.max(0, dem_10_total - supply_10_base);

        // 1. Bypass 10B (TG3 10B Backup) from 41 Bar
        if (valves.value.tg3_10b_backup) {
          f_tg3_10b_backup = Math.min(deficit_10, left_41);
          left_41 = Math.max(0, left_41 - f_tg3_10b_backup);
          deficit_10 = Math.max(0, deficit_10 - f_tg3_10b_backup);
        } else {
          f_tg3_10b_backup = 0;
        }

        // 2. Reductora 20/10 (from 20 Bar to 10 Bar)
        // Note: 1 t/h of 20 bar steam produces (1 + ratio_10) t/h of 10 bar steam
        if (valves.value.reductora_20_10 === 'manual') {
          desired_20_10 = 5.0;
        } else if (valves.value.reductora_20_10 === 'auto') {
          desired_20_10 = Math.min(20.0, deficit_10 / (1 + ratio_10));
        } else {
          desired_20_10 = 0;
        }

        // Limit reductora_20_10 flow by available surplus steam in 20 Bar colector (after direct 20 Bar consumers)
        let supply_20_max = (valves.value.vm ? (p_vyncke + custom_20b) : 0) + f_c1_backup + f_vyncke_backup;
        let avail_export_20 = Math.max(0, supply_20_max - (d_tissue + d_pap20 + custom_dem_20b));
        f_reductora_20_10 = Math.min(desired_20_10, avail_export_20);

        // Update actual supply at 10 Bar (including reductora_20_10 + its attemperation water)
        let supply_10_actual = supply_10_base + f_tg3_10b_backup + f_reductora_20_10 * (1 + ratio_10);

        // Potential additional 10 Bar supply available from 20 Bar via Red. 20/10 if 3 Bar needs more steam
        let max_possible_10_from_20 = (valves.value.reductora_20_10 === 'auto') ? (avail_export_20 * (1 + ratio_10)) : (f_reductora_20_10 * (1 + ratio_10));
        let max_supply_10_for_3 = Math.max(0, (supply_10_base + f_tg3_10b_backup + max_possible_10_from_20) - dem_10_direct);

        // --- 3 BAR BACKUPS AND INTER-MANIFOLD REDUCTIONS ---
        let supply_3_base = f_tg3_3b + custom_3b;
        let deficit_3 = Math.max(0, dem_3_total - supply_3_base);

        // 1. Reductora 10/3 (from 10 Bar to 3 Bar)
        // Note: 1 t/h of 10 bar steam produces (1 + ratio_3) t/h of 3 bar steam
        if (valves.value.reductora_10_3 === 'manual') {
          desired_10_3 = 7.0;
        } else if (valves.value.reductora_10_3 === 'auto') {
          desired_10_3 = Math.min(20.0, deficit_3 / (1 + ratio_3), max_supply_10_for_3);
        } else {
          desired_10_3 = 0;
        }

        // Limit reductora_10_3 by actual available surplus steam in 10 Bar colector
        let avail_export_10 = Math.max(0, supply_10_actual - dem_10_direct);
        f_reductora_10_3 = Math.min(desired_10_3, avail_export_10);

        // 2. Bypass 3B (TG3 3B Backup) from 41 Bar
        let supply_3_actual = supply_3_base + f_reductora_10_3 * (1 + ratio_3);
        let deficit_3_remaining = Math.max(0, dem_3_total - supply_3_actual);

        if (valves.value.tg3_3b_backup) {
          f_tg3_3b_backup = Math.min(deficit_3_remaining, left_41);
          left_41 = Math.max(0, left_41 - f_tg3_3b_backup);
        } else {
          f_tg3_3b_backup = 0;
        }
      }

      // Stage-by-stage flows for the Double Attemperator on TG3 10 Bar extraction
      const isDouble10 = (!atemp10.value || atemp10.value.configType !== 'single');
      const f_tg3_10b_water1 = valves.value.atemp_10
        ? (isDouble10 ? (f_tg3_10b_inlet * r1_10) : (f_tg3_10b_inlet * ratio_10))
        : 0;
      const f_tg3_10b_int = f_tg3_10b_inlet + f_tg3_10b_water1;
      const f_tg3_10b_water2 = (valves.value.atemp_10 && isDouble10)
        ? (f_tg3_10b_int * r2_10)
        : 0;
      const water_tg3_10 = f_tg3_10b_water1 + f_tg3_10b_water2;
      f_tg3_10b = f_tg3_10b_inlet + water_tg3_10;

      // Single Attemperator flows on TG3 3 Bar extraction
      const f_tg3_3b_water = valves.value.atemp_3 ? (f_tg3_3b_inlet * ratio_3) : 0;
      f_tg3_3b = f_tg3_3b_inlet + f_tg3_3b_water;

      // Calculate actual boiler productions at 41 Bar by summing all demands/extractions/bypasses on that collector
      let total_consumed_41b = f_vyncke_backup + (f_tg3_10b_inlet + f_tg3_3b_inlet) + f_tg3_10b_backup + f_tg3_3b_backup + custom_dem_41b;
      let actual_41b_prod = Math.min(total_consumed_41b, total_41b_supply);
      let actual_c3_prod = 0;
      let actual_c4_prod = 0;
      if (total_41b_supply > 0) {
        actual_c3_prod = actual_41b_prod * (p_c3 / total_41b_supply);
        actual_c4_prod = actual_41b_prod * (p_c4 / total_41b_supply);
      }

      let water_20 = f_vyncke_backup * ratio_20;
      let water_red_20_10 = f_reductora_20_10 * ratio_10;
      let water_10 = water_tg3_10 + water_red_20_10;
      let water_red_10_3 = f_reductora_10_3 * ratio_3;
      let water_3 = f_tg3_3b_water + water_red_10_3;

      f.water_20 = water_20;
      f.water_10 = water_10;
      f.water_3 = water_3;

      // Calculate actual boiler productions at 20 Bar (Vyncke & custom 20b) based on actual demand on 20 Bar collector
      let total_consumed_20b_base = Math.max(0, (d_tissue + d_pap20 + custom_dem_20b + f_reductora_20_10) - f_c1_backup - f_vyncke_backup);
      let avail_20b_base = valves.value.vm ? (p_vyncke + custom_20b) : 0;
      let actual_20b_base_prod = Math.min(total_consumed_20b_base, avail_20b_base);
      let actual_vyncke_prod = 0;
      if (avail_20b_base > 0) {
        actual_vyncke_prod = actual_20b_base_prod * (p_vyncke / avail_20b_base);
      }

      // Assign to return object
      f.vyncke_hp = actual_vyncke_prod;
      f.vyncke = actual_20b_base_prod + f_c1_backup + f_vyncke_backup;
      f.c1_backup = f_c1_backup;
      f.c1_backup_hp = f_c1_backup;
      f.c1_reducing_hp = f_c1_10b;
      f.c1_10b = f_c1_10b;
      f.c1_discharge = f_c1_backup + f_c1_10b;
      f.vyncke_backup = f_vyncke_backup;
      f.vyncke_backup_hp = f_vyncke_backup;
      f.c3 = actual_c3_prod;
      f.c4 = actual_c4_prod;
      f.tg3_inlet = f_tg3_10b_inlet + f_tg3_3b_inlet;
      f.tg3_10b_inlet = f_tg3_10b_inlet;
      f.tg3_10b_water1 = f_tg3_10b_water1;
      f.tg3_10b_int = f_tg3_10b_int;
      f.tg3_10b_water2 = f_tg3_10b_water2;
      f.tg3_10b_water_total = water_tg3_10;
      f.tg3_10b = f_tg3_10b;
      f.tg3_3b_inlet = f_tg3_3b_inlet;
      f.tg3_3b_water = f_tg3_3b_water;
      f.tg3_3b = f_tg3_3b;
      f.tg3_10b_backup = f_tg3_10b_backup;
      f.tg3_10b_backup_hp = f_tg3_10b_backup;
      f.tg3_3b_backup = f_tg3_3b_backup;
      f.tg3_3b_backup_hp = f_tg3_3b_backup;

      let supply_20_net = Math.max(0, f.vyncke - f_reductora_20_10);
      f.tissue_line = Math.min(d_tissue, supply_20_net);
      f.papeles_20b = Math.min(d_pap20, Math.max(0, supply_20_net - d_tissue));

      // Downstream lines of the reducing valves must render the increased flow (inlet + water)
      let f_reductora_20_10_with_water = f_reductora_20_10 + water_red_20_10;
      let supply_10_net = Math.max(0, (f_tg3_10b + f_c1_10b + f_tg3_10b_backup + custom_10b + f_reductora_20_10_with_water) - f_reductora_10_3);
      f.papeles_10b = Math.min(d_pap10, supply_10_net);

      let f_reductora_10_3_with_water = f_reductora_10_3 + water_red_10_3;
      f.papeles_3b = Math.min(d_pap3, f_tg3_3b + f_reductora_10_3_with_water + f_tg3_3b_backup + custom_3b);
      f.desgasificador = Math.min(d_desg, Math.max(0, (f_tg3_3b + f_reductora_10_3_with_water + f_tg3_3b_backup + custom_3b) - d_pap3));
      f.secador = Math.min(d_sec, Math.max(0, (f_tg3_3b + f_reductora_10_3_with_water + f_tg3_3b_backup + custom_3b) - d_pap3 - d_desg));
      
      f.reductora_20_10 = f_reductora_20_10_with_water;
      f.reductora_10_3 = f_reductora_10_3_with_water;
      f.reductora_41_20 = f_vyncke_backup + water_20;

      return f;
    });

    const tg3Power = computed(() => {
      if (flows.value.tg3_inlet <= 0) return 0;
      const f10In = flows.value.tg3_10b_inlet !== undefined ? flows.value.tg3_10b_inlet : flows.value.tg3_10b;
      const f3In = flows.value.tg3_3b_inlet !== undefined ? flows.value.tg3_3b_inlet : flows.value.tg3_3b;
      return (f10In * 0.013) + (f3In * 0.023) + (Math.max(0, flows.value.tg3_inlet - f10In - f3In) * 0.030);
    });

    // Summary calculations
    const genByPressure = computed(() => {
      const g = { '41b': 0, '20b': 0, '10b': 0, '3b': 0 };
      calderas.value.forEach(c => {
        if (c.operational) {
          g[c.dest] += c.capacity;
        }
      });
      return g;
    });

    const demByPressure = computed(() => {
      const d = { '41b': 0, '20b': 0, '10b': 0, '3b': 0 };
      consumidores.value.forEach(c => {
        d[c.dest] += c.load;
      });
      return d;
    });

    const totalAtempWater = computed(() => {
      return (flows.value.water_20 || 0) + (flows.value.water_10 || 0) + (flows.value.water_3 || 0);
    });

    const totalGen = computed(() => {
      const boilersTotal = genByPressure.value['41b'] + genByPressure.value['20b'] + genByPressure.value['10b'] + genByPressure.value['3b'];
      return boilersTotal + totalAtempWater.value;
    });
    const totalDem = computed(() => demByPressure.value['41b'] + demByPressure.value['20b'] + demByPressure.value['10b'] + demByPressure.value['3b']);
    const netBalance = computed(() => totalGen.value - totalDem.value);
    const granDeficit = computed(() => Math.max(0, totalDem.value - totalGen.value));

    // Methods
    const toggleValve = (vKey) => {
      if (editorMode.value) return; // Ignore in editor mode
      if (vKey === 'reductora_20_10' || vKey === 'reductora_10_3') {
        const current = valves.value[vKey];
        if (current === 'off') {
          valves.value[vKey] = 'auto';
        } else if (current === 'auto') {
          valves.value[vKey] = 'manual';
        } else {
          valves.value[vKey] = 'off';
        }
      } else {
        valves.value[vKey] = !valves.value[vKey];
      }
    };

    const getLinePath = (points) => {
      if (!points || points.length === 0 || !points[0]) return '';
      return `M ${points[0].x} ${points[0].y} ` + points.slice(1).filter(p => p).map(p => `L ${p.x} ${p.y}`).join(' ');
    };

    const getFlowSpeed = (flowVal) => {
      if (!flowVal || flowVal <= 0) return '0s';
      const sp = Math.max(0.4, Math.min(3.0, 30 / flowVal));
      return `${sp.toFixed(2)}s`;
    };

    const getLineMidpoint = (points) => {
      if (!points || points.length < 2 || !points[0]) return { x: 0, y: 0 };
      const midIdx = Math.floor((points.length - 1) / 2);
      const p1 = points[midIdx];
      const p2 = points[midIdx + 1];
      if (!p1 || !p2) return { x: 0, y: 0 };
      return {
        x: Math.round((p1.x + p2.x) / 2),
        y: Math.round((p1.y + p2.y) / 2)
      };
    };

    // Boiler management
    const submitAddBoiler = () => {
      if (!newBoilerForm.value.nombre) return;
      calderas.value.push({
        id: 'boiler-' + Date.now(),
        nombre: newBoilerForm.value.nombre,
        tipo: newBoilerForm.value.tipo,
        capacity: parseFloat(newBoilerForm.value.capacity) || 10,
        pressure: parseFloat(newBoilerForm.value.pressure) || 20,
        operational: true,
        dest: newBoilerForm.value.dest,
        isCustom: true
      });
      showAddBoilerModal.value = false;
      newBoilerForm.value = { nombre: '', tipo: 'Biomasa', capacity: 10, pressure: 20, dest: '20b' };
    };

    const removeBoiler = (id) => {
      calderas.value = calderas.value.filter(c => c.id !== id);
    };

    // Consumer management
    const submitAddConsumer = () => {
      if (!newConsumerForm.value.nombre) return;
      consumidores.value.push({
        id: 'consumer-' + Date.now(),
        nombre: newConsumerForm.value.nombre,
        load: parseFloat(newConsumerForm.value.load) || 5,
        dest: newConsumerForm.value.dest,
        isCustom: true
      });
      showAddConsumerModal.value = false;
      newConsumerForm.value = { nombre: '', load: 5, dest: '3b' };
    };

    const removeConsumer = (id) => {
      consumidores.value = consumidores.value.filter(c => c.id !== id);
    };

    // Selection handlers
    const selectLine = (line) => {
      if (!editorMode.value) return;
      selectedElement.value = { type: 'line', id: line.id };
    };

    const selectLabel = (label) => {
      if (!editorMode.value) return;
      selectedElement.value = { type: 'label', id: label.id };
    };

    const deleteSelected = () => {
      if (!selectedElement.value) return;
      const id = selectedElement.value.id;
      if (selectedElement.value.type === 'line') {
        lines.value = lines.value.filter(l => l.id !== id);
      } else {
        labels.value = labels.value.filter(l => l.id !== id);
      }
      selectedElement.value = null;
    };

    // Adding elements in editor mode
    const addLine = () => {
      const id = 'custom-line-' + Date.now();
      lines.value.push({
        id,
        points: [{ x: 400, y: 300 }, { x: 500, y: 300 }],
        color: '#94a3b8',
        style: 'solid',
        flowKey: ''
      });
      selectedElement.value = { type: 'line', id };
    };

    const addLabel = () => {
      const id = 'custom-label-' + Date.now();
      labels.value.push({
        id,
        x: 450,
        y: 280,
        text: 'Nuevo Texto',
        color: '#ffffff',
        size: '12px',
        isBold: false
      });
      selectedElement.value = { type: 'label', id };
    };

    const addPointToSelectedLine = () => {
      const line = selectedLine.value;
      if (!line) return;
      const lastPoint = line.points[line.points.length - 1];
      line.points.push({
        x: Math.min(1000, lastPoint.x + 40),
        y: Math.min(650, lastPoint.y + 40)
      });
    };

    const removePointFromSelectedLine = () => {
      const line = selectedLine.value;
      if (!line || line.points.length <= 2) return;
      line.points.pop();
    };

    const isLineActive = (line) => {
      if (line.id === 'reductora_20_10_hp') return flows.value.reductora_20_10 > 0;
      if (line.id === 'reductora_10_3_hp') return flows.value.reductora_10_3 > 0;

      if (!line.flowKey) return false;
      if (flows.value[line.flowKey] > 0) return true;

      // Special check: bypass lines should light up if their valve is open and steam is available
      if (line.id === 'c1_backup' && valves.value.c1_backup && calderas.value.find(c => c.id === 'c1')?.operational) return true;
      if (line.id === 'vyncke_backup' && valves.value.vyncke_backup && (calderas.value.find(c => c.id === 'c3')?.operational || calderas.value.find(c => c.id === 'c4')?.operational)) return true;
      if (line.id === 'tg3_10b_backup' && valves.value.tg3_10b_backup && (calderas.value.find(c => c.id === 'c3')?.operational || calderas.value.find(c => c.id === 'c4')?.operational)) return true;
      if (line.id === 'tg3_3b_backup' && valves.value.tg3_3b_backup && (calderas.value.find(c => c.id === 'c3')?.operational || calderas.value.find(c => c.id === 'c4')?.operational)) return true;
      if (line.id === 'c1_10b' && valves.value.c1_reducing && calderas.value.find(c => c.id === 'c1')?.operational) return true;

      return false;
    };

    const getLineStyle = (line) => {
      const isFlowing = isLineActive(line);
      
      let dashArray = 'none';
      if (!isFlowing) {
        if (line.style === 'dashed') {
          dashArray = '6, 5';
        } else if (line.style === 'dotted') {
          dashArray = '2, 3';
        }
      }

      let opacity = 1.0;
      if ((line.flowKey || ['reductora_20_10_hp', 'reductora_10_3_hp'].includes(line.id)) && !isFlowing) {
        if (line.id.endsWith('_hp')) {
          const isSourceOn = (line.id.startsWith('c1_') && calderas.value.find(c => c.id === 'c1')?.operational) ||
                             ((line.id.startsWith('vyncke_') || line.id.startsWith('tg3_') || line.id.startsWith('reductora_')) && 
                              (calderas.value.find(c => c.id === 'c3')?.operational || calderas.value.find(c => c.id === 'c4')?.operational || calderas.value.find(c => c.id === 'vyncke')?.operational));
          if (!isSourceOn) {
            opacity = 0.35;
          }
        } else {
          opacity = 0.35;
        }
      }

      const styleObj = {
        strokeDasharray: isFlowing ? undefined : dashArray,
        opacity: opacity,
        cursor: editorMode.value ? 'pointer' : 'default',
        transition: 'opacity 0.5s ease, stroke-dasharray 0.3s ease'
      };

      if (isFlowing) {
        const flowVal = line.flowKey ? flows.value[line.flowKey] : (line.id === 'reductora_20_10_hp' ? flows.value.reductora_20_10 : flows.value.reductora_10_3);
        styleObj['--flow-speed'] = getFlowSpeed(flowVal || 10.0);
      }

      return styleObj;
    };

    // Drag-and-drop implementation
    const startDragPoint = (event, line, pointIndex) => {
      activeDrag.value = { type: 'line-point', lineId: line.id, pointIndex };
    };

    const startDragLabel = (event, label) => {
      activeDrag.value = { type: 'label', labelId: label.id };
      const rect = svgRef.value.getBoundingClientRect();
      const localX = (event.clientX - rect.left) / scale.value;
      const localY = (event.clientY - rect.top) / scale.value;
      dragOffset = {
        x: localX - label.x,
        y: localY - label.y
      };
    };

    const getFlowBadgePosition = (line) => {
      const mid = getLineMidpoint(line.points);
      const offset = line.badgeOffset || { x: 0, y: 0 };
      return {
        x: mid.x + offset.x,
        y: mid.y + offset.y
      };
    };

    const startDragFlowBadge = (event, line) => {
      activeDrag.value = { type: 'flow-badge', lineId: line.id };
      const rect = svgRef.value.getBoundingClientRect();
      const localX = (event.clientX - rect.left) / scale.value;
      const localY = (event.clientY - rect.top) / scale.value;
      const offset = line.badgeOffset || { x: 0, y: 0 };
      dragOffset = {
        x: localX - offset.x,
        y: localY - offset.y
      };
    };

    const startDragValveLabel = (event, key) => {
      activeDrag.value = { type: 'valve-label', key };
      const rect = svgRef.value.getBoundingClientRect();
      const localX = (event.clientX - rect.left) / scale.value;
      const localY = (event.clientY - rect.top) / scale.value;
      const currentOffset = valveLabelOffsets.value[key];
      dragOffset = {
        x: localX - currentOffset.x,
        y: localY - currentOffset.y
      };
    };

    const startDragEquipment = (event, id) => {
      if (!editorMode.value) return;
      activeDrag.value = { type: 'equipment', id };
      const rect = svgRef.value.getBoundingClientRect();
      const localX = (event.clientX - rect.left) / scale.value;
      const localY = (event.clientY - rect.top) / scale.value;
      dragOffset = {
        x: localX - equipmentPositions.value[id].x,
        y: localY - equipmentPositions.value[id].y
      };
    };

    const onCanvasMouseMove = (event) => {
      if (!activeDrag.value || !svgRef.value) return;
      const rect = svgRef.value.getBoundingClientRect();
      const localX = (event.clientX - rect.left) / scale.value;
      const localY = (event.clientY - rect.top) / scale.value;

      if (activeDrag.value.type === 'line-point') {
        const line = lines.value.find(l => l.id === activeDrag.value.lineId);
        if (line && line.points[activeDrag.value.pointIndex]) {
          line.points[activeDrag.value.pointIndex].x = Math.round(localX);
          line.points[activeDrag.value.pointIndex].y = Math.round(localY);
        }
      } else if (activeDrag.value.type === 'label') {
        const label = labels.value.find(l => l.id === activeDrag.value.labelId);
        if (label) {
          label.x = Math.round(localX - dragOffset.x);
          label.y = Math.round(localY - dragOffset.y);
        }
      } else if (activeDrag.value.type === 'flow-badge') {
        const line = lines.value.find(l => l.id === activeDrag.value.lineId);
        if (line) {
          if (!line.badgeOffset) line.badgeOffset = { x: 0, y: 0 };
          line.badgeOffset.x = Math.round(localX - dragOffset.x);
          line.badgeOffset.y = Math.round(localY - dragOffset.y);
        }
      } else if (activeDrag.value.type === 'valve-label') {
        const offset = valveLabelOffsets.value[activeDrag.value.key];
        if (offset) {
          offset.x = Math.round(localX - dragOffset.x);
          offset.y = Math.round(localY - dragOffset.y);
        }
      } else if (activeDrag.value.type === 'equipment') {
        const pos = equipmentPositions.value[activeDrag.value.id];
        if (pos) {
          pos.x = Math.round(localX - dragOffset.x);
          pos.y = Math.round(localY - dragOffset.y);
        }
      }
    };

    const onCanvasMouseUp = () => {
      activeDrag.value = null;
    };

    const onCanvasClick = (event) => {
      if (editorMode.value && event.target === svgRef.value) {
        selectedElement.value = null;
      }
    };

    const adjustConsumerLoad = (idOrGroup, delta) => {
      if (idOrGroup === 'tissue') {
        const c = consumidores.value[0];
        if (c) {
          if (c.consumoMode === 'actual') {
            c.actualLoad = Math.max(0, parseFloat((c.actualLoad + delta).toFixed(1)));
            c.load = c.actualLoad;
          } else {
            c.futuroLoad = Math.max(0, parseFloat((c.futuroLoad + delta).toFixed(1)));
            c.load = c.futuroLoad;
          }
        }
      } else if (idOrGroup === 'papeles-20b') {
        const c = consumidores.value[1];
        if (c) {
          if (c.consumoMode === 'actual') {
            c.actualLoad = Math.max(0, parseFloat((c.actualLoad + delta).toFixed(1)));
            c.load = c.actualLoad;
          } else {
            c.futuroLoad = Math.max(0, parseFloat((c.futuroLoad + delta).toFixed(1)));
            c.load = c.futuroLoad;
          }
        }
      } else if (idOrGroup === 'papeles-10b') {
        const c = consumidores.value[2];
        if (c) {
          if (c.consumoMode === 'actual') {
            c.actualLoad = Math.max(0, parseFloat((c.actualLoad + delta).toFixed(1)));
            c.load = c.actualLoad;
          } else {
            c.futuroLoad = Math.max(0, parseFloat((c.futuroLoad + delta).toFixed(1)));
            c.load = c.futuroLoad;
          }
        }
      } else if (idOrGroup === 'papeles-3b') {
        const c = consumidores.value[3];
        if (c) {
          if (c.consumoMode === 'actual') {
            c.actualLoad = Math.max(0, parseFloat((c.actualLoad + delta).toFixed(1)));
            c.load = c.actualLoad;
          } else {
            c.futuroLoad = Math.max(0, parseFloat((c.futuroLoad + delta).toFixed(1)));
            c.load = c.futuroLoad;
          }
        }
      }
    };

    const setConsumerMode = (idOrGroup, mode) => {
      if (idOrGroup === 'tissue') {
        const c = consumidores.value[0];
        if (c) {
          c.consumoMode = mode;
          c.load = mode === 'actual' ? c.actualLoad : c.futuroLoad;
        }
      } else if (idOrGroup === 'papeles') {
        for (let i = 1; i <= 3; i++) {
          const c = consumidores.value[i];
          if (c) {
            c.consumoMode = mode;
            c.load = mode === 'actual' ? c.actualLoad : c.futuroLoad;
          }
        }
      }
    };

    const syncToAttemperatorApp = () => {
      const att = window.steamoptix_attemperator_app;
      if (!att || !atemp10.value) return;
      if (typeof att.applyPidState === 'function') {
        att.applyPidState('double');
      }
    };

    const syncToAttemperatorApp3 = () => {
      const att = window.steamoptix_attemperator_app;
      if (!att || !atemp3.value) return;
      if (typeof att.applyPidState === 'function') {
        att.applyPidState('single');
      }
    };

    const openAttemperatorCalculator = () => {
      openPopups.value.atemp_10_doble = false;
      if (typeof window.switchPidSubTab === 'function') {
        window.switchPidSubTab('attemperator');
      }
      syncToAttemperatorApp();
    };

    const openAttemperatorCalculator3 = () => {
      openPopups.value.atemp_3_unico = false;
      if (typeof window.switchPidSubTab === 'function') {
        window.switchPidSubTab('attemperator');
      }
      syncToAttemperatorApp3();
    };

    const loadState = (stateData) => {
      if (!stateData) return;
      const clean = sanitizeState(stateData);
      calderas.value = clean.calderas;
      consumidores.value = clean.consumidores;
      valves.value = clean.valves;
      lines.value = clean.lines;
      labels.value = clean.labels;
      if (clean.equipmentPositions) {
        equipmentPositions.value = clean.equipmentPositions;
      }
      if (clean.valveLabelOffsets) {
        valveLabelOffsets.value = clean.valveLabelOffsets;
      }
      if (clean.atemp10) {
        atemp10.value = clean.atemp10;
      }
      if (clean.atemp3) {
        atemp3.value = clean.atemp3;
      }
    };

    // LocalStorage persistence
    const saveLayout = () => {
      const layoutData = {
        calderas: calderas.value,
        consumidores: consumidores.value,
        valves: valves.value,
        lines: lines.value,
        labels: labels.value,
        equipmentPositions: equipmentPositions.value,
        valveLabelOffsets: valveLabelOffsets.value,
        atemp10: atemp10.value,
        atemp3: atemp3.value
      };
      localStorage.setItem('steamoptix_pid_state_v3', JSON.stringify(layoutData));
      alert("¡Diseño y variables guardados con éxito!");
    };

    const togglePopup = (id) => {
      if (editorMode.value) return;
      openPopups.value[id] = !openPopups.value[id];
    };

    const resetLayout = () => {
      if (confirm("¿Estás seguro de restablecer el diseño predeterminado? Se perderán todas tus personalizaciones.")) {
        localStorage.removeItem('steamoptix_pid_state_v3');
        localStorage.removeItem('steamoptix_attemperator_state_v2');
        calderas.value = JSON.parse(JSON.stringify(defaultCalderas));
        consumidores.value = JSON.parse(JSON.stringify(defaultConsumidores));
        valves.value = JSON.parse(JSON.stringify(defaultValves));
        lines.value = JSON.parse(JSON.stringify(defaultLines));
        labels.value = JSON.parse(JSON.stringify(defaultLabels));
        valveLabelOffsets.value = JSON.parse(JSON.stringify(defaultValveLabelOffsets));
        atemp10.value = JSON.parse(JSON.stringify(defaultAtemp10));
        atemp3.value = JSON.parse(JSON.stringify(defaultAtemp3));
        equipmentPositions.value = {
          vyncke: { x: 235, y: 15, w: 120, h: 55 },
          c1: { x: 40, y: 250, w: 150, h: 60 },
          c3: { x: 40, y: 400, w: 150, h: 60 },
          c4: { x: 40, y: 510, w: 150, h: 60 },
          tissue: { x: 478, y: 115, w: 130, h: 85 },
          papeles: { x: 710, y: 115, w: 155, h: 125 },
          desgasificador: { x: 755, y: 485, w: 110, h: 50 },
          secador: { x: 860, y: 475, w: 110, h: 50 },
          tg3: { x: 370, y: 492, w: 90, h: 70 },
          atemp_10_doble: { x: 0, y: 0, w: 0, h: 0 },
          atemp_3_unico: { x: 0, y: 0, w: 0, h: 0 }
        };
        selectedElement.value = null;
      }
    };

    // Watch auto-save for operational parameters (valves and inputs)
    watch([calderas, consumidores, valves, equipmentPositions, lines, labels, valveLabelOffsets, atemp10, atemp3], () => {
      const layoutData = {
        calderas: calderas.value,
        consumidores: consumidores.value,
        valves: valves.value,
        lines: lines.value,
        labels: labels.value,
        equipmentPositions: equipmentPositions.value,
        valveLabelOffsets: valveLabelOffsets.value,
        atemp10: atemp10.value,
        atemp3: atemp3.value
      };
      localStorage.setItem('steamoptix_pid_state_v3', JSON.stringify(layoutData));
      if (!window._isUpdatingFromAttApp) {
        const att = window.steamoptix_attemperator_app;
        try {
          const prevDual = JSON.parse(localStorage.getItem('steamoptix_attemperator_state_v2') || '{}');
          localStorage.setItem('steamoptix_attemperator_state_v2', JSON.stringify({
            configType: att ? att.configType : (prevDual.configType || 'double'),
            single: {
              pressure: Number(atemp3.value.pressure) || 3.0,
              steamFlow: Number(atemp3.value.customFlow) || 18.8,
              tempInitial: Number(atemp3.value.tempInitial) || 200.0,
              tempTarget: Number(atemp3.value.tempTarget) || 145.0,
              tempWater: Number(atemp3.value.tempWater) || 100.0
            },
            double: {
              pressure: Number(atemp10.value.pressure) || 11.0,
              steamFlow: Number(atemp10.value.customFlow) || 21.8,
              tempInitial: Number(atemp10.value.tempInitial) || 350.0,
              tempIntermediate: Number(atemp10.value.tempIntermediate) || 260.0,
              tempTarget: Number(atemp10.value.tempTarget) || 190.0,
              tempWater: Number(atemp10.value.tempWater) || 100.0
            }
          }));
        } catch (e) {}
        if (att && typeof att.applyPidState === 'function') {
          att.applyPidState();
        }
      }
    }, { deep: true });

    return {
      editorMode, showSidebar, openPopups, calderas, consumidores, valves, lines, labels, flows, tg3Power,
      atemp10, atemp10Props, atemp10Pos, openAttemperatorCalculator,
      atemp3, atemp3Props, atemp3Pos, openAttemperatorCalculator3,
      customBoilers, customConsumers, selectedElement, selectedLine, selectedLabel,
      showAddBoilerModal, showAddConsumerModal, newBoilerForm, newConsumerForm,
      svgRef, containerRef, scale, bgTheme,
      genByPressure, demByPressure, totalGen, totalDem, netBalance, granDeficit, totalAtempWater,
      toggleValve, getLinePath, getFlowSpeed, getLineMidpoint,
      submitAddBoiler, removeBoiler, submitAddConsumer, removeConsumer,
      selectLine, selectLabel, deleteSelected, addLine, addLabel,
      addPointToSelectedLine, removePointFromSelectedLine, getLineStyle, isLineActive,
      startDragPoint, startDragLabel, startDragEquipment, onCanvasMouseMove, onCanvasMouseUp, onCanvasClick,
      saveLayout, resetLayout, equipmentPositions, togglePopup, getFlowBadgePosition, startDragFlowBadge,
      valveLabelOffsets, startDragValveLabel, adjustConsumerLoad, setConsumerMode, loadState
    };
  }
});

function mountPidApp() {
  if (window.steamoptix_pid_app) return;
  window.steamoptix_pid_app = app.mount('#tab-content-pid');
}
window.mountPidApp = mountPidApp;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mountPidApp);
} else {
  mountPidApp();
}
