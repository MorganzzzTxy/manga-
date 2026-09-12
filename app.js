/**
 * COMICVERSE — Core SPA Script (Neo-Brutalism Edition)
 * + Floating navbar + Single install CTA di header (pill) + Page transition
 * + Toast + Haptic + Reading progress + Back-to-top
 */

const BASE_API = 'https://www.sankavollerei.web.id/comic/bacakomik';
const appRoot = document.getElementById('app-root');
const contextBar = document.getElementById('top-nav-context');

/* ---------- CLEANUP REGISTRY ---------- */
function addCleanup(fn) {
    (window.__pageCleanups = window.__pageCleanups || []).push(fn);
}
function clearPageHooks() {
    (window.__pageCleanups || []).forEach(fn => { try { fn(); } catch {} });
    window.__pageCleanups = [];
}

/* ---------- TOAST + HAPTIC ---------- */
function showToast(msg, type = 'success') {
    let host = document.getElementById('toast-host');
    if (!host) {
        host = document.createElement('div');
        host.id = 'toast-host';
        host.className = 'fixed top-20 left-1/2 -translate-x-1/2 z-[80] flex flex-col items-center gap-2 pointer-events-none';
        document.body.appendChild(host);
    }
    const bg = type === 'error' ? 'bg-red-400' : type === 'info' ? 'bg-secondary' : 'bg-primary';
    const el = document.createElement('div');
    el.className = `${bg} border-[3px] border-ink rounded-xl px-4 py-2 shadow-brut text-ink text-xs font-black uppercase tracking-wide`;
    el.style.animation = 'toastIn .3s cubic-bezier(.34,1.56,.64,1)';
    el.textContent = msg;
    host.appendChild(el);
    setTimeout(() => {
        el.style.animation = 'toastOut .3s ease forwards';
        setTimeout(() => el.remove(), 300);
    }, 1600);
}
function haptic(ms = 12) { if (navigator.vibrate) navigator.vibrate(ms); }
window.showToast = showToast;
window.haptic = haptic;

/* ---------- FAVORITES ---------- */
const FavManager = {
    getAll() { try { return JSON.parse(localStorage.getItem('mangaverse_favs')) || []; } catch { return []; } },
    toggle(comic) {
        let favs = this.getAll();
        const i = favs.findIndex(x => x.slug === comic.slug);
        if (i > -1) favs.splice(i, 1);
        else favs.push({
            title: comic.title, slug: comic.slug, cover: comic.cover,
            rating: comic.rating || 'N/A', type: comic.type || 'manga'
        });
        localStorage.setItem('mangaverse_favs', JSON.stringify(favs));
        return i === -1;
    },
    isFav(slug) { return this.getAll().some(x => x.slug === slug); }
};

window.handleFavClick = function(e, slug, title, cover, rating, type) {
    e.stopPropagation(); e.preventDefault();
    const added = FavManager.toggle({ slug, title, cover, rating, type });
    haptic(18);
    showToast(added ? '♥ Ditambahkan ke Favorit' : 'Dihapus dari Favorit', added ? 'success' : 'info');
    document.querySelectorAll(`.fav-btn-${slug}`).forEach(btn => {
        btn.innerHTML = added
            ? `<svg class="w-4 h-4 text-primary fill-current" viewBox="0 0 24 24"><path stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>`
            : `<svg class="w-4 h-4 text-ink/60" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>`;
    });
    if (window.location.hash === '#favorite' && !added) renderFavoritePage();
};

/* ---------- FETCH ---------- */
async function safeFetch(url) {
    try {
        const r = await fetch(url);
        if (!r.ok) throw new Error();
        return await r.json();
    } catch {
        const p = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`);
        if (!p.ok) throw new Error();
        const j = await p.json();
        return JSON.parse(j.contents);
    }
}

/* ---------- INSTALL PROMPT (single CTA di header) ---------- */
let deferredInstall = null;
const isStandalone = () =>
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true;

function setInstallVisible(show) {
    const btn = document.getElementById('install-btn-header');
    if (!btn) return;
    btn.classList.toggle('hidden', !show);
    btn.classList.toggle('inline-flex', show);
}

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstall = e;
    if (!isStandalone()) setInstallVisible(true);
});

window.addEventListener('appinstalled', () => {
    deferredInstall = null;
    setInstallVisible(false);
    showToast('Aplikasi berhasil dipasang 🎉', 'success');
});

function bindInstallBtn() {
    const btn = document.getElementById('install-btn-header');
    if (!btn || btn.dataset.bound) return;
    btn.dataset.bound = '1';
    btn.addEventListener('click', async () => {
        haptic(20);
        if (!deferredInstall) { showToast('Install belum tersedia', 'info'); return; }
        deferredInstall.prompt();
        const { outcome } = await deferredInstall.userChoice;
        if (outcome === 'accepted') setInstallVisible(false);
        deferredInstall = null;
    });
}

/* ---------- ROUTER ---------- */
function initApp() {
    window.addEventListener('hashchange', handleRouting);
    bindInstallBtn();

    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => haptic(10));
    });

    handleRouting();
}

function handleRouting() {
    clearPageHooks();
    const hash = window.location.hash || '#home';
    contextBar.textContent = '';
    window.scrollTo({ top: 0, behavior: 'instant' });

    if (hash.startsWith('#detail/')) {
        renderDetailManga(hash.replace('#detail/', ''));
        setActiveNav('');
    } else if (hash.startsWith('#chapter/')) {
        const rest = hash.replace('#chapter/', '');
        const i = rest.indexOf('/');
        if (i !== -1) renderChapterReader(rest.substring(0, i), rest.substring(i + 1));
        setActiveNav('');
    } else {
        const path = hash.replace('#', '');
        setActiveNav(path);
        switch (path) {
            case 'home': renderHome(); break;
            case 'search': renderSearchPage(); break;
            case 'favorite': renderFavoritePage(); break;
            case 'genres': renderGenresPage(); break;
            case 'developer': renderDeveloperPage(); break;
            default: renderHome();
        }
    }
    mountBackToTop();
}

function setActiveNav(path) {
    document.querySelectorAll('.nav-btn').forEach(btn => {
        const active = btn.dataset.path === path;
        btn.classList.toggle('text-primary', active);
        btn.classList.toggle('text-ink/50', !active);
    });
}

/* ---------- FLOATING BACK-TO-TOP ---------- */
function mountBackToTop() {
    let fab = document.getElementById('btt-fab');
    if (!fab) {
        fab = document.createElement('button');
        fab.id = 'btt-fab';
        fab.className = 'fixed bottom-24 right-3 z-40 w-11 h-11 rounded-xl bg-secondary border-[3px] border-ink shadow-brut flex items-center justify-center opacity-0 pointer-events-none transition-all pressable';
        fab.innerHTML = `<svg class="w-5 h-5 text-ink" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 10l7-7m0 0l7 7m-7-7v18"></path></svg>`;
        fab.addEventListener('click', () => { haptic(18); window.scrollTo({ top: 0, behavior: 'smooth' }); });
        document.body.appendChild(fab);
    }
    const onScroll = () => {
        const show = window.scrollY > 400;
        fab.classList.toggle('opacity-0', !show);
        fab.classList.toggle('pointer-events-none', !show);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    addCleanup(() => window.removeEventListener('scroll', onScroll));
}

/* ---------- UTILITIES ---------- */
function showLoader() {
    appRoot.innerHTML = `
        <div data-no-anim class="flex flex-col items-center justify-center h-80">
            <div class="w-12 h-12 rounded-full border-[4px] border-ink border-t-primary animate-spin mb-3"></div>
            <span class="text-xs font-black text-ink/70 tracking-widest uppercase">Syncing Database...</span>
        </div>
    `;
}

function renderError(retry) {
    appRoot.innerHTML = `
        <div class="text-center py-12 px-5 bg-paper border-[3px] border-ink rounded-2xl shadow-brut-lg">
            <div class="w-14 h-14 mx-auto mb-3 bg-secondary border-2 border-ink rounded-xl shadow-brut-sm flex items-center justify-center text-2xl font-black">!</div>
            <h2 class="text-base font-black text-ink">Gagal Sinkronisasi Data</h2>
            <p class="text-[11px] text-ink/70 mt-1 max-w-xs mx-auto font-medium">Periksa koneksi internet Anda atau coba muat ulang.</p>
            <button id="retry-btn" class="mt-4 px-4 py-2 bg-primary border-2 border-ink rounded-lg shadow-brut-sm text-ink text-xs font-black uppercase tracking-wide active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all pressable">
                Coba Muat Ulang
            </button>
        </div>
    `;
    document.getElementById('retry-btn')?.addEventListener('click', () => { haptic(); retry(); });
}

function getFavIconHTML(slug, title, cover, rating, type) {
    const isFav = FavManager.isFav(slug);
    const t = encodeURIComponent(title);
    const c = encodeURIComponent(cover);
    return `
        <button onclick="handleFavClick(event, '${slug}', decodeURIComponent('${t}'), decodeURIComponent('${c}'), '${rating}', '${type}')"
            class="fav-btn-${slug} absolute top-1.5 right-1.5 z-20 bg-paper border-2 border-ink p-1.5 rounded-lg shadow-brut-sm active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all pressable">
            ${isFav
                ? `<svg class="w-4 h-4 text-primary fill-current" viewBox="0 0 24 24"><path stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>`
                : `<svg class="w-4 h-4 text-ink/60" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>`
            }
        </button>
    `;
}

function sectionTitle(text, accent = 'bg-primary') {
    return `
        <h2 class="text-xs font-black tracking-widest uppercase text-ink mb-3 flex items-center gap-2">
            <span class="w-3 h-3 ${accent} border-2 border-ink rounded"></span>${text}
        </h2>
    `;
}

/* ---------- HOME ---------- */
async function renderHome() {
    showLoader();
    try {
        const [t, p, l] = await Promise.all([
            safeFetch(`${BASE_API}/top`),
            safeFetch(`${BASE_API}/populer`),
            safeFetch(`${BASE_API}/latest`)
        ]);
        if (!t.success || !p.success || !l.success) throw new Error();
        appRoot.innerHTML = `
            <div class="space-y-8">
                ${buildTopPremiumSection(t.komikList)}
                ${buildPopularCarousel(p.komikList)}
                ${buildLatestGrid(l.komikList)}
            </div>
        `;
    } catch { renderError(renderHome); }
}

function buildTopPremiumSection(items) {
    if (!items?.length) return '';
    return `
        <section>
            <div class="flex items-center justify-between mb-3">
                ${sectionTitle('Top Highlights 🚀', 'bg-secondary')}
                <span class="text-[10px] bg-secondary border-2 border-ink font-black px-2 py-0.5 rounded-lg shadow-brut-sm">MUST READ</span>
            </div>
            <div class="h-scroll flex overflow-x-auto gap-4 pb-3 snap-x snap-proximity">
                ${items.map((item, i) => `
                    <div class="flex-none w-[270px] sm:w-[310px] bg-paper border-[3px] border-ink rounded-2xl p-3 flex gap-3 snap-start shadow-brut cursor-pointer hover:shadow-brut-lg transition-all group relative cv-card"
                         onclick="window.location.hash='#detail/${item.slug}'">
                        <div class="w-20 aspect-[3/4] rounded-xl overflow-hidden bg-cream shrink-0 relative border-2 border-ink">
                            <img src="${item.cover}" alt="${item.title}" loading="lazy" decoding="async" class="w-full h-full object-cover">
                            <div class="absolute top-0 left-0 bg-primary border-b-2 border-r-2 border-ink text-ink font-black text-[11px] px-2 py-0.5 rounded-br-lg">#${i + 1}</div>
                        </div>
                        <div class="flex flex-col justify-between py-1 min-w-0 flex-grow pr-6">
                            <div>
                                <h3 class="text-xs font-black text-ink line-clamp-2 leading-snug">${item.title}</h3>
                                <p class="text-[10px] text-ink/60 mt-1 font-semibold">Global Recommendation</p>
                            </div>
                            <div class="flex items-center gap-1 text-[11px] font-black text-ink">
                                <svg class="w-3.5 h-3.5 text-secondary fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>
                                <span>${item.rating || '8.5'}</span>
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
    if (!items?.length) return '';
    return `
        <section>
            ${sectionTitle('Terpopuler Hari Ini')}
            <div class="h-scroll flex overflow-x-auto gap-3 pb-3 snap-x snap-proximity">
                ${items.map(item => `
                    <div class="flex-none w-28 sm:w-32 group cursor-pointer relative cv-card" onclick="window.location.hash='#detail/${item.slug}'">
                        <div class="relative aspect-[3/4] rounded-xl overflow-hidden bg-cream mb-2 border-2 border-ink shadow-brut group-hover:shadow-brut-lg transition-all">
                            <img src="${item.cover}" alt="${item.title}" loading="lazy" decoding="async" class="w-full h-full object-cover">
                            <div class="absolute top-1 left-1 bg-primary border-2 border-ink text-[8px] font-black text-ink px-1 rounded uppercase tracking-wide z-10">${item.type || 'Manga'}</div>
                            ${item.rating ? `
                                <div class="absolute bottom-1 right-1 bg-paper border-2 border-ink text-[9px] font-black text-ink px-1 py-0.5 rounded flex items-center gap-0.5 z-10">
                                    <svg class="w-2.5 h-2.5 text-secondary fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>
                                    <span>${item.rating}</span>
                                </div>
                            ` : ''}
                        </div>
                        <h3 class="text-[11px] font-bold text-ink line-clamp-2 leading-tight pr-2">${item.title}</h3>
                        ${getFavIconHTML(item.slug, item.title, item.cover, item.rating, item.type)}
                    </div>
                `).join('')}
            </div>
        </section>
    `;
}

function buildLatestGrid(items) {
    if (!items?.length) return '';
    return `
        <section>
            ${sectionTitle('Rilis Terbaru')}
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                ${items.map(item => {
                    const chSlug = item.slug ? `${item.slug}-chapter-${item.chapter?.toLowerCase().replace('ch.', '').trim()}` : '';
                    return `
                    <article class="flex gap-3 p-2.5 rounded-xl bg-paper border-2 border-ink shadow-brut hover:shadow-brut-lg transition-all relative cv-card">
                        <div class="w-16 aspect-[3/4] rounded-lg overflow-hidden bg-cream shrink-0 border-2 border-ink cursor-pointer" onclick="window.location.hash='#detail/${item.slug}'">
                            <img src="${item.cover}" alt="${item.title}" loading="lazy" decoding="async" class="w-full h-full object-cover">
                        </div>
                        <div class="flex flex-col justify-between min-w-0 flex-grow pr-8">
                            <div>
                                <h3 class="text-xs font-black text-ink line-clamp-2 leading-snug cursor-pointer" onclick="window.location.hash='#detail/${item.slug}'">${item.title}</h3>
                                <span class="text-[9px] text-ink/60 uppercase tracking-wider font-bold">${item.type || 'manga'}</span>
                            </div>
                            <div class="mt-2">
                                <a href="#chapter/${item.slug}/${chSlug}" class="inline-block text-[10px] bg-primary border-2 border-ink text-ink font-black py-1 px-3 rounded-lg shadow-brut-sm active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all pressable">
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

/* ---------- SEARCH ---------- */
async function renderSearchPage() {
    appRoot.innerHTML = `
        <div class="space-y-6">
            <div>
                ${sectionTitle('Pencarian Komik')}
                <div class="flex gap-2">
                    <input type="text" id="search-input" placeholder="Masukkan judul komik..."
                        class="w-full bg-paper border-2 border-ink rounded-xl px-4 py-3 text-xs font-semibold focus:outline-none focus:shadow-brut placeholder-ink/40 transition-shadow">
                    <button id="search-submit-btn" class="bg-primary border-2 border-ink text-ink text-xs font-black uppercase px-5 py-3 rounded-xl shadow-brut-sm active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all pressable">Cari</button>
                </div>
            </div>
            <div class="space-y-4">
                <div class="flex items-center gap-2 mb-2">
                    <span class="w-3 h-3 bg-primary border-2 border-ink rounded"></span>
                    <h2 id="search-area-title" class="text-xs font-black tracking-widest uppercase text-ink">Rekomendasi Pilihan</h2>
                </div>
                <div id="search-results" class="grid grid-cols-1 sm:grid-cols-2 gap-3"></div>
            </div>
        </div>
    `;

    const input = document.getElementById('search-input');
    const btn = document.getElementById('search-submit-btn');
    const results = document.getElementById('search-results');
    const title = document.getElementById('search-area-title');

    function renderGrid(list) {
        results.innerHTML = list.map(item => `
            <article class="flex gap-3 p-2.5 rounded-xl bg-paper border-2 border-ink shadow-brut hover:shadow-brut-lg transition-all cursor-pointer relative cv-card"
                     onclick="window.location.hash='#detail/${item.slug}'">
                <div class="w-16 aspect-[3/4] rounded-lg overflow-hidden bg-cream shrink-0 border-2 border-ink">
                    <img src="${item.cover}" alt="${item.title}" loading="lazy" decoding="async" class="w-full h-full object-cover">
                </div>
                <div class="flex flex-col justify-between min-w-0 flex-grow py-0.5 pr-8">
                    <div>
                        <h3 class="text-xs font-black text-ink line-clamp-2 leading-snug">${item.title}</h3>
                        <p class="text-[9px] text-ink/60 truncate mt-0.5 font-semibold">${item.genre || item.type || 'Manga'}</p>
                    </div>
                    <div class="flex items-center gap-1 text-[10px] font-black text-ink">
                        <svg class="w-3 h-3 text-secondary fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>
                        <span>${item.rating || '7.0'}</span>
                    </div>
                </div>
                ${getFavIconHTML(item.slug, item.title, item.cover, item.rating, item.type)}
            </article>
        `).join('');
    }

    async function loadRecommendations() {
        results.innerHTML = `<div class="col-span-full py-6 text-center text-xs font-bold text-ink/60">Loading Editor Choices...</div>`;
        try {
            const d = await safeFetch(`${BASE_API}/recomen`);
            if (d?.success && d.komikList) { title.textContent = 'Rekomendasi Pilihan 🔥'; renderGrid(d.komikList); }
        } catch {
            results.innerHTML = `<div class="col-span-full py-6 text-center text-xs font-bold text-ink/60">Gagal memuat rekomendasi.</div>`;
        }
    }

    async function executeSearch() {
        const q = input.value.trim();
        haptic();
        if (!q) return loadRecommendations();
        results.innerHTML = `<div class="col-span-full py-12 text-center text-xs font-bold text-ink/60">Mencari '${q}'...</div>`;
        try {
            const d = await safeFetch(`${BASE_API}/search/${encodeURIComponent(q)}`);
            if (!d?.success || !d.komikList?.length) {
                title.textContent = 'Hasil Pencarian';
                results.innerHTML = `<div class="col-span-full py-12 text-center text-xs font-bold text-ink/60">Komik tidak ditemukan.</div>`;
                return;
            }
            title.textContent = `Hasil: "${q}" 🔍`;
            renderGrid(d.komikList);
        } catch {
            results.innerHTML = `<div class="col-span-full py-12 text-center text-xs font-black text-secondary">Terjadi kesalahan sinkronisasi.</div>`;
        }
    }

    loadRecommendations();
    btn.addEventListener('click', executeSearch);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') executeSearch(); });
}

/* ---------- FAVORITE ---------- */
function renderFavoritePage() {
    const favs = FavManager.getAll();
    if (!favs.length) {
        appRoot.innerHTML = `
            <div class="flex flex-col items-center justify-center min-h-[50vh] text-center p-4">
                <div class="w-16 h-16 bg-paper border-[3px] border-ink rounded-2xl shadow-brut flex items-center justify-center text-ink/40 mb-3">
                    <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>
                </div>
                <h1 class="text-base font-black tracking-wider text-ink">Daftar Favorit Kosong</h1>
                <p class="text-[11px] text-ink/60 max-w-xs mt-1 font-semibold">Ketuk ikon hati di poster komik untuk menyimpannya di sini.</p>
            </div>
        `;
        return;
    }
    appRoot.innerHTML = `
        <div class="space-y-4">
            ${sectionTitle(`Koleksi Saya (${favs.length})`)}
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                ${favs.map(item => `
                    <article class="flex gap-3 p-2.5 rounded-xl bg-paper border-2 border-ink shadow-brut hover:shadow-brut-lg transition-all cursor-pointer relative cv-card"
                             onclick="window.location.hash='#detail/${item.slug}'">
                        <div class="w-16 aspect-[3/4] rounded-lg overflow-hidden bg-cream shrink-0 border-2 border-ink">
                            <img src="${item.cover}" alt="${item.title}" loading="lazy" decoding="async" class="w-full h-full object-cover">
                        </div>
                        <div class="flex flex-col justify-between min-w-0 flex-grow py-0.5 pr-8">
                            <div>
                                <h3 class="text-xs font-black text-ink line-clamp-2 leading-snug">${item.title}</h3>
                                <span class="text-[9px] bg-primary border-2 border-ink px-1.5 py-0.5 rounded-md text-ink uppercase font-black mt-1 inline-block">${item.type || 'manga'}</span>
                            </div>
                            <div class="flex items-center gap-1 text-[10px] font-black text-ink">
                                <svg class="w-3 h-3 text-secondary fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>
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

/* ---------- GENRES ---------- */
const GENRE_COLOR_MAP = [
    { keys: ['action','martial','fighting','war','military'], cls: 'bg-red-200' },
    { keys: ['romance','josei','shoujo','harem'],             cls: 'bg-pink-200' },
    { keys: ['horror','ghost','thriller','gore'],             cls: 'bg-purple-300' },
    { keys: ['comedy','slice of life','parody'],              cls: 'bg-amber-200' },
    { keys: ['mystery','psychological','detective'],          cls: 'bg-indigo-200' },
    { keys: ['fantasy','isekai','magic','supernatural','demon'], cls: 'bg-violet-200' },
    { keys: ['sci-fi','scifi','mecha','cyberpunk'],           cls: 'bg-cyan-200' },
    { keys: ['drama','tragedy'],                              cls: 'bg-slate-300' },
    { keys: ['school','sport'],                               cls: 'bg-emerald-200' },
    { keys: ['ecchi','adult','smut','mature'],                cls: 'bg-fuchsia-200' },
    { keys: ['historical','period'],                          cls: 'bg-orange-200' },
    { keys: ['adventure'],                                    cls: 'bg-teal-200' },
];
function getGenreBg(title) {
    const t = (title || '').toLowerCase();
    const m = GENRE_COLOR_MAP.find(x => x.keys.some(k => t.includes(k)));
    return m ? m.cls : 'bg-primary/30';
}

async function renderGenresPage() {
    showLoader();
    try {
        const data = await safeFetch(`${BASE_API}/genres`);
        if (!data?.success || !data.genres) throw new Error();
        const sorted = [...data.genres].sort((a, b) => a.title.localeCompare(b.title));
        appRoot.innerHTML = `
            <div class="space-y-4">
                <div class="mb-2">
                    ${sectionTitle('Explore Genres')}
                    <p class="text-[11px] text-ink/70 font-semibold -mt-2">Temukan komik berdasarkan kategori cerita.</p>
                </div>
                <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    ${sorted.map(g => {
                        const q = encodeURIComponent(g.title);
                        const bg = getGenreBg(g.title);
                        return `
                            <button onclick="window.location.hash='#search'; setTimeout(() => {
                                const i = document.getElementById('search-input');
                                if (i) { i.value = decodeURIComponent('${q}'); document.getElementById('search-submit-btn').click(); }
                            }, 60);"
                                class="${bg} group text-left p-3 border-2 border-ink rounded-xl shadow-brut active:translate-x-[4px] active:translate-y-[4px] active:shadow-none hover:shadow-brut-lg transition-all flex items-center justify-between gap-2 pressable">
                                <span class="text-[11px] font-black uppercase tracking-wide text-ink truncate">${g.title}</span>
                                <svg class="w-3.5 h-3.5 text-ink shrink-0 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M9 5l7 7-7 7"></path></svg>
                            </button>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    } catch { renderError(renderGenresPage); }
}

/* ---------- DETAIL ---------- */
async function renderDetailManga(slug) {
    showLoader();
    try {
        const data = await safeFetch(`${BASE_API}/detail/${slug}`);
        if (!data?.success || !data.detail) throw new Error();
        const m = data.detail;
        contextBar.textContent = '';
        const chapters = (m.chapters || []).filter(c => c.slug);

        appRoot.innerHTML = `
            <div class="space-y-6">
                <div class="p-4 rounded-2xl bg-paper border-[3px] border-ink shadow-brut flex flex-col sm:flex-row gap-4 relative">
                    <div class="w-32 aspect-[3/4] mx-auto sm:mx-0 rounded-xl overflow-hidden bg-cream shrink-0 border-2 border-ink">
                        <img src="${m.cover}" alt="${m.title}" loading="lazy" decoding="async" class="w-full h-full object-cover">
                    </div>
                    <div class="flex flex-col justify-between space-y-3 flex-grow text-center sm:text-left pr-0 sm:pr-8">
                        <div>
                            <h1 class="text-base sm:text-lg font-black text-ink leading-tight">${m.title}</h1>
                            <p class="text-[11px] text-ink/60 italic mt-0.5 line-clamp-1 font-semibold">${m.otherTitle || '-'}</p>
                            <div class="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 mt-2 text-xs font-black text-ink">
                                <span class="inline-flex items-center gap-1 bg-secondary border-2 border-ink px-2 py-0.5 rounded-lg">
                                    <svg class="w-3 h-3 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>
                                    ${m.rating || 'N/A'}
                                </span>
                                <span class="bg-primary border-2 border-ink px-2 py-0.5 rounded-lg">${m.type || 'Manga'}</span>
                                <span class="bg-paper border-2 border-ink px-2 py-0.5 rounded-lg">${m.status || 'Ongoing'}</span>
                            </div>
                        </div>
                        <div class="text-[11px] text-ink font-semibold space-y-0.5">
                            <div><span class="text-ink/50">Author:</span> ${m.author || '-'}</div>
                            <div><span class="text-ink/50">Released:</span> ${m.release || '-'}</div>
                            <div><span class="text-ink/50">Views:</span> ${m.reader || '-'}</div>
                        </div>
                        <div class="flex flex-wrap justify-center sm:justify-start gap-1.5">
                            ${(m.genres || []).map(g => `<span class="text-[10px] bg-cream border-2 border-ink px-2 py-0.5 rounded-lg font-black text-ink uppercase">${g.title}</span>`).join('')}
                        </div>
                    </div>
                    ${getFavIconHTML(slug, m.title, m.cover, m.rating, m.type)}
                </div>

                <div class="p-4 rounded-2xl bg-paper border-2 border-ink shadow-brut">
                    <h2 class="text-xs font-black tracking-widest text-ink uppercase mb-2">Sinopsis</h2>
                    <p class="text-xs text-ink/80 leading-relaxed text-justify font-medium">${m.synopsis || 'Tidak ada deskripsi sinopsis.'}</p>
                </div>

                <div>
                    ${sectionTitle(`Daftar Chapter (${chapters.length})`)}
                    <div class="max-h-80 overflow-y-auto space-y-2 pr-1 hide-scrollbar">
                        ${chapters.map(ch => {
                            const label = ch.title || ch.slug.replace(/-/g, ' ').toUpperCase();
                            return `
                                <a href="#chapter/${slug}/${ch.slug}" class="flex items-center justify-between p-3 rounded-xl bg-paper border-2 border-ink shadow-brut-sm hover:shadow-brut transition-all">
                                    <span class="text-xs font-black text-ink truncate">${label}</span>
                                    <span class="text-[10px] text-ink/60 font-bold shrink-0 ml-2">${ch.date || ''}</span>
                                </a>
                            `;
                        }).join('')}
                    </div>
                </div>
            </div>
        `;
    } catch { renderError(() => renderDetailManga(slug)); }
}

/* ---------- CHAPTER ---------- */
async function renderChapterReader(comicSlug, chapterSlug) {
    showLoader();
    try {
        const data = await safeFetch(`${BASE_API}/chapter/${chapterSlug}`);
        if (!data?.success || !data.images) throw new Error();
        contextBar.textContent = '';

        const num = parseFloat(chapterSlug.split('-').pop());
        const base = chapterSlug.substring(0, chapterSlug.lastIndexOf('-') + 1);
        const prev = !isNaN(num) && num > 1 ? `${base}${num - 1}` : null;
        const next = !isNaN(num) ? `${base}${num + 1}` : null;

        appRoot.innerHTML = `
            <div class="space-y-4 max-w-2xl mx-auto">
                <div class="fixed top-0 left-0 right-0 h-1 z-50 bg-ink/10">
                    <div id="read-progress" class="h-full bg-primary border-r-2 border-ink" style="width:0%"></div>
                </div>

                <div class="flex items-center justify-between p-2 rounded-xl bg-paper border-2 border-ink shadow-brut-sm">
                    <button onclick="window.location.hash='#detail/${comicSlug}'" class="text-xs font-black px-3 py-1.5 text-ink bg-primary border-2 border-ink rounded-lg shadow-brut-sm active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all pressable">
                        ← Info
                    </button>
                    <span class="text-xs font-black text-ink truncate px-2 max-w-[200px]">${data.title}</span>
                </div>

                <div class="flex flex-col border-[3px] border-ink bg-cream rounded-xl overflow-hidden shadow-brut-lg">
                    ${data.images.map((src, i) => `
                        <img src="${src}" alt="Halaman ${i + 1}" loading="lazy" decoding="async" class="w-full h-auto block border-b-2 border-ink last:border-b-0" onerror="this.style.display='none'">
                    `).join('')}
                </div>

                <div class="grid grid-cols-2 gap-3 pt-2">
                    <button ${prev ? `onclick="window.location.hash='#chapter/${comicSlug}/${prev}'"` : 'disabled'}
                        class="p-3 text-xs font-black rounded-xl text-center border-2 border-ink transition-all pressable ${prev
                            ? 'bg-paper shadow-brut active:translate-x-[4px] active:translate-y-[4px] active:shadow-none'
                            : 'bg-cream/40 text-ink/30 cursor-not-allowed border-ink/30'}">
                        ← Sebelumnya
                    </button>
                    <button ${next ? `onclick="window.location.hash='#chapter/${comicSlug}/${next}'"` : 'disabled'}
                        class="p-3 text-xs font-black rounded-xl text-center border-2 border-ink transition-all pressable ${next
                            ? 'bg-primary shadow-brut active:translate-x-[4px] active:translate-y-[4px] active:shadow-none'
                            : 'bg-cream/40 text-ink/30 cursor-not-allowed border-ink/30'}">
                        Selanjutnya →
                    </button>
                </div>
            </div>
        `;

        const bar = document.getElementById('read-progress');
        const onScroll = () => {
            const h = document.documentElement;
            const max = h.scrollHeight - h.clientHeight;
            bar.style.width = (max > 0 ? Math.min(100, (h.scrollTop / max) * 100) : 0) + '%';
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        onScroll();
        addCleanup(() => window.removeEventListener('scroll', onScroll));
    } catch { renderError(() => renderChapterReader(comicSlug, chapterSlug)); }
}

/* ---------- DEVELOPER ---------- */
function renderDeveloperPage() {
    const WA = 'https://whatsapp.com/channel/0029Vb6lS6sDOQIbAMt02O03';
    const langs = [
        { name: 'JavaScript', cls: 'bg-amber-300' },
        { name: 'HTML5', cls: 'bg-orange-300' },
        { name: 'CSS3', cls: 'bg-cyan-300' }
    ];

    appRoot.innerHTML = `
        <div class="space-y-6 max-w-lg mx-auto">

            <div class="text-center">
                <div class="relative w-32 h-32 mx-auto mb-4">
                    <div class="absolute inset-0 rounded-full border-[3px] border-dashed border-ink avatar-ring"></div>
                    <div class="absolute inset-2 rounded-full bg-ink translate-x-1.5 translate-y-1.5"></div>
                    <div class="absolute inset-2 rounded-full bg-primary border-[3px] border-ink flex items-center justify-center overflow-hidden">
                        <span class="font-black text-5xl text-ink select-none">M</span>
                    </div>
                    <div class="absolute bottom-0 right-0 w-9 h-9 rounded-full bg-secondary border-[3px] border-ink flex items-center justify-center shadow-brut-sm">
                        <svg class="w-4 h-4 text-ink" fill="currentColor" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                    </div>
                </div>
                <h1 class="text-xl font-black text-ink tracking-tight">Morganz</h1>
                <p class="text-[11px] text-ink/60 font-bold mt-0.5">Independent Web Developer</p>
                <div class="inline-flex items-center gap-1.5 mt-2 bg-paper border-2 border-ink rounded-lg px-2.5 py-1 shadow-brut-sm">
                    <span class="w-2 h-2 rounded-full bg-emerald-500 border border-ink"></span>
                    <span class="text-[9px] text-ink/70 uppercase tracking-widest font-black">Active</span>
                </div>
            </div>

            <p class="text-xs text-ink/80 leading-relaxed px-1 font-semibold text-center">
                Ruang baca komik pribadi di sakumu. Ringan, tanpa iklan, tanpa loading lambat — favoritmu tersimpan aman di perangkat, siap dibuka kapan saja.
            </p>

            <div class="px-1">
                <h2 class="text-[10px] font-black tracking-widest text-ink/60 uppercase mb-2 text-center">Dibangun Dengan</h2>
                <div class="flex flex-wrap gap-2 justify-center">
                    ${langs.map(l => `<span class="${l.cls} border-2 border-ink text-ink text-xs font-black px-3 py-1.5 rounded-lg shadow-brut-sm">${l.name}</span>`).join('')}
                </div>
            </div>

            <a href="${WA}" target="_blank" rel="noopener noreferrer"
               class="flex items-center gap-3 p-4 rounded-2xl bg-emerald-400 border-[3px] border-ink shadow-brut active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all pressable">
                <div class="w-10 h-10 rounded-xl bg-ink flex items-center justify-center shrink-0">
                    <svg class="w-5 h-5 text-emerald-400" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.71.45 3.38 1.3 4.85L2 22l5.36-1.4a9.9 9.9 0 004.68 1.19h.01c5.46 0 9.9-4.45 9.9-9.91C21.96 6.45 17.5 2 12.04 2zm4.52 13.9c-.25.12-1.47.72-1.7.81-.23.08-.39.12-.56-.13-.16-.25-.64-.81-.79-.97-.14-.16-.29-.18-.54-.06-.25.12-1.05.39-2 1.23-.74.66-1.24 1.48-1.39 1.73-.14.25-.02.38.11.51.11.11.25.29.37.43.12.14.16.25.25.41.08.16.04.31-.02.43-.06.12-.56 1.35-.77 1.85-.2.48-.41.42-.56.43h-.48c-.16 0-.43-.06-.66-.31-.23-.25-.86-.85-.86-2.07 0-1.22.89-2.4 1.01-2.56.12-.16 1.75-2.67 4.24-3.74.59-.26 1.05-.41 1.41-.52.59-.19 1.13-.16 1.56-.1.48.07 1.47.6 1.67 1.18.21.58.21 1.07.15 1.18-.07.1-.23.16-.48.28z"/>
                    </svg>
                </div>
                <div class="flex-grow text-left">
                    <h3 class="text-sm font-black text-ink">Ikuti Saluran WhatsApp</h3>
                    <p class="text-[11px] text-ink/70 font-bold">Update rilis komik & pengumuman terbaru</p>
                </div>
                <svg class="w-4 h-4 text-ink shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M9 5l7 7-7 7"></path></svg>
            </a>

        </div>
    `;
}

/* ---------- SERVICE WORKER + EASTER EGG ---------- */
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch(() => {});
    });
}

document.addEventListener('click', (() => {
    let n = 0, t = 0;
    return (e) => {
        if (!e.target.closest('#brand-logo')) return;
        const now = Date.now();
        if (now - t > 1500) n = 0;
        t = now; n++;
        if (n === 5) {
            haptic([20, 40, 20]);
            showToast('🎉 Kamu menemukan easter egg!', 'info');
            n = 0;
        }
    };
})());

/* ---------- PAGE TRANSITION OBSERVER ---------- */
const pageAnimObserver = new MutationObserver(() => {
    if (!appRoot.firstElementChild) return;
    if (appRoot.querySelector('[data-no-anim]')) return;

    const wrap = appRoot.firstElementChild;
    const topLevel = Array.from(wrap.children);

    if (topLevel.length > 1) {
        topLevel.forEach((el, i) => {
            el.style.animation = `pageIn .55s cubic-bezier(.34,1.56,.64,1) ${Math.min(i * 70, 420)}ms both`;
        });
    } else if (topLevel.length === 1) {
        topLevel[0].style.animation = `pageIn .55s cubic-bezier(.34,1.56,.64,1) both`;
    } else {
        wrap.style.animation = `pageIn .55s cubic-bezier(.34,1.56,.64,1) both`;
    }

    requestAnimationFrame(() => {
        appRoot.querySelectorAll('.cv-card').forEach((el, i) => {
            if (el.dataset.animCard) return;
            el.dataset.animCard = '1';
            el.style.animation = `cardIn .5s cubic-bezier(.34,1.56,.64,1) ${Math.min(i * 35, 500) + 80}ms both`;
        });
    });
});
pageAnimObserver.observe(appRoot, { childList: true });

document.addEventListener('DOMContentLoaded', initApp);