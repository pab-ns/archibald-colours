    (() => {
      // ========================================
      // CONFIGURATION
      // ========================================

const CONFIG = {
    csvPath: G_SHEET_URL,
    fps: 10,
    debug: true
};

      // ========================================
      // ELEMENTS
      // ========================================

      const runner = document.getElementById("palette-runner");

      const status = document.getElementById("palette-status");

      if (!runner) {
        console.error("[Palette Runner] Missing #palette-runner");

        return;
      }

      // ========================================
      // STATE
      // ========================================

      let items = [];

      let order = [];

      let position = 0;

      let timer = null;

      let last = null;

      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

      // ========================================
      // STATUS MESSAGE
      // ========================================

      function setStatus(message) {
        if (status) {
          status.textContent = message;
        }
      }

      // ========================================
      // STOP ANIMATION
      // ========================================

      function stop() {
        clearInterval(timer);

        timer = null;
      }

      // ========================================
      // RANDOMISE PALETTES
      // ========================================

      function shuffle() {
        order = [...items];

        for (let i = order.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));

          [order[i], order[j]] = [order[j], order[i]];
        }

        // Prevent consecutive repetitions

        if (order.length > 1 && order[0] === last) {
          [order[0], order[1]] = [order[1], order[0]];
        }

        position = 0;
      }

      // ========================================
      // DISPLAY PALETTE
      // ========================================

      function show() {
        last = order[position];

        if (!last) return;

        runner.src = last;

        runner.hidden = false;
      }

      // ========================================
      // START ANIMATION
      // ========================================

      function start() {
        stop();

        if (document.hidden || reducedMotion.matches || items.length <= 1) {
          return;
        }

        timer = setInterval(() => {
          position++;

          if (position >= order.length) {
            shuffle();
          }

          show();
        }, 1000 / CONFIG.fps);
      }

      // ========================================
      // PRELOAD IMAGES
      // ========================================

      function preload(src) {
        return new Promise((resolve) => {
          const img = new Image();

          img.onload = () => resolve(src);

          img.onerror = () => {
            console.warn("[Palette Runner] Missing palette:", src);

            resolve(null);
          };

          img.src = src;
        });
      }

      // ========================================
      // LOAD GOOGLE SHEET
      // ========================================

      async function load() {
        stop();

        items = [];

        runner.hidden = true;

        setStatus("Loading palettes…");

        try {
          if (typeof Papa === "undefined") {
            throw new Error("PapaParse is unavailable. Load PapaParse before this script.");
          }

          // Retrieve CSV data

          const data = await new Promise((resolve, reject) => {
            Papa.parse(CONFIG.csvPath, {
              download: true,

              header: true,

              skipEmptyLines: true,

              transformHeader: (header) => header.trim().toLowerCase(),

              complete: resolve,

              error: reject,
            });
          });

          // Validate palette header

          if (!data.meta.fields?.includes("palette_web")) {
            throw new Error('The Google Sheet does not contain a "palette_web" header.');
          }

          // Retrieve remote palette URLs

          const paths = data.data

            .map((row) => row.palette_web?.trim())

            .filter(Boolean);

          if (CONFIG.debug) {
            console.group("ARCHIBALD — Palette Runner");

            console.log("CSV Headers:", data.meta.fields);

            console.log("Palette URLs:", paths);

            console.log("Palettes found:", paths.length);

            console.groupEnd();
          }

          // Preload unique images

          const loaded = await Promise.all([...new Set(paths)].map(preload));

          // Remove missing images

          items = loaded.filter(Boolean);

          if (!items.length) {
            throw new Error("No remote palette images could be loaded.");
          }

          if (CONFIG.debug) {
            console.log("[Palette Runner] Successfully loaded:", items.length);
          }

          // Start animation

          shuffle();

          show();

          setStatus("");

          start();
        } catch (error) {
          console.error("[Palette Runner]", error);

          setStatus("Unable to load palettes.");
        }
      }

      // ========================================
      // BROWSER VISIBILITY
      // ========================================

      document.addEventListener("visibilitychange", start);

      reducedMotion.addEventListener("change", start);

      // ========================================
      // INITIALISE
      // ========================================

      load();
    })();
  
