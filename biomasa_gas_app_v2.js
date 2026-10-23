// ======================================================================
// BIOMASS VS NATURAL GAS BOILER COMPARISON APP
// ======================================================================
(function() {
const { createApp, ref, computed, watch, onMounted } = Vue;

const biomasaGasApp = createApp({
  setup() {
    const editingId = ref(null);
    const showMMBtu = ref(true);

    // General parameters
    const general = ref({
      discount_rate: 10.0,
      gas_price_MMBtu: 14.0,
      gas_lhv_kcal: 10800,
      glp_price_MMBtu: 22.0,
      glp_lhv_kcal: 11900,
      diesel_price_liter: 1.10,
      diesel_lhv_kcal: 10200,
      biomass_price_m3st_clp: 15000,
      biomass_moisture: 45.0,
      biomass_density: 0.35,
      biomass_specific_consumption: 0.80,
      steam_generation_tonh: 10.0,
      biomass_consumption_monthly: 2016,
      exchange_rate: 900,
      electricity_price_MWh: 80.0,
      co2_tax_ton: 5.0,
      years_analysis: 15,
      hours_year: 8760
    });

    // (Biomass monthly consumption watcher moved to execute after state load)

    // Default proposals (all OPEX figures are in USD/ton of steam)
    const proposals = ref([
      {
        id: 1,
        supplier: 'Thermal 2 Calderas (18 ton/h cu)',
        type: 'Gas Natural',
        power_MW: 26.0,
        steam_tonh: 36.0,
        pressure_bar: 20.0,
        temp_C: 220.0,
        efficiency: 92.0,
        capex: 1100000,
        life_years: 20,
        spec_fuel: null,
        maintenance: 0.35,
        spare_parts: 0.15,
        labor: 0.42,
        waste: 0.0,
        chemicals: 0.10,
        depreciation: 0.31,
        electricity_cost: 0.36,
        diesel_loader: 0.0,
        other_opex: 0.21,
        hours_year: 8760,
        biomass_price_m3st_clp: null
      },
      {
        id: 2,
        supplier: 'Bosh 2 calderas (12 ton/h cu)',
        type: 'Gas Natural',
        power_MW: 17.5,
        steam_tonh: 24.0,
        pressure_bar: 20.0,
        temp_C: 220.0,
        efficiency: 90.0,
        capex: 1100000,
        life_years: 20,
        spec_fuel: null,
        maintenance: 0.35,
        spare_parts: 0.15,
        labor: 0.42,
        waste: 0.0,
        chemicals: 0.10,
        depreciation: 0.31,
        electricity_cost: 0.36,
        diesel_loader: 0.0,
        other_opex: 0.21,
        hours_year: 8500,
        biomass_price_m3st_clp: null
      },
      {
        id: 3,
        supplier: 'Martech 1 caldera',
        type: 'Gas Natural',
        power_MW: 26.0,
        steam_tonh: 36.0,
        pressure_bar: 20.0,
        temp_C: 220.0,
        efficiency: 90.0,
        capex: 520000,
        life_years: 20,
        spec_fuel: null,
        maintenance: 0.35,
        spare_parts: 0.15,
        labor: 0.42,
        waste: 0.0,
        chemicals: 0.10,
        depreciation: 0.31,
        electricity_cost: 0.36,
        diesel_loader: 0.0,
        other_opex: 0.21,
        hours_year: 8500,
        biomass_price_m3st_clp: null
      },
      {
        id: 4,
        supplier: 'Caldera 1 Existente',
        type: 'Gas Natural',
        power_MW: 14.5,
        steam_tonh: 20.0,
        pressure_bar: 20.0,
        temp_C: 220.0,
        efficiency: 88.0,
        capex: 500000,
        life_years: 20,
        spec_fuel: null,
        maintenance: 0.35,
        spare_parts: 0.15,
        labor: 0.42,
        waste: 0.0,
        chemicals: 0.10,
        depreciation: 0.31,
        electricity_cost: 0.36,
        diesel_loader: 0.0,
        other_opex: 0.21,
        hours_year: 8760,
        biomass_price_m3st_clp: null
      },
      {
        id: 5,
        supplier: 'Caldera Vyncke Existente',
        type: 'Biomasa',
        power_MW: 15.0,
        steam_tonh: 20.0,
        pressure_bar: 20.0,
        temp_C: 220.0,
        efficiency: 82.0,
        capex: 600000,
        life_years: 20,
        spec_fuel: null,
        maintenance: 0.85,
        spare_parts: 0.40,
        labor: 0.60,
        waste: 0.15,
        chemicals: 0.15,
        depreciation: 0.38,
        electricity_cost: 0.45,
        diesel_loader: 0.30,
        other_opex: 0.25,
        hours_year: 8760,
        biomass_price_m3st_clp: null
      }
    ]);

    // Form data for adding a proposal (all OPEX figures are in USD/ton of steam)
    const form = ref({
      supplier: '',
      type: 'Gas Natural',
      power_MW: 7.5,
      steam_tonh: 10.0,
      pressure_bar: 20.0,
      temp_C: 220.0,
      efficiency: 90.0,
      capex: 500000,
      life_years: 20,
      spec_fuel: '',
      maintenance: 0.50,
      spare_parts: 0.20,
      labor: 0.40,
      waste: 0.0,
      chemicals: 0.10,
      depreciation: 0.35,
      electricity_cost: 0.40,
      diesel_loader: 0.20,
      other_opex: 0.20,
      hours_year: 7200,
      biomass_price_m3st_clp: ''
    });

    const activeChartTab = ref('tco'); // 'tco' or 'sensitivity'
    const sensitivityType = ref('gas'); // 'gas', 'glp' or 'biomass'

    // Load state from localStorage on init
    const loadState = () => {
      try {
        const savedProposals = localStorage.getItem('steamoptix_bg_proposals');
        const savedGeneral = localStorage.getItem('steamoptix_bg_general');
        
        if (savedGeneral) {
          const parsedGen = JSON.parse(savedGeneral);
          if (parsedGen && typeof parsedGen === 'object') {
            general.value.discount_rate = (typeof parsedGen.discount_rate === 'number' && !isNaN(parsedGen.discount_rate)) ? Math.max(0, parsedGen.discount_rate) : 10.0;
            general.value.gas_price_MMBtu = (typeof parsedGen.gas_price_MMBtu === 'number' && !isNaN(parsedGen.gas_price_MMBtu)) ? Math.max(0.1, parsedGen.gas_price_MMBtu) : 14.0;
            general.value.gas_lhv_kcal = (typeof parsedGen.gas_lhv_kcal === 'number' && !isNaN(parsedGen.gas_lhv_kcal)) ? Math.max(1000, parsedGen.gas_lhv_kcal) : 10800;
            general.value.glp_price_MMBtu = (typeof parsedGen.glp_price_MMBtu === 'number' && !isNaN(parsedGen.glp_price_MMBtu)) ? Math.max(0.1, parsedGen.glp_price_MMBtu) : 22.0;
            general.value.glp_lhv_kcal = (typeof parsedGen.glp_lhv_kcal === 'number' && !isNaN(parsedGen.glp_lhv_kcal)) ? Math.max(1000, parsedGen.glp_lhv_kcal) : 11900;
            general.value.diesel_price_liter = (typeof parsedGen.diesel_price_liter === 'number' && !isNaN(parsedGen.diesel_price_liter)) ? Math.max(0.01, parsedGen.diesel_price_liter) : 1.10;
            general.value.diesel_lhv_kcal = (typeof parsedGen.diesel_lhv_kcal === 'number' && !isNaN(parsedGen.diesel_lhv_kcal)) ? Math.max(1000, parsedGen.diesel_lhv_kcal) : 10200;
            general.value.biomass_price_m3st_clp = (typeof parsedGen.biomass_price_m3st_clp === 'number' && !isNaN(parsedGen.biomass_price_m3st_clp)) ? Math.max(1, parsedGen.biomass_price_m3st_clp) : 15000;
            general.value.biomass_moisture = (typeof parsedGen.biomass_moisture === 'number' && !isNaN(parsedGen.biomass_moisture)) ? Math.max(0, Math.min(100, parsedGen.biomass_moisture)) : 45.0;
            general.value.biomass_density = (typeof parsedGen.biomass_density === 'number' && !isNaN(parsedGen.biomass_density)) ? Math.max(0.01, parsedGen.biomass_density) : 0.35;
            general.value.biomass_specific_consumption = (typeof parsedGen.biomass_specific_consumption === 'number' && !isNaN(parsedGen.biomass_specific_consumption)) ? Math.max(0.01, parsedGen.biomass_specific_consumption) : 0.80;
            general.value.steam_generation_tonh = (typeof parsedGen.steam_generation_tonh === 'number' && !isNaN(parsedGen.steam_generation_tonh)) ? Math.max(0.1, parsedGen.steam_generation_tonh) : 10.0;
            general.value.exchange_rate = (typeof parsedGen.exchange_rate === 'number' && !isNaN(parsedGen.exchange_rate)) ? Math.max(1, parsedGen.exchange_rate) : 900;
            general.value.electricity_price_MWh = (typeof parsedGen.electricity_price_MWh === 'number' && !isNaN(parsedGen.electricity_price_MWh)) ? Math.max(0, parsedGen.electricity_price_MWh) : 80.0;
            general.value.co2_tax_ton = (typeof parsedGen.co2_tax_ton === 'number' && !isNaN(parsedGen.co2_tax_ton)) ? Math.max(0, parsedGen.co2_tax_ton) : 5.0;
            general.value.years_analysis = (typeof parsedGen.years_analysis === 'number' && !isNaN(parsedGen.years_analysis)) ? Math.max(1, parsedGen.years_analysis) : 15;
            general.value.hours_year = (typeof parsedGen.hours_year === 'number' && !isNaN(parsedGen.hours_year)) ? Math.max(1, Math.min(8760, parsedGen.hours_year)) : 8760;
          }
        }

        if (savedProposals) {
          const parsedProps = JSON.parse(savedProposals);
          if (Array.isArray(parsedProps)) {
            if (parsedProps.some(p => p.supplier && p.supplier.indexOf('Proveedor A') !== -1)) {
              throw new Error('Outdated default proposals detected, resetting to new default calderas.');
            }
            const cleanProps = parsedProps.map(p => {
              const steam_tonh = (typeof p.steam_tonh === 'number' && !isNaN(p.steam_tonh) && p.steam_tonh > 0) ? p.steam_tonh : 10.0;
              const hours_year = (typeof p.hours_year === 'number' && !isNaN(p.hours_year) && p.hours_year > 0 && p.hours_year <= 8760) ? p.hours_year : 7200;
              const annualSteam = steam_tonh * hours_year;

              // Auto-migrate old USD/year values to USD/ton steam
              const migrateToTon = (val, fallback) => {
                if (typeof val !== 'number' || isNaN(val) || val < 0) return fallback;
                if (val > 100) return val / annualSteam; // Old annual cost, scale it to ton steam
                return val;
              };

              const legacyElectricityCost = typeof p.electricity_cost === 'number' ? p.electricity_cost : 
                (typeof p.electricity_kW === 'number' ? (p.electricity_kW * 0.08) / steam_tonh : 0.40);

              return {
                id: typeof p.id === 'number' ? p.id : Date.now() + Math.random(),
                supplier: typeof p.supplier === 'string' ? p.supplier : 'Proveedor Desconocido',
                type: (p.type === 'Gas Natural' || p.type === 'Biomasa' || p.type === 'GLP') ? p.type : 'Gas Natural',
                power_MW: (typeof p.power_MW === 'number' && !isNaN(p.power_MW) && p.power_MW > 0) ? p.power_MW : 7.5,
                steam_tonh: steam_tonh,
                pressure_bar: (typeof p.pressure_bar === 'number' && !isNaN(p.pressure_bar) && p.pressure_bar > 0) ? p.pressure_bar : 20.0,
                temp_C: (typeof p.temp_C === 'number' && !isNaN(p.temp_C) && p.temp_C > 0) ? p.temp_C : 220.0,
                efficiency: (typeof p.efficiency === 'number' && !isNaN(p.efficiency) && p.efficiency > 0 && p.efficiency <= 100) ? p.efficiency : 90.0,
                capex: (typeof p.capex === 'number' && !isNaN(p.capex) && p.capex >= 0) ? p.capex : 500000,
                life_years: (typeof p.life_years === 'number' && !isNaN(p.life_years) && p.life_years > 0) ? p.life_years : 20,
                spec_fuel: typeof p.spec_fuel === 'number' || p.spec_fuel === null ? p.spec_fuel : null,
                maintenance: migrateToTon(p.maintenance, 0.35),
                spare_parts: migrateToTon(p.spare_parts, 0.15),
                labor: migrateToTon(p.labor, 0.42),
                waste: migrateToTon(p.waste, 0.0),
                chemicals: migrateToTon(p.chemicals, 0.10),
                depreciation: migrateToTon(p.depreciation, p.capex / (p.life_years * annualSteam) || 0.31),
                electricity_cost: migrateToTon(legacyElectricityCost, 0.40),
                diesel_loader: migrateToTon(p.diesel_loader, p.type === 'Biomasa' ? 0.20 : 0.0),
                other_opex: migrateToTon(p.other_opex, 0.21),
                hours_year: hours_year,
                biomass_price_m3st_clp: (typeof p.biomass_price_m3st_clp === 'number' && !isNaN(p.biomass_price_m3st_clp)) ? p.biomass_price_m3st_clp : null
              };
            });
            proposals.value = cleanProps;
          }
        }
      } catch (e) {
        console.error('Error loading biomass-gas state, resetting local storage:', e);
        try {
          localStorage.removeItem('steamoptix_bg_proposals');
          localStorage.removeItem('steamoptix_bg_general');
        } catch (ex) {}
      }
    };

    // Load initial state synchronously before watchers are set up
    loadState();

    // Watch to calculate biomass monthly consumption dynamically
    watch([
      () => general.value.biomass_specific_consumption,
      () => general.value.steam_generation_tonh,
      () => general.value.biomass_density
    ], () => {
      general.value.biomass_consumption_monthly = Number((
        (general.value.biomass_specific_consumption || 0) *
        (general.value.steam_generation_tonh || 0) *
        720 *
        (general.value.biomass_density || 0)
      ).toFixed(2));
    }, { immediate: true });

    // Save state to localStorage
    const saveState = () => {
      localStorage.setItem('steamoptix_bg_proposals', JSON.stringify(proposals.value));
      localStorage.setItem('steamoptix_bg_general', JSON.stringify(general.value));
    };

    // Watch for deep updates to save state
    watch([proposals, general], saveState, { deep: true });

    // Computed biomass price values
    const biomassPriceUSDton = computed(() => {
      if (!general.value.biomass_density || !general.value.exchange_rate) return 0;
      const price_clp_ton = general.value.biomass_price_m3st_clp / general.value.biomass_density;
      return price_clp_ton / general.value.exchange_rate;
    });

    const biomassPriceUSDMMBtu = computed(() => {
      const lhvWet_kcal = 4500 * (1 - general.value.biomass_moisture / 100) - 583 * (general.value.biomass_moisture / 100);
      const lhvWet_kJ = lhvWet_kcal * 4.184;
      if (!lhvWet_kJ) return 0;
      const biomassPrice_kJ = biomassPriceUSDton.value / (1000 * lhvWet_kJ);
      return biomassPrice_kJ * 1055060;
    });

    const biomassMonthlyEnergy = computed(() => {
      const lhvWet_kcal = 4500 * (1 - general.value.biomass_moisture / 100) - 583 * (general.value.biomass_moisture / 100);
      const lhvWet_kJ = lhvWet_kcal * 4.184;
      return (general.value.biomass_consumption_monthly * 1000 * lhvWet_kJ) / 1055060;
    });

    const monthlySteamGenerated = computed(() => {
      return (general.value.steam_generation_tonh || 0) * 720;
    });

    const gasSteamCostUSDton = computed(() => {
      const p = processedProposals.value.find(x => x.type === 'Gas Natural');
      return p ? p.totalOpexCostPerTon : null;
    });

    const gasSteamCostUSDMMBtu = computed(() => {
      const p = processedProposals.value.find(x => x.type === 'Gas Natural');
      return p ? p.totalOpexCostPerTon_USD_MMBtu : null;
    });

    const glpSteamCostUSDton = computed(() => {
      const p = processedProposals.value.find(x => x.type === 'GLP');
      if (p) return p.totalOpexCostPerTon;
      const base = baselineProposal.value;
      return base ? base.totalOpexCostPerTon_GLP : null;
    });

    const glpSteamCostUSDMMBtu = computed(() => {
      const p = processedProposals.value.find(x => x.type === 'GLP');
      if (p) return p.totalOpexCostPerTon_USD_MMBtu;
      const base = baselineProposal.value;
      return base ? base.totalOpexCostPerTon_USD_MMBtu_GLP : null;
    });

    const biomassSteamCostUSDton = computed(() => {
      const p = processedProposals.value.find(x => x.type === 'Biomasa');
      return p ? p.totalOpexCostPerTon : null;
    });

    const biomassSteamCostUSDMMBtu = computed(() => {
      const p = processedProposals.value.find(x => x.type === 'Biomasa');
      return p ? p.totalOpexCostPerTon_USD_MMBtu : null;
    });

    const biomassMonthlyCostUSD = computed(() => {
      const costPerTon = biomassSteamCostUSDton.value;
      if (costPerTon !== null) {
        return monthlySteamGenerated.value * costPerTon;
      }
      return general.value.biomass_consumption_monthly * biomassPriceUSDton.value;
    });

    const gasEquivalentMonthlyCostUSD = computed(() => {
      const costPerTon = gasSteamCostUSDton.value;
      if (costPerTon !== null) {
        return monthlySteamGenerated.value * costPerTon;
      }
      return biomassMonthlyEnergy.value * general.value.gas_price_MMBtu;
    });

    const glpEquivalentMonthlyCostUSD = computed(() => {
      const costPerTon = glpSteamCostUSDton.value;
      if (costPerTon !== null) {
        return monthlySteamGenerated.value * costPerTon;
      }
      return biomassMonthlyEnergy.value * general.value.glp_price_MMBtu;
    });

    const monthlySavingsUSD = computed(() => {
      return gasEquivalentMonthlyCostUSD.value - biomassMonthlyCostUSD.value;
    });

    const monthlySavingsVsGlpUSD = computed(() => {
      return glpEquivalentMonthlyCostUSD.value - biomassMonthlyCostUSD.value;
    });

    const dieselPriceUSDMMBtu = computed(() => {
      const diesel_density = 0.85; // kg/liter
      const diesel_lhv_kJ = (general.value.diesel_lhv_kcal || 10200) * 4.184;
      const diesel_lhv_liter_kJ = diesel_lhv_kJ * diesel_density;
      const diesel_lhv_liter_MMBtu = diesel_lhv_liter_kJ / 1055060;
      return diesel_lhv_liter_MMBtu > 0 ? (general.value.diesel_price_liter / diesel_lhv_liter_MMBtu) : 0;
    });

    const dieselSteamCostUSDton = computed(() => {
      const p = processedProposals.value.find(x => x.type === 'Diésel');
      if (p) return p.totalOpexCostPerTon;
      
      const h_steam = getSteamEnthalpy(10.0, 200.0);
      const h_feedwater = 440.0;
      const steam_energy_kJ = 1000 * (h_steam - h_feedwater);
      const fuel_energy_needed = steam_energy_kJ / 0.90; // 90% efficiency
      
      const diesel_lhv_kJ = (general.value.diesel_lhv_kcal || 10200) * 4.184;
      const diesel_lhv_liter_kJ = diesel_lhv_kJ * 0.85;
      const fuelCostPerTon_Diesel = fuel_energy_needed * (general.value.diesel_price_liter / diesel_lhv_liter_kJ);
      const co2CostPerTon_Diesel = fuel_energy_needed * (0.074 / 1055060) * general.value.co2_tax_ton;
      
      const elecCostPerTon = 1.05; 
      const omCostPerTon = 2.0; 
      
      return fuelCostPerTon_Diesel + co2CostPerTon_Diesel + elecCostPerTon + omCostPerTon;
    });

    const dieselSteamCostUSDMMBtu = computed(() => {
      const p = processedProposals.value.find(x => x.type === 'Diésel');
      if (p) return p.totalOpexCostPerTon_USD_MMBtu;
      const h_steam = getSteamEnthalpy(10.0, 200.0);
      const steam_energy_MMBtu = 1000 * (h_steam - 440.0) / 1055060;
      return steam_energy_MMBtu > 0 ? (dieselSteamCostUSDton.value / steam_energy_MMBtu) : 0;
    });

    const dieselEquivalentMonthlyCostUSD = computed(() => {
      const costPerTon = dieselSteamCostUSDton.value;
      if (costPerTon !== null) {
        return monthlySteamGenerated.value * costPerTon;
      }
      return 0;
    });

    const monthlyDieselConsumptionLiters = computed(() => {
      const diesel_lhv_kJ = (general.value.diesel_lhv_kcal || 10200) * 4.184;
      const diesel_lhv_liter_kJ = diesel_lhv_kJ * 0.85;
      const diesel_lhv_liter_MMBtu = diesel_lhv_liter_kJ / 1055060;
      return diesel_lhv_liter_MMBtu > 0 ? (biomassMonthlyEnergy.value / diesel_lhv_liter_MMBtu) : 0;
    });

    // (State loading and watchers moved above to run synchronously before reactivity initial loops)

    // Numerical IRR solver
    const solveIR = (capexDiff, annualSavings, years = 15) => {
      if (capexDiff <= 0 && annualSavings >= 0) return 999;
      if (annualSavings <= 0) return -1;
      
      let low = -0.99;
      let high = 10.0;
      let mid = 0.0;
      
      for (let i = 0; i < 100; i++) {
        mid = (low + high) / 2;
        let npv = -capexDiff;
        for (let t = 1; t <= years; t++) {
          npv += annualSavings / Math.pow(1 + mid, t);
        }
        if (Math.abs(npv) < 1e-4) {
          return mid * 100;
        }
        if (npv > 0) {
          low = mid;
        } else {
          high = mid;
        }
      }
      return mid * 100;
    };

    // Helper for formatting
    const fmt = (n, d = 0) => {
      if (isNaN(n) || n === null || n === undefined) return '—';
      return Number(n).toLocaleString('de-DE', { minimumFractionDigits: d, maximumFractionDigits: d });
    };

    const fmtUSD = (n) => {
      if (n === null || n === undefined || isNaN(n)) return '—';
      if (Math.abs(n) >= 1e6) {
        return (n / 1e6).toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + 'M USD';
      }
      if (Math.abs(n) >= 1e3) {
        return (n / 1e3).toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + 'K USD';
      }
      return n.toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' USD';
    };

    // Get steam properties from parent context if available
    const getSteamEnthalpy = (p, t) => {
      if (window.getEnthalpy) {
        try {
          return window.getEnthalpy(p, t);
        } catch (e) {
          console.error('getEnthalpy failed, using fallback:', e);
        }
      }
      const tSat = 100 * Math.pow(p, 0.25);
      return 2778 + 2.05 * (t - tSat);
    };

    // Process all proposals with economic calculations
    const processedProposals = computed(() => {
      const r = Math.max(0, general.value.discount_rate) / 100;
      
      const lhvWet_kcal = 4500 * (1 - general.value.biomass_moisture / 100) - 583 * (general.value.biomass_moisture / 100);
      const lhvWet_kJ = lhvWet_kcal * 4.184;
      const price_usd_ton = biomassPriceUSDton.value;

      const gasPrice_kJ = (general.value.gas_price_MMBtu / 1055060);

      return proposals.value.map(p => {
        // Boiler-specific biomass price
        const boiler_biomass_price = (p.biomass_price_m3st_clp !== undefined && p.biomass_price_m3st_clp !== null) 
          ? p.biomass_price_m3st_clp 
          : general.value.biomass_price_m3st_clp;

        let boiler_price_usd_ton = 0;
        if (general.value.biomass_density && general.value.exchange_rate) {
          const price_clp_ton = boiler_biomass_price / general.value.biomass_density;
          boiler_price_usd_ton = price_clp_ton / general.value.exchange_rate;
        }

        const boiler_biomassPrice_kJ = lhvWet_kJ > 0 ? (boiler_price_usd_ton / (1000 * lhvWet_kJ)) : 0;

        const h_steam = getSteamEnthalpy(p.pressure_bar, p.temp_C);
        const h_feedwater = 440.0;
        const steam_energy_kJ = 1000 * (h_steam - h_feedwater);
        const fuel_energy_needed = steam_energy_kJ / (p.efficiency / 100);
        const steam_energy_MMBtu = steam_energy_kJ / 1055060;

        const elecCostPerTon = p.electricity_cost || 0;
        const omCostPerTon = (p.maintenance || 0) + (p.spare_parts || 0) + (p.labor || 0) + (p.waste || 0) + (p.chemicals || 0) + (p.diesel_loader || 0) + (p.other_opex || 0);

        // GN calculations:
        const fuelCostPerTon_GN = fuel_energy_needed * gasPrice_kJ * (10800 / (general.value.gas_lhv_kcal || 10800));
        const co2PerTon_GN = fuel_energy_needed * (0.056 / 1055060);
        const co2CostPerTon_GN = co2PerTon_GN * general.value.co2_tax_ton;
        const totalOpexCostPerTon_GN = fuelCostPerTon_GN + co2CostPerTon_GN + elecCostPerTon + omCostPerTon;
        const totalOpexCostPerTon_USD_MMBtu_GN = steam_energy_MMBtu > 0 ? (totalOpexCostPerTon_GN / steam_energy_MMBtu) : 0;

        // GLP calculations:
        const glpPrice_kJ = (general.value.glp_price_MMBtu / 1055060);
        const fuelCostPerTon_GLP = fuel_energy_needed * glpPrice_kJ * (11900 / (general.value.glp_lhv_kcal || 11900));
        const co2PerTon_GLP = fuel_energy_needed * (0.063 / 1055060);
        const co2CostPerTon_GLP = co2PerTon_GLP * general.value.co2_tax_ton;
        const totalOpexCostPerTon_GLP = fuelCostPerTon_GLP + co2CostPerTon_GLP + elecCostPerTon + omCostPerTon;
        const totalOpexCostPerTon_USD_MMBtu_GLP = steam_energy_MMBtu > 0 ? (totalOpexCostPerTon_GLP / steam_energy_MMBtu) : 0;

        // Biomasa calculations:
        const fuelCostPerTon_Bio = fuel_energy_needed * boiler_biomassPrice_kJ;
        const totalOpexCostPerTon_Bio = fuelCostPerTon_Bio + elecCostPerTon + omCostPerTon;
        const totalOpexCostPerTon_USD_MMBtu_Bio = steam_energy_MMBtu > 0 ? (totalOpexCostPerTon_Bio / steam_energy_MMBtu) : 0;

        // Diésel calculations:
        const diesel_lhv_kJ = (general.value.diesel_lhv_kcal || 10200) * 4.184;
        const diesel_lhv_liter_kJ = diesel_lhv_kJ * 0.85; // density 0.85 kg/liter
        const fuelCostPerTon_Diesel = fuel_energy_needed * (general.value.diesel_price_liter / diesel_lhv_liter_kJ);
        const co2PerTon_Diesel = fuel_energy_needed * (0.074 / 1055060);
        const co2CostPerTon_Diesel = co2PerTon_Diesel * general.value.co2_tax_ton;
        const totalOpexCostPerTon_Diesel = fuelCostPerTon_Diesel + co2CostPerTon_Diesel + elecCostPerTon + omCostPerTon;
        const totalOpexCostPerTon_USD_MMBtu_Diesel = steam_energy_MMBtu > 0 ? (totalOpexCostPerTon_Diesel / steam_energy_MMBtu) : 0;

        // Fuel details based on type (active parameters)
        let fuelCostPerTon = 0;
        let co2PerTon = 0;
        let calculated_spec_fuel = 0;

        if (p.type === 'Gas Natural') {
          fuelCostPerTon = fuelCostPerTon_GN;
          co2PerTon = co2PerTon_GN;
          const gas_lhv_kJ = (general.value.gas_lhv_kcal || 10800) * 4.184;
          calculated_spec_fuel = fuel_energy_needed / gas_lhv_kJ;
        } else if (p.type === 'GLP') {
          fuelCostPerTon = fuelCostPerTon_GLP;
          co2PerTon = co2PerTon_GLP;
          const glp_lhv_kJ = (general.value.glp_lhv_kcal || 11900) * 4.184;
          calculated_spec_fuel = fuel_energy_needed / glp_lhv_kJ;
        } else if (p.type === 'Diésel') {
          fuelCostPerTon = fuelCostPerTon_Diesel;
          co2PerTon = co2PerTon_Diesel;
          calculated_spec_fuel = fuel_energy_needed / diesel_lhv_liter_kJ; // liters/ton of steam
        } else {
          fuelCostPerTon = fuelCostPerTon_Bio;
          co2PerTon = 0;
          calculated_spec_fuel = lhvWet_kJ > 0 ? (fuel_energy_needed / lhvWet_kJ) : 0;
        }

        const co2CostPerTon = co2PerTon * general.value.co2_tax_ton;
        const annualSteam = p.steam_tonh * (general.value.hours_year || 8760);
        const totalOpexCostPerTon = fuelCostPerTon + co2CostPerTon + elecCostPerTon + omCostPerTon;
        const annualOPEX = totalOpexCostPerTon * annualSteam;

        const N = p.life_years;
        const capFactor = r > 0 ? (r * Math.pow(1 + r, N)) / (Math.pow(1 + r, N) - 1) : (1 / N);
        const annualizedCAPEX = p.capex * capFactor;
        const capexCostPerTon = annualizedCAPEX / annualSteam;

        const lcos = totalOpexCostPerTon + (p.depreciation || 0);
        const lcos_USD_MMBtu = steam_energy_MMBtu > 0 ? (lcos / steam_energy_MMBtu) : 0;
        const totalOpexCostPerTon_USD_MMBtu = steam_energy_MMBtu > 0 ? (totalOpexCostPerTon / steam_energy_MMBtu) : 0;

        return {
          ...p,
          biomass_price_m3st_clp: p.type === 'Biomasa' ? boiler_biomass_price : null,
          biomassPriceUSDton: p.type === 'Biomasa' ? boiler_price_usd_ton : 0,
          spec_fuel_val: p.spec_fuel !== null && p.spec_fuel !== '' ? parseFloat(p.spec_fuel) : calculated_spec_fuel,
          fuelCostPerTon,
          co2CostPerTon,
          co2PerTon,
          elecCostPerTon,
          omCostPerTon,
          totalOpexCostPerTon,
          annualOPEX,
          annualSteam,
          annualizedCAPEX,
          capexCostPerTon,
          lcos,
          lcos_USD_MMBtu,
          totalOpexCostPerTon_USD_MMBtu,
          h_steam,
          // Expose GN, GLP, and Biomasa total OPEX per ton specifically for the table:
          totalOpexCostPerTon_GN,
          totalOpexCostPerTon_USD_MMBtu_GN,
          totalOpexCostPerTon_GLP,
          totalOpexCostPerTon_USD_MMBtu_GLP,
          totalOpexCostPerTon_Bio,
          totalOpexCostPerTon_USD_MMBtu_Bio
        };
      });
    });

    const baselineProposal = computed(() => {
      const gasBoilers = processedProposals.value.filter(p => p.type === 'Gas Natural');
      if (gasBoilers.length > 0) {
        return gasBoilers.reduce((prev, curr) => (prev.capex < curr.capex) ? prev : curr);
      }
      if (processedProposals.value.length > 0) {
        return processedProposals.value.reduce((prev, curr) => (prev.capex < curr.capex) ? prev : curr);
      }
      return null;
    });

    const glpBaselineProposal = computed(() => {
      const glpBoilers = processedProposals.value.filter(p => p.type === 'GLP');
      if (glpBoilers.length > 0) {
        return glpBoilers.reduce((prev, curr) => (prev.capex < curr.capex) ? prev : curr);
      }
      return baselineProposal.value;
    });

    const biomassBaselineProposal = computed(() => {
      const bioBoilers = processedProposals.value.filter(p => p.type === 'Biomasa');
      if (bioBoilers.length > 0) {
        return bioBoilers.reduce((prev, curr) => (prev.capex < curr.capex) ? prev : curr);
      }
      return baselineProposal.value;
    });

    const comparisons = computed(() => {
      const base = baselineProposal.value;
      const glpBase = glpBaselineProposal.value;
      const bioBase = biomassBaselineProposal.value;
      if (!base) return {};

      const r = Math.max(0, general.value.discount_rate) / 100;
      const years = general.value.years_analysis;

      const result = {};
      processedProposals.value.forEach(p => {
        // vs GN (base)
        const diffCAPEX = p.capex - base.capex;
        const annualSavings = base.annualOPEX - p.annualOPEX;

        let cumDiscountedSavings = 0;
        let discPayback = null;

        for (let t = 1; t <= years; t++) {
          const discSavings = annualSavings / Math.pow(1 + r, t);
          cumDiscountedSavings += discSavings;
          if (cumDiscountedSavings >= diffCAPEX && discPayback === null) {
            discPayback = t;
          }
        }

        let npv = -diffCAPEX;
        for (let t = 1; t <= years; t++) {
          npv += annualSavings / Math.pow(1 + r, t);
        }

        const irr = solveIR(diffCAPEX, annualSavings, years);
        const payback = annualSavings > 0 ? (diffCAPEX / annualSavings) : null;

        // vs GLP (glpBase)
        let diffCAPEX_glp = 0;
        let annualSavings_glp = 0;
        let npv_glp = 0;
        let irr_glp = -1;
        let payback_glp = null;
        let discPayback_glp = null;

        if (glpBase) {
          const p_annualOPEX_GLP = p.totalOpexCostPerTon_GLP * p.annualSteam;
          const glpBase_annualOPEX_GLP = glpBase.totalOpexCostPerTon_GLP * glpBase.annualSteam;

          diffCAPEX_glp = p.capex - glpBase.capex;
          annualSavings_glp = glpBase_annualOPEX_GLP - p_annualOPEX_GLP;

          let cumDiscountedSavings_glp = 0;
          for (let t = 1; t <= years; t++) {
            const discSavings = annualSavings_glp / Math.pow(1 + r, t);
            cumDiscountedSavings_glp += discSavings;
            if (cumDiscountedSavings_glp >= diffCAPEX_glp && discPayback_glp === null) {
              discPayback_glp = t;
            }
          }

          npv_glp = -diffCAPEX_glp;
          for (let t = 1; t <= years; t++) {
            npv_glp += annualSavings_glp / Math.pow(1 + r, t);
          }

          irr_glp = solveIR(diffCAPEX_glp, annualSavings_glp, years);
          payback_glp = annualSavings_glp > 0 ? (diffCAPEX_glp / annualSavings_glp) : null;
        }

        // vs Biomasa (bioBase)
        let diffCAPEX_bio = 0;
        let annualSavings_bio = 0;
        let npv_bio = 0;
        let irr_bio = -1;
        let payback_bio = null;
        let discPayback_bio = null;

        if (bioBase) {
          const p_annualOPEX_Bio = p.totalOpexCostPerTon_Bio * p.annualSteam;
          const bioBase_annualOPEX_Bio = bioBase.totalOpexCostPerTon_Bio * bioBase.annualSteam;

          diffCAPEX_bio = p.capex - bioBase.capex;
          annualSavings_bio = bioBase_annualOPEX_Bio - p_annualOPEX_Bio;

          let cumDiscountedSavings_bio = 0;
          for (let t = 1; t <= years; t++) {
            const discSavings = annualSavings_bio / Math.pow(1 + r, t);
            cumDiscountedSavings_bio += discSavings;
            if (cumDiscountedSavings_bio >= diffCAPEX_bio && discPayback_bio === null) {
              discPayback_bio = t;
            }
          }

          npv_bio = -diffCAPEX_bio;
          for (let t = 1; t <= years; t++) {
            npv_bio += annualSavings_bio / Math.pow(1 + r, t);
          }

          irr_bio = solveIR(diffCAPEX_bio, annualSavings_bio, years);
          payback_bio = annualSavings_bio > 0 ? (diffCAPEX_bio / annualSavings_bio) : null;
        }

        const tcoValues = [];
        for (let t = 0; t <= years; t++) {
          tcoValues.push(p.capex + t * p.annualOPEX);
        }

        result[p.id] = {
          // Flat root properties for main page backward compatibility:
          diffCAPEX,
          annualSavings,
          npv,
          irr,
          payback,
          discPayback,
          tcoValues,
          // Nested properties for modal:
          gas: {
            isBase: p.id === base.id,
            diffCAPEX,
            annualSavings,
            npv,
            irr,
            payback,
            discPayback
          },
          glp: {
            isBase: glpBase ? p.id === glpBase.id : false,
            diffCAPEX: diffCAPEX_glp,
            annualSavings: annualSavings_glp,
            npv: npv_glp,
            irr: irr_glp,
            payback: payback_glp,
            discPayback: discPayback_glp
          },
          biomass: {
            isBase: bioBase ? p.id === bioBase.id : false,
            diffCAPEX: diffCAPEX_bio,
            annualSavings: annualSavings_bio,
            npv: npv_bio,
            irr: irr_bio,
            payback: payback_bio,
            discPayback: discPayback_bio
          }
        };
      });

      return result;
    });

    const rankedProposals = computed(() => {
      return [...processedProposals.value].sort((a, b) => a.lcos - b.lcos);
    });

    const bestProposal = computed(() => {
      return rankedProposals.value[0] || null;
    });

    const breakEvenPoints = computed(() => {
      const gasBoilers = processedProposals.value.filter(p => p.type === 'Gas Natural');
      const glpBoilers = processedProposals.value.filter(p => p.type === 'GLP');
      const biomassBoilers = processedProposals.value.filter(p => p.type === 'Biomasa');
      const points = [];

      biomassBoilers.forEach(b => {
        // Break-even vs GN
        gasBoilers.forEach(g => {
          const h_steam = getSteamEnthalpy(g.pressure_bar, g.temp_C);
          const fuel_energy_needed = (1000 * (h_steam - 440.0)) / (g.efficiency / 100);
          const co2Factor = fuel_energy_needed * (0.056 / 1055060);
          const gasPrice_kJ = (b.lcos - (g.depreciation || 0) - g.elecCostPerTon - g.omCostPerTon) / (fuel_energy_needed + co2Factor * general.value.co2_tax_ton);
          const gasPrice_MMBtu = gasPrice_kJ * 1055060;
          points.push({
            biomassSupplier: b.supplier,
            gasSupplier: g.supplier,
            fuelLabel: 'GN',
            gasPrice_MMBtu
          });
        });
        // Break-even vs GLP
        glpBoilers.forEach(g => {
          const h_steam = getSteamEnthalpy(g.pressure_bar, g.temp_C);
          const fuel_energy_needed = (1000 * (h_steam - 440.0)) / (g.efficiency / 100);
          const co2Factor = fuel_energy_needed * (0.063 / 1055060);
          const glpPrice_kJ = (b.lcos - (g.depreciation || 0) - g.elecCostPerTon - g.omCostPerTon) / (fuel_energy_needed + co2Factor * general.value.co2_tax_ton);
          const glpPrice_MMBtu = glpPrice_kJ * 1055060;
          points.push({
            biomassSupplier: b.supplier,
            gasSupplier: g.supplier,
            fuelLabel: 'GLP',
            gasPrice_MMBtu: glpPrice_MMBtu
          });
        });
      });
      return points;
    });

    const sensitivityData = computed(() => {
      const factors = [0.7, 0.85, 1.0, 1.3, 1.6, 2.0];
      const r = general.value.discount_rate / 100;
      
      const price_usd_ton = biomassPriceUSDton.value;

      return processedProposals.value.map(p => {
        const points = factors.map(f => {
          let gasPrice = general.value.gas_price_MMBtu;
          let glpPrice = general.value.glp_price_MMBtu;
          let biomassPrice = p.biomassPriceUSDton !== undefined && p.biomassPriceUSDton !== null ? p.biomassPriceUSDton : price_usd_ton;

          if (sensitivityType.value === 'gas' && p.type === 'Gas Natural') {
            gasPrice *= f;
          } else if (sensitivityType.value === 'glp' && p.type === 'GLP') {
            glpPrice *= f;
          } else if (sensitivityType.value === 'biomass' && p.type === 'Biomasa') {
            biomassPrice *= f;
          }

          const h_steam = getSteamEnthalpy(p.pressure_bar, p.temp_C);
          const h_feedwater = 440.0;
          const steam_energy_kJ = 1000 * (h_steam - h_feedwater);
          const fuel_energy_needed = steam_energy_kJ / (p.efficiency / 100);

          let fuelCost = 0;
          if (p.type === 'Gas Natural') {
            fuelCost = fuel_energy_needed * (gasPrice / 1055060) * (10800 / (general.value.gas_lhv_kcal || 10800));
          } else if (p.type === 'GLP') {
            fuelCost = fuel_energy_needed * (glpPrice / 1055060) * (11900 / (general.value.glp_lhv_kcal || 11900));
          } else {
            const lhvWet_kcal = 4500 * (1 - general.value.biomass_moisture / 100) - 583 * (general.value.biomass_moisture / 100);
            const lhvWet_kJ = lhvWet_kcal * 4.184;
            fuelCost = lhvWet_kJ > 0 ? (fuel_energy_needed * (biomassPrice / (1000 * lhvWet_kJ))) : 0;
          }

          const co2Cost = p.co2PerTon * general.value.co2_tax_ton;
          const totalOpex = fuelCost + co2Cost + p.elecCostPerTon + p.omCostPerTon;
          const lcos = totalOpex + (p.depreciation || 0);

          return {
            factor: (f - 1) * 100,
            lcos
          };
        });

        return {
          id: p.id,
          supplier: p.supplier,
          type: p.type,
          points
        };
      });
    });

    const resetForm = () => {
      form.value = {
        supplier: '',
        type: 'Gas Natural',
        power_MW: 7.5,
        steam_tonh: 10.0,
        pressure_bar: 20.0,
        temp_C: 220.0,
        efficiency: 90.0,
        capex: 500000,
        life_years: 20,
        spec_fuel: '',
        maintenance: 0.50,
        spare_parts: 0.20,
        labor: 0.40,
        waste: 0.0,
        chemicals: 0.10,
        depreciation: 0.35,
        electricity_cost: 0.40,
        diesel_loader: 0.20,
        other_opex: 0.20,
        hours_year: general.value.hours_year || 8760,
        biomass_price_m3st_clp: ''
      };
      editingId.value = null;
    };

    const editProposal = (p) => {
      editingId.value = p.id;
      form.value = {
        supplier: p.supplier,
        type: p.type,
        power_MW: p.power_MW,
        steam_tonh: p.steam_tonh,
        pressure_bar: p.pressure_bar,
        temp_C: p.temp_C,
        efficiency: p.efficiency,
        capex: p.capex,
        life_years: p.life_years,
        spec_fuel: p.spec_fuel !== null ? p.spec_fuel : '',
        maintenance: p.maintenance,
        spare_parts: p.spare_parts,
        labor: p.labor,
        waste: p.waste,
        chemicals: p.chemicals,
        depreciation: p.depreciation,
        electricity_cost: p.electricity_cost,
        diesel_loader: p.diesel_loader,
        other_opex: p.other_opex,
        hours_year: p.hours_year,
        biomass_price_m3st_clp: p.biomass_price_m3st_clp !== null && p.biomass_price_m3st_clp !== undefined ? p.biomass_price_m3st_clp : ''
      };
      const formEl = document.querySelector('#biomasa-gas-form-card');
      if (formEl) {
        formEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    };

    const addProposal = () => {
      if (!form.value.supplier.trim()) return;

      const payload = {
        supplier: form.value.supplier.trim(),
        type: form.value.type,
        power_MW: Math.max(0.1, parseFloat(form.value.power_MW) || 7.5),
        steam_tonh: Math.max(0.1, parseFloat(form.value.steam_tonh) || 10.0),
        pressure_bar: Math.max(0.1, parseFloat(form.value.pressure_bar) || 20.0),
        temp_C: Math.max(50, parseFloat(form.value.temp_C) || 220.0),
        efficiency: Math.max(1, Math.min(100, parseFloat(form.value.efficiency) || 90.0)),
        capex: Math.max(0, parseFloat(form.value.capex) || 500000),
        life_years: Math.max(1, parseInt(form.value.life_years) || 20),
        spec_fuel: (form.value.spec_fuel !== '' && form.value.spec_fuel !== null && !isNaN(form.value.spec_fuel)) ? Math.max(0, parseFloat(form.value.spec_fuel)) : null,
        maintenance: Math.max(0, parseFloat(form.value.maintenance) || 0),
        spare_parts: Math.max(0, parseFloat(form.value.spare_parts) || 0),
        labor: Math.max(0, parseFloat(form.value.labor) || 0),
        waste: Math.max(0, parseFloat(form.value.waste) || 0),
        chemicals: Math.max(0, parseFloat(form.value.chemicals) || 0),
        depreciation: Math.max(0, parseFloat(form.value.depreciation) || 0),
        electricity_cost: Math.max(0, parseFloat(form.value.electricity_cost) || 0),
        diesel_loader: Math.max(0, parseFloat(form.value.diesel_loader) || 0),
        other_opex: Math.max(0, parseFloat(form.value.other_opex) || 0),
        hours_year: general.value.hours_year || 8760,
        biomass_price_m3st_clp: form.value.type === 'Biomasa' ? (form.value.biomass_price_m3st_clp !== '' && form.value.biomass_price_m3st_clp !== null && !isNaN(form.value.biomass_price_m3st_clp) ? parseFloat(form.value.biomass_price_m3st_clp) : null) : null
      };

      if (editingId.value !== null) {
        const idx = proposals.value.findIndex(p => p.id === editingId.value);
        if (idx !== -1) {
          proposals.value[idx] = {
            ...proposals.value[idx],
            ...payload
          };
        }
      } else {
        const newId = proposals.value.length > 0 ? Math.max(...proposals.value.map(p => p.id)) + 1 : 1;
        proposals.value.push({
          id: newId,
          ...payload
        });
      }

      resetForm();
    };

    const deleteProposal = (id) => {
      proposals.value = proposals.value.filter(p => p.id !== id);
      if (editingId.value === id) {
        resetForm();
      }
    };

    const getTcoSvgPoints = computed(() => {
      const maxYear = general.value.years_analysis;
      let maxTco = 0;

      processedProposals.value.forEach(p => {
        const metrics = comparisons.value[p.id];
        if (metrics && metrics.tcoValues) {
          const finalVal = metrics.tcoValues[maxYear];
          if (finalVal > maxTco) maxTco = finalVal;
        }
      });

      if (maxTco === 0) maxTco = 1;

      const width = 600;
      const height = 300;
      const padding = { left: 80, right: 30, top: 20, bottom: 40 };

      const scaleX = (year) => padding.left + (year / maxYear) * (width - padding.left - padding.right);
      const scaleY = (val) => height - padding.bottom - (val / maxTco) * (height - padding.top - padding.bottom);

      const colors = ['#0284c7', '#ea580c', '#16a34a', '#8b5cf6', '#db2777', '#ca8a04'];

      const lines = processedProposals.value.map((p, idx) => {
        const metrics = comparisons.value[p.id];
        if (!metrics || !metrics.tcoValues) return null;

        const pts = metrics.tcoValues.map((val, year) => {
          return `${scaleX(year)},${scaleY(val)}`;
        }).join(' ');

        return {
          id: p.id,
          supplier: p.supplier,
          color: colors[idx % colors.length],
          points: pts
        };
      }).filter(l => l !== null);

      return {
        lines,
        width,
        height,
        maxTco,
        padding,
        scaleX,
        scaleY
      };
    });

    const getSensitivitySvgPoints = computed(() => {
      let maxLcos = 0;
      let minLcos = 999;

      sensitivityData.value.forEach(d => {
        d.points.forEach(pt => {
          if (pt.lcos > maxLcos) maxLcos = pt.lcos;
          if (pt.lcos < minLcos) minLcos = pt.lcos;
        });
      });

      if (maxLcos === 0) maxLcos = 1;
      minLcos = Math.max(0, minLcos - 5);
      maxLcos = maxLcos + 5;

      const width = 600;
      const height = 300;
      const padding = { left: 80, right: 30, top: 20, bottom: 40 };

      const scaleX = (dev) => {
        const pct = (dev + 30) / 130;
        return padding.left + pct * (width - padding.left - padding.right);
      };
      
      const scaleY = (val) => {
        const pct = (val - minLcos) / (maxLcos - minLcos);
        return height - padding.bottom - pct * (height - padding.top - padding.bottom);
      };

      const colors = ['#0284c7', '#ea580c', '#16a34a', '#8b5cf6', '#db2777', '#ca8a04'];

      const lines = sensitivityData.value.map((d, idx) => {
        const pts = d.points.map(pt => {
          return `${scaleX(pt.factor)},${scaleY(pt.lcos)}`;
        }).join(' ');

        return {
          id: d.id,
          supplier: d.supplier,
          color: colors[idx % colors.length],
          points: pts
        };
      });

      return {
        lines,
        width,
        height,
        minLcos,
        maxLcos,
        padding,
        scaleX,
        scaleY
      };
    });
    const cleanSupplierName = (name) => {
      if (!name) return 'Propuesta';
      const lowercaseName = name.toLowerCase();
      if (lowercaseName.includes('vyncke')) return 'Vyncke';
      if (lowercaseName.includes('caldera 1') || lowercaseName.includes('caldera1')) return 'Caldera 1';
      if (lowercaseName.includes('existente')) return 'Existente';
      if (lowercaseName.includes('bosh')) return 'Bosh';
      if (lowercaseName.includes('thermal')) return 'Thermal';
      if (lowercaseName.includes('martech')) return 'Martech';
      return name.split(' ')[0] || name;
    };

    const getProposalColor = (name) => {
      if (!name) return '#db2777';
      const lowercaseName = name.toLowerCase();
      if (lowercaseName.includes('vyncke')) return '#0284c7';
      if (lowercaseName.includes('caldera 1') || lowercaseName.includes('caldera1')) return '#0ea5e9';
      if (lowercaseName.includes('existente')) return '#3b82f6';
      if (lowercaseName.includes('bosh')) return '#ea580c';
      if (lowercaseName.includes('thermal')) return '#16a34a';
      if (lowercaseName.includes('martech')) return '#8b5cf6';
      return '#db2777';
    };

    const getLcosBarChartData = computed(() => {
      const scenarios = [
        { label: 'Escenario Favorable (-30%)', factor: -30 },
        { label: 'Precio Actual (0%)', factor: 0 },
        { label: 'Escenario Desfavorable (+60%)', factor: 60 }
      ];
      
      const activeProps = processedProposals.value;
      if (activeProps.length === 0) return { groups: [], maxLcos: 100, width: 600, height: 300, padding: { left: 50, right: 20, top: 30, bottom: 40 } };
      
      let maxLcos = 0;
      
      scenarios.forEach(sc => {
        activeProps.forEach(p => {
          const pSens = sensitivityData.value.find(s => s.id === p.id);
          if (pSens && pSens.points) {
            const pt = pSens.points.find(pt => Math.abs(pt.factor - sc.factor) < 1e-2);
            if (pt && pt.lcos > maxLcos) maxLcos = pt.lcos;
          }
        });
      });
      maxLcos = maxLcos > 0 ? maxLcos * 1.15 : 100;

      const width = 600;
      const height = 300;
      const padding = { left: 50, right: 20, top: 30, bottom: 40 };
      const plotWidth = width - padding.left - padding.right;
      const plotHeight = height - padding.top - padding.bottom;
      
      const groupWidth = plotWidth / 3;
      const barSpacing = 2;
      const totalGroupWidth = groupWidth * 0.75;
      const barsCount = activeProps.length;
      const barWidth = barsCount > 0 ? (totalGroupWidth - (barsCount - 1) * barSpacing) / barsCount : 0;
      
      const groups = scenarios.map((sc, groupIdx) => {
        const groupCenterX = padding.left + (groupIdx + 0.5) * groupWidth;
        const groupStartX = groupCenterX - (barsCount * barWidth + (barsCount - 1) * barSpacing) / 2;
        
        const bars = activeProps.map((p, barIdx) => {
          const pSens = sensitivityData.value.find(s => s.id === p.id);
          let lcosVal = 0;
          if (pSens && pSens.points) {
            const pt = pSens.points.find(pt => Math.abs(pt.factor - sc.factor) < 1e-2);
            if (pt) lcosVal = pt.lcos;
          }
          
          const barHeight = (lcosVal / maxLcos) * plotHeight;
          const barX = groupStartX + barIdx * (barWidth + barSpacing);
          const barY = padding.top + plotHeight - barHeight;
          
          return {
            proposalId: p.id,
            supplier: p.supplier,
            cleanName: cleanSupplierName(p.supplier),
            color: getProposalColor(p.supplier),
            value: lcosVal,
            x: barX,
            y: barY,
            w: barWidth,
            h: barHeight
          };
        });
        
        return {
          label: sc.label,
          factor: sc.factor,
          bars,
          centerX: groupCenterX
        };
      });
      
      return {
        groups,
        maxLcos,
        width,
        height,
        padding
      };
    });

    const getPaybackChartData = computed(() => {
      let base = baselineProposal.value;
      if (sensitivityType.value === 'glp') {
        base = glpBaselineProposal.value;
      } else if (sensitivityType.value === 'biomass') {
        base = biomassBaselineProposal.value;
      }
      if (!base) return { bars: [], width: 600, height: 130, padding: { left: 120, right: 40, top: 15, bottom: 30 } };
      
      const activeProps = processedProposals.value.filter(p => p.id !== base.id);
      
      const width = 600;
      const height = 130;
      const padding = { left: 120, right: 40, top: 15, bottom: 30 };
      const plotWidth = width - padding.left - padding.right;
      const plotHeight = height - padding.top - padding.bottom;
      
      const maxYears = 15;
      const barHeight = 12;
      const barsCount = activeProps.length;
      const verticalStep = barsCount > 0 ? plotHeight / barsCount : 0;
      
      const bars = activeProps.map((p, idx) => {
        const comp = comparisons.value[p.id];
        let paybackVal = null;
        if (comp) {
          if (sensitivityType.value === 'gas') {
            paybackVal = comp.gas && typeof comp.gas.payback === 'number' && !isNaN(comp.gas.payback) ? comp.gas.payback : null;
          } else if (sensitivityType.value === 'glp') {
            paybackVal = comp.glp && typeof comp.glp.payback === 'number' && !isNaN(comp.glp.payback) ? comp.glp.payback : null;
          } else if (sensitivityType.value === 'biomass') {
            paybackVal = comp.biomass && typeof comp.biomass.payback === 'number' && !isNaN(comp.biomass.payback) ? comp.biomass.payback : null;
          }
        }
        
        let displayName = p.supplier.replace(/calderas/gi, 'Calderas').replace(/\s*\(.*\)/g, '');
        if (p.supplier.toLowerCase().includes('bosh')) {
          displayName = 'Bosh 2 Calderas';
        } else if (p.supplier.toLowerCase().includes('thermal')) {
          displayName = 'Thermal 2 Calderas';
        } else if (p.supplier.toLowerCase().includes('martech')) {
          displayName = 'Martech 1 Caldera';
        }
        
        const centerY = padding.top + (idx + 0.5) * verticalStep;
        const topY = centerY - barHeight / 2;
        
        let barW = 0;
        let labelText = 'N/A';
        let isValid = false;
        
        if (paybackVal !== null && paybackVal > 0) {
          if (paybackVal < 100) {
            barW = (Math.min(paybackVal, maxYears) / maxYears) * plotWidth;
            labelText = paybackVal < 1 ? paybackVal.toFixed(2) + ' años' : paybackVal.toFixed(1) + ' años';
            isValid = true;
          } else {
            labelText = 'No recupera';
          }
        } else if (paybackVal !== null) {
          labelText = 'No recupera';
        }
        
        return {
          proposalId: p.id,
          supplier: p.supplier,
          displayName,
          color: getProposalColor(p.supplier),
          value: paybackVal,
          y: topY,
          h: barHeight,
          w: barW,
          labelX: padding.left + barW + 8,
          labelY: centerY + 4,
          labelText,
          isValid
        };
      });
      
      return {
        bars,
        width,
        height,
        padding,
        maxYears
      };
    });

    const getTcoBreakdownChartData = computed(() => {
      const activeProps = processedProposals.value;
      const years = general.value.years_analysis || 15;
      
      if (activeProps.length === 0) {
        return {
          bars: [],
          maxOpexVal: 10,
          maxCapexVal: 1,
          years,
          width: 600,
          height: 200,
          padding: { left: 60, right: 60, top: 25, bottom: 45 }
        };
      }
      
      let maxOpex = 0;
      let maxCapex = 0;
      
      activeProps.forEach(p => {
        const capexM = p.capex / 1000000;
        const opexM = (p.annualOPEX * years) / 1000000;
        if (opexM > maxOpex) maxOpex = opexM;
        if (capexM > maxCapex) maxCapex = capexM;
      });
      
      const maxOpexVal = maxOpex > 0 ? maxOpex * 1.15 : 10;
      const maxCapexVal = maxCapex > 0 ? maxCapex * 1.15 : 1;
      
      const width = 600;
      const height = 200;
      const padding = { left: 60, right: 60, top: 25, bottom: 45 };
      const plotWidth = width - padding.left - padding.right;
      const plotHeight = height - padding.top - padding.bottom;
      
      const barsCount = activeProps.length;
      const categoryWidth = barsCount > 0 ? plotWidth / barsCount : 0;
      const barWidth = 24;
      
      const bars = activeProps.map((p, idx) => {
        const capexM = p.capex / 1000000;
        const opexM = (p.annualOPEX * years) / 1000000;
        
        const categoryCenterX = padding.left + (idx + 0.5) * categoryWidth;
        
        const opexX = categoryCenterX - barWidth / 2;
        const opexH = (opexM / maxOpexVal) * plotHeight;
        const opexY = padding.top + plotHeight - opexH;
        
        const capexY = padding.top + plotHeight - (capexM / maxCapexVal) * plotHeight;
        
        return {
          proposalId: p.id,
          supplier: p.supplier,
          cleanName: cleanSupplierName(p.supplier),
          capex: capexM,
          opex: opexM,
          opexX,
          opexY,
          opexH,
          opexW: barWidth,
          capexY,
          centerX: categoryCenterX
        };
      });
      
      return {
        bars,
        maxOpexVal,
        maxCapexVal,
        years,
        width,
        height,
        padding
      };
    });

    const getTcoBreakdownLinePath = computed(() => {
      const data = getTcoBreakdownChartData.value;
      if (!data.bars || data.bars.length === 0) return '';
      return data.bars.map((b, idx) => {
        return `${idx === 0 ? 'M' : 'L'} ${b.centerX} ${b.capexY}`;
      }).join(' ');
    });

    const selectedProposalForModal = ref(null);
    const showBoilerReportModal = ref(false);

    // ── Computed: BoilerDecisionReport data ──────────────────────────
    const boilerReportData = computed(() => {
      const sorted = [...processedProposals.value].sort((a, b) => a.lcos - b.lcos);
      if (sorted.length === 0) return null;

      const optimo = sorted[0];
      const competidor = sorted[1] || null;
      const existente = proposals.value.find(p =>
        p.supplier.toLowerCase().includes('existente') || p.supplier.toLowerCase().includes('caldera 1')
      );
      const existenteProcessed = existente
        ? processedProposals.value.find(p => p.id === existente.id)
        : sorted[sorted.length - 1];

      // OPEX anual del optimo vs existente => ahorro
      const ahorroOpexAnual = existenteProcessed && existenteProcessed.id !== optimo.id
        ? existenteProcessed.annualOPEX - optimo.annualOPEX
        : 0;

      // Costo de combustible del optimo en USD/MMBtu
      let costoCombustibleOptimo = 0;
      if (optimo.type === 'Gas Natural') costoCombustibleOptimo = general.value.gas_price_MMBtu;
      else if (optimo.type === 'GLP') costoCombustibleOptimo = general.value.glp_price_MMBtu;
      else costoCombustibleOptimo = biomasaPriceMMBtuForReport.value;

      return {
        numeroDeOpciones: sorted.length,
        optimo,
        competidor,
        existente: existenteProcessed,
        ahorroOpexAnual,
        costoCombustibleOptimo,
        costoGN: general.value.gas_price_MMBtu,
        top3: sorted.slice(0, 3),
        all: sorted
      };
    });

    const biomasaPriceMMBtuForReport = computed(() => {
      return biomassPriceUSDMMBtu.value || 0;
    });

    const downloadBoilerPDF = () => {
      const element = document.getElementById('boiler-decision-report-content');
      if (!element) return;
      if (typeof html2pdf !== 'undefined') {
        const opt = {
          margin: [0.05, 0.05, 0.05, 0.05],
          filename: 'Resolucion_Estrategica_Adquisicion_Caldera.pdf',
          image: { type: 'jpeg', quality: 1.0 },
          html2canvas: {
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
            boilerPrintFallback(element);
          });
      } else {
        boilerPrintFallback(element);
      }
    };

    const boilerPrintFallback = (element) => {
      const printWindow = window.open('', '_blank', 'width=1020,height=620');
      if (!printWindow) { alert('Por favor permita ventanas emergentes.'); return; }
      printWindow.document.write(`<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8">
<title>Resolución Estratégica — Caldera</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;900&display=swap" rel="stylesheet">
<style>*{margin:0;padding:0;box-sizing:border-box;}body{font-family:'Inter',sans-serif;background:white;}
@page{size:letter landscape;margin:0.35in;}
@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}}</style></head>
<body>${element.outerHTML}
<script>window.onload=function(){setTimeout(function(){window.print();window.close();},400);};<\/script>
</body></html>`);
      printWindow.document.close();
    };

    const showFinancialDetails = (proposal) => {
      selectedProposalForModal.value = proposal;
    };

    const getModalNpvText = (compareType) => {
      const p = selectedProposalForModal.value;
      if (!p || !comparisons.value[p.id]) return '—';
      const comp = comparisons.value[p.id][compareType];
      if (!comp) return '—';
      if (comp.isBase) return `— (Base ${compareType === 'gas' ? 'GN' : 'GLP'})`;
      return fmtUSD(comp.npv);
    };

    const getModalNpvClass = (compareType) => {
      const p = selectedProposalForModal.value;
      if (!p || !comparisons.value[p.id]) return 'text-on-surface-variant';
      const comp = comparisons.value[p.id][compareType];
      if (!comp || comp.isBase) return 'text-on-surface-variant';
      return comp.npv > 0 ? 'text-secondary font-bold' : (comp.npv < 0 ? 'text-error' : 'text-on-surface-variant');
    };

    const getModalIrrText = (compareType) => {
      const p = selectedProposalForModal.value;
      if (!p || !comparisons.value[p.id]) return '—';
      const comp = comparisons.value[p.id][compareType];
      if (!comp) return '—';
      if (comp.isBase) return '—';
      if (comp.irr === 999) return 'Excelente';
      if (comp.irr === -1) return 'No aplica';
      return `${fmt(comp.irr, 1)}%`;
    };

    const getModalPaybackText = (compareType) => {
      const p = selectedProposalForModal.value;
      if (!p || !comparisons.value[p.id]) return '—';
      const comp = comparisons.value[p.id][compareType];
      if (!comp) return '—';
      if (comp.isBase) return '—';
      if (comp.payback === null) return 'No retorna';
      if (comp.payback < 0) return 'Inmediato';
      return `${fmt(comp.payback, 1)} años`;
    };

    // loadState executed synchronously on setup

    return {
      showMMBtu,
      general,
      proposals,
      form,
      activeChartTab,
      sensitivityType,
      biomassPriceUSDton,
      biomassPriceUSDMMBtu,
      biomassMonthlyEnergy,
      biomassMonthlyCostUSD,
      gasEquivalentMonthlyCostUSD,
      glpEquivalentMonthlyCostUSD,
      monthlySavingsUSD,
      gasSteamCostUSDton,
      gasSteamCostUSDMMBtu,
      glpSteamCostUSDton,
      glpSteamCostUSDMMBtu,
      dieselPriceUSDMMBtu,
      dieselSteamCostUSDton,
      dieselSteamCostUSDMMBtu,
      dieselEquivalentMonthlyCostUSD,
      monthlyDieselConsumptionLiters,
      biomassSteamCostUSDton,
      biomassSteamCostUSDMMBtu,
      monthlySavingsVsGlpUSD,
      processedProposals,
      baselineProposal,
      comparisons,
      rankedProposals,
      bestProposal,
      breakEvenPoints,
      sensitivityData,
      addProposal,
      deleteProposal,
      editingId,
      editProposal,
      resetForm,
      fmt,
      fmtUSD,
      getTcoSvgPoints,
      getSensitivitySvgPoints,
      getLcosBarChartData,
      getPaybackChartData,
      getTcoBreakdownChartData,
      getTcoBreakdownLinePath,
      cleanSupplierName,
      getProposalColor,
      selectedProposalForModal,
      showFinancialDetails,
      getModalNpvText,
      getModalNpvClass,
      getModalIrrText,
      getModalPaybackText,
      // Exposed for cross-module bridge (window.steamoptix_bg_app.processedProposals)
      processedProposals,
      showBoilerReportModal,
      boilerReportData,
      biomasaPriceMMBtuForReport,
      downloadBoilerPDF
    };
  }
});

biomasaGasApp.config.errorHandler = (err, instance, info) => {
  console.error('Vue Error:', err, info);
  const msg = err ? err.message || String(err) : 'Unknown Vue Error';
  const stack = err ? err.stack || '' : '';
  const errDiv = document.createElement('div');
  errDiv.style.cssText = 'position:fixed;top:0;left:0;width:100%;background:darkred;color:white;z-index:99999;font-family:monospace;padding:10px;font-size:14px;';
  errDiv.innerText = 'VUE RUNTIME ERROR: ' + msg + '\nInfo: ' + info + '\nStack:\n' + stack;
  document.documentElement.appendChild(errDiv);
};

const mountApp = () => {
  try {
    window.steamoptix_bg_app = biomasaGasApp.mount('#tab-content-biomasa-gas');
    console.log('Biomasa/Gas app mounted successfully.');
  } catch (err) {
    console.error('Error mounting Biomasa/Gas app:', err);
  }
};
window.mountApp = mountApp;

// =====================================================
// CROSS-MODULE BRIDGE: expose proposals for Balance Gen
// =====================================================
// Returns the processed proposals array (with lcos, lcos_USD_MMBtu etc.)
// so other Vue apps can query them by supplier name / fuel type.
window.getBiomasaGasProposals = function() {
  try {
    if (window.steamoptix_bg_app && window.steamoptix_bg_app.processedProposals) {
      return window.steamoptix_bg_app.processedProposals;
    }
  } catch(e) {}
  // Fallback: read from localStorage and return raw proposals
  try {
    const saved = localStorage.getItem('steamoptix_bg_proposals');
    if (saved) return JSON.parse(saved);
  } catch(e) {}
  return [];
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mountApp);
} else {
  mountApp();
}
})();
