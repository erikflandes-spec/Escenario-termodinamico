// ======================================================================
// STEAM ATTEMPERATOR CALCULATOR VUE APP
// ======================================================================
(function() {
  const { createApp, ref, computed, watch } = Vue;

  function mountAttemperatorApp() {
    if (window.steamoptix_attemperator_app) return;

    const app = createApp({
      setup() {
        // Load persisted independent attemperator state from localStorage (survives Ctrl+F5)
        let savedDualState = null;
        try {
          const rawDual = localStorage.getItem('steamoptix_attemperator_state_v2');
          if (rawDual) {
            savedDualState = JSON.parse(rawDual);
          } else {
            const rawPid = localStorage.getItem('steamoptix_pid_state_v3');
            if (rawPid) {
              const parsedPid = JSON.parse(rawPid);
              savedDualState = {
                configType: 'double',
                single: parsedPid?.atemp3 ? {
                  pressure: Number(parsedPid.atemp3.pressure) || 3.0,
                  steamFlow: Number(parsedPid.atemp3.customFlow) || 18.8,
                  tempInitial: Number(parsedPid.atemp3.tempInitial) || 200.0,
                  tempTarget: Number(parsedPid.atemp3.tempTarget) || 145.0,
                  tempWater: Number(parsedPid.atemp3.tempWater) || 100.0
                } : null,
                double: parsedPid?.atemp10 ? {
                  pressure: Number(parsedPid.atemp10.pressure) || 11.0,
                  steamFlow: Number(parsedPid.atemp10.customFlow) || 21.8,
                  tempInitial: Number(parsedPid.atemp10.tempInitial) || 350.0,
                  tempIntermediate: Number(parsedPid.atemp10.tempIntermediate) || 260.0,
                  tempTarget: Number(parsedPid.atemp10.tempTarget) || 190.0,
                  tempWater: Number(parsedPid.atemp10.tempWater) || 100.0
                } : null
              };
            }
          }
        } catch (e) {
          console.error("Error loading saved attemperator state:", e);
        }

        // Line Configuration ('single' = Atemperador Único, 'double' = Atemperadores en Serie)
        const configType = ref((savedDualState && (savedDualState.configType === 'single' || savedDualState.configType === 'double')) ? savedDualState.configType : 'double');

        // Independent State for Atemperador Único (3 Bar Line in P&ID)
        const singleState = ref({
          pressure: Number(savedDualState?.single?.pressure) || 3.0,
          steamFlow: Number(savedDualState?.single?.steamFlow) || 18.8,
          tempInitial: Number(savedDualState?.single?.tempInitial) || 200.0,
          tempTarget: Number(savedDualState?.single?.tempTarget) || 145.0,
          tempWater: Number(savedDualState?.single?.tempWater) || 100.0
        });

        // Independent State for Atemperadores en Serie / Dos Etapas (10 Bar Line in P&ID)
        const doubleState = ref({
          pressure: Number(savedDualState?.double?.pressure) || 11.0,
          steamFlow: Number(savedDualState?.double?.steamFlow) || 21.8,
          tempInitial: Number(savedDualState?.double?.tempInitial) || 350.0,
          tempIntermediate: Number(savedDualState?.double?.tempIntermediate) || 260.0,
          tempTarget: Number(savedDualState?.double?.tempTarget) || 190.0,
          tempWater: Number(savedDualState?.double?.tempWater) || 100.0
        });

        const persistDualState = () => {
          try {
            localStorage.setItem('steamoptix_attemperator_state_v2', JSON.stringify({
              configType: configType.value,
              single: singleState.value,
              double: doubleState.value
            }));
            const rawPid = localStorage.getItem('steamoptix_pid_state_v3');
            if (rawPid) {
              const parsedPid = JSON.parse(rawPid) || {};
              parsedPid.atemp3 = {
                configType: 'single',
                pressure: singleState.value.pressure,
                tempInitial: singleState.value.tempInitial,
                tempTarget: singleState.value.tempTarget,
                tempWater: singleState.value.tempWater,
                flowMode: 'fixed',
                customFlow: singleState.value.steamFlow,
                independentInit: true
              };
              parsedPid.atemp10 = {
                configType: 'double',
                pressure: doubleState.value.pressure,
                tempInitial: doubleState.value.tempInitial,
                tempIntermediate: doubleState.value.tempIntermediate,
                tempTarget: doubleState.value.tempTarget,
                tempWater: doubleState.value.tempWater,
                flowMode: 'fixed',
                customFlow: doubleState.value.steamFlow,
                independentInit: true
              };
              localStorage.setItem('steamoptix_pid_state_v3', JSON.stringify(parsedPid));
            }
          } catch (e) {
            console.error("Error persisting attemperator state:", e);
          }
        };

        // Active inputs bound to the currently selected independent calculator
        const pressure = computed({
          get: () => configType.value === 'single' ? singleState.value.pressure : doubleState.value.pressure,
          set: (v) => {
            const val = Number(v);
            if (configType.value === 'single') singleState.value.pressure = val;
            else doubleState.value.pressure = val;
          }
        });

        const steamFlow = computed({
          get: () => configType.value === 'single' ? singleState.value.steamFlow : doubleState.value.steamFlow,
          set: (v) => {
            const val = Number(v);
            if (configType.value === 'single') singleState.value.steamFlow = val;
            else doubleState.value.steamFlow = val;
          }
        });

        const tempInitial = computed({
          get: () => configType.value === 'single' ? singleState.value.tempInitial : doubleState.value.tempInitial,
          set: (v) => {
            const val = Number(v);
            if (configType.value === 'single') singleState.value.tempInitial = val;
            else doubleState.value.tempInitial = val;
          }
        });

        const tempIntermediate = computed({
          get: () => doubleState.value.tempIntermediate,
          set: (v) => {
            doubleState.value.tempIntermediate = Number(v);
          }
        });

        const tempTarget = computed({
          get: () => configType.value === 'single' ? singleState.value.tempTarget : doubleState.value.tempTarget,
          set: (v) => {
            const val = Number(v);
            if (configType.value === 'single') singleState.value.tempTarget = val;
            else doubleState.value.tempTarget = val;
          }
        });

        const tempWater = computed({
          get: () => configType.value === 'single' ? singleState.value.tempWater : doubleState.value.tempWater,
          set: (v) => {
            const val = Number(v);
            if (configType.value === 'single') singleState.value.tempWater = val;
            else doubleState.value.tempWater = val;
          }
        });

        // Saved Simulations
        const newSimName = ref('');
        const savedSimulations = ref([]);

        const getSatTempForPressure = (pMan) => {
          const pA = (Number(pMan) || 0) + 1.013;
          if (window.interpSat) {
            return window.interpSat(pA).t;
          }
          return 179.9;
        };

        // Convert to absolute pressure
        const pAbs = computed(() => pressure.value + 1.013);

        // Saturation temperature at pressure
        const tSat = computed(() => getSatTempForPressure(pressure.value));

        // Load saved simulations from localStorage
        const loadSavedSimulations = () => {
          try {
            const raw = localStorage.getItem('steamoptix_attemperator_simulations');
            if (raw) {
              savedSimulations.value = JSON.parse(raw);
            } else {
              savedSimulations.value = [];
            }
          } catch (e) {
            console.error("Failed to load saved simulations:", e);
            savedSimulations.value = [];
          }
        };
        loadSavedSimulations();

        // Save current simulation
        const saveSim = () => {
          let name = newSimName.value.trim();
          if (!name) {
            name = `Simulación ${new Date().toLocaleString()}`;
          }
          const sim = {
            id: Date.now().toString(),
            name: name,
            date: new Date().toLocaleString(),
            configType: configType.value,
            pressure: pressure.value,
            steamFlow: steamFlow.value,
            tempInitial: tempInitial.value,
            tempIntermediate: tempIntermediate.value,
            tempTarget: tempTarget.value,
            tempWater: tempWater.value
          };
          savedSimulations.value.push(sim);
          try {
            localStorage.setItem('steamoptix_attemperator_simulations', JSON.stringify(savedSimulations.value));
            newSimName.value = '';
          } catch (e) {
            console.error("Failed to save simulation:", e);
            alert("Error al guardar la simulación en localStorage");
          }
        };

        // Guard flags for bidirectional P&ID synchronization
        let isSyncingFromPid = false;

        // Pull values independently from P&ID Attemperators (single = 3 Bar Atemp Único, double = 10 Bar Atemp Doble)
        const applyPidState = (targetMode) => {
          const pidApp = window.steamoptix_pid_app;
          if (!pidApp) return;
          isSyncingFromPid = true;
          if (targetMode === 'single' || targetMode === 'double') {
            configType.value = targetMode;
          }
          if (pidApp.atemp3) {
            singleState.value.pressure = Number(pidApp.atemp3.pressure) || 3.0;
            singleState.value.tempWater = Number(pidApp.atemp3.tempWater) || 100;
            singleState.value.tempTarget = Number(pidApp.atemp3.tempTarget) || 145;
            singleState.value.tempInitial = Number(pidApp.atemp3.tempInitial) || 200;
            const f3 = (pidApp.atemp3.flowMode === 'fixed' && pidApp.atemp3.customFlow > 0)
              ? Number(pidApp.atemp3.customFlow)
              : ((pidApp.flows && pidApp.flows.tg3_3b_inlet > 0) ? pidApp.flows.tg3_3b_inlet : 18.8);
            singleState.value.steamFlow = Math.round(f3 * 10) / 10;
          }
          if (pidApp.atemp10) {
            doubleState.value.pressure = Number(pidApp.atemp10.pressure) || 11.0;
            doubleState.value.tempWater = Number(pidApp.atemp10.tempWater) || 100;
            doubleState.value.tempTarget = Number(pidApp.atemp10.tempTarget) || 190;
            doubleState.value.tempIntermediate = Number(pidApp.atemp10.tempIntermediate) || 260;
            doubleState.value.tempInitial = Number(pidApp.atemp10.tempInitial) || 350;
            const f10 = (pidApp.atemp10.flowMode === 'fixed' && pidApp.atemp10.customFlow > 0)
              ? Number(pidApp.atemp10.customFlow)
              : ((pidApp.flows && pidApp.flows.tg3_10b_inlet > 0) ? pidApp.flows.tg3_10b_inlet : 21.8);
            doubleState.value.steamFlow = Math.round(f10 * 10) / 10;
          }
          Vue.nextTick(() => {
            isSyncingFromPid = false;
          });
        };

        // Load saved simulation into the corresponding independent state ONLY
        const loadSim = (sim) => {
          const mode = sim.configType || 'single';
          configType.value = mode;
          if (mode === 'single') {
            singleState.value.pressure = Number(sim.pressure) || 3.0;
            singleState.value.steamFlow = Number(sim.steamFlow) || 18.8;
            singleState.value.tempWater = Number(sim.tempWater) || 100;
            singleState.value.tempTarget = Number(sim.tempTarget) || 145;
            singleState.value.tempInitial = Number(sim.tempInitial) || 200;
          } else {
            doubleState.value.pressure = Number(sim.pressure) || 11.0;
            doubleState.value.steamFlow = Number(sim.steamFlow) || 21.8;
            doubleState.value.tempWater = Number(sim.tempWater) || 100;
            doubleState.value.tempTarget = Number(sim.tempTarget) || 190;
            if (sim.tempIntermediate !== undefined) {
              doubleState.value.tempIntermediate = Number(sim.tempIntermediate) || 260;
            }
            doubleState.value.tempInitial = Number(sim.tempInitial) || 350;
          }
        };

        // Delete saved simulation
        const deleteSim = (id) => {
          savedSimulations.value = savedSimulations.value.filter(s => s.id !== id);
          try {
            localStorage.setItem('steamoptix_attemperator_simulations', JSON.stringify(savedSimulations.value));
          } catch (e) {
            console.error("Failed to delete simulation:", e);
          }
        };

        // Independent physical boundary checks for Atemperador Único (singleState)
        watch(() => singleState.value.pressure, (newP) => {
          if (isSyncingFromPid) return;
          const sat = getSatTempForPressure(newP);
          if (singleState.value.tempInitial < sat + 10) {
            singleState.value.tempInitial = Math.ceil(sat + 10);
          }
          if (singleState.value.tempWater > sat - 5) {
            singleState.value.tempWater = Math.max(10, Math.floor(sat - 10));
          }
          if (singleState.value.tempTarget < singleState.value.tempWater + 5) {
            singleState.value.tempTarget = singleState.value.tempWater + 5;
          }
        });

        watch(() => singleState.value.tempInitial, (newT1) => {
          if (isSyncingFromPid) return;
          if (singleState.value.tempTarget > newT1 - 5) {
            singleState.value.tempTarget = newT1 - 5;
          }
        });

        watch(() => singleState.value.tempTarget, (newT3) => {
          if (isSyncingFromPid) return;
          if (singleState.value.tempInitial < newT3 + 5) {
            singleState.value.tempInitial = newT3 + 5;
          }
          if (newT3 < singleState.value.tempWater + 5) {
            singleState.value.tempTarget = singleState.value.tempWater + 5;
          }
        });

        // Independent physical boundary checks for Atemperadores en Serie (doubleState)
        watch(() => doubleState.value.pressure, (newP) => {
          if (isSyncingFromPid) return;
          const sat = getSatTempForPressure(newP);
          if (doubleState.value.tempInitial < sat + 10) {
            doubleState.value.tempInitial = Math.ceil(sat + 10);
          }
          if (doubleState.value.tempIntermediate < sat + 5) {
            doubleState.value.tempIntermediate = Math.ceil(sat + 7);
          }
          if (doubleState.value.tempWater > sat - 5) {
            doubleState.value.tempWater = Math.max(10, Math.floor(sat - 10));
          }
          if (doubleState.value.tempTarget < doubleState.value.tempWater + 5) {
            doubleState.value.tempTarget = doubleState.value.tempWater + 5;
          }
        });

        watch(() => doubleState.value.tempInitial, (newT1) => {
          if (isSyncingFromPid) return;
          if (doubleState.value.tempIntermediate > newT1 - 5) {
            doubleState.value.tempIntermediate = newT1 - 5;
          }
        });

        watch(() => doubleState.value.tempIntermediate, (newTInt) => {
          if (isSyncingFromPid) return;
          if (doubleState.value.tempTarget > newTInt - 5) {
            doubleState.value.tempTarget = newTInt - 5;
          }
          if (doubleState.value.tempInitial < newTInt + 5) {
            doubleState.value.tempInitial = newTInt + 5;
          }
        });

        watch(() => doubleState.value.tempTarget, (newT3) => {
          if (isSyncingFromPid) return;
          if (doubleState.value.tempIntermediate < newT3 + 5) {
            doubleState.value.tempIntermediate = newT3 + 5;
          }
          if (newT3 < doubleState.value.tempWater + 5) {
            doubleState.value.tempTarget = doubleState.value.tempWater + 5;
          }
        });

        watch(configType, () => {
          persistDualState();
        });

        // Sync Atemperador Único (singleState) -> P&ID 3 Bar Single Attemperator (atemp3)
        watch(singleState, (s) => {
          if (isSyncingFromPid) return;
          persistDualState();
          const pidApp = window.steamoptix_pid_app;
          if (pidApp && pidApp.atemp3) {
            window._isUpdatingFromAttApp = true;
            pidApp.atemp3.configType = 'single';
            pidApp.atemp3.pressure = s.pressure;
            pidApp.atemp3.customFlow = s.steamFlow;
            pidApp.atemp3.flowMode = 'fixed';
            pidApp.atemp3.tempInitial = s.tempInitial;
            pidApp.atemp3.tempTarget = s.tempTarget;
            pidApp.atemp3.tempWater = s.tempWater;
            Vue.nextTick(() => {
              window._isUpdatingFromAttApp = false;
            });
          }
        }, { deep: true });

        // Sync Atemperadores en Serie (doubleState) -> P&ID 10 Bar Double Attemperator (atemp10)
        watch(doubleState, (d) => {
          if (isSyncingFromPid) return;
          persistDualState();
          const pidApp = window.steamoptix_pid_app;
          if (pidApp && pidApp.atemp10) {
            window._isUpdatingFromAttApp = true;
            pidApp.atemp10.configType = 'double';
            pidApp.atemp10.pressure = d.pressure;
            pidApp.atemp10.customFlow = d.steamFlow;
            pidApp.atemp10.flowMode = 'fixed';
            pidApp.atemp10.tempInitial = d.tempInitial;
            pidApp.atemp10.tempIntermediate = d.tempIntermediate;
            pidApp.atemp10.tempTarget = d.tempTarget;
            pidApp.atemp10.tempWater = d.tempWater;
            Vue.nextTick(() => {
              window._isUpdatingFromAttApp = false;
            });
          }
        }, { deep: true });

        // Helper for property lookup
        const getProperties = (p, t, pointNum) => {
          if (window.calculatePointProperties) {
            try {
              return window.calculatePointProperties(p, t, pointNum);
            } catch (e) {
              console.error("calculatePointProperties failed:", e);
            }
          }
          return { h: 2700, phase: "Desconocido" };
        };

        // State 1 properties: Inlet Steam
        const state1 = computed(() => getProperties(pAbs.value, tempInitial.value, 1));
        const h1 = computed(() => state1.value.h || 0);
        const phase1 = computed(() => state1.value.phase || "Vapor sobrecalentado");

        // State 2 properties: Water
        const state2 = computed(() => getProperties(pAbs.value, tempWater.value, 2));
        const h2 = computed(() => state2.value.h || 0);
        const phase2 = computed(() => state2.value.phase || "Líquido subenfriado");

        // State Intermediate properties: Intermediate Steam
        const stateInt = computed(() => getProperties(pAbs.value, tempIntermediate.value, 9));
        const hInt = computed(() => stateInt.value.h || 0);
        const phaseInt = computed(() => stateInt.value.phase || "Vapor sobrecalentado");

        // State 3 properties: Outlet Steam
        const state3 = computed(() => getProperties(pAbs.value, tempTarget.value, 3));
        const h3 = computed(() => {
          if (tempTarget.value <= tSat.value) {
            if (window.interpSat) {
              return window.interpSat(pAbs.value).hg;
            }
            return 2778.0; // fallback
          }
          return state3.value.h || 0;
        });
        const phase3 = computed(() => {
          if (tempTarget.value <= tSat.value) {
            return "Vapor saturado";
          }
          return state3.value.phase || "Vapor sobrecalentado";
        });

        // Stage 1 water flow (waterFlow1)
        const waterFlow1 = computed(() => {
          if (configType.value !== 'double') return 0;
          const h_diff_steam = h1.value - hInt.value;
          const h_diff_water = hInt.value - h2.value;
          if (h_diff_water <= 0) return 0;
          const flow = steamFlow.value * (h_diff_steam / h_diff_water);
          return Math.max(0, flow);
        });

        // Intermediate steam flow (intermediateFlow)
        const intermediateFlow = computed(() => {
          return steamFlow.value + waterFlow1.value;
        });

        // Stage 2 water flow (waterFlow2)
        const waterFlow2 = computed(() => {
          if (configType.value !== 'double') return 0;
          const h_diff_steam = hInt.value - h3.value;
          const h_diff_water = h3.value - h2.value;
          if (h_diff_water <= 0) return 0;
          const flow = intermediateFlow.value * (h_diff_steam / h_diff_water);
          return Math.max(0, flow);
        });

        // Total water flow:
        // single stage: waterFlow
        // double stage: waterFlow1 + waterFlow2
        const waterFlow = computed(() => {
          if (configType.value === 'double') {
            return waterFlow1.value + waterFlow2.value;
          } else {
            const h_diff_steam = h1.value - h3.value;
            const h_diff_water = h3.value - h2.value;
            if (h_diff_water <= 0) return 0;
            const flow = steamFlow.value * (h_diff_steam / h_diff_water);
            return Math.max(0, flow);
          }
        });

        // m3 = m1 + m2
        const outletFlow = computed(() => {
          return steamFlow.value + waterFlow.value;
        });

        // Heat removed/dissipated in MW
        const heatRemovedMW = computed(() => {
          const flow_kg_s = steamFlow.value / 3.6;
          const heat_kW = flow_kg_s * (h1.value - h3.value);
          return Math.max(0, heat_kW / 1000);
        });

        // SVG dynamic styles
        // Particle speed/duration (inverse to flow rate, min 1.2s, max 8s)
        const animationDuration = computed(() => {
          const val = 8 - (steamFlow.value / 100) * 6.8;
          return Math.max(1.2, Math.min(8, val));
        });

        const animationDurationIntermediate = computed(() => {
          const val = 8 - (intermediateFlow.value / 100) * 6.8;
          return Math.max(1.2, Math.min(8, val));
        });

        const animationDurationOutlet = computed(() => {
          const val = 8 - (outletFlow.value / 100) * 6.8;
          return Math.max(1.2, Math.min(8, val));
        });

        // Colors based on temperatures
        // Steam inlet: red/hot. Interpolate from yellow (200C) to deep red (450C)
        const steamInletColor = computed(() => {
          const t = tempInitial.value;
          const ratio = Math.max(0, Math.min(1, (t - 180) / 270));
          const hue = Math.round(35 - ratio * 35);
          return `hsl(${hue}, 95%, 55%)`;
        });

        // Steam intermediate: orange.
        const steamIntermediateColor = computed(() => {
          const t = tempIntermediate.value;
          const ratio = Math.max(0, Math.min(1, (t - 180) / 250));
          const hue = Math.round(40 - ratio * 25);
          return `hsl(${hue}, 92%, 57%)`;
        });

        // Steam outlet: orange/yellow. Interpolate from yellow (180C) to orange (350C)
        const steamOutletColor = computed(() => {
          const t = tempTarget.value;
          const ratio = Math.max(0, Math.min(1, (t - 180) / 220));
          const hue = Math.round(45 - ratio * 20);
          return `hsl(${hue}, 90%, 60%)`;
        });

        // Mix zone: average color
        const steamMixColor = computed(() => {
          const t = (tempInitial.value + tempTarget.value) / 2;
          const ratio = Math.max(0, Math.min(1, (t - 180) / 250));
          const hue = Math.round(40 - ratio * 25);
          return `hsl(${hue}, 90%, 58%)`;
        });

        // Mix zone 1 (stage 1 mix):
        const steamMix1Color = computed(() => {
          const t = (tempInitial.value + tempIntermediate.value) / 2;
          const ratio = Math.max(0, Math.min(1, (t - 180) / 260));
          const hue = Math.round(37 - ratio * 30);
          return `hsl(${hue}, 92%, 56%)`;
        });

        // Mix zone 2 (stage 2 mix):
        const steamMix2Color = computed(() => {
          const t = (tempIntermediate.value + tempTarget.value) / 2;
          const ratio = Math.max(0, Math.min(1, (t - 180) / 230));
          const hue = Math.round(42 - ratio * 22);
          return `hsl(${hue}, 90%, 59%)`;
        });

        // Safety warnings
        const alerts = computed(() => {
          const list = [];
          
          // 1. Target temperature check (allowing saturated steam operation)
          if (tempTarget.value <= tSat.value) {
            list.push({
              title: "Operación con Vapor Saturado",
              text: `El atemperador está regulando para producir vapor saturado (T_final <= T_sat = ${tSat.value.toFixed(1)} °C). El sistema calcula la inyección exacta para alcanzar vapor saturado seco (calidad x = 1.0). Nota: Monitorear el arrastre de condensado en la tubería de salida.`,
              bgClass: "bg-emerald-50 border-emerald-200 text-emerald-800",
              iconClass: "text-emerald-600",
              icon: "check_circle"
            });
          } else if (tempTarget.value < tSat.value + 5) {
            list.push({
              title: "Riesgo de Condensación Final (Aviso Crítico)",
              text: `La temperatura objetivo final (${tempTarget.value} °C) está a menos de 5 °C de la temperatura de saturación (T_sat = ${tSat.value.toFixed(1)} °C). Esto incrementa críticamente el riesgo de arrastre de condensado y golpe de ariete en la tubería de salida. Se recomienda una sobrecalefacción final mínima de 5 a 10 °C o regular para vapor saturado exacto.`,
              bgClass: "bg-red-50 border-red-200 text-red-800",
              iconClass: "text-red-500",
              icon: "warning"
            });
          } else if (tempTarget.value < tSat.value + 15) {
            list.push({
              title: "Bajo Grado de Sobrecalentamiento Final",
              text: `La temperatura final tiene una sobrecalefacción de ${(tempTarget.value - tSat.value).toFixed(1)} °C por encima de la de saturación. Operación estable pero cercana al punto de rocío.`,
              bgClass: "bg-yellow-50 border-yellow-200 text-yellow-800",
              iconClass: "text-yellow-600",
              icon: "info"
            });
          } else {
            list.push({
              title: "Operación de Salida Segura",
              text: `El vapor de salida cuenta con una sobrecalefacción adecuada de ${(tempTarget.value - tSat.value).toFixed(1)} °C por encima de la temperatura de saturación, garantizando vapor 100% seco y libre de humedad.`,
              bgClass: "bg-green-50 border-green-200 text-green-800",
              iconClass: "text-green-600",
              icon: "check_circle"
            });
          }

          // 2. Intermediate temperature too close to saturation
          if (configType.value === 'double') {
            if (tempIntermediate.value < tSat.value + 5) {
              list.push({
                title: "Riesgo de Condensación Intermedia (Aviso Crítico)",
                text: `La temperatura intermedia (${tempIntermediate.value} °C) está muy cerca de la temperatura de saturación (T_sat = ${tSat.value.toFixed(1)} °C), arriesgando condensación en el tramo intermedio de la tubería.`,
                bgClass: "bg-red-50 border-red-200 text-red-800",
                iconClass: "text-red-500",
                icon: "warning"
              });
            }
          }

          // 3. Initial temperature warning
          if (tempInitial.value <= tSat.value + 2) {
            list.push({
              title: "Límite de Saturación de Entrada",
              text: `El vapor inicial está casi saturado (${tempInitial.value} °C vs T_sat = ${tSat.value.toFixed(1)} °C). El atemperador requiere vapor sobrecalentado estable para operar adecuadamente.`,
              bgClass: "bg-red-50 border-red-200 text-red-800",
              iconClass: "text-red-500",
              icon: "error"
            });
          }

          // 4. Water flashing check
          if (tempWater.value >= tSat.value - 2) {
            list.push({
              title: "Riesgo de Vaporización del Agua",
              text: `La temperatura del agua de atemperación (${tempWater.value} °C) es muy cercana a la temperatura de saturación (${tSat.value.toFixed(1)} °C). Puede ocurrir vaporización instantánea parcial en la boquilla atomizadora.`,
              bgClass: "bg-red-50 border-red-200 text-red-800",
              iconClass: "text-red-500",
              icon: "error"
            });
          } else if (tempWater.value > 120) {
            list.push({
              title: "Alta Temperatura de Agua de Inyección",
              text: `El agua caliente de atemperación (${tempWater.value} °C) previene choques térmicos mecánicos en la tubería y reduce significativamente la longitud de evaporación requerida.`,
              bgClass: "bg-blue-50 border-blue-200 text-blue-800",
              iconClass: "text-blue-500",
              icon: "info"
            });
          }

          return list;
        });

        return {
          configType,
          pressure,
          steamFlow,
          tempInitial,
          tempIntermediate,
          tempTarget,
          tempWater,
          pAbs,
          tSat,
          h1,
          phase1,
          h2,
          phase2,
          hInt,
          phaseInt,
          h3,
          phase3,
          waterFlow1,
          waterFlow2,
          intermediateFlow,
          waterFlow,
          outletFlow,
          heatRemovedMW,
          animationDuration,
          animationDurationIntermediate,
          animationDurationOutlet,
          steamInletColor,
          steamIntermediateColor,
          steamOutletColor,
          steamMixColor,
          steamMix1Color,
          steamMix2Color,
          alerts,
          newSimName,
          savedSimulations,
          saveSim,
          loadSim,
          deleteSim,
          applyPidState
        };
      }
    });

    window.steamoptix_attemperator_app = app.mount('#tab-content-pid-attemperator');
    if (window.steamoptix_pid_app && !localStorage.getItem('steamoptix_attemperator_state_v2')) {
      window.steamoptix_attemperator_app.applyPidState();
    }
  }

  // Export global function
  window.mountAttemperatorApp = mountAttemperatorApp;
  console.log("attemperator_app.js cargado correctamente con soporte dual stage y persistencia");
})();
