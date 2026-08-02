/**
 * MANGAVERSE - Core SPA Script (Updated)
 * Dark Minimalist Architecture with Bottom Navigation Controls.
 */

const BASE_API = 'https://www.sankavollerei.web.id/comic/mangakita';
const appRoot = document.getElementById('app-root');
const contextBar = document.getElementById('top-nav-context');

// --- 1. DEEP ROUTER IMPLEMENTATION ---

function initApp() {
    window.addEventListener('hashchange', handleRouting);
    handleRouting();
}

function handleRouting() {
    const hash = window.location.hash || '#home';
    contextBar.textContent = ''; // Reset context label
    
    // Smooth scroll to top on change
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Precise Route Matching
    if (hash.startsWith('#detail/')) {
        const slug = hash.replace('#detail/', '');
        renderDetailManga(slug);
        setActiveNav('');
    } else if (hash.startsWith('#chapter/')) {
        // Hash Format: #chapter/comic-slug/chapter-slug
        const segments = hash.replace('#chapter/', '').split('/');
        if (segments.length >= 2) {
            renderChapterReader(segments[0], segments[1]);
        }
        setActiveNav('');
    } else {
        const mainPath = hash.replace('#', '');
        setActiveNav(mainPath);
        
        switch(mainPath) {
            case 'home': renderHome(); break;
            case 'favorite': renderPlaceholder('My Favorite', 'Komik yang Anda simpan akan tampil di sini.'); break;
            case 'genres': renderPlaceholder('Manga Genres', 'Pusat klasifikasi genre komik.'); break;
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

// --- 2. GLOBAL RENDER UTILITIES ---

function showLoader() {
    appRoot.innerHTML = `
        <div class="flex flex-col items-center justify-center h-80 animate-fade-in" aria-label="Memuat data">
            <svg class="animate-spin h-7 w-7 text-primary mb-3" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span class="text-xs text-gray-500 tracking-widest uppercase">Fetching Database...</span>
        </div>
    `;
}

function renderError(retryCallback) {
    appRoot.innerHTML = `
        <div class="text-center py-16 px-4 bg-surface rounded-2xl border border-red-500/10">
            <h2 class="text-lg font-semibold text-gray-300">Gagal Sinkronisasi Data</h2>
            <p class="text-xs text-gray-500 mt-1 max-w-xs mx-auto">Silakan periksa koneksi data internet Anda atau API server sedang bermasalah.</p>
            <button id="retry-btn" class="mt-4 px-4 py-2 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-secondary transition-colors">
                Coba Muat Ulang
            </button>
        </div>
    `;
    document.getElementById('retry-btn')?.addEventListener('click', retryCallback);
}

// --- 3. CORE VIEWS & COMPONENT BUILDERS ---

async function renderHome() {
    showLoader();
    try {
        const res = await fetch(`${BASE_API}/home`);
        const data = await res.json();
        if(!data.success) throw new Error();

        appRoot.innerHTML = `
            <div class="space-y-8 animate-fade-in">
                ${buildCarousel(data.popularToday)}
                ${buildGrid(data.latestReleases)}
            </div>
        `;
    } catch {
        renderError(renderHome);
    }
}

function buildCarousel(items) {
    if (!items) return '';
    const cards = items.map(item => `
        <div class="flex-none w-32 sm:w-36 group cursor-pointer" onclick="window.location.hash='#detail/${item.slug}'">
            <div class="relative aspect-[3/4] rounded-xl overflow-hidden bg-surface mb-2 border border-gray-900 shadow-md">
                <img src="${item.image}" alt="Cover ${item.title}" loading="lazy" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300">
                ${item.latestChapter ? `<div class="absolute bottom-1 right-1 bg-darker/90 text-[10px] font-bold text-primary px-1.5 py-0.5 rounded border border-surface">Ch. ${item.latestChapter}</div>` : ''}
            </div>
            <h3 class="text-xs font-semibold text-gray-300 line-clamp-2 leading-tight group-hover:text-primary transition-colors">${item.title}</h3>
        </div>
    `).join('');

    return `
        <section>
            <h2 class="text-sm font-bold tracking-widest uppercase text-gray-400 mb-3 flex items-center gap-1.5">
                <span class="w-1.5 h-3.5 bg-primary rounded-full"></span> Popular Updates
            </h2>
            <div class="flex overflow-x-auto gap-3 pb-2 hide-scrollbar">${cards}</div>
        </section>
    `;
}

function buildGrid(items) {
    if (!items) return '';
    const itemsHtml = items.map(item => {
        // Safe navigation directly into dynamic detail/chapter route
        return `
            <article class="flex gap-3 p-2.5 rounded-xl bg-surface border border-gray-900 hover:border-primary/30 transition-all duration-200">
                <div class="w-20 aspect-[3/4] rounded-lg overflow-hidden bg-darker shrink-0 cursor-pointer" onclick="window.location.hash='#detail/${item.slug}'">
                    <img src="${item.image}" alt="Cover ${item.title}" loading="lazy" class="w-full h-full object-cover">
                </div>
                <div class="flex flex-col justify-between min-w-0 flex-grow">
                    <h3 class="text-xs sm:text-sm font-bold text-gray-200 line-clamp-2 leading-snug cursor-pointer hover:text-primary transition-colors" onclick="window.location.hash='#detail/${item.slug}'">
                        ${item.title}
                    </h3>
                    <div class="grid grid-cols-2 gap-1.5 mt-2">
                        ${(item.chapters || []).slice(0, 2).map(c => {
                            const numericSlug = c.slug ? c.slug.split('/').pop() : '';
                            return `<a href="#chapter/${item.slug}/${numericSlug}" class="text-[10px] bg-darker text-gray-400 py-1 px-2 rounded border border-gray-800 text-center truncate hover:border-primary hover:text-white transition-colors">
                                ${c.slug ? c.slug.split('.')[0].replace('-', ' ').toUpperCase() : 'Read'}
                            </a>`;
                        }).join('')}
                    </div>
                </div>
            </article>
        `;
    }).join('');

    return `
        <section>
            <h2 class="text-sm font-bold tracking-widest uppercase text-gray-400 mb-4 flex items-center gap-1.5">
                <span class="w-1.5 h-3.5 bg-primary rounded-full"></span> Latest Releases
            </h2>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">${itemsHtml}</div>
        </section>
    `;
}

// --- 4. NEW VIEWS: DETAIL MANGA ---

async function renderDetailManga(slug) {
    showLoader();
    try {
        const res = await fetch(`${BASE_API}/detail/${slug}`);
        const data = await res.json();
        if(!data.success || !data.details) throw new Error();
        
        const manga = data.details;
        contextBar.textContent = manga.title;

        // FILTER LOGIC: Hiraukan chapter 0 & validasi data
        const validChapters = (manga.chapters || []).filter(ch => 
            ch.title && ch.title.toLowerCase() !== 'chapter 0' && ch.slug
        );

        const genreBadges = (manga.genres || []).map(g => 
            `<span class="text-[10px] bg-dark px-2 py-0.5 rounded-md border border-gray-800 text-gray-400 font-medium">${g}</span>`
        ).join('');

        const chapterListItems = validChapters.map(ch => {
            const cleanSlug = ch.slug.split('/').pop();
            return `
                <a href="#chapter/${slug}/${cleanSlug}" class="flex items-center justify-between p-3 rounded-xl bg-dark border border-gray-900 hover:border-primary/40 transition-all group">
                    <span class="text-xs font-semibold text-gray-300 group-hover:text-primary transition-colors">${ch.title}</span>
                    <svg class="w-4 h-4 text-gray-600 group-hover:text-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
                </a>
            `;
        }).join('');

        appRoot.innerHTML = `
            <div class="space-y-6 animate-fade-in">
                <!-- Header Card -->
                <div class="p-4 rounded-2xl bg-surface border border-gray-900 flex flex-col sm:flex-row gap-4">
                    <div class="w-32 aspect-[3/4] mx-auto sm:mx-0 rounded-xl overflow-hidden bg-dark shrink-0">
                        <img src="${manga.image}" alt="Cover ${manga.title}" class="w-full h-full object-cover">
                    </div>
                    <div class="flex flex-col justify-between space-y-3 flex-grow text-center sm:text-left">
                        <div>
                            <h1 class="text-lg font-bold text-white">${manga.title}</h1>
                            <div class="flex items-center justify-center sm:justify-start gap-1 mt-1 text-primary text-xs font-bold">
                                <svg class="w-3.5 h-3.5 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>
                                <span>${manga.rating || 'N/A'}</span>
                            </div>
                        </div>
                        <div class="flex flex-wrap justify-center sm:justify-start gap-1">${genreBadges}</div>
                    </div>
                </div>

                <!-- Synopsis -->
                <div class="p-4 rounded-2xl bg-surface border border-gray-900">
                    <h2 class="text-xs font-bold tracking-widest text-gray-400 uppercase mb-2">Sinopsis</h2>
                    <p class="text-xs text-gray-400 leading-relaxed text-justify">${manga.synopsis || 'Tidak ada deskripsi.'}</p>
                </div>

                <!-- Chapter List Section -->
                <div>
                    <h2 class="text-xs font-bold tracking-widest text-gray-400 uppercase mb-3 px-1">Daftar Chapter (${validChapters.length})</h2>
                    <div class="max-h-80 overflow-y-auto space-y-2 pr-1 hide-scrollbar">${chapterListItems}</div>
                </div>
            </div>
        `;
    } catch {
        renderError(() => renderDetailManga(slug));
    }
}

// --- 5. NEW VIEWS: MANGA VIEWER (CHAPTER READER) ---

async function renderChapterReader(comicSlug, chapterSlug) {
    showLoader();
    try {
        // Build correct dynamic endpoint request
        const res = await fetch(`${BASE_API}/chapter/${comicSlug}/${chapterSlug}`);
        const data = await res.json();
        if(!data.success || !data.images) throw new Error();

        contextBar.textContent = `Reading: Ch. ${chapterSlug.split('.')[0].replace('chapter-', '')}`;

        const imageStacks = data.images.map((imgUrl, index) => `
            <div class="w-full bg-dark min-h-[300px] relative">
                <img src="${imgUrl}" alt="Halaman ${index + 1}" loading="lazy" class="w-full h-auto block" onerror="this.parentElement.style.display='none'">
            </div>
        `).join('');

        // Navigation logic parse inside SPA context
        const parseHashFromUrl = (url) => {
            if(!url) return null;
            const parts = url.replace(/\/$/, '').split('/');
            const ch = parts.pop();
            const cm = parts.pop();
            return `#chapter/${cm}/${ch}`;
        };

        const prevHash = parseHashFromUrl(data.navigation?.prev);
        const nextHash = parseHashFromUrl(data.navigation?.next);

        appRoot.innerHTML = `
            <div class="space-y-4 animate-fade-in max-w-2xl mx-auto">
                <!-- Upper Controls -->
                <div class="flex items-center justify-between p-2 rounded-xl bg-surface border border-gray-900">
                    <button onclick="window.location.hash='#detail/${comicSlug}'" class="text-xs font-medium px-3 py-1.5 text-gray-400 hover:text-white flex items-center gap-1">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg> Detail
                    </button>
                    <span class="text-xs text-gray-400 font-semibold text-center truncate px-2">${data.title || 'Manga Reader'}</span>
                </div>

                <!-- Webtoon Image Strip Stack -->
                <div class="flex flex-col border border-gray-900 rounded-xl overflow-hidden shadow-2xl bg-black">
                    ${imageStacks}
                </div>

                <!-- Bottom Strict Custom Router Navigation Controller -->
                <div class="grid grid-cols-2 gap-4 pt-2">
                    <button ${prevHash ? `onclick="window.location.hash='${prevHash}'"` : 'disabled'} 
                        class="p-3 text-xs font-bold rounded-xl text-center border transition-all ${prevHash ? 'bg-surface border-gray-900 text-gray-200 active:scale-95' : 'bg-surface/30 border-gray-900/20 text-gray-600 cursor-not-allowed'}">
                        &larr; Chapter Sebelumnya
                    </button>
                    <button ${nextHash ? `onclick="window.location.hash='${nextHash}'"` : 'disabled'} 
                        class="p-3 text-xs font-bold rounded-xl text-center border transition-all ${nextHash ? 'bg-primary border-primary text-white active:scale-95' : 'bg-surface/30 border-gray-900/20 text-gray-600 cursor-not-allowed'}">
                        Chapter Selanjutnya &rarr;
                    </button>
                </div>
            </div>
        `;
    } catch {
        renderError(() => renderChapterReader(comicSlug, chapterSlug));
    }
}

function renderPlaceholder(title, message) {
    appRoot.innerHTML = `
        <div class="flex flex-col items-center justify-center min-h-[50vh] text-center p-4">
            <h1 class="text-xl font-bold text-white mb-1">${title}</h1>
            <p class="text-xs text-gray-500 max-w-xs">${message}</p>
            <span class="mt-4 text-[10px] uppercase font-bold tracking-widest bg-primary/10 text-primary px-2 py-1 rounded-md">Development Layer</span>
        </div>
    `;
}

document.addEventListener('DOMContentLoaded', initApp);
