(() => {
  const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1200&q=85';
    const stories = [];

    const events = [];

  const elements = {
    heroGrid: document.getElementById('heroGrid'), newsGrid: document.getElementById('newsGrid'),
    filters: document.getElementById('categoryFilters'), eventsList: document.getElementById('eventsList'),
    popularList: document.getElementById('popularList'), noResults: document.getElementById('noResults'),
    searchSummary: document.getElementById('searchSummary'), themeToggle: document.getElementById('themeToggle'),
    menuButton: document.getElementById('menuButton'), mobileMenu: document.getElementById('mobileMenu'),
    headerSearch: document.getElementById('headerSearch'), mobileSearch: document.getElementById('mobileSearch'),
    newsletterForm: document.getElementById('newsletterForm'), newsletterStatus: document.getElementById('newsletterStatus'),
    toast: document.getElementById('toast')
  };

  let allStories = [...stories];
  let activeCategory = 'All';
  let searchTerm = '';
  let toastTimer;

  const createElement = (tag, className = '', text = '') => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text) element.textContent = text;
    return element;
  };

  const createBadge = (label, dark = false) => createElement(
    'span',
    `inline-flex w-fit rounded-md px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em] ${dark ? 'bg-white/15 text-white backdrop-blur' : 'bg-electric-50 text-electric-700 dark:bg-electric-500/10 dark:text-blue-300'}`,
    label
  );

  const createHeroCard = (story, prominent = false) => {
    const article = createElement('article', `story-card group relative min-h-0 overflow-hidden rounded-lg bg-slate-900 ${prominent ? 'h-[390px] lg:h-full' : 'h-[280px] lg:h-auto'}`);
    const image = createElement('img', 'absolute inset-0 h-full w-full object-cover');
    image.src = story.image || FALLBACK_IMAGE;
    image.alt = '';
    image.decoding = 'async';
    const overlay = createElement('div', 'absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent');
    const body = createElement('div', `absolute inset-x-0 bottom-0 p-5 text-white ${prominent ? 'sm:p-8' : 'sm:p-6'}`);
    body.append(createBadge(prominent ? 'Breaking News' : 'Trending', true));
    const heading = createElement('h2', `mt-3 font-display font-extrabold leading-tight ${prominent ? 'max-w-3xl text-2xl sm:text-4xl' : 'text-xl sm:text-2xl'}`, story.title);
    const meta = createElement('p', 'mt-3 text-xs font-semibold text-slate-300', `${story.category}  |  ${story.time}`);
    body.append(heading, meta);
    article.append(image, overlay, body);
    return article;
  };

    const renderHero = () => {
    const featured = allStories.find(story => story.featured) || allStories[0];
    const trending = allStories.filter(story => story.trending).slice(0, 2);
    if (!featured) {
      elements.heroGrid.replaceChildren();
      return;
    }
    const side = createElement('div', 'grid min-h-0 gap-4 sm:grid-cols-2 lg:grid-cols-1');
    trending.forEach(story => side.append(createHeroCard(story)));
    elements.heroGrid.replaceChildren(createHeroCard(featured, true), side);
  };

  const createNewsCard = story => {
    const article = createElement('article', 'story-card group overflow-hidden rounded-lg border border-slate-200 bg-white transition duration-300 hover:-translate-y-1 hover:border-electric-500 hover:shadow-lift dark:border-slate-800 dark:bg-slate-900');
    const imageWrap = createElement('div', 'h-48 overflow-hidden bg-slate-200 dark:bg-slate-800');
    const image = createElement('img', 'h-full w-full object-cover');
    image.src = story.image || FALLBACK_IMAGE;
    image.alt = '';
    image.loading = 'lazy';
    image.decoding = 'async';
    imageWrap.append(image);
    const body = createElement('div', 'p-5');
    const meta = createElement('div', 'flex items-center justify-between gap-3');
    meta.append(createBadge(story.category), createElement('time', 'text-xs font-semibold text-slate-400', story.time));
    const heading = createElement('h3', 'mt-4 line-clamp-2 font-display text-xl font-extrabold leading-snug transition group-hover:text-electric-600', story.title);
    const snippet = createElement('p', 'mt-3 line-clamp-3 text-sm leading-6 text-slate-500 dark:text-slate-400', story.snippet);
    body.append(meta, heading, snippet);
    article.append(imageWrap, body);
    return article;
  };

  const getFilteredStories = () => allStories.filter(story => {
    const categoryMatch = activeCategory === 'All' || story.category === activeCategory;
    const searchable = `${story.title} ${story.snippet} ${story.category}`.toLowerCase();
    return categoryMatch && searchable.includes(searchTerm.toLowerCase());
  });

  const renderNews = () => {
    const filtered = getFilteredStories();
    elements.newsGrid.replaceChildren(...filtered.map(createNewsCard));
    elements.noResults.hidden = filtered.length > 0;
    elements.searchSummary.textContent = searchTerm
      ? `${filtered.length} result${filtered.length === 1 ? '' : 's'} for “${searchTerm}”`
      : `${filtered.length} ${activeCategory === 'All' ? 'latest stories' : `${activeCategory} stories`}`;
    window.lucide?.createIcons();
  };

  const renderFilters = () => {
    const categories = ['All', ...new Set(allStories.map(story => story.category))];
    const buttons = categories.map(category => {
      const button = createElement('button', 'filter-button rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-bold transition hover:border-electric-500 hover:text-electric-600 dark:border-slate-700 dark:bg-slate-900', category);
      button.type = 'button';
      button.setAttribute('aria-pressed', String(category === activeCategory));
      button.addEventListener('click', () => {
        activeCategory = category;
        renderFilters();
        renderNews();
      });
      return button;
    });
    elements.filters.replaceChildren(...buttons);
  };

  const renderEvents = () => {
    const cards = events.map(event => {
      const article = createElement('article', 'grid gap-5 rounded-lg border border-slate-200 bg-white p-5 transition hover:border-emerald-500 hover:shadow-lift dark:border-slate-800 dark:bg-slate-900 sm:grid-cols-[76px_1fr_auto] sm:items-center');
      const date = createElement('div', 'grid h-[76px] w-[76px] place-items-center rounded-lg bg-slate-950 text-center text-white dark:bg-white dark:text-slate-950');
      const dateInner = createElement('div');
      dateInner.append(createElement('span', 'block text-[10px] font-bold tracking-[0.16em] text-emerald-400', event.month), createElement('strong', 'mt-0.5 block font-display text-2xl', event.day));
      date.append(dateInner);
      const details = createElement('div');
      details.append(createElement('p', 'text-xs font-bold text-emerald-600 dark:text-emerald-400', `${event.time}  |  ${event.location}`), createElement('h3', 'mt-2 font-display text-xl font-extrabold', event.title), createElement('p', 'mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400', event.description));
      const link = createElement('a', 'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-electric-600 px-5 text-sm font-bold text-white transition hover:bg-electric-700 sm:justify-self-end', 'Register Now');
      link.href = `mailto:tara.tech211@gmail.com?subject=${encodeURIComponent(`Registration: ${event.title}`)}&body=${encodeURIComponent(`Hello Tara Tech,\n\nI would like to register for ${event.title} on ${event.month} ${event.day}.\n\nName:\nPhone:\n`)}`;
      const icon = createElement('i', 'h-4 w-4');
      icon.setAttribute('data-lucide', 'arrow-up-right');
      link.append(icon);
      article.append(date, details, link);
      return article;
    });
    elements.eventsList.replaceChildren(...cards);
  };

  const renderPopular = () => {
    const popular = allStories.filter(story => story.popular).slice(0, 4);
    elements.popularList.replaceChildren(...popular.map((story, index) => {
      const item = createElement('li', 'grid grid-cols-[28px_1fr] gap-3 py-4 first:pt-0 last:pb-0');
      item.append(createElement('span', 'font-display text-lg font-extrabold text-electric-500', String(index + 1).padStart(2, '0')), createElement('p', 'text-sm font-bold leading-5', story.title));
      return item;
    }));
  };

  const showToast = message => {
    window.clearTimeout(toastTimer);
    elements.toast.textContent = message;
    elements.toast.hidden = false;
    toastTimer = window.setTimeout(() => { elements.toast.hidden = true; }, 3200);
  };

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
    document.getElementById('news').scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const wireInteractions = () => {
    let setMenuState = () => {};
    if (elements.themeToggle) {
      const savedTheme = localStorage.getItem('tara-news-theme');
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setTheme(savedTheme ? savedTheme === 'dark' : prefersDark);
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

    [document.getElementById('headerSearchForm'), document.getElementById('mobileSearchForm')].forEach(form => form?.addEventListener('submit', event => {
      event.preventDefault();
      applySearch(new FormData(event.currentTarget).get('query') || event.currentTarget.querySelector('input').value);
      setMenuState(false);
    }));
    elements.headerSearch?.addEventListener('input', event => { searchTerm = event.target.value.trim(); renderNews(); });
    elements.mobileSearch?.addEventListener('input', event => { searchTerm = event.target.value.trim(); renderNews(); });

    elements.newsletterForm.addEventListener('submit', event => {
      event.preventDefault();
      if (!elements.newsletterForm.reportValidity()) return;
      const email = document.getElementById('newsletterEmail').value.trim();
      localStorage.setItem('tara-newsletter-email', email);
      elements.newsletterStatus.textContent = 'You are on the list. Watch your inbox.';
      elements.newsletterForm.reset();
      showToast('Newsletter subscription saved');
    });
    const copyrightYear = document.getElementById('copyrightYear');
    if (copyrightYear) copyrightYear.textContent = new Date().getFullYear();
  };

  const loadSupabasePosts = async () => {
    const api = window.TaraSupabaseAPI;
    if (!api?.configured) return;
    try {
      const [newsResult, eventsResult] = await Promise.all([
        api.client.from('news').select('id, title, content, image_url, created_at').order('created_at', { ascending: false }),
        api.client.from('events').select('id, title, description, event_date, location').gte('event_date', new Date().toISOString()).order('event_date')
      ]);
      if (newsResult.error) throw newsResult.error;
      if (eventsResult.error) throw eventsResult.error;
      if (newsResult.data.length) {
        const liveStories = newsResult.data.map(item => ({
          id: item.id,
          category: 'Tech',
          title: item.title,
          snippet: item.content,
          image: item.image_url || FALLBACK_IMAGE,
          time: new Date(item.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
        }));
        allStories = [...liveStories, ...stories];
        renderFilters();
        renderNews();
        renderPopular();
      }
      if (eventsResult.data.length) {
        events.splice(0, events.length, ...eventsResult.data.map(item => {
          const eventDate = new Date(item.event_date);
          return {
            month: eventDate.toLocaleDateString(undefined, { month: 'short' }).toUpperCase(),
            day: String(eventDate.getDate()).padStart(2, '0'),
            time: eventDate.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }),
            location: item.location,
            title: item.title,
            description: item.description
          };
        }));
        renderEvents();
      }
    } catch (error) {
      console.error('Unable to load Supabase content:', error);
    }
  };

  const initialize = () => {
    renderHero();
    renderFilters();
    renderNews();
    renderEvents();
    renderPopular();
    wireInteractions();
    window.lucide?.createIcons();
    loadSupabasePosts();
  };

  initialize();
})();
