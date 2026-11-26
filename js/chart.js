(() => {

    // ========================================
    // CONFIGURATION
    // ========================================

const CONFIG = {

    jsonPath: "./data/palettes.json",

    inactiveOpacity: 0.1,

    activeOpacity: 1,

    tooltipOffsetX: 15,

    tooltipOffsetY: -45,

    debug: true

};


    // ========================================
    // ELEMENTS
    // ========================================

    const root = document.getElementById("archibald-colours");

    if (!root) {
        console.error("Archibald chart container not found.");
        return;
    }

    const chart = root.querySelector("#colour-chart");
    const markers = root.querySelector("#colour-markers");
    const controls = root.querySelector("#colour-controls");
    const info = root.querySelector("#colour-info");
    const comparison = root.querySelector("#colour-comparison");
    const buttons = root.querySelectorAll("[data-chart-mode]");
    const tooltip = root.querySelector("#colour-tooltip");


    // ========================================
    // STATE
    // ========================================

    let portraits = [];
    let years = [];
    let decades = [];
    let bars = [];
    let currentMode = "all";


    // ========================================
    // LOAD JSON
    // ========================================

    async function loadData() {

        try {

            const response = await fetch(CONFIG.jsonPath);

            if (!response.ok) {
                throw new Error(`HTTP error: ${response.status}`);
            }

            const data = await response.json();

            portraits = data.map(item => {

                const year = Number(
                    item.year ?? item.file?.match(/^\d{4}/)?.[0]
                );

                const colours = (item.colours ?? [])

                    .filter(colour =>
                        /^#[0-9a-f]{6}$/i.test(colour.hex) &&
                        Number.isFinite(Number(colour.percent)) &&
                        Number(colour.percent) > 0
                    )

                    .map(colour => ({
                        hex: colour.hex,
                        percent: Number(colour.percent)
                    }));

                return {

                    ...item,

                    year,

                    decade: Math.floor(year / 10) * 10,

                    colours

                };

            })

            .filter(item =>
                Number.isInteger(item.year) &&
                item.year > 0 &&
                item.colours.length > 0
            )

            .sort((a, b) => a.year - b.year);


            if (!portraits.length) {
                throw new Error("No valid portraits found.");
            }


            years = [...new Set(
                portraits.map(p => p.year)
            )];

            decades = [...new Set(
                portraits.map(p => p.decade)
            )];


            if (CONFIG.debug) {

                console.log("JSON successfully loaded.");

                console.log("Portraits:", portraits.length);

                console.log("Years:", years);

                console.log("Decades:", decades);

            }


            renderChart();

            renderMarkers();

            setMode("all");

            requestAnimationFrame(debugChart);


        } catch (error) {

            console.error("Unable to load chart:", error);

            info.textContent = "Unable to load colour data.";

        }

    }


    // ========================================
    // CREATE INDIVIDUAL YEAR BAR
    // ========================================

function createBar(portrait, interactive = true) {

    const bar = document.createElement("div");

    bar.className = "year-bar";

    bar.dataset.year = portrait.year;
    bar.dataset.decade = portrait.decade;


    // Dimensions
    bar.style.width = "100%";
    bar.style.height = "100%";
    bar.style.minWidth = "0";
    bar.style.display = "flex";
    bar.style.flexDirection = "column";


    const total = portrait.colours.reduce(
        (sum, colour) => sum + colour.percent,
        0
    );


    // Individual colour segments
    portrait.colours.forEach(colour => {

        const segment = document.createElement("div");

        segment.className = "colour-segment";

        segment.style.backgroundColor = colour.hex;

        segment.style.height =
            `${(colour.percent / total) * 100}%`;

        segment.style.width = "100%";

        segment.style.flexShrink = "0";

        segment.dataset.hex = colour.hex;

        segment.dataset.percent = colour.percent;


        // Prevent individual segments from
        // interfering with the parent hover
        segment.style.pointerEvents = "none";


        bar.appendChild(segment);

    });


    // Hover interactions
    if (interactive) {

        bar.tabIndex = 0;

        bar.setAttribute(
            "aria-label",
            `Colour palette for ${portrait.year}`
        );

        bar.addEventListener("pointerenter", event => {

            if (currentMode !== "all") return;

            highlightBar(bar);

            showTooltip(portrait.year, event);

        });


        bar.addEventListener("pointermove", event => {

            if (currentMode !== "all") return;

            moveTooltip(event);

        });


        bar.addEventListener("pointerleave", () => {

            if (currentMode !== "all") return;

            resetHover();

        });


        // Keyboard accessibility
        bar.addEventListener("focus", () => {

            if (currentMode !== "all") return;

            highlightBar(bar);

            const rect = bar.getBoundingClientRect();

            showTooltip(portrait.year, {
                clientX: rect.left + rect.width / 2,
                clientY: rect.top
            });

        });


        bar.addEventListener("blur", () => {

            if (currentMode !== "all") return;

            resetHover();

        });

    }

    return bar;

}


    // ========================================
    // RENDER MAIN CHART
    // ========================================

    function renderChart() {

        chart.replaceChildren();


        // Explicit grid layout - fixes zero-width bars
        chart.style.display = "grid";

        chart.style.width = "100%";

        chart.style.gridTemplateColumns =
            `repeat(${portraits.length}, minmax(0, 1fr))`;


        const fragment = document.createDocumentFragment();

        portraits.forEach(portrait => {

            fragment.appendChild(createBar(portrait));

        });


        chart.appendChild(fragment);

        bars = [...chart.children];

    }


    // ========================================
    // DECADE MARKERS
    // ========================================

    function renderMarkers() {

        markers.replaceChildren();

        markers.style.gridTemplateColumns =
            `repeat(${portraits.length}, minmax(0, 1fr))`;


        decades.forEach(decade => {

            const count = portraits.filter(
                p => p.decade === decade
            ).length;

            const marker = document.createElement("div");

            marker.className = "decade-marker";

            marker.style.gridColumn = `span ${count}`;

            marker.textContent = decade;

            markers.appendChild(marker);

        });

    }


    // ========================================
    // HIGHLIGHT BARS
    // ========================================

    function highlight(predicate) {

        bars.forEach((bar, index) => {

            bar.style.opacity = predicate(portraits[index])

                ? CONFIG.activeOpacity

                : CONFIG.inactiveOpacity;

        });

    }

    // ========================================
// HOVER HIGHLIGHT
// ========================================

function highlightBar(activeBar) {

    bars.forEach(bar => {

        bar.style.opacity = bar === activeBar

            ? CONFIG.activeOpacity

            : CONFIG.inactiveOpacity;

    });

}


// ========================================
// RESET HOVER
// ========================================

function resetHover() {

    highlight(() => true);

    hideTooltip();

}


// ========================================
// SHOW TOOLTIP
// ========================================

function showTooltip(year, event) {

    tooltip.textContent = year;

    tooltip.classList.remove("hidden");

    moveTooltip(event);

}


// ========================================
// MOVE TOOLTIP
// ========================================

function moveTooltip(event) {

    const x = event.clientX + CONFIG.tooltipOffsetX;

    const y = event.clientY + CONFIG.tooltipOffsetY;


    tooltip.style.left = `${Math.max(
        8,
        Math.min(x, window.innerWidth - tooltip.offsetWidth - 8)
    )}px`;

    tooltip.style.top = `${Math.max(
        8,
        Math.min(y, window.innerHeight - tooltip.offsetHeight - 8)
    )}px`;

}


// ========================================
// HIDE TOOLTIP
// ========================================

function hideTooltip() {

    tooltip.classList.add("hidden");

}


    // ========================================
    // CREATE DROPDOWN
    // ========================================

    function createSelect(values, selected, suffix = "") {

        const select = document.createElement("select");

        select.className = "chart-select";

        values.forEach(value => {

            const option = document.createElement("option");

            option.value = value;

            option.textContent = `${value}${suffix}`;

            select.appendChild(option);

        });

        select.value = selected;

        return select;

    }


    // ========================================
    // SET VIEWING MODE
    // ========================================

function setMode(mode) {

    currentMode = mode;

    hideTooltip();

    controls.replaceChildren();

    comparison.replaceChildren();

    comparison.hidden = true;


    buttons.forEach(button => {

        const active = button.dataset.chartMode === mode;

        button.classList.toggle("active", active);

        button.setAttribute("aria-pressed", String(active));

    });


    switch (mode) {

        case "all":

            highlight(() => true);

            info.textContent =
                `${portraits.length} portraits · ` +
                `${years[0]}–${years.at(-1)}`;

            break;


        case "decade":

            singleControl(decades, "decade");

            break;


        case "compare-years":

            compareControls(years, "year");

            break;


        case "compare-decades":

            compareControls(decades, "decade");

            break;

    }

}


    // ========================================
    // SINGLE YEAR / DECADE
    // ========================================

    function singleControl(values, property, selected) {

        const suffix = property === "decade" ? "s" : "";

        const select = createSelect(
            values,
            selected ?? values[0],
            suffix
        );

        select.setAttribute(
            "aria-label",
            `Select ${property}`
        );

        controls.appendChild(select);


        function update() {

            const value = Number(select.value);

            highlight(p => p[property] === value);

            info.textContent = `${value}${suffix}`;

        }

        select.addEventListener("change", update);

        update();

    }


    // ========================================
    // COMPARE YEARS / DECADES
    // ========================================

    function compareControls(values, property) {

        if (values.length < 2) {

            highlight(() => true);

            info.textContent =
                `At least two different ${property}s are required.`;

            return;

        }

        const suffix = property === "decade" ? "s" : "";

        const first = createSelect(
            values,
            values[0],
            suffix
        );

        const second = createSelect(
            values,
            values.at(-1),
            suffix
        );

        first.setAttribute("aria-label", `First ${property}`);

        second.setAttribute("aria-label", `Second ${property}`);

        const versus = document.createElement("span");

        versus.textContent = "VS";

        versus.className = "text-xs opacity-50";

        controls.append(first, versus, second);


        function update() {

            const a = Number(first.value);

            const b = Number(second.value);

            highlight(p =>
                p[property] === a ||
                p[property] === b
            );

            info.textContent =
                `${a}${suffix} vs ${b}${suffix}`;

            renderComparison(a, b, property);

        }

        first.addEventListener("change", update);

        second.addEventListener("change", update);

        update();

    }


    // ========================================
    // SIDE-BY-SIDE COMPARISON
    // ========================================

    function renderComparison(a, b, property) {

        comparison.replaceChildren();

        comparison.hidden = false;


        [a, b].forEach(value => {

            const group = portraits.filter(
                p => p[property] === value
            );

            const column = document.createElement("div");

            column.className = "min-w-0";


            // Heading
            const heading = document.createElement("h3");

            heading.className = "text-xl mb-3";

            heading.textContent = property === "decade"

                ? `${value}s`

                : value;


            // Comparison chart
            const groupChart = document.createElement("div");

            groupChart.className = "comparison-chart";

            groupChart.style.gridTemplateColumns =
                `repeat(${group.length}, minmax(0, 1fr))`;


            group.forEach(portrait => {

                groupChart.appendChild(
                    createBar(portrait, false)
                );

            });


            // Caption
            const caption = document.createElement("p");

            caption.className = "text-xs opacity-50 mt-2";

            caption.textContent =
                `${group.length} ${group.length === 1
                    ? "portrait"
                    : "portraits"}`;


            column.append(heading, groupChart, caption);

            comparison.appendChild(column);

        });

    }


    // ========================================
    // DEBUGGING
    // ========================================

    function debugChart() {

        if (!CONFIG.debug) return;

        console.group("ARCHIBALD — Chart diagnostics");


        const chartStyles = getComputedStyle(chart);

        console.log("Portraits loaded:", portraits.length);

        console.log("Bars generated:", bars.length);

        console.log("Colour segments:",
            chart.querySelectorAll(".colour-segment").length
        );

        console.log("Chart container:", {
            width: chart.getBoundingClientRect().width,
            height: chart.getBoundingClientRect().height,
            display: chartStyles.display,
            gridColumns: chartStyles.gridTemplateColumns
        });


        if (chart.getBoundingClientRect().width === 0) {

            console.warn(
                "Chart container has zero width. Check parent elements."
            );

        }


        if (chart.getBoundingClientRect().height === 0) {

            console.warn("Chart container has zero height.");

        }


        console.table(bars.map(bar => {

            const rect = bar.getBoundingClientRect();

            return {

                year: bar.dataset.year,

                width: rect.width.toFixed(2),

                height: rect.height.toFixed(2),

                colours: bar.children.length,

                opacity: getComputedStyle(bar).opacity,

                valid: rect.width > 0 && rect.height > 0

            };

        }));


        bars.forEach(bar => {

            const rect = bar.getBoundingClientRect();

            if (rect.width === 0) {

                console.warn(
                    `Bar ${bar.dataset.year} has ZERO WIDTH`
                );

            }

            if (rect.height === 0) {

                console.warn(
                    `Bar ${bar.dataset.year} has ZERO HEIGHT`
                );

            }

        });


        console.groupEnd();

    }


    // ========================================
    // EVENTS
    // ========================================

    buttons.forEach(button => {

        button.addEventListener("click", () => {

            if (!portraits.length) return;

            setMode(button.dataset.chartMode);

        });

    });


    // ========================================
    // INITIALISE
    // ========================================

    loadData();

})();