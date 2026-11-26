document.addEventListener("DOMContentLoaded", () => {

    const sheetURL = G_SHEET_URL;
    const container = document.getElementById("palette-grid");

    // Create floating portrait preview
    const preview = document.createElement("img");
    preview.id = "portrait-preview";
    preview.alt = "";
    document.body.appendChild(preview);

    Papa.parse(sheetURL, {
        download: true,
        header: true,
        skipEmptyLines: true,
        transformHeader: header => header.trim().toLowerCase(),

        complete: function(results) {

            const data = results.data;

            container.innerHTML = data
                .filter(row => row.year && row.palette_web?.trim() && row.artist)
                .map(row => `
                    <div class="flex flex-col font-mono text-neutral-400">

                        <p class="paint_year text-xxxs font-mono text-neutral-400">${row.year}</p>  
                        <p class="paint_year text-xxxs"> ${row.artist}</p>

                        <img
                            class="paint_palette mt-2"
                            src="${row.palette_web.trim()}"
                            data-portrait="${row.img_web?.trim() || ''}"
                            alt="${row.year} colour palette"
                            loading="lazy"
                        >

                    </div>
                `).join("");

            // Hover interactions
            container.querySelectorAll(".paint_palette").forEach(palette => {

                palette.addEventListener("mouseenter", (e) => {

                    if (!palette.dataset.portrait) return;

                    preview.src = palette.dataset.portrait;
                    preview.style.display = "block";

                    movePreview(e);
                });

                palette.addEventListener("mousemove", movePreview);

                palette.addEventListener("mouseleave", () => {
                    preview.style.display = "none";
                });

            });
        },

        error: function(error) {
            console.error("Error loading Google Sheet:", error);
        }
    });

    // Make portrait follow cursor
    function movePreview(e) {

        const offset = 20;

        const width = preview.offsetWidth;
        const height = preview.offsetHeight;

        let x = e.clientX + offset;
        let y = e.clientY + offset;

        // Prevent portrait overflowing the right edge
        if (x + width > window.innerWidth - offset) {
            x = e.clientX - width - offset;
        }

        // Prevent portrait overflowing the bottom edge
        if (y + height > window.innerHeight - offset) {
            y = e.clientY - height - offset;
        }

        preview.style.left = `${Math.max(0, x)}px`;
        preview.style.top = `${Math.max(0, y)}px`;
    }

    // Hide when cursor leaves the browser viewport
    document.documentElement.addEventListener("mouseleave", () => {
        preview.style.display = "none";
    });

    window.addEventListener("blur", () => {
        preview.style.display = "none";
    });

});
