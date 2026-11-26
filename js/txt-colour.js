    document.addEventListener("DOMContentLoaded", () => {
      const colours = ["#1695E0", "#FBCE4F", "#FA622E", "#FBB8C5", "#15AF4B"];

      document.querySelectorAll(".multicolor").forEach((element) => {
        let previousColour = null;

        element.innerHTML = element.textContent
          .trim()
          .split("")
          .map((letter) => {
            if (/\s/.test(letter)) return letter;

            const availableColours = colours.filter((colour) => colour !== previousColour);

            const colour = availableColours[Math.floor(Math.random() * availableColours.length)];

            previousColour = colour;

            return `<span style="color: ${colour}">${letter}</span>`;
          })
          .join("");
      });
    });
  