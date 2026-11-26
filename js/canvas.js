(() => {

    // ========================================
    // CONFIGURATION
    // ========================================

const CONFIG = {
    csvPath: G_SHEET_URL,
    padding: 30,
    hoverTolerance: 5,
    tooltipOffsetX: 15,
    tooltipOffsetY: -40,
    debug: true
};


    // ========================================
    // ELEMENTS
    // ========================================

    const root = document.getElementById("canvas-section");

    if (!root) return;

    const chart = root.querySelector("#canvas-chart");
    const text = root.querySelector("#canvas_text");
    const slider = root.querySelector("#canvas-slider");
    const tooltip = root.querySelector("#canvas-tooltip");
    const reset = root.querySelector("#canvas-reset");

    const currentYear = root.querySelector(
        "#canvas-slider-current"
    );


    // Check required HTML elements

    const required = { chart, text, slider, tooltip };

    const missing = Object.keys(required).filter(
        key => !required[key]
    );

    if (missing.length) {
        console.error(
            "[Canvas Chart] Missing HTML elements:",
            missing
        );
        return;
    }


    // Retrieve highlight colour from HTML

    const activeClass =
        chart.dataset.activeClass || "text-yellow-200";


    // ========================================
    // STATE
    // ========================================

    let portraits = [];
    let outlines = [];

    let averageOutline = null;
    let average = null;

    let selectedIndex = -1;
    let hoveredIndex = -1;

    let scale = 1;


    // ========================================
    // PARSE PORTRAIT DIMENSIONS
    // ========================================

    function parseSize(value) {

        if (!value) return null;

        const cleaned = String(value)
            .trim()
            .replace(/,/g, ".")
            .replace(/×/g, "x");

        const match = cleaned.match(
            /^(\d+(?:\.\d+)?)\s*(cm)?\s*x\s*(\d+(?:\.\d+)?)\s*(cm)?$/i
        );

        if (!match) return null;


        // Artwork dimensions: Height × Width

        const height = Number(match[1]);
        const width = Number(match[3]);

        if (
            !Number.isFinite(width) ||
            !Number.isFinite(height) ||
            width <= 0 ||
            height <= 0
        ) {
            return null;
        }

        return {
            width,
            height
        };

    }


    // ========================================
    // FORMAT DIMENSIONS
    // ========================================

    function formatNumber(value) {
        return Number(value.toFixed(1)).toString();
    }

    function formatSize(width, height) {

        return `${formatNumber(height)} × ${formatNumber(width)} cm`;

    }


    // ========================================
    // LOAD GOOGLE SHEET
    // ========================================

    function loadData() {

        // Check PapaParse dependency

        if (typeof Papa === "undefined") {

            console.error(
                "[Canvas Chart] Load PapaParse before canvas.js."
            );

            text.textContent =
                "Unable to load portrait dimensions.";

            return;
        }


        Papa.parse(CONFIG.csvPath, {

            download: true,

            header: true,

            skipEmptyLines: true,

            transformHeader: header =>
                header.trim().toLowerCase(),


            complete: results => {

                portraits = [];

                const skipped = [];


                results.data.forEach(row => {

                    const size = parseSize(row.size);

                    const year = Number(row.year);


                    if (
                        !size ||
                        !Number.isInteger(year) ||
                        year <= 0
                    ) {

                        skipped.push(row);

                        return;
                    }


                    portraits.push({

                        year,

                        artist:
                            row.artist?.trim() ||
                            "Unknown artist",

                        width: size.width,

                        height: size.height

                    });

                });


                // Sort chronologically

                portraits.sort(
                    (a, b) => a.year - b.year
                );


                // Debugging

                if (CONFIG.debug) {

                    console.group(
                        "ARCHIBALD — Canvas data"
                    );

                    console.log(
                        "CSV headers:",
                        results.meta.fields
                    );

                    console.table(portraits);

                    console.log(
                        "Valid portraits:",
                        portraits.length
                    );

                    console.log(
                        "Skipped rows:",
                        skipped.length
                    );

                    if (skipped.length) {

                        console.warn(
                            "Invalid or missing dimensions:"
                        );

                        console.table(skipped);

                    }

                    console.groupEnd();

                }


                if (!portraits.length) {

                    console.error(
                        "No valid canvas dimensions found."
                    );

                    text.textContent =
                        "Unable to load portrait dimensions.";

                    return;

                }


                calculateAverage();

                configureSlider();

                renderChart();

                showAverage();

            },


            error: error => {

                console.error(
                    "Canvas CSV error:",
                    error
                );

                text.textContent =
                    "Unable to load portrait dimensions.";

            }

        });

    }


    // ========================================
    // CALCULATE AVERAGE DIMENSIONS
    // ========================================

    function calculateAverage() {

        const totalWidth = portraits.reduce(
            (sum, portrait) => sum + portrait.width,
            0
        );

        const totalHeight = portraits.reduce(
            (sum, portrait) => sum + portrait.height,
            0
        );


        average = {

            width:
                totalWidth / portraits.length,

            height:
                totalHeight / portraits.length

        };


        if (CONFIG.debug) {

            console.log(
                "Average canvas dimensions:",
                average
            );

        }

    }


    // ========================================
    // CALCULATE RESPONSIVE SCALE
    // ========================================

    function calculateScale() {

        const maxWidth = Math.max(
            ...portraits.map(p => p.width)
        );

        const maxHeight = Math.max(
            ...portraits.map(p => p.height)
        );


        const availableWidth =
            chart.clientWidth - CONFIG.padding * 2;

        const availableHeight =
            chart.clientHeight - CONFIG.padding * 2;


        if (
            availableWidth <= 0 ||
            availableHeight <= 0
        ) {

            console.warn(
                "Canvas chart has invalid dimensions.",
                {
                    width: chart.clientWidth,
                    height: chart.clientHeight
                }
            );

            return 0;

        }


        return Math.min(

            availableWidth / maxWidth,

            availableHeight / maxHeight

        );

    }


    // ========================================
    // CREATE INDIVIDUAL CANVAS OUTLINE
    // ========================================

    function createOutline(portrait, index) {

        const outline =
            document.createElement("div");

        outline.className = "canvas-outline";

        outline.dataset.year = portrait.year;

        outline.dataset.index = index;

        outline.style.width =
            `${portrait.width * scale}px`;

        outline.style.height =
            `${portrait.height * scale}px`;

        return outline;

    }


    // ========================================
    // CREATE AVERAGE OUTLINE
    // ========================================

    function createAverageOutline() {

        const outline =
            document.createElement("div");

        outline.className = "canvas-average";

        outline.classList.add(activeClass);

        outline.style.width =
            `${average.width * scale}px`;

        outline.style.height =
            `${average.height * scale}px`;

        return outline;

    }


    // ========================================
    // RENDER CHART
    // ========================================

    function renderChart() {

        chart.replaceChildren();

        averageOutline = null;

        outlines = [];

        scale = calculateScale();

        if (!scale) return;


        const fragment =
            document.createDocumentFragment();


        portraits.forEach((portrait, index) => {

            const outline =
                createOutline(portrait, index);

            outlines.push(outline);

            fragment.appendChild(outline);

        });


        averageOutline = createAverageOutline();

        fragment.appendChild(averageOutline);

        chart.appendChild(fragment);


        restoreSelection();

    }


    // ========================================
    // DEFAULT AVERAGE STATE
    // ========================================

    function showAverage() {

        if (!average) return;


        outlines.forEach(outline => {

            outline.classList.remove(
                "is-active",
                "is-muted",
                activeClass
            );

        });


        if (averageOutline) {

            averageOutline.style.display = "block";

        }


        text.textContent =

            `The average size of the portraits is roughly ` +

            `${formatSize(average.width, average.height)}.`;

    }


    // ========================================
    // PORTRAIT LABEL
    // ========================================

    function portraitLabel(portrait) {

        return (

            `${formatSize(portrait.width, portrait.height)} ` +

            `• ${portrait.artist} (${portrait.year})`

        );

    }


    // ========================================
    // HIGHLIGHT INDIVIDUAL PORTRAIT
    // ========================================

    function highlightPortrait(index) {

        const portrait = portraits[index];

        if (!portrait) return;


        // Hide average outline

        if (averageOutline) {

            averageOutline.style.display = "none";

        }


        // Highlight selected portrait

        outlines.forEach((outline, i) => {

            const isActive = i === index;


            outline.classList.toggle(
                "is-active",
                isActive
            );


            outline.classList.toggle(
                "is-muted",
                !isActive
            );


            outline.classList.toggle(
                activeClass,
                isActive
            );

        });


        text.textContent =
            portraitLabel(portrait);

    }


    // ========================================
    // CONFIGURE SLIDER
    // ========================================

    function configureSlider() {

        slider.min = 1921;

        slider.max = 2026;

        slider.step = 1;

        slider.value = 1921;


        selectedIndex = -1;


        // Optional HTML element

        if (currentYear) {

            currentYear.textContent = "1921";

        }


        slider.setAttribute(
            "aria-valuetext",
            "Average dimensions"
        );

    }


    // ========================================
    // RESTORE CURRENT SELECTION
    // ========================================

    function restoreSelection() {

        if (!average) return;


        // Average dimensions

        if (selectedIndex === -1) {

            showAverage();

        }


        // Year without available data

        else if (selectedIndex === -2) {

            outlines.forEach(outline => {

                outline.classList.remove(
                    "is-active",
                    activeClass
                );

                outline.classList.add("is-muted");

            });


            if (averageOutline) {

                averageOutline.style.display = "none";

            }


            text.textContent =

                `No portrait dimensions available for ${slider.value}.`;

        }


        // Individual portrait

        else {

            highlightPortrait(selectedIndex);

        }

    }


    // ========================================
    // SLIDER SELECTION
    // ========================================

    function selectSliderYear() {

        if (!average) return;


        const year = Number(slider.value);


        if (currentYear) {

            currentYear.textContent = String(year);

        }


        selectedIndex = portraits.findIndex(
            portrait => portrait.year === year
        );


        // No portrait found for selected year

        if (selectedIndex === -1) {

            selectedIndex = -2;

        }


        slider.setAttribute(
            "aria-valuetext",
            String(year)
        );


        hoveredIndex = -1;

        hideTooltip();

        restoreSelection();

    }


    // ========================================
    // SLIDER EVENTS
    // ========================================

    slider.addEventListener(
        "input",
        selectSliderYear
    );


    // Allow selecting 1921 without moving slider

    slider.addEventListener("click", () => {

        if (selectedIndex === -1) {

            selectSliderYear();

        }

    });


    // Keyboard accessibility

    slider.addEventListener("keydown", event => {

        if (
            event.key === "Enter" &&
            selectedIndex === -1
        ) {

            selectSliderYear();

        }

    });


    // ========================================
    // EDGE HIT DETECTION
    // ========================================

    function findHoveredPortrait(event) {

        const bounds =
            chart.getBoundingClientRect();


        // Cursor coordinates relative to centre

        const x = Math.abs(

            event.clientX -

            bounds.left -

            bounds.width / 2

        );


        const y = Math.abs(

            event.clientY -

            bounds.top -

            bounds.height / 2

        );


        let closestIndex = -1;

        let closestDistance = Infinity;


        portraits.forEach((portrait, index) => {

            const halfWidth =
                portrait.width * scale / 2;

            const halfHeight =
                portrait.height * scale / 2;


            // Distance to vertical border

            const verticalDistance =

                y <= halfHeight + CONFIG.hoverTolerance

                    ? Math.abs(x - halfWidth)

                    : Infinity;


            // Distance to horizontal border

            const horizontalDistance =

                x <= halfWidth + CONFIG.hoverTolerance

                    ? Math.abs(y - halfHeight)

                    : Infinity;


            const distance = Math.min(

                verticalDistance,

                horizontalDistance

            );


            if (

                distance <= CONFIG.hoverTolerance &&

                distance < closestDistance

            ) {

                closestDistance = distance;

                closestIndex = index;

            }

        });


        return closestIndex;

    }


    // ========================================
    // HOVER EVENT
    // ========================================

    chart.addEventListener("pointermove", event => {

        if (!average || !scale) return;


        const index = findHoveredPortrait(event);


        // Cursor is not over an outline

        if (index === -1) {

            if (hoveredIndex !== -1) {

                hoveredIndex = -1;

                restoreSelection();

            }


            hideTooltip();

            chart.style.cursor = "default";

            return;

        }


        // Cursor is over an outline

        chart.style.cursor = "pointer";


        if (hoveredIndex !== index) {

            hoveredIndex = index;

            highlightPortrait(index);

        }


        showTooltip(

            portraitLabel(portraits[index]),

            event

        );

    });


    // ========================================
    // MOUSE LEAVE
    // ========================================

    chart.addEventListener("pointerleave", () => {

        hoveredIndex = -1;

        hideTooltip();

        restoreSelection();

    });


    // ========================================
    // TOOLTIP
    // ========================================

    function showTooltip(content, event) {

        tooltip.textContent = content;

        tooltip.classList.remove("hidden");


        const x =
            event.clientX + CONFIG.tooltipOffsetX;

        const y =
            event.clientY + CONFIG.tooltipOffsetY;


        tooltip.style.left = `${Math.max(

            8,

            Math.min(

                x,

                window.innerWidth -
                tooltip.offsetWidth - 8

            )

        )}px`;


        tooltip.style.top = `${Math.max(

            8,

            Math.min(

                y,

                window.innerHeight -
                tooltip.offsetHeight - 8

            )

        )}px`;

    }


    function hideTooltip() {

        tooltip.classList.add("hidden");

    }


    // ========================================
    // RESET TO AVERAGE
    // ========================================

    reset?.addEventListener("click", () => {

        slider.value = 1921;


        if (currentYear) {

            currentYear.textContent = "1921";

        }


        slider.setAttribute(
            "aria-valuetext",
            "Average dimensions"
        );


        selectedIndex = -1;

        hoveredIndex = -1;

        hideTooltip();

        showAverage();

    });


    // ========================================
    // RESPONSIVE RESIZING
    // ========================================

    const resizeObserver = new ResizeObserver(() => {

        if (!portraits.length) return;


        hoveredIndex = -1;

        hideTooltip();

        renderChart();

    });


    resizeObserver.observe(chart);


    // ========================================
    // INITIALISE
    // ========================================

    loadData();

})();