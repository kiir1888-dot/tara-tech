(() => {
  const postsContainer = document.getElementById('latestPosts');
  const emptyState = document.getElementById('latestPostsEmpty');
  const status = document.getElementById('latestPostsStatus');
  if (!postsContainer || !emptyState || !status) return;

  const api = window.TaraSupabaseAPI;

  const showEmptyState = () => {
    postsContainer.setAttribute('aria-busy', 'false');
    emptyState.hidden = false;
    window.lucide?.createIcons();
  };

  if (!api?.configured) {
    showEmptyState();
    return;
  }

  const createPostCard = post => {
    const article = document.createElement('article');
    article.className = 'reveal overflow-hidden rounded-lg border border-gray-200 bg-white shadow-card';

    if (post.image_url) {
      const image = document.createElement('img');
      image.className = 'h-52 w-full object-cover';
      image.src = post.image_url;
      image.alt = '';
      image.loading = 'lazy';
      image.decoding = 'async';
      article.append(image);
    }

    const body = document.createElement('div');
    body.className = 'p-6';
    const meta = document.createElement('p');
    meta.className = 'text-xs font-extrabold uppercase tracking-[0.14em] text-blue-600';
    const date = post.created_at ? new Date(post.created_at) : null;
    meta.textContent = `News${date ? ` · ${date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}` : ''}`;

    const heading = document.createElement('h3');
    heading.className = 'mt-3 text-xl font-extrabold';
    heading.textContent = post.title;

    const description = document.createElement('p');
    description.className = 'mt-3 text-sm leading-6 text-gray-600';
    description.textContent = post.content;

    body.append(meta, heading, description);
    article.append(body);
    return article;
  };

  const loadPosts = async () => {
    const { data, error } = await api.client
      .from('news')
      .select('id, title, slug, content, image_url, created_at')
      .order('created_at', { ascending: false })
      .limit(6);

    postsContainer.setAttribute('aria-busy', 'false');
    if (error) {
      status.textContent = 'Unable to load updates right now.';
      showEmptyState();
      return;
    }
    if (!data.length) {
      showEmptyState();
      return;
    }

    const fragment = document.createDocumentFragment();
    data.forEach(post => fragment.append(createPostCard(post)));
    postsContainer.replaceChildren(fragment);
    document.querySelectorAll('#latestPosts .reveal').forEach(element => element.classList.add('is-visible'));
  };

  loadPosts();
})();
