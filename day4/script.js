```javascript
const noteText = document.getElementById("note-text");
const charCount = document.getElementById("char-count");
const wordCount = document.getElementById("word-count");
const clearBtn = document.getElementById("clear-btn");
const themeToggle = document.getElementById("theme-toggle");

const DRAFT_KEY = "day4-note-draft";
const THEME_KEY = "day4-theme";

function updateCounts() {
    const text = noteText.value;
    const characters = text.length;
    const trimmedText = text.trim();

    let words = 0;

    if (trimmedText !== "") {
        words = trimmedText.split(/\s+/).length;
    }

    charCount.textContent = characters + " / 200 characters";
    wordCount.textContent = words + " words";

    charCount.classList.remove("warning", "over");

    if (characters > 200) {
        charCount.classList.add("over");
    } else if (characters > 180) {
        charCount.classList.add("warning");
    }
}

function clearNote() {
    noteText.value = "";
    localStorage.removeItem(DRAFT_KEY);
    updateCounts();
}

function applyTheme(isDark) {
    document.body.classList.toggle("dark", isDark);

    themeToggle.textContent = isDark ? "Light mode" : "Dark mode";
}

// Restore saved note
const savedDraft = localStorage.getItem(DRAFT_KEY);

if (savedDraft !== null) {
    noteText.value = savedDraft;
}

// Restore saved theme
const savedTheme = localStorage.getItem(THEME_KEY);
applyTheme(savedTheme === "dark");

// Update counters when typing
noteText.addEventListener("input", function () {
    updateCounts();
    localStorage.setItem(DRAFT_KEY, noteText.value);
});

// Clear button
clearBtn.addEventListener("click", clearNote);

// Escape key
noteText.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
        clearNote();
    }
});

// Theme toggle
themeToggle.addEventListener("click", function () {
    const isDark = !document.body.classList.contains("dark");

    applyTheme(isDark);
    localStorage.setItem(THEME_KEY, isDark ? "dark" : "light");
});

// Initial counter update
updateCounts();
```
