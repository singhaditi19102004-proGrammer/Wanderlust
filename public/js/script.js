(() => {
    'use strict'

    // --- 1. BOOTSTRAP FORM VALIDATION ---
    // Fetch all the forms we want to apply custom Bootstrap validation styles to
    const forms = document.querySelectorAll('.needs-validation');

    // Loop over them and prevent submission if invalid
    Array.from(forms).forEach(form => {
        form.addEventListener('submit', event => {
            if (!form.checkValidity()) {
                event.preventDefault();
                event.stopPropagation();
            }

            form.classList.add('was-validated');
        }, false);
    });

    // --- 2. DARK/LIGHT MODE THEME TOGGLE ---
    const htmlElement = document.documentElement;
    const themeToggle = document.getElementById('darkModeToggle');

    // Check if a toggle exists on the current page (prevents errors)
    if (themeToggle) {
        // A. Load saved theme from LocalStorage
        const savedTheme = localStorage.getItem('theme') || 'light';
        htmlElement.setAttribute('data-bs-theme', savedTheme);
        themeToggle.checked = (savedTheme === 'dark');

        // B. Listen for toggle switch clicks
        themeToggle.addEventListener('change', () => {
            if (themeToggle.checked) {
                htmlElement.setAttribute('data-bs-theme', 'dark');
                localStorage.setItem('theme', 'dark');
            } else {
                htmlElement.setAttribute('data-bs-theme', 'light');
                localStorage.setItem('theme', 'light');
            }
        });
    }
})();



const searchInput = document.getElementById('search-input');
const suggestionsBox = document.getElementById('suggestions-box');

if (searchInput) {
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        suggestionsBox.innerHTML = ''; // Clear old suggestions

        if (query.length > 0) {
            // Get all titles from the listing cards on the page
            const cards = document.querySelectorAll('.listing-card');
            let matches = [];

            cards.forEach(card => {
                const title = card.querySelector('.card-body b').innerText;
                const location = card.querySelector('.card-body').innerText.split('\n')[1]; // Basic location grab
                
                if (title.toLowerCase().includes(query) || (location && location.toLowerCase().includes(query))) {
                    matches.push(title);
                }
            });

            // Remove duplicates and show up to 5 suggestions
            const uniqueMatches = [...new Set(matches)].slice(0, 5);

            if (uniqueMatches.length > 0) {
                suggestionsBox.style.display = 'block';
                uniqueMatches.forEach(match => {
                    const item = document.createElement('a');
                    item.classList.add('list-group-item', 'list-group-item-action');
                    item.style.cursor = 'pointer';
                    item.innerText = match;
                    item.onclick = () => {
                        searchInput.value = match;
                        suggestionsBox.style.display = 'none';
                        searchInput.form.submit(); // Automatically search on click
                    };
                    suggestionsBox.appendChild(item);
                });
            } else {
                suggestionsBox.style.display = 'none';
            }
        } else {
            suggestionsBox.style.display = 'none';
        }
    });

    // Close suggestions if user clicks elsewhere
    document.addEventListener('click', (e) => {
        if (e.target !== searchInput) suggestionsBox.style.display = 'none';
    });
}

// public/js/script.js

window.addEventListener('DOMContentLoaded', () => {
    // 1. Get the search query from the URL (e.g., ?q=manali)
    const urlParams = new URLSearchParams(window.location.search);
    const searchQuery = urlParams.get('q');

    if (searchQuery) {
        const query = searchQuery.toLowerCase();
        
        // 2. Find the first card that matches the title
        const cards = document.querySelectorAll('.listing-card');
        let targetCard = null;

        for (let card of cards) {
            if (card.getAttribute('data-title').includes(query)) {
                targetCard = card;
                break; // Stop at the first match
            }
        }

        // 3. Smoothly scroll to that card
        if (targetCard) {
            targetCard.scrollIntoView({
                behavior: 'smooth',
                block: 'center' // Puts the card in the middle of the screen
            });

            // Optional: Add a brief highlight effect
            targetCard.style.transition = "transform 0.3s ease";
            targetCard.style.transform = "scale(1.05)";
            setTimeout(() => {
                targetCard.style.transform = "scale(1)";
            }, 1000);
        }
    }
});