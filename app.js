/**
 * MANGAVERSE - Core SPA Script
 * Integrated Features: Search Recommendation, Real Genres Explorer, & LocalStorage Favorites
 */

const BASE_API = 'https://www.sankavollerei.web.id/comic/bacakomik';
const appRoot = document.getElementById('app-root');
const contextBar = document.getElementById('top-nav-context');

// --- LOCAL STORAGE FAVORITE SYSTEM ---
const FavManager = {
    getAll() {
        try {
            return JSON.parse(localStorage.getItem('mangaverse_favs')) || [];
        } catch {
            return [];
        }
    },
    toggle(comic) {
        let favs = this.getAll();
        const exists = favs.findIndex(item => item.slug === comic.slug);
        if (exists > -1) {
            favs.splice(exists, 1);
        } else {
            favs.push({
                title: comic.title,
                slug: comic.slug,
                cover: comic.cover,
                rating: comic.rating || 'N/A',
                type: comic.type || 'manga'
            });
        }
        localStorage.setItem('mangaverse_favs', JSON.stringify(favs));
        return exists === -1; // returns true if added, false if removed
    },
    isFav(slug) {
        return this.getAll().some(item => item.slug === slug);
    }
};

// Proxy Fallback Utilitas CORS aman untuk client-side fetch
async function safeFetch(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error();
        return await response.json();
    } catch (e) {
        const proxyResponse = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`);
        if (!proxyResponse.ok) throw new Error();
        const jsonWrapper = await proxyResponse.json();
        return JSON.parse(jsonWrapper.contents);
    }
}

// Global click handler untuk tombol favorit agar tidak memicu navigasi detail card
window.handleFavClick = function(e, slug, title, cover, rating, type) {
    e.stopPropagation();
    e.preventDefault();
    const isAdded = FavManager.toggle({ slug, title, cover, rating, type });
    
    // Update semua icon dengan slug yang sama di layar saat ini
    document.querySelectorAll(`.fav-btn-${slug}`).forEach(btn => {
        if (isAdded) {
            btn.innerHTML = `<svg class="w-4 h-4 text-primary fill-current" viewBox="0 0 24 24"><path stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>`;
        } else {
            btn.innerHTML = `<svg class="w-4 h-4 text-gray-400 group-hover:text-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>`;
        }
    });

    // Jika sedang di page favorit dan menghapus item, render ulang pagenya
    if (window.location.hash === '#favorite' && !isAdded) {
        renderFavoritePage();
    }
};

// --- 1. ROUTER IMPLEMENTATION ---

function initApp() {
    window.addEventListener('hashchange', handleRouting);
    handleRouting();
}

function handleRouting() {
    const hash = window.location.hash || '#home';
    contextBar.textContent = ''; 
    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (hash.startsWith('#detail/')) {
        const slug = hash.replace('#detail/', '');
        renderDetailManga(slug);
        setActiveNav('');
    } else if (hash.startsWith('#chapter/')) {
        const fullParams = hash.replace('#chapter/', '');
        const firstSlashIndex = fullParams.indexOf('/');
        
        if (firstSlashIndex !== -1) {
            const comicSlug = fullParams.substring(0, firstSlashIndex);
            const chapterSlug = fullParams.substring(firstSlashIndex + 1);
            renderChapterReader(comicSlug, chapterSlug);
        }
        setActiveNav('');
    } else {
        const mainPath = hash.replace('#', '');
        setActiveNav(mainPath);
        
        switch(mainPath) {
            case 'home': renderHome(); break;
            case 'search': renderSearchPage(); break;
            case 'favorite': renderFavoritePage(); break;
            case 'genres': renderGenresPage(); break;
            case 'developer': renderPlaceholder('Developer Profile', 'Situs ini dikembangkan secara modular berbasis performa tinggi.'); break;
            default: renderHome();
        }
    }
}

function setActiveNav(path) {
    document.querySelectorAll('.nav-btn').forEach(btn => {
        if (btn.dataset.path === path) {
            btn.classList.add('text-primary');
            btn.classList.remove('text-gray-400');
        } else {
            btn.classList.remove('text-primary');
            btn.classList.add('text-gray-400');
        }
    });
}

// --- 2. RENDERING UTILITIES ---

function showLoader() {
    appRoot.innerHTML = `
        <div class="flex flex-col items-center justify-center h-80">
            <svg class="animate-spin h-7 w-7 text-primary mb-3" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span class="text-xs text-gray-500 tracking-widest uppercase">Syncing Database...</span>
        </div>
    `;
}

function renderError(retryCallback) {
    appRoot.innerHTML = `
        <div class="text-center py-16 px-4 bg-surface rounded-2xl border border-red-500/10">
            <h2 class="text-lg font-semibold text-gray-300">Gagal Sinkronisasi Data</h2>
            <p class="text-xs text-gray-500 mt-1 max-w-xs mx-auto">Silakan periksa koneksi internet Anda atau coba muat ulang halaman.</p>
            <button id="retry-btn" class="mt-4 px-4 py-2 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-secondary transition-colors">
                Coba Muat Ulang
            </button>
        </div>
    `;
    document.getElementById('retry-btn')?.addEventListener('click', retryCallback);
}

function getFavIconHTML(slug, title, cover, rating, type) {
    const isFav = FavManager.isFav(slug);
    const titleEscaped = encodeURIComponent(title);
    const coverEscaped = encodeURIComponent(cover);
    return `
        <button onclick="handleFavClick(event, '${slug}', decodeURIComponent('${titleEscaped}'), decodeURIComponent('${coverEscaped}'), '${rating}', '${type}')" 
                class="fav-btn-${slug} absolute top-1.5 right-1.5 z-20 bg-darker/70 backdrop-blur-md p-1.5 rounded-lg border border-surface group shadow-md active:scale-90 transition-transform">
            ${isFav ? 
                `<svg class="w-4 h-4 text-primary fill-current" viewBox="0 0 24 24"><path stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>` : 
                `<svg class="w-4 h-4 text-gray-400 group-hover:text-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>`
            }
        </button>
    `;
}

// --- 3. HOME VIEW ---

async function renderHome() {
    showLoader();
    try {
        const [resTop, resPopuler, resLatest] = await Promise.all([
            safeFetch(`${BASE_API}/top`),
            safeFetch(`${BASE_API}/populer`),
            safeFetch(`${BASE_API}/latest`)
        ]);

        if (!resTop.success || !resPopuler.success || !resLatest.success) throw new Error();

        appRoot.innerHTML = `
            <div class="space-y-8 animate-fade-in">
                ${buildTopPremiumSection(resTop.komikList)}
                ${buildPopularCarousel(resPopuler.komikList)}
                ${buildLatestGrid(resLatest.komikList)}
            </div>
        `;
    } catch (e) {
        renderError(renderHome);
    }
}

function buildTopPremiumSection(items) {
    if (!items || items.length === 0) return '';
    return `
        <section>
            <div class="flex items-center justify-between mb-3">
                <h2 class="text-xs font-bold tracking-widest uppercase text-gray-400 flex items-center gap-1.5">
                    <span class="w-1.5 h-3.5 bg-secondary rounded-full"></span> Top Highlights 🚀
                </h2>
                <span class="text-[10px] bg-secondary/10 text-secondary font-bold px-2 py-0.5 rounded-full border border-secondary/20 animate-pulse">MUST READ</span>
            </div>
            <div class="flex overflow-x-auto gap-4 pb-3 hide-scrollbar snap-x snap-mandatory">
                ${items.map((item, idx) => `
                    <div class="flex-none w-[270px] sm:w-[310px] bg-gradient-to-br from-surface to-dark border border-gray-900 rounded-2xl p-3 flex gap-3 snap-start shadow-xl cursor-pointer hover:border-primary/40 transition-all group relative"
                         onclick="window.location.hash='#detail/${item.slug}'">
                        <div class="w-20 aspect-[3/4] rounded-xl overflow-hidden bg-darker shrink-0 relative shadow-md">
                            <img src="${item.cover}" alt="${item.title}" class="w-full h-full object-cover group-hover:scale-105 transition-all duration-300">
                            <div class="absolute top-0 left-0 bg-secondary text-white font-black text-[11px] px-2 py-0.5 rounded-br-lg shadow">#${idx + 1}</div>
                        </div>
                        <div class="flex flex-col justify-between py-1 min-w-0 flex-grow pr-6">
                            <div>
                                <h3 class="text-xs font-bold text-gray-100 line-clamp-2 leading-snug group-hover:text-primary transition-colors">${item.title}</h3>
                                <p class="text-[10px] text-gray-500 mt-1">Global Recommendation</p>
                            </div>
                            <div class="flex items-center gap-1 text-[11px] font-bold text-yellow-500">
                                <svg class="w-3.5 h-3.5 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>
                                <span>${item.rating || '8.5'} Rating</span>
                            </div>
                        </div>
                        ${getFavIconHTML(item.slug, item.title, item.cover, item.rating, item.type)}
                    </div>
                `).join('')}
            </div>
        </section>
    `;
}

function buildPopularCarousel(items) {
    if (!items || items.length === 0) return '';
    return `
        <section>
            <h2 class="text-xs font-bold tracking-widest uppercase text-gray-400 mb-3 flex items-center gap-1.5">
                <span class="w-1.5 h-3.5 bg-primary rounded-full"></span> Terpopuler Hari Ini
            </h2>
            <div class="flex overflow-x-auto gap-3 pb-2 hide-scrollbar">
                ${items.map(item => `
                    <div class="flex-none w-28 sm:w-32 group cursor-pointer relative" onclick="window.location.hash='#detail/${item.slug}'">
                        <div class="relative aspect-[3/4] rounded-xl overflow-hidden bg-surface mb-2 border border-gray-900 shadow-md">
                            <img src="${item.cover}" alt="${item.title}" loading="lazy" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300">
                            <div class="absolute top-1 left-1 bg-primary/90 text-[8px] font-bold text-white px-1 rounded uppercase tracking-wide z-10">${item.type || 'Manga'}</div>
                            ${item.rating ? `
                                <div class="absolute bottom-1 right-1 bg-darker/90 text-[9px] font-bold text-yellow-500 px-1 py-0.5 rounded border border-surface flex items-center gap-0.5 z-10">
                                    <svg class="w-2.5 h-2.5 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>
                                    <span>${item.rating}</span>
                                </div>
                            ` : ''}
                        </div>
                        <h3 class="text-[11px] font-semibold text-gray-300 line-clamp-2 leading-tight group-hover:text-primary transition-colors pr-2">${item.title}</h3>
                        ${getFavIconHTML(item.slug, item.title, item.cover, item.rating, item.type)}
                    </div>
                `).join('')}
            </div>
        </section>
    `;
}

function buildLatestGrid(items) {
    if (!items || items.length === 0) return '';
    return `
        <section>
            <h2 class="text-xs font-bold tracking-widest uppercase text-gray-400 mb-4 flex items-center gap-1.5">
                <span class="w-1.5 h-3.5 bg-primary rounded-full"></span> Rilis Terbaru
            </h2>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                ${items.map(item => {
                    const cleanChapterSlug = item.slug ? `${item.slug}-chapter-${item.chapter?.toLowerCase().replace('ch.', '').trim()}` : '';
                    return `
                    <article class="flex gap-3 p-2.5 rounded-xl bg-surface border border-gray-900 hover:border-primary/30 transition-all relative">
                        <div class="w-16 aspect-[3/4] rounded-lg overflow-hidden bg-darker shrink-0 cursor-pointer" onclick="window.location.hash='#detail/${item.slug}'">
                            <img src="${item.cover}" alt="${item.title}" loading="lazy" class="w-full h-full object-cover">
                        </div>
                        <div class="flex flex-col justify-between min-w-0 flex-grow pr-8">
                            <div>
                                <h3 class="text-xs font-bold text-gray-200 line-clamp-2 leading-snug cursor-pointer hover:text-primary transition-colors" onclick="window.location.hash='#detail/${item.slug}'">
                                    ${item.title}
                                </h3>
                                <span class="text-[9px] text-gray-500 uppercase tracking-wider font-semibold">${item.type || 'manga'}</span>
                            </div>
                            <div class="mt-2">
                                <a href="#chapter/${item.slug}/${cleanChapterSlug}" class="inline-block text-[10px] bg-darker text-primary font-bold py-1 px-3 rounded border border-gray-800 text-center hover:border-primary transition-colors">
                                    ${item.chapter || 'Baca'}
                                </a>
                            </div>
                        </div>
                        ${getFavIconHTML(item.slug, item.title, item.cover, item.rating, item.type)}
                    </article>
                `}).join('')}
            </div>
        </section>
    `;
}

// --- 4. SEARCH & RECOMMENDATION VIEW ---

async function renderSearchPage() {
    appRoot.innerHTML = `
        <div class="space-y-6 animate-fade-in">
            <div>
                <h1 class="text-sm font-bold tracking-widest uppercase text-gray-400 mb-2">Pencarian Komik</h1>
                <div class="flex gap-2">
                    <input type="text" id="search-input" placeholder="Masukkan judul komik..." 
                           class="w-full bg-surface border border-gray-800 rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-primary text-gray-200 placeholder-gray-600 transition-all">
                    <button id="search-submit-btn" class="bg-primary text-white text-xs font-bold px-5 py-3 rounded-xl hover:bg-secondary transition-all active:scale-95">
                        Cari
                    </button>
                </div>
            </div>
            
            <!-- Dynamic Content Area (Results OR Recommendations) -->
            <div id="search-content-area" class="space-y-4">
                <div class="flex items-center gap-1.5 mb-2">
                     <span class="w-1.5 h-3.5 bg-primary rounded-full"></span>
                     <h2 id="search-area-title" class="text-xs font-bold tracking-widest uppercase text-gray-400">Rekomendasi Pilihan</h2>
                </div>
                <div id="search-results" class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                     <!-- Populated dynamically -->
                </div>
            </div>
        </div>
    `;

    const searchInput = document.getElementById('search-input');
    const searchSubmitBtn = document.getElementById('search-submit-btn');
    const resultsContainer = document.getElementById('search-results');
    const areaTitle = document.getElementById('search-area-title');

    // Load initial recommended layer
    async function loadRecommendations() {
        resultsContainer.innerHTML = `
            <div class="col-span-full py-6 text-center text-xs text-gray-600 flex justify-center items-center gap-2">
                <svg class="animate-spin h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                <span>Loading Editor Choices...</span>
            </div>`;
        try {
            const data = await safeFetch(`${BASE_API}/recomen`);
            if (data && data.success && data.komikList) {
                areaTitle.textContent = "Rekomendasi Pilihan 🔥";
                renderComicListGrid(data.komikList);
            }
        } catch {
            resultsContainer.innerHTML = `<div class="col-span-full py-6 text-center text-xs text-gray-600">Gagal memuat rekomendasi.</div>`;
        }
    }

    function renderComicListGrid(list) {
        resultsContainer.innerHTML = list.map(item => `
            <article class="flex gap-3 p-2.5 rounded-xl bg-surface border border-gray-900 hover:border-primary/30 transition-all cursor-pointer shadow-md relative animate-fade-in"
                     onclick="window.location.hash='#detail/${item.slug}'">
                <div class="w-16 aspect-[3/4] rounded-lg overflow-hidden bg-darker shrink-0">
                    <img src="${item.cover}" alt="${item.title}" class="w-full h-full object-cover">
                </div>
                <div class="flex flex-col justify-between min-w-0 flex-grow py-0.5 pr-8">
                    <div>
                        <h3 class="text-xs font-bold text-gray-200 line-clamp-2 leading-snug group-hover:text-primary">${item.title}</h3>
                        <p class="text-[9px] text-gray-500 truncate mt-0.5">${item.genre || item.type || 'Manga'}</p>
                    </div>
                    <div class="flex items-center gap-1 text-[10px] text-yellow-500 font-bold">
                        <svg class="w-3 h-3 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>
                        <span>${item.rating || '7.0'}</span>
                    </div>
                </div>
                ${getFavIconHTML(item.slug, item.title, item.cover, item.rating, item.type)}
            </article>
        `).join('');
    }

    const executeSearch = async () => {
        const query = searchInput.value.trim();
        if (!query) {
            loadRecommendations();
            return;
        }

        resultsContainer.innerHTML = `
            <div class="col-span-full flex flex-col items-center justify-center py-12">
                <svg class="animate-spin h-5 w-5 text-primary mb-2" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                <span class="text-[10px] text-gray-500 uppercase tracking-widest">Mencari '${query}'...</span>
            </div>
        `;

        try {
            const data = await safeFetch(`${BASE_API}/search/${encodeURIComponent(query)}`);
            if (!data || !data.success || !data.komikList || data.komikList.length === 0) {
                areaTitle.textContent = "Hasil Pencarian";
                resultsContainer.innerHTML = `<div class="col-span-full py-12 text-center text-xs text-gray-500">Komik tidak ditemukan. Gunakan keyword lain.</div>`;
                return;
            }
            areaTitle.textContent = `Hasil Pencarian: "${query}" 🔍`;
            renderComicListGrid(data.komikList);
        } catch {
            resultsContainer.innerHTML = `<div class="col-span-full py-12 text-center text-xs text-red-500">Terjadi kesalahan sinkronisasi data.</div>`;
        }
    };

    // Trigger initial state
    loadRecommendations();

    searchSubmitBtn.addEventListener('click', executeSearch);
    searchInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') executeSearch(); });
}

// --- 5. REAL FAVORITE PAGE VIEW (LOCAL STORAGE) ---

function renderFavoritePage() {
    const favs = FavManager.getAll();
    
    if (favs.length === 0) {
        appRoot.innerHTML = `
            <div class="flex flex-col items-center justify-center min-h-[50vh] text-center p-4 animate-fade-in">
                <div class="w-16 h-16 bg-surface rounded-full flex items-center justify-center text-gray-600 mb-3 border border-gray-900">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>
                </div>
                <h1 class="text-sm font-bold tracking-wider text-gray-300">Daftar Favorit Kosong</h1>
                <p class="text-[11px] text-gray-600 max-w-xs mt-1">Ketuk ikon bookmark di poster komik mana pun untuk menyimpannya di sini.</p>
            </div>
        `;
        return;
    }

    appRoot.innerHTML = `
        <div class="space-y-4 animate-fade-in">
            <h1 class="text-sm font-bold tracking-widest uppercase text-gray-400 flex items-center gap-1.5 mb-2">
                <span class="w-1.5 h-3.5 bg-primary rounded-full"></span> Koleksi Saya (${favs.length})
            </h1>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                ${favs.map(item => `
                    <article class="flex gap-3 p-2.5 rounded-xl bg-surface border border-gray-900 hover:border-primary/30 transition-all cursor-pointer shadow-md relative"
                             onclick="window.location.hash='#detail/${item.slug}'">
                        <div class="w-16 aspect-[3/4] rounded-lg overflow-hidden bg-darker shrink-0">
                            <img src="${item.cover}" alt="${item.title}" class="w-full h-full object-cover">
                        </div>
                        <div class="flex flex-col justify-between min-w-0 flex-grow py-0.5 pr-8">
                            <div>
                                <h3 class="text-xs font-bold text-gray-200 line-clamp-2 leading-snug">${item.title}</h3>
                                <span class="text-[9px] bg-dark px-1.5 py-0.5 rounded border border-gray-800 text-gray-500 uppercase font-semibold mt-1 inline-block">${item.type || 'manga'}</span>
                            </div>
                            <div class="flex items-center gap-1 text-[10px] text-yellow-500 font-bold">
                                <svg class="w-3 h-3 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>
                                <span>${item.rating}</span>
                            </div>
                        </div>
                        ${getFavIconHTML(item.slug, item.title, item.cover, item.rating, item.type)}
                    </article>
                `).join('')}
            </div>
        </div>
    `;
}

// --- 6. REAL GENRES EXPLORER VIEW ---

async function renderGenresPage() {
    showLoader();
    try {
        const data = await safeFetch(`${BASE_API}/genres`);
        if (!data || !data.success || !data.genres) throw new Error();

        appRoot.innerHTML = `
            <div class="space-y-4 animate-fade-in">
                <div class="mb-2">
                    <h1 class="text-sm font-bold tracking-widest uppercase text-gray-400 flex items-center gap-1.5">
                        <span class="w-1.5 h-3.5 bg-primary rounded-full"></span> Explore Genres
                    </h1>
                    <p class="text-[11px] text-gray-600 mt-0.5">Temukan komik spesifik berdasarkan kategori klasifikasi cerita.</p>
                </div>
                
                <div class="flex flex-wrap gap-2 p-4 bg-surface rounded-2xl border border-gray-900 shadow-inner">
                    ${data.genres.map(genre => {
                        // Kapsulkan fungsi pencarian saat tag diklik
                        const clickQuery = encodeURIComponent(genre.title);
                        return `
                            <button onclick="window.location.hash='#search'; setTimeout(() => {
                                const input = document.getElementById('search-input');
                                if(input) { input.value = decodeURIComponent('${clickQuery}'); document.getElementById('search-submit-btn').click(); }
                            }, 50);" 
                            class="text-[11px] font-semibold bg-dark border border-gray-800 hover:border-primary/50 text-gray-300 hover:text-primary px-3 py-2 rounded-xl active:scale-95 transition-all">
                                ${genre.title}
                            </button>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    } catch (e) {
        renderError(renderGenresPage);
    }
}

// --- 7. DETAIL MANGA VIEW ---

async function renderDetailManga(slug) {
    showLoader();
    try {
        const data = await safeFetch(`${BASE_API}/detail/${slug}`);
        if (!data || !data.success || !data.detail) throw new Error();
        
        const manga = data.detail;
        contextBar.textContent = ''; 

        const validChapters = (manga.chapters || []).filter(ch => ch.slug);

        appRoot.innerHTML = `
            <div class="space-y-6 animate-fade-in">
                <div class="p-4 rounded-2xl bg-surface border border-gray-900 flex flex-col sm:flex-row gap-4 relative">
                    <div class="w-32 aspect-[3/4] mx-auto sm:mx-0 rounded-xl overflow-hidden bg-dark shrink-0 shadow-lg relative">
                        <img src="${manga.cover}" alt="${manga.title}" class="w-full h-full object-cover">
                    </div>
                    <div class="flex flex-col justify-between space-y-3 flex-grow text-center sm:text-left pr-0 sm:pr-8">
                        <div>
                            <h1 class="text-base sm:text-lg font-bold text-white leading-tight">${manga.title}</h1>
                            <p class="text-[11px] text-gray-500 italic mt-0.5 line-clamp-1">${manga.otherTitle || '-'}</p>
                            <div class="flex items-center justify-center sm:justify-start gap-1 mt-1.5 text-primary text-xs font-bold">
                                <svg class="w-3.5 h-3.5 fill-current text-yellow-500" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>
                                <span>${manga.rating || 'N/A'}</span>
                                <span class="mx-1 text-gray-700">|</span>
                                <span class="text-gray-400 font-normal">${manga.type || 'Manga'}</span>
                                <span class="mx-1 text-gray-700">|</span>
                                <span class="text-gray-400 font-normal">${manga.status || 'Ongoing'}</span>
                            </div>
                        </div>
                        <div class="text-[11px] text-gray-400 space-y-0.5">
                            <div><span class="text-gray-600">Author:</span> ${manga.author || '-'}</div>
                            <div><span class="text-gray-600">Released:</span> ${manga.release || '-'}</div>
                            <div><span class="text-gray-600">Views:</span> ${manga.reader || '-'}</div>
                        </div>
                        <div class="flex flex-wrap justify-center sm:justify-start gap-1">
                            ${(manga.genres || []).map(g => `<span class="text-[10px] bg-dark px-2 py-0.5 rounded-md border border-gray-800 text-gray-400">${g.title}</span>`).join('')}
                        </div>
                    </div>
                    ${getFavIconHTML(slug, manga.title, manga.cover, manga.rating, manga.type)}
                </div>

                <div class="p-4 rounded-2xl bg-surface border border-gray-900">
                    <h2 class="text-xs font-bold tracking-widest text-gray-400 uppercase mb-2">Sinopsis</h2>
                    <p class="text-xs text-gray-400 leading-relaxed text-justify">${manga.synopsis || 'Tidak ada deskripsi sinopsis.'}</p>
                </div>

                <div>
                    <h2 class="text-xs font-bold tracking-widest text-gray-400 uppercase mb-3 px-1">Daftar Chapter (${validChapters.length})</h2>
                    <div class="max-h-80 overflow-y-auto space-y-2 pr-1 hide-scrollbar">
                        ${validChapters.map(ch => {
                            const displayTitle = ch.title || ch.slug.replace(/-/g, ' ').toUpperCase();
                            return `
                                <a href="#chapter/${slug}/${ch.slug}" class="flex items-center justify-between p-3 rounded-xl bg-dark border border-gray-900 hover:border-primary/40 transition-all group">
                                    <span class="text-xs font-semibold text-gray-300 group-hover:text-primary transition-colors">${displayTitle}</span>
                                    <span class="text-[10px] text-gray-600">${ch.date || ''}</span>
                                </a>
                            `;
                        }).join('')}
                    </div>
                </div>
            </div>
        `;
    } catch (e) {
        renderError(() => renderDetailManga(slug));
    }
}

// --- 8. MANGA VIEWER (CHAPTER READER) ---

async function renderChapterReader(comicSlug, chapterSlug) {
    showLoader();
    try {
        const data = await safeFetch(`${BASE_API}/chapter/${chapterSlug}`);
        if (!data || !data.success || !data.images) throw new Error();

        contextBar.textContent = ''; 

        const currentChapterNum = parseFloat(chapterSlug.split('-').pop());
        const baseSlugPattern = chapterSlug.substring(0, chapterSlug.lastIndexOf('-') + 1);

        const prevChapterSlug = !isNaN(currentChapterNum) && currentChapterNum > 1 ? `${baseSlugPattern}${currentChapterNum - 1}` : null;
        const nextChapterSlug = !isNaN(currentChapterNum) ? `${baseSlugPattern}${currentChapterNum + 1}` : null;

        appRoot.innerHTML = `
            <div class="space-y-4 max-w-2xl mx-auto animate-fade-in">
                <div class="flex items-center justify-between p-2 rounded-xl bg-surface border border-gray-900">
                    <button onclick="window.location.hash='#detail/${comicSlug}'" class="text-xs font-medium px-3 py-1.5 text-gray-400 hover:text-white flex items-center gap-1">
                        &larr; Kembali ke Info
                    </button>
                    <span class="text-xs text-primary font-bold truncate px-2 max-w-[200px]">${data.title}</span>
                </div>

                <div class="flex flex-col border border-gray-900 bg-black rounded-xl overflow-hidden shadow-2xl">
                    ${data.images.map((imgUrl, index) => `
                        <img src="${imgUrl}" alt="Halaman ${index + 1}" loading="lazy" class="w-full h-auto block" onerror="this.style.display='none'">
                    `).join('')}
                </div>

                <div class="grid grid-cols-2 gap-4 pt-2">
                    <button ${prevChapterSlug ? `onclick="window.location.hash='#chapter/${comicSlug}/${prevChapterSlug}'"` : 'disabled'} 
                        class="p-3 text-xs font-bold rounded-xl text-center border transition-all ${prevChapterSlug ? 'bg-surface border-gray-900 text-gray-200 active:scale-95' : 'bg-surface/30 border-gray-900/20 text-gray-600 cursor-not-allowed'}">
                        &larr; Chapter Sebelumnya
                    </button>
                    <button ${nextChapterSlug ? `onclick="window.location.hash='#chapter/${comicSlug}/${nextChapterSlug}'"` : 'disabled'} 
                        class="p-3 text-xs font-bold rounded-xl text-center border transition-all ${nextChapterSlug ? 'bg-primary border-primary text-white active:scale-95' : 'bg-surface/30 border-gray-900/20 text-gray-600 cursor-not-allowed'}">
                        Chapter Selanjutnya &rarr;
                    </button>
                </div>
            </div>
        `;
    } catch (e) {
        renderError(() => renderChapterReader(comicSlug, chapterSlug));
    }
}

function renderPlaceholder(title, message) {
    appRoot.innerHTML = `
        <div class="flex flex-col items-center justify-center min-h-[50vh] text-center p-4">
            <h1 class="text-xl font-bold text-white mb-1">${title}</h1>
            <p class="text-xs text-gray-500 max-w-xs">${message}</p>
        </div>
    `;
}

document.addEventListener('DOMContentLoaded', initApp);
