// --- 5. MANGA VIEWER (CHAPTER READER) ---

async function renderChapterReader(comicSlug, chapterSlug) {
    showLoader();
    try {
        // PERBAIKAN: Pola diganti agar konsisten menggunakan BASE_API (/comic/mangakita/chapter/...)
        const targetUrl = `${BASE_API}/chapter/${chapterSlug}`;
        
        const data = await safeFetch(targetUrl);
        if(!data || !data.success || !data.images) throw new Error();

        // Mengambil nomor chapter untuk judul bar atas
        const chapterNumber = chapterSlug.split('-').pop().replace('.html', '');
        contextBar.textContent = `Ch. ${chapterNumber}`;

        // Mengurai navigasi URL dari payload API menjadi format Hash SPA internal
        const parseHashFromUrl = (url) => {
            if(!url) return null;
            const decodeUrl = decodeURIComponent(url);
            // Mengambil segment terakhir (contoh: 'it-all-starts-with-trillions-of-nether-currency-chapter-156')
            const cleanChapterSlug = decodeUrl.replace(/\/$/, '').split('/').pop();
            return `#chapter/${comicSlug}/${cleanChapterSlug}`;
        };

        const prevHash = parseHashFromUrl(data.navigation?.prev);
        const nextHash = parseHashFromUrl(data.navigation?.next);

        appRoot.innerHTML = `
            <div class="space-y-4 max-w-2xl mx-auto animate-fade-in">
                <!-- Upper Controls -->
                <div class="flex items-center justify-between p-2 rounded-xl bg-surface border border-gray-900">
                    <button onclick="window.location.hash='#detail/${comicSlug}'" class="text-xs font-medium px-3 py-1.5 text-gray-400 hover:text-white flex items-center gap-1">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
                        </svg> Detail Manga
                    </button>
                    <span class="text-xs text-gray-400 font-semibold truncate px-2 max-w-[180px]">${data.title || 'Manga Reader'}</span>
                </div>

                <!-- Webtoon Image Strip Stack -->
                <div class="flex flex-col border border-gray-900 bg-black rounded-xl overflow-hidden shadow-2xl">
                    ${data.images.map((imgUrl, index) => `
                        <img src="${imgUrl}" alt="Halaman ${index + 1}" loading="lazy" class="w-full h-auto block" onerror="this.style.display='none'">
                    `).join('')}
                </div>

                <!-- Bottom Strict Navigation Controller -->
                <div class="grid grid-cols-2 gap-4 pt-2">
                    <button ${prevHash ? `onclick="window.location.hash='${prevHash}'"` : 'disabled'} 
                        class="p-3 text-xs font-bold rounded-xl text-center border transition-all ${prevHash ? 'bg-surface border-gray-900 text-gray-200 active:scale-95' : 'bg-surface/30 border-gray-900/20 text-gray-600 cursor-not-allowed'}">
                        &larr; Prev Chapter
                    </button>
                    <button ${nextHash ? `onclick="window.location.hash='${nextHash}'"` : 'disabled'} 
                        class="p-3 text-xs font-bold rounded-xl text-center border transition-all ${nextHash ? 'bg-primary border-primary text-white active:scale-95' : 'bg-surface/30 border-gray-900/20 text-gray-600 cursor-not-allowed'}">
                        Next Chapter &rarr;
                    </button>
                </div>
            </div>
        `;
    } catch (e) {
        renderError(() => renderChapterReader(comicSlug, chapterSlug));
    }
}
