// ======================================================================
// STEAMOPTIX: BALANCE GENERACIÓN & COGENERACIÓN HÍBRIDA APP (V6.0 - UPGRADED)
// ======================================================================

(function() {
  function mountBalanceGenApp() {
    if (window.steamoptix_balance_gen_app) return;

    const app = Vue.createApp({
      data() {
        let state = {
          // Plant & Grid Parameters
          plantElecDemand: 12, // MW
          plantSteamDemand: 35, // ton/h
          hoursOp: 720, // h/month
          marketMonomico: 80, // USD/MWh
          marketMarginal: 45, // USD/MWh

          // Reference Fuel Prices for Boilers (defined on weight basis: USD/ton or USD/kg)
          gasPriceTon: 336.0, // USD/ton (approx 7.0 USD/MMBtu at 11000 kcal/kg)
          glpPriceTon: 533.0, // USD/ton (approx 12.0 USD/MMBtu at 11200 kcal/kg)
          biomassPriceVal: 20.0, // USD/ton
          gasLhv: 11000, // kcal/kg (PCI GN)
          glpLhv: 11200, // kcal/kg (PCI GLP)
          biomassLhv: 3300, // kcal/kg biomass LHV (PCI)

          // Backward compatibility getters/setters via computed or data properties:
          gasPrice: 7.0,
          glpPrice: 12.0,
          biomassPrice: 20.0,

          // Combined Cycles (CC) - Array of dynamic units
          ciclosCombinados: [
            {
              id: 1,
              name: "Ciclo Combinado TG 1",
              gasCons: 150, // MMBtu/h
              gasCost: 7.0, // USD/MMBtu
              gen: 15, // MW
              steamRec: 35, // ton/h
              opexFixed: 12000, // USD/month
              capex: 12000000, // USD (12M)
              isOutOfService: false, // F/S toggle
              collapsed: false
            }
          ],
          nextCCId: 2,

          // Boilers List
          refBoilerId: 1,
          boilers: [
            {
              id: 1,
              name: "Caldera Gas Natural Base",
              fuelType: "Gas Natural",
              pressure: 10,
              temp: 200,
              efficiency: 88,
              maxSteamGen: 35,
              steamGen: 20,
              isOutOfService: false,
              hasTurbine: false,
              turbineType: "Contrapresión",
              tgGen: 0,
              editCostManual: false,
              manualCostUSDton: 25.0,
              manualCostUSDMMBtu: 8.0
            },
            {
              id: 2,
              name: "Caldera Auxiliar Biomasa",
              fuelType: "Biomasa",
              pressure: 10,
              temp: 200,
              efficiency: 78,
              maxSteamGen: 25,
              steamGen: 15,
              isOutOfService: false,
              hasTurbine: false,
              turbineType: "Contrapresión",
              tgGen: 0,
              editCostManual: false,
              manualCostUSDton: 15.0,
              manualCostUSDMMBtu: 5.0
            }
          ],
          nextBoilerId: 3,

          copyStatus: "Copiar JSON",

          // ── Gestor de Escenarios ──────────────────────────────
          scenarios: [],          // [{id, name, timestamp, state}]
          baseScenarioId: null,   // ID del escenario marcado como base
          editingScenarioId: null, // ID del escenario que se está editando
          scenarioNameInput: '',  // nombre del nuevo escenario a guardar
          showScenarioMenu: false, // toggle del panel de escenarios
          showExecutiveReportModal: false, // modal de informe ejecutivo
          showEmsArchitectureModal: false, // modal de arquitectura EMS de simulación 720h
          showConfigReportModal: false, // modal de reporte de configuraciones
          showAdvancedSettingsModal: false, // modal de gestión avanzada
          hoveredMarginalPoint: null, // punto seleccionado en el gráfico de costos marginales
          
          // Supabase Integration & Collaboration
          isLoggedIn: true,       // Mock login para Supabase
          userId: 'usr_cogeneracion_ops_99',
          mockSharedEscenarios: [
            {
              id: 9901,
              name: "Estrategia Gerencial 2026: Vyncke ON",
              timestamp: "16/06/2026 08:30:12",
              created_by: "Ing. Alejandro M.",
              is_shared: true,
              results: {
                plantSteamDemand: 40,
                avgUsdTon: 24.10,
                ownElecGen: 15.0,
                totalOpex: 1980500,
                netSavings: 145000
              },
              state: { ccOutOfService: false, ccGen: 15, ccSteamRec: 35 }
            }
          ],

          // Popup/Modal de fórmulas interactivo
          showFormulaModal: false,
          formulaModalTitle: '',
          formulaModalText: ''
        };

        try {
          const saved = localStorage.getItem('steamoptix_bg_balance_gen');
          if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed && typeof parsed === 'object') {
              for (const key in parsed) {
                if (state.hasOwnProperty(key)) {
                  state[key] = parsed[key];
                }
              }
            }
          }
        } catch (e) {
          console.error('Error loading balance gen state from localStorage:', e);
        }

        return state;
      },
      computed: {
        ccGasCons() {
          const active = this.ciclosCombinados.filter(cc => !cc.isOutOfService);
          return active.reduce((sum, cc) => sum + (parseFloat(cc.gasCons) || 0), 0);
        },
        ccGasCost() {
          const active = this.ciclosCombinados.filter(cc => !cc.isOutOfService);
          if (active.length === 0) return 7.0;
          return active.reduce((sum, cc) => sum + (parseFloat(cc.gasCost) || 0), 0) / active.length;
        },
        ccGen() {
          const active = this.ciclosCombinados.filter(cc => !cc.isOutOfService);
          return active.reduce((sum, cc) => sum + (parseFloat(cc.gen) || 0), 0);
        },
        ccSteamRec() {
          const active = this.ciclosCombinados.filter(cc => !cc.isOutOfService);
          return active.reduce((sum, cc) => sum + (parseFloat(cc.steamRec) || 0), 0);
        },
        ccOpexFixed() {
          const active = this.ciclosCombinados.filter(cc => !cc.isOutOfService);
          return active.reduce((sum, cc) => sum + (parseFloat(cc.opexFixed) || 0), 0);
        },
        ccCapex() {
          return this.ciclosCombinados.reduce((sum, cc) => sum + (parseFloat(cc.capex) || 0), 0);
        },
        ccOutOfService() {
          return this.ciclosCombinados.every(cc => cc.isOutOfService);
        },
        ccState() {
          return this.ciclosCombinados.every(cc => cc.isOutOfService) ? 'FUERA DE SERVICIO' : 'EN OPERACION';
        },
        // Enthalpy difference helper for standard steam calculations
        steamEnthalpyDiff() {
          return (pressure, temp) => {
            const tSat = 100 * Math.pow(pressure, 0.25);
            const h_steam = 2778 + 2.05 * (temp - tSat);
            const h_fw = 418.4; // Feedwater at 100°C
            return Math.max(0, h_steam - h_fw); // kJ/kg
          };
        },

        // Reference Boiler
        refBoiler() {
          const selected = this.boilers.find(b => b.id === this.refBoilerId);
          if (selected) return selected;
          if (this.boilers.length > 0) return this.boilers[0];
          // Default fallback if no boilers exist
          return {
            name: "Default Boiler",
            fuelType: "Gas Natural",
            pressure: 10,
            temp: 200,
            efficiency: 88,
            hasTurbine: false,
            editCostManual: false,
            manualCostUSDton: 25.0,
            manualCostUSDMMBtu: 8.0
          };
        },

        emsAlerts() {
          const sim = this.comparison.sim;
          const c_internal = sim.ccElecCostPerMWh || 65.0; // fallback to 65 USD/MWh
          const cc_gen = sim.totalElecGenSum720 || this.plantElecDemand || 15;
          
          // Costo marginal bajo en valle solar: Charrúa 154 kV = 80.00 USD/MWh
          const savingLow = Math.max(0, c_internal - 80.00) * cc_gen;

          // Costo marginal alto en punta/madrugada: Charrúa 154 kV = 300.00 USD/MWh
          const savingHigh = Math.max(0, 300.00 - c_internal) * cc_gen;

          return {
            c_internal,
            cc_gen,
            savingLow,
            savingHigh
          };
        },

        marginalCostsChartData() {
          const width = 420;
          const height = 180;
          const padL = 35;
          const padR = 15;
          const padT = 15;
          const padB = 25;
          
          const maxVal = 320; // scaled up to 320
          const minVal = 0;
          
          // Actual pricing curve from Coordinator portal (strict point by point):
          const charruaPrices = [
            85.0,  // Hour 24 (23:00 - 00:00)
            300.0, // Hour 1 (00:00 - 01:00)
            295.0, // Hour 2 (01:00 - 02:00)
            230.0, // Hour 3 (02:00 - 03:00)
            230.0, // Hour 4 (03:00 - 04:00)
            230.0, // Hour 5 (04:00 - 05:00)
            140.0, // Hour 6 (05:00 - 06:00)
            80.0,  // Hour 7 (06:00 - 07:00)
            110.0, // Hour 8 (07:00 - 08:00)
            260.0, // Hour 9 (08:00 - 09:00)
            100.0, // Hour 10 (09:00 - 10:00)
            50.0,  // Hour 11 (10:00 - 11:00)
            45.0,  // Hour 12 (11:00 - 12:00)
            55.0,  // Hour 13 (12:00 - 13:00)
            55.0,  // Hour 14 (13:00 - 14:00)
            55.0,  // Hour 15 (14:00 - 15:00)
            55.0,  // Hour 16 (15:00 - 16:00)
            65.0,  // Hour 17 (16:00 - 17:00)
            75.0,  // Hour 18 (17:00 - 18:00)
            130.0, // Hour 19 (18:00 - 19:00)
            140.0, // Hour 20 (19:00 - 20:00)
            135.0, // Hour 21 (20:00 - 21:00)
            110.0, // Hour 22 (21:00 - 22:00)
            90.0   // Hour 23 (22:00 - 23:00)
          ];

          // Generate 24 hours values
          const hours = [];
          for (let h = 1; h <= 24; h++) {
            const idx = h % 24;
            const val = charruaPrices[idx];
            
            // h <= 12 is Real, h > 12 is Proyectado
            hours.push({
              hour: h,
              val: val,
              type: h <= 12 ? 'Real' : 'Proyectado'
            });
          }
          
          const getX = (h) => padL + ((h - 1) / 23) * (width - padL - padR);
          const getY = (val) => height - padB - ((val - minVal) / (maxVal - minVal)) * (height - padT - padB);
          
          // Generate points
          const realPoints = [];
          const projPoints = [];
          
          hours.forEach(item => {
            const x = getX(item.hour);
            const y = getY(item.val);
            if (item.hour <= 12) {
              realPoints.push(`${x},${y}`);
            }
            if (item.hour >= 12) {
              projPoints.push(`${x},${y}`);
            }
          });
          
          return {
            width,
            height,
            padL, padR, padT, padB,
            realPath: 'M ' + realPoints.join(' L '),
            projPath: 'M ' + projPoints.join(' L '),
            hours: hours.map(item => ({
              ...item,
              x: getX(item.hour),
              y: getY(item.val)
            }))
          };
        },

        // Backward compatible computed ccOutOfService (true if no active CC units exist)
        ccOutOfService() {
          const activeCCs = this.ciclosCombinados.filter(cc => !cc.isOutOfService);
          return activeCCs.length === 0;
        },

        // Calculate costs for a given boiler based on active fuel prices
        calcBoilerCost() {
          // ⚠️ REACTIVITY FIX: Access reactive LHV and price properties HERE (at computed getter level)
          // so Vue 3 registers them as dependencies. Without this, changes to gasLhv/glpLhv/biomassLhv
          // from PCI inputs would NOT trigger re-evaluation of massBalance and results.
          const _gasLhv = this.gasLhv;
          const _glpLhv = this.glpLhv;
          const _biomassLhv = this.biomassLhv;
          const _gasPriceTon = this.gasPriceTon;
          const _glpPriceTon = this.glpPriceTon;
          const _biomassPriceVal = this.biomassPriceVal;

          return (boiler) => {
            if (boiler.editCostManual) {
              return {
                usdTon: boiler.manualCostUSDton || 0,
                usdMMBtu: boiler.manualCostUSDMMBtu || 0
              };
            }

            let fuelPrice = 0; // USD/MMBtu
            if (boiler.fuelType === "Gas Natural") {
              // Convert gasPrice (USD/ton) to USD/MMBtu based on gasLhv (kcal/kg)
              const lhvMbtuTon = (_gasLhv || 11000) / 252.2;
              fuelPrice = (_gasPriceTon || 336.0) / lhvMbtuTon;
            } else if (boiler.fuelType === "GLP") {
              // Convert glpPrice (USD/ton) to USD/MMBtu based on glpLhv (kcal/kg)
              const lhvMbtuTon = (_glpLhv || 11200) / 252.2;
              fuelPrice = (_glpPriceTon || 533.0) / lhvMbtuTon;
            } else if (boiler.fuelType === "Biomasa") {
              // biomassLhv is in kcal/kg. Convert to MMBtu/ton: LHV_kcal_kg / 252.2 = LHV_MMBtu_ton
              const lhvMbtuTon = (_biomassLhv || 3300) / 252.2;
              fuelPrice = (_biomassPriceVal || 20.0) / lhvMbtuTon;
            }

            const eff = (boiler.efficiency || 100) / 100;
            const diff_h = this.steamEnthalpyDiff(boiler.pressure, boiler.temp); // kJ/kg
            const steam_energy_mmbtu_ton = diff_h / 1055.056; // MMBtu/ton

            const usdMMBtu = fuelPrice / eff;
            const usdTon = usdMMBtu * steam_energy_mmbtu_ton;

            return {
              usdTon: parseFloat(usdTon.toFixed(2)),
              usdMMBtu: parseFloat(usdMMBtu.toFixed(2))
            };
          };
        },

        // Detailed Economic scenarios
        results() {
          const hours = this.hoursOp;
          const refCost = this.calcBoilerCost(this.refBoiler);

          // Multi-unit Combined Cycles: calculate total steam and electricity
          const activeCCs = this.ciclosCombinados.filter(cc => !cc.isOutOfService);
          const totalCCSteam = activeCCs.reduce((sum, cc) => sum + (parseFloat(cc.steamRec) || 0), 0);
          const totalCCElec = activeCCs.reduce((sum, cc) => sum + (parseFloat(cc.gen) || 0), 0);

          // Active boilers
          const activeBoilerSteam = this.boilers.reduce((s, b) =>
            s + (b.isOutOfService ? 0 : (parseFloat(b.steamGen) || 0)), 0); // ton/h
          const activeBoilerElec = this.boilers.reduce((s, b) =>
            s + (b.hasTurbine && !b.isOutOfService ? (parseFloat(b.tgGen) || 0) : 0), 0); // MW

          // Generación total eléctrica y de vapor disponibles
          const totalElecGen   = totalCCElec + activeBoilerElec;    // MW
          const totalSteamGen  = totalCCSteam + activeBoilerSteam;  // ton/h

          // ── ESCENARIO 1: Caldera(s) + Compra de Red (baseline sin CC/TG) ──
          // Regla: TG apagado (0 MW), toda la electricidad comprada al SEN al precio monómico.
          // El vapor lo cubren las calderas auxiliares encendidas a sus costos reales ponderados.
          const esc1ElectricMWh  = this.plantElecDemand * hours;              // MWh/mes
          const esc1ElectricOpex = esc1ElectricMWh * this.marketMonomico;    // USD/mes

          // Costo de vapor Esc1: costo ponderado de TODAS las calderas activas
          // (si no hay calderas, usa la caldera de referencia como fallback)
          const activeBoilerOpexEsc1 = this.boilers.reduce((s, b) => {
            if (b.isOutOfService) return s;
            const c = this.calcBoilerCost(b);
            return s + (parseFloat(b.steamGen) || 0) * hours * c.usdTon;
          }, 0);
          const totalActiveBoilerSteamEsc1 = this.boilers.reduce((s, b) =>
            s + (b.isOutOfService ? 0 : (parseFloat(b.steamGen) || 0)), 0) * hours; // ton/mes

          // Si hay calderas generando, usar su costo ponderado real; si no, usar caldera de referencia
          const esc1SteamProduced = this.plantSteamDemand * hours; // ton/mes (siempre la demanda)
          const esc1SteamOpex = activeBoilerOpexEsc1 > 0
            ? activeBoilerOpexEsc1
            : esc1SteamProduced * refCost.usdTon;

          // Costo ponderado Esc1 para referencia en tabla
          const esc1WeightedUsdTon = esc1SteamProduced > 0
            ? esc1SteamOpex / esc1SteamProduced
            : refCost.usdTon;

          const esc1TotalOpex = esc1SteamOpex + esc1ElectricOpex;

          // Desglose por caldera para auditabilidad
          const esc1BoilerDetail = this.boilers
            .filter(b => !b.isOutOfService && (parseFloat(b.steamGen) || 0) > 0)
            .map(b => {
              const c = this.calcBoilerCost(b);
              const gen = parseFloat(b.steamGen) || 0;
              return {
                name: b.name,
                fuelType: b.fuelType,
                steamTonH: gen,
                usdTon: c.usdTon,
                opexMonth: gen * hours * c.usdTon
              };
            });

          // ── ESCENARIO 2: Operación actual (CCs + calderas activas) ──
          // Allocate gas, fixed opex, and exergy individually for each CC unit
          let ccGasCostMonth = 0;
          let ccTotalOpex = 0;
          let ccTotalSteamCost = 0;
          let Ex_e = 0;
          let Ex_v = 0;

          activeCCs.forEach(cc => {
            const ccGasM = (parseFloat(cc.gasCons) || 0) * (parseFloat(cc.gasCost) || 0) * hours;
            const ccFixed = parseFloat(cc.opexFixed) || 0;
            ccGasCostMonth += ccGasM;
            ccTotalOpex += (ccGasM + ccFixed);

            const Ex_e_unit = parseFloat(cc.gen) || 0;
            const Ex_v_unit = ((parseFloat(cc.steamRec) || 0) * 0.77) * 0.35;
            Ex_e += Ex_e_unit;
            Ex_v += Ex_v_unit;

            const unitExTotal = Ex_e_unit + Ex_v_unit;
            const f_vapor_unit = unitExTotal > 0 ? (Ex_v_unit / unitExTotal) : 0;
            ccTotalSteamCost += (ccGasM * f_vapor_unit + ccFixed * f_vapor_unit);
          });

          const Ex_total = Ex_e + Ex_v;
          const f_elec = Ex_total > 0 ? (Ex_e / Ex_total) : 0;
          const f_vapor = Ex_total > 0 ? (Ex_v / Ex_total) : 0;
          const fSteam = f_vapor;

          const ccSteamProduced = totalCCSteam * hours;
          const ccSteamUnitCost = ccSteamProduced > 0 ? (ccTotalSteamCost / ccSteamProduced) : 0;

          const ccElecCostPerMWh = (totalCCElec * hours) > 0
            ? (ccTotalOpex * f_elec) / (totalCCElec * hours)
            : null;

          const ccVaporCostPerTon = ccSteamProduced > 0
            ? (ccTotalOpex * f_vapor) / ccSteamProduced
            : null;

          // 3. Vapor de respaldo: diferencia entre demanda y vapor total disponible
          const backupSteamNeeded = Math.max(0, this.plantSteamDemand - totalSteamGen) * hours; // ton/mes
          const backupSteamCost   = backupSteamNeeded * refCost.usdTon; // USD/mes

          // ── PASO 2 y 3: Balance eléctrico estricto ──
          // Neto_MW = Total_Gen_MW - Consumo_Planta_MW
          const netoMWEsc2 = totalElecGen - this.plantElecDemand; // MW

          // Asignación condicional estricta:
          // Si Neto < 0 → déficit → comprar al SEN (precio monómico)
          // Si Neto > 0 → excedente → vender al SEN (precio marginal)
          const excedente        = netoMWEsc2 > 0 ? netoMWEsc2 : 0;           // MW
          const purchaseElectric = netoMWEsc2 < 0 ? Math.abs(netoMWEsc2) : 0; // MW
          const autoconsumo      = Math.min(totalElecGen, this.plantElecDemand); // MW

          // Conversión mensual (× horas de operación)
          const excedenteMWh      = excedente * hours;        // MWh/mes vendidos
          const purchaseElecMWh   = purchaseElectric * hours; // MWh/mes comprados
          const autoconsumoMWh    = autoconsumo * hours;      // MWh/mes autoconsumidos

          const autoconsumoSavings = autoconsumoMWh * this.marketMonomico;  // USD/mes
          const excedenteRevenue   = excedenteMWh   * this.marketMarginal;  // USD/mes
          const electricBenefit    = autoconsumoSavings + excedenteRevenue;

          // Compra SEN → siempre precio monómico
          const hasActiveCC = activeCCs.length > 0;
          const purchaseCost = purchaseElecMWh * this.marketMonomico;        // USD/mes

          // Costo opex calderas activas (para esc2)
          const activeBoilerOpex = this.boilers.reduce((s, b) => {
            if (b.isOutOfService) return s;
            const c = this.calcBoilerCost(b);
            return s + (parseFloat(b.steamGen) || 0) * hours * c.usdTon;
          }, 0); // USD/mes (calderas auxiliares en operación)

          const esc2GrossOpex = ccTotalOpex + backupSteamCost + purchaseCost;
          const esc2NetOpex   = esc2GrossOpex - excedenteRevenue;

          // LCOS (Levelized Cost of Steam)
          const totalSteamDemand = this.plantSteamDemand * hours;
          const esc1Lcos = esc1WeightedUsdTon;
          const esc2Lcos = totalSteamDemand > 0
            ? ((ccTotalSteamCost + backupSteamCost) / totalSteamDemand)
            : 0;

          return {
            esc1: {
              steamOpex:        esc1SteamOpex,
              electricOpex:     esc1ElectricOpex,
              totalOpex:        esc1TotalOpex,
              lcos:             esc1Lcos,
              weightedUsdTon:   esc1WeightedUsdTon,
              electricMWh:      esc1ElectricMWh,
              boilerDetail:     esc1BoilerDetail        // para tabla auditáble
            },
            esc2: {
              ccGasCost:         ccGasCostMonth,
              ccTotalOpex,
              fSteam,
              f_elec,
              f_vapor,
              Ex_e,
              Ex_v,
              ccElecCostPerMWh,
              ccVaporCostPerTon,
              ccSteamUnitCost,
              ccSteamProduced,
              ccTotalSteamCost,
              backupSteamCost,
              electricBenefit,
              excedenteRevenue,
              purchaseCost,
              purchaseElectric: purchaseElecMWh,             // MWh/mes comprados (ya × horas)
              purchasePriceEsc2: this.marketMonomico,         // compra siempre al monómico
              grossOpex:         esc2GrossOpex,
              netOpex:           esc2NetOpex,
              lcos:              esc2Lcos,
              // Exposición adicional para el dashboard
              totalElecGen,
              netoMWEsc2,                                    // MW neto para debug
              activeBoilerSteam,
              totalSteamGen,
              backupSteamNeeded
            }
          };
        },


        // KPIs calculation — totalmente reactivo al estado de switches/sliders
        kpis() {
          const r = this.results;
          const comp = this.comparison; // obtenemos delta de comparación de forma directa

          // REGLA: El Ahorro Neto es estrictamente el Delta = Costo Total Mensual Base - Costo Total Mensual Simulado
          const netSavings = comp && comp.d ? comp.d.totalOpex : 0;

          // Active Combined Cycles reference
          const activeCCs = this.ciclosCombinados.filter(cc => !cc.isOutOfService);

          // Costo modulado del vapor CC (0 si F/S)
          const ccModulatedSteamCost = activeCCs.length === 0 ? 0 : r.esc2.ccSteamUnitCost;

          // Total Combined Cycle CAPEX
          const totalCCCapex = this.ciclosCombinados.reduce((sum, cc) => sum + (parseFloat(cc.capex) || 0), 0);

          // Payback calculations
          let paybackText = 'N/A';
          if (activeCCs.length > 0 && netSavings > 0 && totalCCCapex > 0) {
            const years = totalCCCapex / (netSavings * 12);
            paybackText = years.toFixed(1);
          }

          // Estrategia
          let strategy;
          if (activeCCs.length === 0) {
            strategy = 'Operación Base (CC fuera de servicio)';
          } else if (netSavings > 0) {
            strategy = `Ciclo Combinado en Línea (Ahorro: $${this.fmt(netSavings, 0)}/mes)`;
          } else if (r.esc2.netOpex < r.esc1.totalOpex * 0.98) {
            strategy = 'Evaluar optimizar modularización del CC';
          } else {
            strategy = 'Revisar costos — Sin ventaja vs caldera base';
          }

          return {
            netSavings,
            ccModulatedSteamCost,
            paybackText,
            strategy,
            totalCCCapex
          };
        },

        // =====================================================
        // COMPUTED: COMPARISON (Base Escenario vs Simulado)
        // =====================================================
        comparison() {
          const hours = this.hoursOp;
          const refCost = this.calcBoilerCost(this.refBoiler);

          // ── Estado simulado = estado actual ─────────────────
          // ⚠️ REACTIVITY FIX: All reactive properties that affect cost calculations MUST
          // be explicitly included here so Vue 3 tracks them as dependencies of this computed.
          // Missing properties (especially PCI/LHV) caused the "SIMULADO ACTUAL" column
          // to not update when fuel parameters changed.
          const simState = {
            ciclosCombinados: this.ciclosCombinados,
            boilers: this.boilers,                       // ← FIX: was missing, causing boiler costs = 0
            plantSteamDemand: this.plantSteamDemand,
            plantElecDemand: this.plantElecDemand,
            // Fuel prices (weight-based)
            gasPriceTon: this.gasPriceTon,               // ← FIX: was using legacy gasPrice
            glpPriceTon: this.glpPriceTon,
            biomassPriceVal: this.biomassPriceVal,
            // Calorific values (PCI/LHV) - THE CRITICAL REACTIVE CHAIN
            gasLhv: this.gasLhv,                         // ← FIX: was missing entirely
            glpLhv: this.glpLhv,                         // ← FIX: was missing entirely
            biomassLhv: this.biomassLhv,                 // ← FIX: was missing entirely
            // Legacy price compatibility
            gasPrice: this.gasPrice,
            glpPrice: this.glpPrice,
            biomassPrice: this.biomassPrice,
            marketMonomico: this.marketMonomico,
            marketMarginal: this.marketMarginal,
            hoursOp: this.hoursOp,
            refBoilerId: this.refBoilerId
          };
          const sim = this.calculateScenarioMetrics(simState);

          // ── Estado base = escenario guardado o Escenario 1 ──
          const baseSc = this.scenarios.find(s => s.id === this.baseScenarioId);
          let base;
          if (baseSc) {
            base = this.calculateScenarioMetrics(baseSc.state);
          } else {
            // Default: SIN CC/TG activo. Toda la electricidad comprada al SEN al precio monómico.
            // El vapor lo cubren las calderas auxiliares encendidas a sus costos reales ponderados.
            const elecDemMon = (this.plantElecDemand || 0) * hours;
            const boughtUSD  = elecDemMon * (this.marketMonomico || 80);

            // Costo vapor: ponderado de calderas activas (igual que results().esc1)
            const boilerOpexDefault = this.boilers.reduce((s, b) => {
              if (b.isOutOfService) return s;
              const c = this.calcBoilerCost(b);
              return s + (parseFloat(b.steamGen) || 0) * hours * c.usdTon;
            }, 0);

            const activeGenTonH = this.boilers.reduce((s, b) =>
              s + (b.isOutOfService ? 0 : (parseFloat(b.steamGen) || 0)), 0); // ton/h real
            const steamGenMonDefault = activeGenTonH * hours; // ton/mes real generado

            const plantDemandMon = this.plantSteamDemand * hours;
            const steamExpense = boilerOpexDefault > 0
              ? boilerOpexDefault
              : plantDemandMon * refCost.usdTon;

            const denomDefault = steamGenMonDefault > 0 ? steamGenMonDefault : plantDemandMon;
            const avgUsdTon    = denomDefault > 0 ? steamExpense / denomDefault : refCost.usdTon;

            const refBoilerIdVal = this.refBoilerId;
            const refB = this.boilers.find(b => b.id === refBoilerIdVal) || this.boilers[0] || this.refBoiler;
            const refDiffH = this.steamEnthalpyDiff(refB.pressure !== undefined ? refB.pressure : 10, refB.temp !== undefined ? refB.temp : 200);
            const steamEnergyMWhPerTon = refDiffH > 0 ? (refDiffH / 3600) : 0.6944;

            const baseSteamMWheq = denomDefault * steamEnergyMWhPerTon;
            const baseBoilerElec = this.boilers.reduce((s, b) =>
              s + (b.hasTurbine && !b.isOutOfService ? (parseFloat(b.tgGen) || 0) : 0), 0);
            const baseElecGenMWh = baseBoilerElec * hours;

            const baseTotalOpex = steamExpense + boughtUSD;
            const baseLcoe = (baseSteamMWheq + baseElecGenMWh) > 0 
              ? baseTotalOpex / (baseSteamMWheq + baseElecGenMWh)
              : null;

            // Base fuel input calculation
            let baseBoilerFuelInputMWh = 0;
            this.boilers.forEach(b => {
              if (b.isOutOfService) return;
              const gen = parseFloat(b.steamGen) || 0;
              const diff_h = this.steamEnthalpyDiff(b.pressure, b.temp);
              const steamMW = (gen * diff_h) / 3600;
              const eff = (b.efficiency || 85) / 100;
              baseBoilerFuelInputMWh += (steamMW / eff) * hours;
            });
            const baseDeficitSteam = Math.max(0, this.plantSteamDemand - activeGenTonH) * hours;
            const baseBackupSteamMWh = baseDeficitSteam * steamEnergyMWhPerTon;
            const refEff = (refB.efficiency || 85) / 100;
            const baseBackupFuelMWh = baseBackupSteamMWh / refEff;
            const baseFuelMWh = baseBoilerFuelInputMWh + baseBackupFuelMWh;

            const baseEtaGlobal = baseFuelMWh > 0
              ? (baseSteamMWheq + baseElecGenMWh) / baseFuelMWh
              : null;

            // --- SIMULADOR DE LOOP HORARIO DINÁMICO (720 HORAS) PARA BASE ---
            const totalHours = 720;
            let baseFuelCostSum720 = 0;
            let baseSenCostSum720 = 0;
            let baseSteamDeficitCostSum720 = 0;
            let baseUsefulEnergyMWhSum720 = 0;

            const baseElecDemand = this.plantElecDemand || 0;
            const baseSteamDemand = this.plantSteamDemand || 0;

            for (let hour = 1; hour <= totalHours; hour++) {
              const dayHour = hour % 24;

              const steamFactor = 1.0 + 0.15 * Math.sin(2 * Math.PI * (dayHour - 6) / 24);
              const elecFactor = 1.0 + 0.20 * Math.sin(2 * Math.PI * (dayHour - 8) / 24);

              const hrSteamDemand = baseSteamDemand * steamFactor;
              const hrElecDemand = baseElecDemand * elecFactor;

              // Costo Marginal Real SEN Charrúa 154 kV de la curva real
              const charruaPrices = [
                85.0,  // Hour 24 (23:00 - 00:00)
                300.0, // Hour 1 (00:00 - 01:00)
                295.0, // Hour 2 (01:00 - 02:00)
                230.0, // Hour 3 (02:00 - 03:00)
                230.0, // Hour 4 (03:00 - 04:00)
                230.0, // Hour 5 (04:00 - 05:00)
                140.0, // Hour 6 (05:00 - 06:00)
                80.0,  // Hour 7 (06:00 - 07:00)
                110.0, // Hour 8 (07:00 - 08:00)
                260.0, // Hour 9 (08:00 - 09:00)
                100.0, // Hour 10 (09:00 - 10:00)
                50.0,  // Hour 11 (10:00 - 11:00)
                45.0,  // Hour 12 (11:00 - 12:00)
                55.0,  // Hour 13 (12:00 - 13:00)
                55.0,  // Hour 14 (13:00 - 14:00)
                55.0,  // Hour 15 (14:00 - 15:00)
                55.0,  // Hour 16 (15:00 - 16:00)
                65.0,  // Hour 17 (16:00 - 17:00)
                75.0,  // Hour 18 (17:00 - 18:00)
                130.0, // Hour 19 (18:00 - 19:00)
                140.0, // Hour 20 (19:00 - 20:00)
                135.0, // Hour 21 (20:00 - 21:00)
                110.0, // Hour 22 (21:00 - 22:00)
                90.0   // Hour 23 (22:00 - 23:00)
              ];
              const hrMarginalCost = charruaPrices[dayHour] || 150.0;

              const boilerSteamCap = activeGenTonH;
              const boilerElecCap = baseBoilerElec;

              const steamDeficit = Math.max(0, hrSteamDemand - boilerSteamCap);
              const steamPenalty = steamDeficit * refCost.usdTon;
              baseSteamDeficitCostSum720 += steamPenalty;

              const elecDeficit = Math.max(0, hrElecDemand - boilerElecCap);
              const elecPenalty = elecDeficit * hrMarginalCost;

              const boilerOpexH = boilerOpexDefault / hours;
              baseFuelCostSum720 += boilerOpexH;
              baseSenCostSum720 += elecPenalty;

              const usefulSteamMWh = hrSteamDemand * steamEnergyMWhPerTon;
              baseUsefulEnergyMWhSum720 += (usefulSteamMWh + hrElecDemand);
            }

            const baseOpexTotal720 = baseFuelCostSum720 + baseSenCostSum720 + baseSteamDeficitCostSum720;
            const baseLcoe720 = baseUsefulEnergyMWhSum720 > 0 ? baseOpexTotal720 / baseUsefulEnergyMWhSum720 : null;

            base = {
              avgUsdTon,
              steamGenMon: denomDefault,
              steamExpense,
              ccElecOpex: 0,
              elecDemMon,
              sold: 0, soldUSD: 0,
              bought: elecDemMon, boughtUSD,
              totalOpex: baseTotalOpex,
              ccElecCostPerMWh: null,
              ccVaporCostPerTon: null,
              f_elec: 0,
              f_vapor: 0,
              Ex_e: 0,
              Ex_v: 0,
              plantSteamDemand: this.plantSteamDemand,
              plantElecDemand: this.plantElecDemand,
              hoursOp: hours,
              ccOutOfService: true,
              ciclosCombinados: [],
              lcoe: baseLcoe,
              etaGlobal: baseEtaGlobal,
              steamMWheq: baseSteamMWheq,
              elecMWh: baseElecGenMWh,
              opexTotal720: baseOpexTotal720,
              lcoe720: baseLcoe720
            };
          }

          // ── Deltas (base - sim: positivo = ahorro) ──────────
          const delta = (bVal, sVal) => bVal - sVal;
          return {
            base, sim,
            baseLabel: baseSc ? baseSc.name : 'Base (sin CC)',
            simLabel:  'Simulado Actual',
            d: {
              avgUsdTon:   delta(base.avgUsdTon,   sim.avgUsdTon),
              steamGenMon: delta(base.steamGenMon, sim.steamGenMon),
              steamExpense:delta(base.steamExpense,sim.steamExpense),
              ccElecOpex:  delta(base.ccElecOpex || 0, sim.ccElecOpex || 0),
              elecDemMon:  delta(base.elecDemMon,  sim.elecDemMon),
              sold:        delta(base.sold,         sim.sold),
              soldUSD:     delta(base.soldUSD,      sim.soldUSD),
              bought:      delta(base.bought,       sim.bought),
              boughtUSD:   delta(base.boughtUSD,    sim.boughtUSD),
              totalOpex:   delta(base.totalOpex,    sim.totalOpex),
              opexTotal720:delta(base.opexTotal720 || 0, sim.opexTotal720 || 0),
              lcoe720:     delta(base.lcoe720 || 0, sim.lcoe720 || 0)
            }
          };
        },

        scenariosWithMetrics() {
          return this.scenarios.map(sc => {
            const metrics = this.calculateScenarioMetrics(sc.state);
            const baseMetrics = this.comparison.base;
            const deltaTotalOpex = baseMetrics.totalOpex - metrics.totalOpex;
            return {
              ...sc,
              metrics,
              deltaTotalOpex
            };
          });
        },

        configurationsForReport() {
          const arr = [];
          
          const getSteamEnergyFactor = (m) => {
            // steam energy content helper (same logic as template / backend)
            const pressure = m.refBoilerPressure !== undefined ? m.refBoilerPressure : 10;
            const temp = m.refBoilerTemp !== undefined ? m.refBoilerTemp : 200;
            const diff_h = this.steamEnthalpyDiff(pressure, temp);
            return diff_h > 0 ? (diff_h / 3600) : 0.6944;
          };

          // 1. Línea Base
          if (this.comparison && this.comparison.base) {
            const base = this.comparison.base;
            const factor = getSteamEnergyFactor(base);
            arr.push({
              name: "Línea Base",
              steamDemand: base.plantSteamDemand,
              steamDemandMon: base.steamGenMon,
              elecDemand: base.plantElecDemand,
              elecDemandMon: base.elecDemMon,
              avgSteamCostUSDton: base.avgUsdTon,
              avgUsdMWh: base.avgUsdTon / factor,
              lcoe: base.lcoe,
              lcoe_indexado: base.lcoe720 || 0,
              etaGlobal: base.etaGlobal ? base.etaGlobal * 100 : 0
            });
          }

          // 2. Simulado Actual
          if (this.comparison && this.comparison.sim) {
            const sim = this.comparison.sim;
            const factor = getSteamEnergyFactor(sim);
            arr.push({
              name: "Simulado Actual",
              steamDemand: sim.plantSteamDemand,
              steamDemandMon: sim.steamGenMon,
              elecDemand: sim.plantElecDemand,
              elecDemandMon: sim.elecDemMon,
              avgSteamCostUSDton: sim.avgUsdTon,
              avgUsdMWh: sim.avgUsdTon / factor,
              lcoe: sim.lcoe,
              lcoe_indexado: sim.lcoe720 || 0,
              etaGlobal: sim.etaGlobal ? sim.etaGlobal * 100 : 0
            });
          }

          // 3. Saved scenarios
          if (this.scenariosWithMetrics) {
            this.scenariosWithMetrics.forEach(sc => {
              const m = sc.metrics;
              const factor = getSteamEnergyFactor(m);
              arr.push({
                name: sc.name,
                steamDemand: m.plantSteamDemand,
                steamDemandMon: m.steamGenMon,
                elecDemand: m.plantElecDemand,
                elecDemandMon: m.elecDemMon,
                avgSteamCostUSDton: m.avgUsdTon,
                avgUsdMWh: m.avgUsdTon / factor,
                lcoe: m.lcoe,
                lcoe_indexado: m.lcoe720 || 0,
                etaGlobal: m.etaGlobal ? m.etaGlobal * 100 : 0
              });
            });
          }

          // Sort by LCOE Indexado (Menor a Mayor Costo)
          arr.sort((a, b) => a.lcoe_indexado - b.lcoe_indexado);
          return arr;
        },

        // =============================================
        // MASS BALANCE OF STEAM
        // =============================================
        massBalance() {
          const sources = [];

          // Each boiler — skip if F/S
          this.boilers.forEach(b => {
            const cost = this.calcBoilerCost(b);
            const gen = b.isOutOfService ? 0 : (parseFloat(b.steamGen) || 0);
            sources.push({
              id: 'boiler_' + b.id,
              name: b.name,
              fuelType: b.fuelType,
              gen,
              maxGen: parseFloat(b.maxSteamGen) || parseFloat(b.steamGen) || 0,
              pctLoad: b.isOutOfService ? 0 : (b.maxSteamGen > 0 ? Math.min(100, (b.steamGen / b.maxSteamGen) * 100) : 100),
              usdTon: cost.usdTon,
              usdMMBtu: cost.usdMMBtu,
              isOutOfService: b.isOutOfService,
              type: 'boiler'
            });
          });

          const r = this.results;
          const activeCCs = this.ciclosCombinados.filter(cc => !cc.isOutOfService);
          const hours = this.hoursOp;
          const totalCCSteam = activeCCs.reduce((sum, cc) => sum + (parseFloat(cc.steamRec) || 0), 0);
          const ccTotalSteamCost = r.esc2.ccTotalSteamCost;
          const ccSteamUnitCost = r.esc2.ccSteamUnitCost;
          const ccGasCostMonth = r.esc2.ccGasCost;
          const fSteam = r.esc2.fSteam;

          // TGs Combined Cycle Units - dynamic sources
          // Steam energy content for USD/ton → USD/MMBtu conversion (using reference boiler params or default)
          const refB = this.refBoiler;
          const refDiffH = this.steamEnthalpyDiff(refB.pressure || 10, refB.temp || 200); // kJ/kg
          const steamEnergyMmbtuTon = refDiffH > 0 ? (refDiffH / 1055.056) : (2359 / 1055.056); // MMBtu/ton ≈ 2.235

          activeCCs.forEach(cc => {
            const ccGenSteam = parseFloat(cc.steamRec) || 0;
            const ccGasM = (parseFloat(cc.gasCons) || 0) * (parseFloat(cc.gasCost) || 0) * hours;
            const ccFixed = parseFloat(cc.opexFixed) || 0;

            const Ex_e_unit = parseFloat(cc.gen) || 0;
            const Ex_v_unit = (ccGenSteam * 0.77) * 0.35;
            const unitExTotal = Ex_e_unit + Ex_v_unit;
            const f_vapor_unit = unitExTotal > 0 ? (Ex_v_unit / unitExTotal) : 0;
            // usdTon: cost per ton of steam from CC/HRSG (allocation by exergy split)
            const ccUnitSteamCost = ccGenSteam > 0 ? ((ccGasM * f_vapor_unit + ccFixed * f_vapor_unit) / (ccGenSteam * hours)) : 0;
            // usdMMBtu: cost per MMBtu of steam energy — convert from usdTon via steam energy content
            const ccUnitSteamCostMMBtu = steamEnergyMmbtuTon > 0 ? (ccUnitSteamCost / steamEnergyMmbtuTon) : 0;

            console.log(`[CC Debug] ${cc.name}: gasCons=${cc.gasCons} MMBtu/h, gasCost=${cc.gasCost} USD/MMBtu, steamRec=${cc.steamRec} ton/h, f_vapor=${f_vapor_unit.toFixed(4)}, usdTon=${ccUnitSteamCost.toFixed(2)}, steamEnergyMMBtu/ton=${steamEnergyMmbtuTon.toFixed(4)}, usdMMBtu=${ccUnitSteamCostMMBtu.toFixed(4)}`);

            sources.push({
              id: 'cc_' + cc.id,
              name: cc.name + ' (HRSG)',
              fuelType: 'Gas Natural (TG)',
              gen: ccGenSteam,
              maxGen: parseFloat(cc.steamRec) || 0,
              pctLoad: 100,
              usdTon: parseFloat(ccUnitSteamCost.toFixed(2)),
              usdMMBtu: parseFloat(ccUnitSteamCostMMBtu.toFixed(2)),
              isOutOfService: false,
              type: 'cc'
            });
          });

          // Add simulated F/S cycles so they appear in sources
          const inactiveCCs = this.ciclosCombinados.filter(cc => cc.isOutOfService);
          inactiveCCs.forEach(cc => {
            sources.push({
              id: 'cc_' + cc.id,
              name: cc.name + ' (F/S)',
              fuelType: 'Gas Natural (TG)',
              gen: 0,
              maxGen: parseFloat(cc.steamRec) || 0,
              pctLoad: 0,
              usdTon: 0,
              usdMMBtu: 0,
              isOutOfService: true,
              type: 'cc'
            });
          });

          const totalGen = sources.reduce((s, x) => s + x.gen, 0);
          const demand = parseFloat(this.plantSteamDemand) || 0;
          const deficit = demand - totalGen;
          const excess = -deficit;

          let weightedUsdTon = 0;
          let weightedUsdMMBtu = 0;
          if (totalGen > 0) {
            sources.forEach(s => {
              weightedUsdTon   += (s.gen / totalGen) * s.usdTon;
              weightedUsdMMBtu += (s.gen / totalGen) * s.usdMMBtu;
            });
          }

          const sourcesWithPct = sources.map(s => ({
            ...s,
            pct: totalGen > 0 ? (s.gen / totalGen) * 100 : 0
          }));

          return {
            sources: sourcesWithPct,
            totalGen,
            demand,
            deficit,
            excess,
            balanced: Math.abs(deficit) < 0.01,
            weightedUsdTon: parseFloat(weightedUsdTon.toFixed(2)),
            weightedUsdMMBtu: parseFloat(weightedUsdMMBtu.toFixed(4))
          };
        },

        // =============================================
        // ELECTRIC BALANCE (Dashboard Panel)
        // =============================================
        electricBalance() {
          // ── PASO 1: Sumar TODA la generación propia activa ──
          // Ciclos Combinados (TGs) activos
          const activeCCs = this.ciclosCombinados.filter(cc => !cc.isOutOfService);
          const ccElecGen = activeCCs.reduce((sum, cc) => sum + (parseFloat(cc.gen) || 0), 0); // MW

          // Turbinas de contrapresión en calderas (si tienen turbina Y están en servicio)
          const boilerTurbineGen = this.boilers.reduce((sum, b) => {
            return sum + (b.hasTurbine && !b.isOutOfService ? (parseFloat(b.tgGen) || 0) : 0);
          }, 0); // MW

          // Total_Gen_MW = Suma de TODA la generación propia
          const totalOwnGen = ccElecGen + boilerTurbineGen; // MW
          const demand = parseFloat(this.plantElecDemand) || 0; // MW

          // ── PASO 2: Balance Neto estricto ──
          // Neto_MW = Total_Gen_MW - Consumo_Planta_MW
          const netoMW = totalOwnGen - demand;

          // ── PASO 3: Asignación condicional (lógica estricta) ──
          // Si Neto < 0 → déficit → COMPRAR al SEN
          // Si Neto > 0 → excedente → VENDER al SEN
          // Si Neto = 0 → balance perfecto
          const compraRedMW   = netoMW < 0 ? Math.abs(netoMW) : 0;  // MW a comprar
          const excedenteMW   = netoMW > 0 ? netoMW : 0;           // MW a vender
          const autoconsumoMW = Math.min(totalOwnGen, demand);      // MW autoconsumidos

          const monomico = parseFloat(this.marketMonomico) || 80;
          const marginal = parseFloat(this.marketMarginal) || 45;

          // Flows en USD/h (para mostrar en panel)
          const savingsAutoconsumo = autoconsumoMW * monomico;  // USD/h
          const revenueExcedente   = excedenteMW  * marginal;   // USD/h
          const costCompra         = compraRedMW  * monomico;   // USD/h

          const coveragePct = demand > 0 ? Math.min(100, (totalOwnGen / demand) * 100) : 0;

          console.log(`[ElecBalance] totalGen=${totalOwnGen.toFixed(2)}MW, demand=${demand}MW, neto=${netoMW.toFixed(2)}MW, compra=${compraRedMW.toFixed(2)}MW, excedente=${excedenteMW.toFixed(2)}MW`);

          return {
            ccElecGen,
            boilerTurbineGen,
            totalOwnGen,
            demand,
            netoMW,
            autoconsumo: autoconsumoMW,
            excedente: excedenteMW,
            compraRed: compraRedMW,
            savingsAutoconsumo,
            revenueExcedente,
            costCompra,
            coveragePct
          };
        },


        // SVG Chart coordinates
        chartMaxVals() {
          const r = this.results;
          const maxOpex = Math.max(r.esc1.totalOpex, r.esc2.grossOpex, 100000);
          const maxSavings = Math.max(r.esc2.electricBenefit, 50000);
          const maxLcos = Math.max(r.esc1.lcos, r.esc2.lcos, 20);

          return {
            opex: maxOpex * 1.15,
            savings: maxSavings * 1.15,
            lcos: maxLcos * 1.15
          };
        },

        chartOpexData() {
          const r = this.results;
          const max = this.chartMaxVals.opex;
          const h1 = (r.esc1.totalOpex / max) * 100;
          const h2 = (r.esc2.netOpex / max) * 100;

          return {
            max,
            bar1: { h: h1, y: 120 - h1 },
            bar2: { h: h2, y: 120 - h2 }
          };
        },

        chartSavingsData() {
          const r = this.results;
          const max = this.chartMaxVals.savings;
          const h1 = 0; // Escenario 1 savings is 0
          const h2 = (r.esc2.electricBenefit / max) * 100;

          return {
            max,
            bar1: { h: h1, y: 120 - h1 },
            bar2: { h: h2, y: 120 - h2 }
          };
        },

        chartLcosData() {
          const r = this.results;
          const max = this.chartMaxVals.lcos;
          const h1 = (r.esc1.lcos / max) * 100;
          const h2 = (r.esc2.lcos / max) * 100;

          return {
            max,
            bar1: { h: h1, y: 120 - h1 },
            bar2: { h: h2, y: 120 - h2 }
          };
        },

        // JSON data export
        jsonOutput() {
          const data = {
            timestamp: new Date().toISOString(),
            parameters: {
              plant_elec_demand_mw: this.plantElecDemand,
              plant_steam_demand_tonh: this.plantSteamDemand,
              hours_operation_month: this.hoursOp,
              market_monomico_usd_mwh: this.marketMonomico,
              market_marginal_usd_mwh: this.marketMarginal,
              gas_price_usd_mmbtu: this.gasPrice,
              glp_price_usd_mmbtu: this.glpPrice,
              biomass_price_usd_ton: this.biomassPrice
            },
            boilers: this.boilers.map(b => ({
              name: b.name,
              fuel_type: b.fuelType,
              pressure_bar: b.pressure,
              temp_c: b.temp,
              efficiency_percent: b.efficiency,
              has_turbine: b.hasTurbine,
              turbine_type: b.turbineType,
              turbine_gen_mw: b.tgGen,
              cost_vapor_usd_ton: this.calcBoilerCost(b).usdTon,
              cost_vapor_usd_mmbtu: this.calcBoilerCost(b).usdMMBtu
            })),
            combined_cycle: {
              gas_consumption_mmbtuh: this.ccGasCons,
              gas_cost_usd_mmbtu: this.ccGasCost,
              generation_mw: this.ccGen,
              steam_recovery_tonh: this.ccSteamRec,
              opex_fixed_usd_month: this.ccOpexFixed,
              capex_usd: this.ccCapex,
              modulated_steam_cost_usd_ton: this.results.esc2.ccSteamUnitCost
            },
            scenarios: {
              escenario_1_traditional: {
                steam_opex_usd_month: this.results.esc1.steamOpex,
                electric_opex_usd_month: this.results.esc1.electricOpex,
                total_opex_usd_month: this.results.esc1.totalOpex,
                lcos_usd_ton: this.results.esc1.lcos
              },
              escenario_2_combined_cycle: {
                gross_opex_usd_month: this.results.esc2.grossOpex,
                net_opex_usd_month: this.results.esc2.netOpex,
                electric_benefit_usd_month: this.results.esc2.electricBenefit,
                backup_steam_cost_usd_month: this.results.esc2.backupSteamCost,
                lcos_usd_ton: this.results.esc2.lcos
              }
            },
            kpis: {
              monthly_net_savings_usd:  this.kpis.netSavings,   // 0 si CC está F/S
              payback_years:            this.kpis.paybackText,
              strategy_recommended:     this.kpis.strategy,
              cc_active:               !this.ccOutOfService
            }
          };
          return JSON.stringify(data, null, 2);
        },

        ahorroNetoMensual() {
          return this.fmtUSD(this.kpis.netSavings);
        },
        recommendationText() {
          if (this.kpis.netSavings < 0) {
            return "Recomendación: Pausar la adquisición bajo las condiciones actuales y optimizar la modularización.";
          } else {
            return "Recomendación: Avanzar con la evaluación de ingeniería, el escenario presenta viabilidad financiera.";
          }
        },
        costoPonderadoBase() {
          return this.fmt(this.comparison.base.avgUsdTon, 2);
        },
        costoPonderadoSimulado() {
          return this.fmt(this.comparison.sim.avgUsdTon, 2);
        },
        deltaCostoPonderado() {
          return this.fmt(Math.abs(this.comparison.d.avgUsdTon), 2);
        },
        costoUnitarioCC() {
          return this.fmt(this.results.esc2.ccSteamUnitCost, 2);
        },
        opexBase() {
          return this.fmt(this.comparison.base.totalOpex, 0);
        },
        opexSimulado() {
          return this.fmt(this.comparison.sim.totalOpex, 0);
        },
        generacionTotal() {
          return this.fmt(this.results.esc2.totalSteamGen, 1);
        },
        demandaPlanta() {
          return this.fmt(this.plantSteamDemand, 1);
        },
        paybackSimple() {
          return this.kpis.paybackText === 'N/A' ? 'N/A' : (this.kpis.paybackText + ' años');
        }

      },
      watch: {
        // Watcher profundo: persiste TODO el estado relevante incluyendo
        // ccOutOfService, scenarios y baseScenarioId para que los
        // KPIs reactivos sobrevivan un reload de página.
        $data: {
          handler(val) {
            try {
              localStorage.setItem('steamoptix_bg_balance_gen', JSON.stringify({
                plantElecDemand:  val.plantElecDemand,
                plantSteamDemand: val.plantSteamDemand,
                hoursOp:          val.hoursOp,
                marketMonomico:   val.marketMonomico,
                marketMarginal:   val.marketMarginal,
                gasPrice:         val.gasPrice,
                glpPrice:         val.glpPrice,
                biomassPrice:     val.biomassPrice,
                gasPriceTon:      val.gasPriceTon,
                glpPriceTon:      val.glpPriceTon,
                biomassPriceVal:  val.biomassPriceVal,
                gasLhv:           val.gasLhv,
                glpLhv:           val.glpLhv,
                biomassLhv:       val.biomassLhv,
                ciclosCombinados: val.ciclosCombinados,
                nextCCId:         val.nextCCId,
                refBoilerId:      val.refBoilerId,
                boilers:          val.boilers,
                nextBoilerId:     val.nextBoilerId,
                scenarios:        val.scenarios,        // ← gestor de escenarios
                baseScenarioId:   val.baseScenarioId    // ← escenario base activo
              }));
            } catch (e) {
              console.error('Error saving balance gen state to localStorage:', e);
            }
          },
          deep: true
        }
      },
      methods: {
        calculateScenarioMetrics(st) {
          const hours = st.hoursOp !== undefined ? st.hoursOp : this.hoursOp;
          
          // Boiler cost calculation for this specific state
          const calcStateBoilerCost = (b) => {
            if (b.editCostManual) {
              return {
                usdTon: b.manualCostUSDton || 0,
                usdMMBtu: b.manualCostUSDMMBtu || 0
              };
            }

            let fuelPrice = 0;
            if (b.fuelType === "Gas Natural") {
              const gasP_ton = st.gasPriceTon !== undefined ? st.gasPriceTon : this.gasPriceTon;
              const gasL = st.gasLhv !== undefined ? st.gasLhv : this.gasLhv;
              const lhvMbtuTon = (gasL || 11000) / 252.2;
              fuelPrice = (gasP_ton || 336.0) / lhvMbtuTon;
            } else if (b.fuelType === "GLP") {
              const glpP_ton = st.glpPriceTon !== undefined ? st.glpPriceTon : this.glpPriceTon;
              const glpL = st.glpLhv !== undefined ? st.glpLhv : this.glpLhv;
              const lhvMbtuTon = (glpL || 11200) / 252.2;
              fuelPrice = (glpP_ton || 533.0) / lhvMbtuTon;
            } else if (b.fuelType === "Biomasa") {
              const biomassP = st.biomassPriceVal !== undefined ? st.biomassPriceVal : this.biomassPriceVal;
              const bioLhv = st.biomassLhv !== undefined ? st.biomassLhv : this.biomassLhv;
              const lhvMbtuTon = (bioLhv || 3300) / 252.2;
              fuelPrice = biomassP / lhvMbtuTon;
            }

            const eff = (b.efficiency || 100) / 100;
            const diff_h = this.steamEnthalpyDiff(b.pressure, b.temp);
            const steam_energy_mmbtu_ton = diff_h / 1055.056;

            const usdMMBtu = fuelPrice / eff;
            const usdTon = usdMMBtu * steam_energy_mmbtu_ton;

            return {
              usdTon: parseFloat(usdTon.toFixed(2)),
              usdMMBtu: parseFloat(usdMMBtu.toFixed(2))
            };
          };

          const ccs = st.ciclosCombinados || this.ciclosCombinados || [];
          const activeCCs = ccs.filter(cc => !cc.isOutOfService);
          const totalCCSteam = activeCCs.reduce((sum, cc) => sum + (parseFloat(cc.steamRec) || 0), 0);
          const totalCCElec = activeCCs.reduce((sum, cc) => sum + (parseFloat(cc.gen) || 0), 0);

          const boilers = st.boilers || [];
          const activeBoilerSteam = boilers.reduce((s, b) =>
            s + (b.isOutOfService ? 0 : (parseFloat(b.steamGen) || 0)), 0);
          const activeBoilerElec  = boilers.reduce((s, b) =>
            s + (b.hasTurbine && !b.isOutOfService ? (parseFloat(b.tgGen) || 0) : 0), 0);

          const totalSteamGen = totalCCSteam + activeBoilerSteam;
          const totalElecGen  = totalCCElec  + activeBoilerElec;

          const boilerOpexM = boilers.reduce((s, b) => {
            if (b.isOutOfService) return s;
            const gen = parseFloat(b.steamGen) || 0;
            const c = calcStateBoilerCost(b);
            return s + gen * hours * c.usdTon;
          }, 0);

          // Allocate gas, fixed opex, and exergy individually for each CC unit
          let ccGasCostM = 0;
          let ccFixedOpexM = 0;
          let ccSteamCostM = 0;
          let Ex_e = 0;
          let Ex_v = 0;

          activeCCs.forEach(cc => {
            const ccGas = (parseFloat(cc.gasCons) || 0) * (parseFloat(cc.gasCost) || 0) * hours;
            const ccFixed = parseFloat(cc.opexFixed) || 0;
            ccGasCostM += ccGas;
            ccFixedOpexM += ccFixed;

            const Ex_e_unit = parseFloat(cc.gen) || 0;
            const Ex_v_unit = ((parseFloat(cc.steamRec) || 0) * 0.77) * 0.35;
            Ex_e += Ex_e_unit;
            Ex_v += Ex_v_unit;

            const unitExTotal = Ex_e_unit + Ex_v_unit;
            const f_vapor_unit = unitExTotal > 0 ? (Ex_v_unit / unitExTotal) : 0;
            ccSteamCostM += (ccGas * f_vapor_unit + ccFixed * f_vapor_unit);
          });

          const Ex_total = Ex_e + Ex_v;
          const f_elec = Ex_total > 0 ? (Ex_e / Ex_total) : 0;
          const f_vapor = Ex_total > 0 ? (Ex_v / Ex_total) : 0;

          const ccTotalOpex = ccGasCostM + ccFixedOpexM;
          const ccElecOpex  = ccTotalOpex * f_elec;

          const ccSteamProduced = totalCCSteam * hours;
          const ccSteamUnitCost = ccSteamProduced > 0 ? (ccSteamCostM / ccSteamProduced) : 0;

          const ccElecCostPerMWh = (totalCCElec * hours) > 0
            ? (ccTotalOpex * f_elec) / (totalCCElec * hours)
            : null;

          const ccVaporCostPerTon = ccSteamProduced > 0
            ? (ccTotalOpex * f_vapor) / ccSteamProduced
            : null;

          const demand = parseFloat(st.plantSteamDemand !== undefined ? st.plantSteamDemand : this.plantSteamDemand) || 0;
          const backupNeeded = Math.max(0, demand - totalSteamGen) * hours;
          
          const refBoilerIdVal = st.refBoilerId !== undefined ? st.refBoilerId : this.refBoilerId;
          const refB = boilers.find(b => b.id === refBoilerIdVal) || boilers[0] || this.refBoiler;
          const refCost = calcStateBoilerCost(refB);
          const backupCost   = backupNeeded * refCost.usdTon;

          const steamExpense = ccSteamCostM + boilerOpexM + backupCost;
          const steamGenMon  = Math.max(demand, totalSteamGen) * hours;

          const avgUsdTon = steamGenMon > 0 ? steamExpense / steamGenMon : 0;

          const elecDemand  = parseFloat(st.plantElecDemand !== undefined ? st.plantElecDemand : this.plantElecDemand) || 0;
          const elecGenMon  = totalElecGen * hours;   // MWh/mes generados
          const elecDemMon  = elecDemand   * hours;   // MWh/mes demandados

          // ── BALANCE ELÉCTRICO SEN ─────────────────────────────────────────────
          // Lógica estricta: Neto_MWh = Generación - Demanda
          //   Si Neto < 0 → déficit → COMPRAR al SEN (precio MONÓMICO)
          //   Si Neto > 0 → excedente → VENDER al SEN (precio MARGINAL)
          //   Si Neto = 0 → balance perfecto, compra = venta = 0
          const netoMWh = elecGenMon - elecDemMon; // MWh/mes
          const sold    = netoMWh > 0 ? netoMWh : 0;           // MWh/mes vendidos al SEN
          const bought  = netoMWh < 0 ? Math.abs(netoMWh) : 0; // MWh/mes comprados al SEN

          const monomico    = parseFloat(st.marketMonomico !== undefined ? st.marketMonomico : this.marketMonomico) || 80;
          const marginal    = parseFloat(st.marketMarginal !== undefined ? st.marketMarginal : this.marketMarginal) || 45;
          const soldUSD     = sold   * marginal;  // ingresos por venta al SEN
          const boughtUSD   = bought * monomico;  // costo de compra al SEN (siempre monómico)
          const hasActiveCC = activeCCs.length > 0;

          console.log(`[CalcMetrics] totalElecGen=${totalElecGen.toFixed(2)}MW, elecDemand=${elecDemand}MW, netoMWh=${netoMWh.toFixed(0)}MWh/mes, sold=${sold.toFixed(0)}, bought=${bought.toFixed(0)}`);

          const totalOpex = steamExpense + ccElecOpex + boughtUSD - soldUSD;

          // --- CÓMPUTO DE LCOE Y EFICIENCIA GLOBAL ---
          const refDiffH = this.steamEnthalpyDiff(refB.pressure !== undefined ? refB.pressure : 10, refB.temp !== undefined ? refB.temp : 200);
          const steamEnergyMWhPerTon = refDiffH > 0 ? (refDiffH / 3600) : 0.6944;
          const steamMWheq = steamGenMon * steamEnergyMWhPerTon;
          const elecMWh = totalElecGen * hours;
          const lcoe = (steamMWheq + elecMWh) > 0 ? totalOpex / (steamMWheq + elecMWh) : null;

          // CC Fuel Input (MWh/mes)
          let ccFuelInputMWh = 0;
          activeCCs.forEach(cc => {
            const gasConsMMBtuH = parseFloat(cc.gasCons) || 0;
            ccFuelInputMWh += gasConsMMBtuH * 0.293071 * hours;
          });

          // Boiler Fuel Input (MWh/mes)
          let boilerFuelInputMWh = 0;
          boilers.forEach(b => {
            if (b.isOutOfService) return;
            const gen = parseFloat(b.steamGen) || 0;
            const diff_h = this.steamEnthalpyDiff(b.pressure, b.temp);
            const steamMW = (gen * diff_h) / 3600;
            const eff = (b.efficiency || 85) / 100;
            boilerFuelInputMWh += (steamMW / eff) * hours;
          });

          // Backup Boiler Fuel Input (MWh/mes)
          const refEff = (refB.efficiency || 85) / 100;
          const backupSteamMWh = backupNeeded * steamEnergyMWhPerTon;
          const backupFuelInputMWh = backupSteamMWh / refEff;

          const totalFuelInputMWh = ccFuelInputMWh + boilerFuelInputMWh + backupFuelInputMWh;
          const etaGlobal = totalFuelInputMWh > 0 ? (steamMWheq + elecMWh) / totalFuelInputMWh : null;

          // --- SIMULADOR DE LOOP HORARIO DINÁMICO (720 HORAS) ---
          const totalHours = 720;
          let fuelCostSum720 = 0;
          let senCostSum720 = 0;
          let steamDeficitCostSum720 = 0;
          let usefulEnergyMWhSum720 = 0;
          let totalSteamGenSum720 = 0;
          let totalElecGenSum720 = 0;

          for (let hour = 1; hour <= totalHours; hour++) {
            const dayHour = hour % 24;

            // Perfiles de Demanda Horaria con variación senoidal diaria (+-15%)
            const steamFactor = 1.0 + 0.15 * Math.sin(2 * Math.PI * (dayHour - 6) / 24);
            const elecFactor = 1.0 + 0.20 * Math.sin(2 * Math.PI * (dayHour - 8) / 24);

            const hrSteamDemand = demand * steamFactor;
            const hrElecDemand = elecDemand * elecFactor;

            // Costo Marginal Real SEN Charrúa 154 kV de la curva real
            const charruaPrices = [
              85.0,  // Hour 24 (23:00 - 00:00)
              300.0, // Hour 1 (00:00 - 01:00)
              295.0, // Hour 2 (01:00 - 02:00)
              230.0, // Hour 3 (02:00 - 03:00)
              230.0, // Hour 4 (03:00 - 04:00)
              230.0, // Hour 5 (04:00 - 05:00)
              140.0, // Hour 6 (05:00 - 06:00)
              80.0,  // Hour 7 (06:00 - 07:00)
              110.0, // Hour 8 (07:00 - 08:00)
              260.0, // Hour 9 (08:00 - 09:00)
              100.0, // Hour 10 (09:00 - 10:00)
              50.0,  // Hour 11 (10:00 - 11:00)
              45.0,  // Hour 12 (11:00 - 12:00)
              55.0,  // Hour 13 (12:00 - 13:00)
              55.0,  // Hour 14 (13:00 - 14:00)
              55.0,  // Hour 15 (14:00 - 15:00)
              55.0,  // Hour 16 (15:00 - 16:00)
              65.0,  // Hour 17 (16:00 - 17:00)
              75.0,  // Hour 18 (17:00 - 18:00)
              130.0, // Hour 19 (18:00 - 19:00)
              140.0, // Hour 20 (19:00 - 20:00)
              135.0, // Hour 21 (20:00 - 21:00)
              110.0, // Hour 22 (21:00 - 22:00)
              90.0   // Hour 23 (22:00 - 23:00)
            ];
            const hrMarginalCost = charruaPrices[dayHour] || 150.0;

            // Capacidad actual de la configuración
            const ccSteamCap = totalCCSteam; // ton/h
            const ccElecCap = totalCCElec;   // MW
            const boilerSteamCap = activeBoilerSteam; // ton/h
            const boilerElecCap = activeBoilerElec;   // MW

            const genSteam = ccSteamCap + boilerSteamCap;
            const genElec = ccElecCap + boilerElecCap;

            // Penalizaciones por subgeneración
            const steamDeficit = Math.max(0, hrSteamDemand - genSteam);
            const steamPenalty = steamDeficit * refCost.usdTon;
            steamDeficitCostSum720 += steamPenalty;

            const elecDeficit = Math.max(0, hrElecDemand - genElec);
            const elecPenalty = elecDeficit * hrMarginalCost;

            // Ventas de excedentes
            const elecExcess = Math.max(0, genElec - hrElecDemand);
            const elecRevenue = elecExcess * (hrMarginalCost * 0.9); // castigo 10%

            // Combustibles y costos fijos de CC y calderas prorrateados por hora
            let ccGasCostH = 0;
            activeCCs.forEach(cc => {
              ccGasCostH += (parseFloat(cc.gasCons) || 0) * (parseFloat(cc.gasCost) || 0); // USD/h
            });
            const ccFixedOpexH = ccFixedOpexM / hours;
            const boilerOpexH = boilerOpexM / hours;

            fuelCostSum720 += ccGasCostH + ccFixedOpexH + boilerOpexH;
            senCostSum720 += (elecPenalty - elecRevenue);

            // Energía útil entregada al proceso
            const usefulSteamMWh = hrSteamDemand * steamEnergyMWhPerTon;
            usefulEnergyMWhSum720 += (usefulSteamMWh + hrElecDemand);
            totalSteamGenSum720 += genSteam;
            totalElecGenSum720 += genElec;
          }

          const opexTotal720 = fuelCostSum720 + senCostSum720 + steamDeficitCostSum720;
          const lcoe720 = usefulEnergyMWhSum720 > 0 ? opexTotal720 / usefulEnergyMWhSum720 : null;

          return {
            avgUsdTon,
            steamGenMon,
            steamExpense,
            ccElecOpex,
            elecDemMon,
            sold, soldUSD,
            bought, boughtUSD,
            totalOpex,
            ccElecCostPerMWh,
            ccVaporCostPerTon,
            f_elec,
            f_vapor,
            Ex_e,
            Ex_v,
            plantSteamDemand: demand,
            plantElecDemand: elecDemand,
            hoursOp: hours,
            ccOutOfService: !hasActiveCC,
            ciclosCombinados: st.ciclosCombinados || this.ciclosCombinados,
            lcoe,
            etaGlobal,
            steamMWheq,
            elecMWh,
            // Variables simulador EMS 720h
            opexTotal720,
            lcoe720,
            fuelCostSum720,
            senCostSum720,
            steamDeficitCostSum720,
            usefulEnergyMWhSum720,
            totalSteamGenSum720: totalSteamGenSum720 / 720,
            totalElecGenSum720: totalElecGenSum720 / 720
          };
        },

        // Add dynamic boiler
        addBoiler() {
          const count = this.boilers.length + 1;
          this.boilers.push({
            id: this.nextBoilerId++,
            name: `Nueva Caldera ${count}`,
            fuelType: "Gas Natural",
            pressure: 10,
            temp: 200,
            efficiency: 88,
            maxSteamGen: 35,
            steamGen: 15,
            isOutOfService: false,
            hasTurbine: false,
            turbineType: "Contrapresión",
            tgGen: 0,
            editCostManual: false,
            manualCostUSDton: 25.0,
            manualCostUSDMMBtu: 8.0
          });
        },

        // Dynamic Multiple Combined Cycles management methods
        addCC() {
          const count = this.ciclosCombinados.length + 1;
          this.ciclosCombinados.push({
            id: this.nextCCId++,
            name: `Ciclo Combinado TG ${count}`,
            gasCons: 150,
            gasCost: 7.0,
            gen: 15,
            steamRec: 35,
            opexFixed: 12000,
            capex: 12000000,
            isOutOfService: false,
            collapsed: false
          });
        },

        removeCC(id) {
          this.ciclosCombinados = this.ciclosCombinados.filter(cc => cc.id !== id);
        },

        toggleCCService(cc) {
          cc.isOutOfService = !cc.isOutOfService;
        },

        // Toggle F/S (Fuera de Servicio) — individual boiler
        toggleOutOfService(boiler) {
          boiler.isOutOfService = !boiler.isOutOfService;
        },

        // =====================================================
        // IMPORT COSTS FROM COMPARACIÓN BIOMASA GAS
        // =====================================================
        importFromBiomasaGas(boiler) {
          // Get proposals from cross-module bridge
          const rawProposals = (typeof window.getBiomasaGasProposals === 'function')
            ? window.getBiomasaGasProposals()
            : [];

          if (!rawProposals || rawProposals.length === 0) {
            boiler._importStatus = 'error';
            boiler._importMsg = 'Sin datos en Comparación Biomasa/Gas';
            setTimeout(() => { boiler._importStatus = ''; boiler._importMsg = ''; }, 3000);
            return;
          }

          // Map fuel type label
          const fuelMap = {
            'Gas Natural': 'Gas Natural',
            'GLP':         'GLP',
            'Biomasa':     'Biomasa'
          };
          const targetFuel = fuelMap[boiler.fuelType] || boiler.fuelType;

          // Normalización: minúsculas, sin acentos, sin signos
          const normalize = s => (s || '').toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9\s]/g, '').trim();

          const boilerNorm = normalize(boiler.name);

          // ── Puntuación: el NOMBRE es lo más importante.
          //    El tipo de combustible es solo desempate porque usamos
          //    la columna correcta (GN/GLP/Bio) de cualquier propuesta.
          let bestMatch = null;
          let bestScore = -1;

          rawProposals.forEach(p => {
            const supplierNorm = normalize(p.supplier || '');

            // Token overlap (palabras clave del nombre)
            const boilerTokens   = boilerNorm.split(/\s+/).filter(t => t.length > 1);
            const supplierTokens = supplierNorm.split(/\s+/).filter(t => t.length > 1);
            let nameScore = 0;
            boilerTokens.forEach(bt => {
              if (supplierTokens.some(st => st.includes(bt) || bt.includes(st))) nameScore += 2;
            });
            // Bonus si uno contiene al otro como substring
            if (supplierNorm.includes(boilerNorm) || boilerNorm.includes(supplierNorm)) nameScore += 5;
            // Desempate por combustible (pequeño peso)
            const fuelBonus = (p.type === targetFuel) ? 1 : 0;

            const totalScore = nameScore * 3 + fuelBonus;
            if (totalScore > bestScore) {
              bestScore = totalScore;
              bestMatch = p;
            }
          });

          // Si no hubo ninguna coincidencia de nombre, tomar la primera propuesta disponible
          if (!bestMatch) {
            bestMatch = rawProposals[0] || null;
          }

          if (!bestMatch) {
            boiler._importStatus = 'error';
            boiler._importMsg = 'No hay propuestas en Comparación Biomasa/Gas';
            setTimeout(() => { boiler._importStatus = ''; boiler._importMsg = ''; }, 3000);
            return;
          }

          // ─────────────────────────────────────────────────────────────────
          // SELECCIÓN DE COLUMNA DE COSTO SEGÚN COMBUSTIBLE DEL BOILER
          // Cada propuesta procesada trae los 3 costos calculados:
          //   totalOpexCostPerTon_GN / GLP / Bio  → OPEX sin depreciación
          // El lcos = OPEX + depreciation (campo p.depreciation)
          // Usamos la columna que corresponde al fuelType seleccionado en el boiler.
          // ─────────────────────────────────────────────────────────────────
          const dep = parseFloat(bestMatch.depreciation || 0);
          let lcos, lcos_mmbtu;

          if (targetFuel === 'Gas Natural') {
            const opex     = bestMatch.totalOpexCostPerTon_GN          !== undefined ? bestMatch.totalOpexCostPerTon_GN          : (bestMatch.lcos || 0);
            const opexMMBtu = bestMatch.totalOpexCostPerTon_USD_MMBtu_GN !== undefined ? bestMatch.totalOpexCostPerTon_USD_MMBtu_GN : (bestMatch.lcos_USD_MMBtu || 0);
            lcos      = opex + dep;
            lcos_mmbtu = opexMMBtu;

          } else if (targetFuel === 'GLP') {
            const opex      = bestMatch.totalOpexCostPerTon_GLP          !== undefined ? bestMatch.totalOpexCostPerTon_GLP          : (bestMatch.lcos || 0);
            const opexMMBtu = bestMatch.totalOpexCostPerTon_USD_MMBtu_GLP !== undefined ? bestMatch.totalOpexCostPerTon_USD_MMBtu_GLP : (bestMatch.lcos_USD_MMBtu || 0);
            lcos       = opex + dep;
            lcos_mmbtu = opexMMBtu;

          } else {
            // Biomasa
            const opex      = bestMatch.totalOpexCostPerTon_Bio          !== undefined ? bestMatch.totalOpexCostPerTon_Bio          : (bestMatch.lcos || 0);
            const opexMMBtu = bestMatch.totalOpexCostPerTon_USD_MMBtu_Bio !== undefined ? bestMatch.totalOpexCostPerTon_USD_MMBtu_Bio : (bestMatch.lcos_USD_MMBtu || 0);
            lcos       = opex + dep;
            lcos_mmbtu = opexMMBtu;
          }

          boiler.editCostManual     = true;
          boiler.manualCostUSDton   = parseFloat(lcos.toFixed(2));
          boiler.manualCostUSDMMBtu = parseFloat(lcos_mmbtu.toFixed(3));

          // Sincronizar eficiencia y parámetros termodinámicos de la propuesta origen
          if (bestMatch.efficiency)   boiler.efficiency = parseFloat(bestMatch.efficiency);
          if (bestMatch.pressure_bar) boiler.pressure   = parseFloat(bestMatch.pressure_bar);
          if (bestMatch.temp_C)       boiler.temp       = parseFloat(bestMatch.temp_C);

          boiler._importStatus = 'ok';
          boiler._importMsg    = `✔ ${bestMatch.supplier} → ${targetFuel}`;
          setTimeout(() => { boiler._importStatus = ''; boiler._importMsg = ''; }, 4000);
        },

        // Helper: color class for fuel type badge
        fuelColor(fuelType) {
          if (fuelType === 'Biomasa') return '#16a34a';
          if (fuelType === 'GLP') return '#d97706';
          if (fuelType === 'Gas Natural (TG)') return '#7c3aed';
          return '#2563eb';
        },

        // Helper: bar color per source type
        sourceBarColor(type, fuelType) {
          if (type === 'cc') return '#8b5cf6';
          if (fuelType === 'Biomasa') return '#22c55e';
          if (fuelType === 'GLP') return '#f59e0b';
          return '#3b82f6';
        },

        // Remove boiler
        removeBoiler(id) {
          this.boilers = this.boilers.filter(b => b.id !== id);
          // Auto adjustment if the reference boiler was removed
          if (this.refBoilerId === id && this.boilers.length > 0) {
            this.refBoilerId = this.boilers[0].id;
          }
        },

        // Helper to format currency in USD
        fmtUSD(val) {
          if (val === undefined || val === null || isNaN(val)) return "$0";
          return "$" + Math.round(val).toLocaleString("es-CL");
        },

        // Helper to format numbers with commas and decimals
        fmt(val, dec = 0) {
          if (val === undefined || val === null || isNaN(val)) return "0";
          return val.toLocaleString("es-CL", {
            minimumFractionDigits: dec,
            maximumFractionDigits: dec
          });
        },

        // =====================================================
        // SCENARIO MANAGER METHODS
        // =====================================================
        snapshotState() {
          // Capturamos variables de entrada del estado actual
          const state = {
            ciclosCombinados: JSON.parse(JSON.stringify(this.ciclosCombinados)),
            plantSteamDemand: this.plantSteamDemand,
            plantElecDemand: this.plantElecDemand,
            hoursOp: this.hoursOp,
            marketMonomico: this.marketMonomico,
            marketMarginal: this.marketMarginal,
            gasPrice: this.gasPrice,
            glpPrice: this.glpPrice,
            biomassPrice: this.biomassPrice,
            gasPriceTon: this.gasPriceTon,
            glpPriceTon: this.glpPriceTon,
            biomassPriceVal: this.biomassPriceVal,
            gasLhv: this.gasLhv,
            glpLhv: this.glpLhv,
            biomassLhv: this.biomassLhv,
            boilers: JSON.parse(JSON.stringify(this.boilers))
          };

          // Capturamos resultados consolidados mensualmente de forma explícita
          const results = {
            plantSteamDemand: this.plantSteamDemand,
            avgUsdTon: this.comparison.sim.avgUsdTon,
            ownElecGen: this.ciclosCombinados.filter(cc => !cc.isOutOfService).reduce((s, cc) => s + parseFloat(cc.gen || 0), 0),
            totalOpex: this.comparison.sim.totalOpex,
            netSavings: this.kpis.netSavings
          };

          return { state, results };
        },

        saveScenario() {
          const name = (this.scenarioNameInput || '').trim();
          if (!name) return;
          const id = Date.now();
          const snapshot = this.snapshotState();
          
          this.scenarios.push({
            id,
            name,
            timestamp: new Date().toLocaleString('es-CL'),
            state: snapshot.state,
            results: snapshot.results,
            is_shared: false // por defecto privado
          });
          // Auto-set first saved as base
          if (this.scenarios.length === 1) this.baseScenarioId = id;
          this.scenarioNameInput = '';
          this.saveToLocalStorage();
        },

        loadScenario(sc) {
          const st = sc.state;
          this.editingScenarioId = sc.id;
          this.scenarioNameInput = sc.name;
          this.ccOutOfService = st.ccOutOfService ?? false;
          this.ccSteamRec     = st.ccSteamRec;
          this.ccGen          = st.ccGen;
          this.ccGasCons      = st.ccGasCons;
          this.ccGasCost      = st.ccGasCost;
          this.ccOpexFixed    = st.ccOpexFixed;
          this.ccCapex        = st.ccCapex;
          this.plantSteamDemand = st.plantSteamDemand;
          this.plantElecDemand  = st.plantElecDemand;
          this.hoursOp          = st.hoursOp;
          this.marketMonomico   = st.marketMonomico;
          this.marketMarginal   = st.marketMarginal;
          this.gasPrice         = st.gasPrice;
          this.glpPrice         = st.glpPrice;
          this.biomassPrice     = st.biomassPrice;
          this.gasPriceTon      = st.gasPriceTon !== undefined ? st.gasPriceTon : 336.0;
          this.glpPriceTon      = st.glpPriceTon !== undefined ? st.glpPriceTon : 533.0;
          this.biomassPriceVal  = st.biomassPriceVal !== undefined ? st.biomassPriceVal : 20.0;
          this.gasLhv           = st.gasLhv !== undefined ? (st.gasLhv < 100 ? st.gasLhv * 229 : st.gasLhv) : 11000;
          this.glpLhv           = st.glpLhv !== undefined ? (st.glpLhv < 100 ? st.glpLhv * 243 : st.glpLhv) : 11200;
          this.biomassLhv       = st.biomassLhv !== undefined ? (st.biomassLhv < 100 ? st.biomassLhv * 252.2 : st.biomassLhv) : 3300;
          
          if (st.ciclosCombinados) {
            this.ciclosCombinados = JSON.parse(JSON.stringify(st.ciclosCombinados));
          } else if (st.ccSteamRec !== undefined) {
            // Backward compatibility for old saved scenarios that had single values
            this.ciclosCombinados = [{
              id: 1,
              name: "Ciclo Combinado TG 1",
              gasCons: st.ccGasCons || 150,
              gasCost: st.ccGasCost || 7.0,
              gen: st.ccGen || 15,
              steamRec: st.ccSteamRec || 35,
              opexFixed: st.ccOpexFixed || 12000,
              capex: st.ccCapex || 12000000,
              isOutOfService: st.ccOutOfService ?? false,
              collapsed: false
            }];
          } else {
            this.ciclosCombinados = [];
          }
          
          if (st.boilers) this.boilers = JSON.parse(JSON.stringify(st.boilers));
        },

        updateScenario() {
          if (!this.editingScenarioId) return;
          const idx = this.scenarios.findIndex(s => s.id === this.editingScenarioId);
          if (idx === -1) return;
          
          const name = (this.scenarioNameInput || '').trim() || this.scenarios[idx].name;
          const snapshot = this.snapshotState();
          
          this.scenarios[idx].name = name;
          this.scenarios[idx].state = snapshot.state;
          this.scenarios[idx].results = snapshot.results;
          this.scenarios[idx].timestamp = new Date().toLocaleString('es-CL') + ' (editado)';
          
          this.saveToLocalStorage();
          
          if (this.scenarios[idx].is_shared) {
            this.toggleShareScenario(this.scenarios[idx]);
          }
          
          this.editingScenarioId = null;
          this.scenarioNameInput = '';
        },

        cancelEdit() {
          this.editingScenarioId = null;
          this.scenarioNameInput = '';
        },

        deleteScenario(id) {
          this.scenarios = this.scenarios.filter(s => s.id !== id);
          if (this.baseScenarioId === id) {
            this.baseScenarioId = this.scenarios.length > 0 ? this.scenarios[0].id : null;
          }
          if (this.editingScenarioId === id) {
            this.editingScenarioId = null;
            this.scenarioNameInput = '';
          }
          this.saveToLocalStorage();
          console.log(`[Supabase] Eliminando escenario ID ${id} de tabla escenarios_simulacion`);
        },

        setBaseScenario(id) {
          this.baseScenarioId = id;
          this.saveToLocalStorage();
        },

        // Mock Supabase save and toggle share methods
        async toggleShareScenario(sc) {
          sc.is_shared = !sc.is_shared;
          this.saveToLocalStorage();

          // Simulación de persistencia en Supabase (escenarios_simulacion)
          console.log(`[Supabase] Actualizando escenario ID ${sc.id} en tabla escenarios_simulacion. consolidado_mensual = true. is_shared = ${sc.is_shared}`);
          try {
            // Estructura Supabase insert/update query consolidada mensualmente:
            const payload = {
              id: sc.id,
              user_id: this.userId,
              name: sc.name,
              is_shared: sc.is_shared,
              timestamp: new Date().toISOString(),
              // Payload de equipos (consolidado mensualmente, sin registros diarios)
              equipment_state: {
                boilers_gen_h: sc.state.boilers.map(b => ({ id: b.id, name: b.name, steamGen: b.steamGen, isOutOfService: b.isOutOfService })),
                ciclos_combinados: sc.state.ciclosCombinados.map(cc => ({ id: cc.id, name: cc.name, steamRec: cc.steamRec, gen: cc.gen, isOutOfService: cc.isOutOfService }))
              },
              // Resultados matemáticos consolidados a nivel mensual
              monthly_metrics: {
                plant_steam_demand_ton_h: sc.results.plantSteamDemand,
                avg_usd_ton: sc.results.avgUsdTon,
                own_elec_gen_mw: sc.results.ownElecGen,
                total_opex_usd_month: sc.results.totalOpex,
                net_savings_usd_month: sc.results.netSavings
              }
            };
            
            // Simular inserción/actualización HTTP o cliente Supabase:
            // const { data, error } = await supabase.from('escenarios_simulacion').upsert(payload);
            console.log("[Supabase] Upsert exitoso. Datos almacenados mensualmente:", JSON.stringify(payload));
          } catch (err) {
            console.error("[Supabase] Error en la conexión:", err);
          }
        },

        openFormulaModal(title, text) {
          this.formulaModalTitle = title;
          this.formulaModalText = text;
          this.showFormulaModal = true;
        },

        saveToLocalStorage() {
          try {
            const toSave = {
              plantElecDemand: this.plantElecDemand,
              plantSteamDemand: this.plantSteamDemand,
              hoursOp: this.hoursOp,
              marketMonomico: this.marketMonomico,
              marketMarginal: this.marketMarginal,
              gasPrice: this.gasPrice,
              glpPrice: this.glpPrice,
              biomassPrice: this.biomassPrice,
              gasPriceTon: this.gasPriceTon,
              glpPriceTon: this.glpPriceTon,
              biomassPriceVal: this.biomassPriceVal,
              gasLhv: this.gasLhv,
              glpLhv: this.glpLhv,
              biomassLhv: this.biomassLhv,
              ciclosCombinados: this.ciclosCombinados,
              nextCCId: this.nextCCId,
              refBoilerId: this.refBoilerId,
              boilers: this.boilers,
              nextBoilerId: this.nextBoilerId,
              scenarios: this.scenarios,
              baseScenarioId: this.baseScenarioId
            };
            localStorage.setItem('steamoptix_bg_balance_gen', JSON.stringify(toSave));
          } catch(e) { console.error('Error saving state:', e); }
        },

        // Copy JSON to clipboard
        copyJson() {
          const text = this.jsonOutput;
          navigator.clipboard.writeText(text).then(() => {
            this.copyStatus = "¡Copiado!";
            setTimeout(() => { this.copyStatus = "Copiar JSON"; }, 2000);
          }).catch(err => {
            console.error("Error al copiar al portapapeles:", err);
            this.copyStatus = "Error";
            setTimeout(() => { this.copyStatus = "Copiar JSON"; }, 2000);
          });
        },

        downloadPDF() {
          const element = document.getElementById('executive-report-pdf-content');
          if (!element) return;

          // Intentar con html2pdf primero — puede fallar en file:// por restricciones de canvas taint
          if (typeof html2pdf !== 'undefined') {
            const opt = {
              margin:       [0.1, 0.1, 0.1, 0.1],
              filename:     'Informe_Ejecutivo_Ciclo_Combinado.pdf',
              image:        { type: 'jpeg', quality: 0.95 },
              html2canvas:  {
                scale: 2,
                useCORS: true,
                allowTaint: true,
                foreignObjectRendering: false,
                logging: false,
                backgroundColor: '#ffffff'
              },
              jsPDF: { unit: 'in', format: 'letter', orientation: 'landscape' }
            };
            html2pdf().set(opt).from(element).save()
              .catch(err => {
                console.warn('[PDF] html2pdf falló, usando fallback window.print():', err);
                this._printFallback(element);
              });
          } else {
            this._printFallback(element);
          }
        },

        _printFallback(element) {
          // Fallback: abrir ventana de impresión con solo el contenido del informe
          const printWindow = window.open('', '_blank', 'width=1020,height=620');
          if (!printWindow) {
            alert('Por favor permita ventanas emergentes para descargar el informe.');
            return;
          }
          printWindow.document.write(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>Informe Ejecutivo — Ciclo Combinado</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;900&display=swap" rel="stylesheet">
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', sans-serif; background: white; }
    @page { size: letter landscape; margin: 0.35in; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  </style>
</head>
<body>
  <div style="padding: 10px; display: flex; justify-content: center; align-items: center; background: white;">
    ${element.outerHTML}
  </div>
  <script>
    window.onload = function() {
      setTimeout(function() { window.print(); window.close(); }, 600);
    };
  <\/script>
</body>
</html>`);
          printWindow.document.close();
        },

        downloadConfigurationsPDF() {
          const element = document.getElementById('config-report-pdf-content');
          if (!element) return;

          if (typeof html2pdf !== 'undefined') {
            const opt = {
              margin:       [0.5, 0.5, 0.5, 0.5],
              filename:     'Reporte_Evaluacion_Configuraciones.pdf',
              image:        { type: 'jpeg', quality: 0.98 },
              html2canvas:  {
                scale: 2,
                useCORS: true,
                allowTaint: true,
                foreignObjectRendering: false,
                logging: false,
                backgroundColor: '#ffffff'
              },
              jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
            };
            html2pdf().set(opt).from(element).save()
              .catch(err => {
                console.warn('[PDF] html2pdf falló, usando fallback window.print():', err);
                this._printConfigFallback(element);
              });
          } else {
            this._printConfigFallback(element);
          }
        },

        _printConfigFallback(element) {
          const printWindow = window.open('', '_blank', 'width=800,height=900');
          if (!printWindow) {
            alert('Por favor permita ventanas emergentes para descargar el reporte.');
            return;
          }
          printWindow.document.write(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>Reporte de Evaluación Económica y Eficiencia de Configuraciones</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;900&display=swap" rel="stylesheet">
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', sans-serif; background: white; padding: 15mm; }
    @page { size: A4 portrait; margin: 15mm; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  </style>
</head>
<body>
  <div>
    ${element.innerHTML}
  </div>
  <script>
    window.onload = function() {
      setTimeout(function() { window.print(); window.close(); }, 600);
    }
  </script>
</body>
</html>`);
          printWindow.document.close();
        }
      }
    });

    window.steamoptix_balance_gen_app = app.mount("#tab-content-balance-gen-wrapper");
  }

  window.mountBalanceGenApp = mountBalanceGenApp;
})();
