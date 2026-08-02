/**
 * MANGAVERSE - Core Application Logic
 * Implements a lightweight vanilla JS SPA router and state-driven rendering.
 */

const API_ENDPOINT = 'https://www.sankavollerei.web.id/comic/mangakita/home';
const appRoot = document.getElementById('app-root');

// --- 1. STATE MANAGEMENT & ROUTING ---

const routes = {
    'home': renderHome,
    'favorite': renderPlaceholder.bind(null, 'Favorite', 'Your saved mangas will appear here.'),
    'genres': renderPlaceholder.bind(null, 'Genres', 'Explore manga by various categories.'),
    'developer': renderPlaceholder.bind(null, 'Developer', 'Mangaverse was built with modern web standards.')
};

function initApp() {
    window.addEventListener('hashchange', handleRouteChange);
    handleRouteChange(); // Trigger on initial load
}

function handleRouteChange() {
    let hash = window.location.hash.replace('#', '') || 'home';
    
    // Update Active Navigation State
    document.querySelectorAll('.nav-link').forEach(link => {
        if (link.dataset.path === hash) {
            link.classList.add('text-primary');
            link.classList.remove('text-gray-400');
        } else {
            link.classList.remove('text-primary');
            link.classList.add('text-gray-400');
        }
    });

    const routeAction = routes[hash] || routes['home'];
    routeAction();
}

// --- 2. DATA FETCHING ---

async function fetchMangaData() {
    try {
        const response = await fetch(API_ENDPOINT);
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Failed to fetch manga data:', error);
        return null;
    }
}

// --- 3. UI RENDERING MODULES ---

async function renderHome() {
    // Show Loading State
    appRoot.innerHTML = `
        <div class="flex justify-center items-center h-64" aria-label="Loading content">
            <svg class="animate-spin h-8 w-8 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
        </div>
    `;

    const data = await fetchMangaData();

    if (!data || !data.success) {
        appRoot.innerHTML = `
            <div class="text-center text-red-400 py-20 bg-surface rounded-xl border border-red-500/20">
                <svg class="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                <h2 class="text-xl font-semibold">Gagal memuat data</h2>
                <p class="text-sm mt-2 text-gray-400">Silakan periksa koneksi internet Anda atau coba lagi nanti.</p>
                <button onclick="renderHome()" class="mt-4 px-4 py-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors">Coba Lagi</button>
            </div>
        `;
        return;
    }

    // Build the UI
    const html = `
        <div class="space-y-12">
            ${buildPopularSection(data.popularToday)}
            ${buildLatestUpdatesSection(data.latestReleases)}
        </div>
    `;
    
    appRoot.innerHTML = html;
}

// Sub-component: Popular Today (Horizontal Scroll / Grid)
function buildPopularSection(items) {
    if (!items || items.length === 0) return '';
    
    const cards = items.slice(0, 10).map(item => `
        <div class="flex-none w-36 sm:w-44 group cursor-pointer" onclick="window.open('${item.link}', '_blank')">
            <div class="relative aspect-[3/4] rounded-lg overflow-hidden bg-surface shadow-lg mb-3">
                <img src="${item.image}" alt="Cover ${item.title}" loading="lazy" 
                     class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                     onerror="this.src='https://via.placeholder.com/300x400?text=No+Image'">
                <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-2">
                    <span class="text-xs font-semibold text-primary">Ch. ${item.latestChapter || '?'}</span>
                </div>
            </div>
            <h3 class="text-sm font-semibold text-gray-200 line-clamp-2 leading-snug group-hover:text-primary transition-colors" title="${item.title}">${item.title}</h3>
        </div>
    `).join('');

    return `
        <section aria-labelledby="popular-heading">
            <div class="flex items-center justify-between mb-4">
                <h2 id="popular-heading" class="text-2xl font-bold flex items-center gap-2">
                    <svg class="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                    Popular Today
                </h2>
            </div>
            <div class="flex overflow-x-auto gap-4 pb-4 hide-scrollbar">
                ${cards}
            </div>
        </section>
    `;
}

// Sub-component: Latest Releases (Grid Layout)
function buildLatestUpdatesSection(items) {
    if (!items || items.length === 0) return '';

    const cards = items.map(item => {
        // Render up to 2 latest chapters safely
        const chaptersHtml = (item.chapters || []).slice(0, 2).map(ch => `
            <span class="text-xs bg-darker text-gray-400 px-2 py-1 rounded border border-surface hover:border-primary hover:text-white transition-colors cursor-pointer block truncate">
                ${ch.slug ? ch.slug.replace('-', ' ').toUpperCase() : 'Latest'}
            </span>
        `).join('');

        return `
            <article class="flex gap-4 p-3 rounded-xl bg-surface border border-gray-800 hover:border-primary/50 transition-colors group">
                <div class="w-24 shrink-0 aspect-[3/4] rounded-md overflow-hidden bg-darker">
                    <img src="${item.image}" alt="Cover ${item.title}" loading="lazy" 
                         class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                         onerror="this.src='https://via.placeholder.com/300x400?text=No+Image'">
                </div>
                <div class="flex flex-col justify-between flex-grow min-w-0">
                    <div>
                        <h3 class="text-sm sm:text-base font-semibold text-gray-100 line-clamp-2 leading-snug mb-2 group-hover:text-primary transition-colors cursor-pointer" onclick="window.open('${item.link}', '_blank')" title="${item.title}">
                            ${item.title}
                        </h3>
                    </div>
                    <div class="space-y-2 mt-auto">
                        ${chaptersHtml}
                    </div>
                </div>
            </article>
        `;
    }).join('');

    return `
        <section aria-labelledby="latest-heading">
            <div class="flex items-center gap-2 mb-6">
                <svg class="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                <h2 id="latest-heading" class="text-2xl font-bold">Latest Releases</h2>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                ${cards}
            </div>
        </section>
    `;
}

// Sub-component: Placeholder pages (Genres, Favorite, Developer)
function renderPlaceholder(title, message) {
    appRoot.innerHTML = `
        <div class="flex flex-col items-center justify-center min-h-[50vh] text-center">
            <div class="bg-surface p-4 rounded-full mb-4 border border-gray-800">
                <svg class="w-10 h-10 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg>
            </div>
            <h1 class="text-3xl font-bold text-white mb-2">${title}</h1>
            <p class="text-gray-400">${message}</p>
            <p class="text-sm text-primary mt-4">Feature coming soon.</p>
        </div>
    `;
}

// Bootstrap Application
document.addEventListener('DOMContentLoaded', initApp);
