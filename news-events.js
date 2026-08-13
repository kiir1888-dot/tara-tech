(() => {
  const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1200&q=85';

  const elements = {
    heroGrid: document.getElementById('heroGrid'),
    newsGrid: document.getElementById('newsGrid'),
    filters: document.getElementById('categoryFilters'),
    eventsList: document.getElementById('eventsList'),
    popularList: document.getElementById('popularList'),
    noResults: document.getElementById('noResults'),
    searchSummary: document.getElementById('searchSummary'),
    themeToggle: document.getElementById('themeToggle'),
    menuButton: document.getElementById('menuButton'),
    mobileMenu: document.getElementById('mobileMenu'),
    headerSearch: document.getElementById('headerSearch'),
    mobileSearch: document.getElementById('mobileSearch'),
    newsletterForm: document.getElementById('newsletterForm'),
    newsletterStatus: document.getElementById('newsletterStatus'),
    toast: document.getElementById('toast'),
    eventInquiryModal: document.getElementById('eventInquiryModal'),
    eventInquiryForm: document.getElementById('eventInquiryForm'),
    newsReaderModal: document.getElementById('newsReaderModal'),
    closeNewsReader: document.getElementById('closeNewsReader'),
    newsReaderMeta: document.getElementById('newsReaderMeta'),
    newsReaderTitle: document.getElementById('newsReaderTitle'),
    newsReaderImage: document.getElementById('newsReaderImage'),
    newsReaderBody: document.getElementById('newsReaderBody')
  };

  let allStories = [];
  let events = [];
  let activeCategory = 'All';
  let searchTerm = '';
  let toastTimer;

  const createElement = (tag, className = '', text = '') => {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text) el.textContent = text;
    return el;
  };

  // ========== NEWS ==========
  const createBadge = (label, dark = false) => createElement(
    'span',
    `inline-flex w-fit rounded-md px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em] ${dark ? 'bg-white/15 text-white backdrop-blur' : 'bg-electric-50 text-electric-700 dark:bg-electric-500/10 dark:text-blue-300'}`,
    label
  );

  const createHeroCard = (story, prominent = false) => {
    const article = createElement('article', `story-card group relative min-h-0 overflow-hidden rounded-lg bg-slate-900 ${prominent ? 'h-[390px] lg:h-full' : 'h-[280px] lg:h-auto'}`);
    const img = createElement('img', 'absolute inset-0 h-full w-full object-cover');
    img.src = story.image || FALLBACK_IMAGE;
    img.alt = '';
    img.decoding = 'async';
    const overlay = createElement('div', 'absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent');
    const body = createElement('div', `absolute inset-x-0 bottom-0 p-5 text-white ${prominent ? 'sm:p-8' : 'sm:p-6'}`);
    body.append(createBadge(prominent ? 'Breaking News' : 'Trending', true));
    body.append(
      createElement('h2', `mt-3 font-display font-extrabold leading-tight ${prominent ? 'max-w-3xl text-2xl sm:text-4xl' : 'text-xl sm:text-2xl'}`, story.title),
      createElement('p', 'mt-3 text-xs font-semibold text-slate-300', `${story.category}  |  ${story.time}`)
    );
    article.append(img, overlay, body);
    return article;
  };

  const renderHero = () => {
    if (!allStories.length) return;
    const featured = allStories.find(s => s.featured) || allStories[0];
    const trending = allStories.filter(s => s.trending).slice(0, 2);
    const side = createElement('div', 'grid min-h-0 gap-4 sm:grid-cols-2 lg:grid-cols-1');
    trending.forEach(s => side.append(createHeroCard(s)));
    elements.heroGrid.replaceChildren(createHeroCard(featured, true), side);
  };

  const createNewsCard = story => {
    const article = createElement('article', 'story-card group overflow-hidden rounded-lg border border-slate-200 bg-white transition duration-300 hover:-translate-y-1 hover:border-electric-500 hover:shadow-lift dark:border-slate-800 dark:bg-slate-900');
    const imgWrap = createElement('div', 'h-48 overflow-hidden bg-slate-200 dark:bg-slate-800');
    const img = createElement('img', 'h-full w-full object-cover');
    img.src = story.image || FALLBACK_IMAGE;
    img.alt = '';
    img.loading = 'lazy';
    img.decoding = 'async';
    imgWrap.append(img);
    const body = createElement('div', 'flex flex-1 flex-col p-5');
    const meta = createElement('div', 'flex items-center justify-between gap-3');
    meta.append(createBadge(story.category), createElement('time', 'text-xs font-semibold text-slate-400', story.time));
    const readMore = createElement('button', 'mt-5 inline-flex items-center gap-2 self-start text-sm font-bold text-electric-600 transition hover:text-electric-700 dark:text-blue-300');
    readMore.type = 'button';
    readMore.innerHTML = '<i data-lucide="book-open" class="h-4 w-4"></i><span>Read more</span>';
    readMore.addEventListener('click', () => openNewsReader(story));
    body.append(meta, createElement('h3', 'mt-4 line-clamp-2 font-display text-xl font-extrabold leading-snug transition group-hover:text-electric-600', story.title), createElement('p', 'mt-3 line-clamp-3 text-sm leading-6 text-slate-500 dark:text-slate-400', story.snippet), readMore);
    article.append(imgWrap, body);
    return article;
  };

  const openNewsReader = story => {
    if (!elements.newsReaderModal) return;
    elements.newsReaderMeta.textContent = `${story.category}  |  ${story.time}`;
    elements.newsReaderTitle.textContent = story.title;
    elements.newsReaderImage.src = story.image || FALLBACK_IMAGE;
    elements.newsReaderImage.alt = '';
    elements.newsReaderBody.textContent = story.snippet || story.content || '';
    elements.newsReaderModal.hidden = false;
    document.body.style.overflow = 'hidden';
    window.lucide?.createIcons();
  };

  const closeNewsReader = () => {
    if (!elements.newsReaderModal) return;
    elements.newsReaderModal.hidden = true;
    document.body.style.overflow = '';
  };

  const getFilteredStories = () => allStories.filter(s => {
    const catMatch = activeCategory === 'All' || s.category === activeCategory;
    const txt = `${s.title} ${s.snippet} ${s.category}`.toLowerCase();
    return catMatch && txt.includes(searchTerm.toLowerCase());
  });

  const renderNews = () => {
    const filtered = getFilteredStories();
    elements.newsGrid.replaceChildren(...filtered.map(createNewsCard));
    elements.noResults.hidden = filtered.length > 0;
    elements.searchSummary.textContent = searchTerm
      ? `${filtered.length} result${filtered.length === 1 ? '' : 's'} for "${searchTerm}"`
      : `${filtered.length} ${activeCategory === 'All' ? 'latest stories' : `${activeCategory} stories`}`;
    window.lucide?.createIcons();
  };

  const renderFilters = () => {
    const cats = ['All', ...new Set(allStories.map(s => s.category))];
    elements.filters.replaceChildren(...cats.map(cat => {
      const btn = createElement('button', 'filter-button rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-bold transition hover:border-electric-500 hover:text-electric-600 dark:border-slate-700 dark:bg-slate-900', cat);
      btn.type = 'button';
      btn.setAttribute('aria-pressed', String(cat === activeCategory));
      btn.addEventListener('click', () => { activeCategory = cat; renderFilters(); renderNews(); });
      return btn;
    }));
  };

  const renderPopular = () => {
    const popular = allStories.filter(s => s.popular).slice(0, 4);
    elements.popularList.replaceChildren(...popular.map((s, i) => {
      const li = createElement('li', 'grid grid-cols-[28px_1fr] gap-3 py-4 first:pt-0 last:pb-0');
      li.append(
        createElement('span', 'font-display text-lg font-extrabold text-electric-500', String(i + 1).padStart(2, '0')),
        createElement('p', 'text-sm font-bold leading-5', s.title)
      );
      return li;
    }));
  };

  const showToast = msg => {
    window.clearTimeout(toastTimer);
    elements.toast.textContent = msg;
    elements.toast.hidden = false;
    toastTimer = window.setTimeout(() => { elements.toast.hidden = true; }, 3200);
  };

  // Events are now handled by tara-events.js — no conflict.
  const renderEvents = () => {};

  // ========== THEME / SEARCH / INTERACTIONS ==========
  const setTheme = dark => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('tara-news-theme', dark ? 'dark' : 'light');
    elements.themeToggle.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
    elements.themeToggle.innerHTML = `<i data-lucide="${dark ? 'sun' : 'moon'}" class="h-5 w-5"></i>`;
    window.lucide?.createIcons();
  };

  const applySearch = value => {
    searchTerm = value.trim();
    if (elements.headerSearch) elements.headerSearch.value = value;
    if (elements.mobileSearch) elements.mobileSearch.value = value;
    renderNews();
    document.getElementById('news')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const wireInteractions = () => {
    let setMenuState = () => {};

    if (elements.themeToggle) {
      const saved = localStorage.getItem('tara-news-theme');
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setTheme(saved ? saved === 'dark' : prefersDark);
      elements.themeToggle.addEventListener('click', () => setTheme(!document.documentElement.classList.contains('dark')));

      setMenuState = open => {
        elements.menuButton.setAttribute('aria-expanded', String(open));
        elements.mobileMenu.hidden = !open;
        elements.menuButton.innerHTML = `<i data-lucide="${open ? 'x' : 'menu'}" class="h-5 w-5"></i>`;
        window.lucide?.createIcons();
      };
      elements.menuButton.addEventListener('click', () => setMenuState(elements.menuButton.getAttribute('aria-expanded') !== 'true'));
      elements.mobileMenu.querySelectorAll('a').forEach(link => link.addEventListener('click', () => setMenuState(false)));
    }

    document.getElementById('headerSearchForm')?.addEventListener('submit', event => {
      event.preventDefault();
      applySearch(new FormData(event.currentTarget).get('query') || event.currentTarget.querySelector('input').value);
    });
    document.getElementById('mobileSearchForm')?.addEventListener('submit', event => {
      event.preventDefault();
      applySearch(new FormData(event.currentTarget).get('query') || event.currentTarget.querySelector('input').value);
      setMenuState(false);
    });
    elements.headerSearch?.addEventListener('input', event => { searchTerm = event.target.value.trim(); renderNews(); });
    elements.mobileSearch?.addEventListener('input', event => { searchTerm = event.target.value.trim(); renderNews(); });

    elements.newsletterForm?.addEventListener('submit', event => {
      event.preventDefault();
      if (!elements.newsletterForm.reportValidity()) return;
      const email = document.getElementById('newsletterEmail')?.value.trim();
      if (email) {
        localStorage.setItem('tara-newsletter-email', email);
        if (elements.newsletterStatus) elements.newsletterStatus.textContent = 'You are on the list. Watch your inbox.';
        elements.newsletterForm.reset();
        showToast('Newsletter subscription saved');
      }
    });

    const yearEl = document.getElementById('copyrightYear');
    if (yearEl) yearEl.textContent = new Date().getFullYear();
  };

  // ========== SUPABASE LOADING ==========
  const loadSupabasePosts = async () => {
    const api = window.TaraSupabaseAPI;
    if (!api?.configured) return;

    try {
      const [newsResult, eventsResult] = await Promise.all([
        api.client.from('news').select('id, title, content, image_url, created_at').order('created_at', { ascending: false }),
        api.client.from('events').select('id, title, description, event_date, location').order('event_date', { ascending: true })
      ]);

      if (newsResult.error) throw newsResult.error;
      if (eventsResult.error) throw eventsResult.error;

      console.log('[supabase] News rows:', newsResult.data?.length);
      console.log('[supabase] Events rows:', eventsResult.data?.length);

      if (newsResult.data?.length) {
        allStories = newsResult.data.map(item => ({
          id: item.id,
          category: 'Tech',
          title: item.title,
          snippet: item.content,
          image: item.image_url || FALLBACK_IMAGE,
          time: new Date(item.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
        }));
        renderFilters();
        renderNews();
        renderHero();
        renderPopular();
      }

      if (eventsResult.data?.length) {
        events = eventsResult.data.map(item => {
          const d = new Date(item.event_date);
          return {
            month: d.toLocaleDateString(undefined, { month: 'short' }).toUpperCase(),
            day: String(d.getDate()).padStart(2, '0'),
            time: d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }),
            location: item.location,
            title: item.title,
            description: item.description
          };
        });
        console.log('[events] Processed:', events);
        renderEvents();
      } else {
        console.log('[events] No rows returned from Supabase');
        renderEvents();
      }
    } catch (error) {
      console.error('[supabase] Load error:', error);
    }
  };

  // ========== INIT ==========
  const initialize = () => {
    renderHero();
    renderFilters();
    renderNews();
    renderEvents();
    renderPopular();
    wireInteractions();
    wireEventInquiryModal();

    elements.closeNewsReader?.addEventListener('click', closeNewsReader);
    elements.newsReaderModal?.addEventListener('click', event => {
      if (event.target === elements.newsReaderModal) closeNewsReader();
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && elements.newsReaderModal && !elements.newsReaderModal.hidden) closeNewsReader();
    });

    window.lucide?.createIcons();
    loadSupabasePosts();
  };

  initialize();
})();