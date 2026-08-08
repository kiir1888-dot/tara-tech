(() => {
  const COMPANY_EMAIL = 'tara.tech211@gmail.com';
  const config = window.TARA_SUPABASE;
  const api = window.TaraSupabaseAPI;
  const configured = config
    && config.url.startsWith('https://')
    && !config.url.includes('YOUR_')
    && config.anonKey
    && !config.anonKey.includes('YOUR_');

  const loginView = document.getElementById('loginView');
  const recoveryView = document.getElementById('recoveryView');
  const dashboardView = document.getElementById('dashboardView');
  const loginForm = document.getElementById('loginForm');
  const loginStatus = document.getElementById('loginStatus');
  const recoveryForm = document.getElementById('recoveryForm');
  const recoveryStatus = document.getElementById('recoveryStatus');
  const postForm = document.getElementById('postForm');
  const editorStatus = document.getElementById('editorStatus');
  const postsStatus = document.getElementById('postsStatus');
  const postsList = document.getElementById('postsList');
  const postCount = document.getElementById('postCount');
  const imageInput = document.getElementById('imageInput');
  const imagePreview = document.getElementById('imagePreview');
  const imageEmpty = document.getElementById('imageEmpty');
  const imageStatus = document.getElementById('imageStatus');
  const removeImageButton = document.getElementById('removeImageButton');
  const newPostButton = document.getElementById('newPostButton');
  const allowedImageTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
  let client;
  let currentUser;
  let posts = [];
  let previewUrl = '';
  let slugEdited = false;
  const recoveryRequested = window.location.hash.includes('type=recovery');

  const getAdminRedirectUrl = () => {
    if (!['http:', 'https:'].includes(window.location.protocol)) return '';
    return new URL('admin.html', window.location.href).href;
  };

  const setVisible = (element, visible, displayClass = 'inline-flex') => {
    element.classList.toggle('hidden', !visible);
    element.classList.toggle(displayClass, visible);
  };

  const slugify = value => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  const clearPreviewUrl = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = '';
  };

  const showImage = (source, message = '') => {
    imagePreview.src = source;
    imagePreview.hidden = false;
    imageEmpty.hidden = true;
    setVisible(removeImageButton, true);
    imageStatus.textContent = message;
  };

  const clearImage = ({ clearStored = true } = {}) => {
    clearPreviewUrl();
    imageInput.value = '';
    imagePreview.removeAttribute('src');
    imagePreview.hidden = true;
    imageEmpty.hidden = false;
    setVisible(removeImageButton, false);
    if (clearStored) {
      document.getElementById('existingImageUrl').value = '';
      document.getElementById('existingImagePath').value = '';
    }
  };

  const resetEditor = () => {
    postForm.reset();
    document.getElementById('postId').value = '';
    document.getElementById('existingImageUrl').value = '';
    document.getElementById('existingImagePath').value = '';
    document.getElementById('editorTitle').textContent = 'Create post';
    editorStatus.textContent = '';
    imageStatus.textContent = '';
    slugEdited = false;
    clearImage();
    setVisible(newPostButton, false);
  };

  const showLogin = message => {
    dashboardView.hidden = true;
    recoveryView.hidden = true;
    loginView.hidden = false;
    loginStatus.textContent = message || '';
    window.lucide?.createIcons();
  };

  const showDashboard = async user => {
    currentUser = user;
    loginView.hidden = true;
    recoveryView.hidden = true;
    dashboardView.hidden = false;
    window.lucide?.createIcons();
    resetEditor();
    await loadPosts();
  };

  const verifyAdmin = async () => {
    try {
      return await api.checkAdminStatus();
    } catch (error) {
      console.error(error);
      return false;
    }
  };

  const requireAdmin = async user => {
    if (user?.email?.toLowerCase() === COMPANY_EMAIL && await verifyAdmin(user)) {
      await showDashboard(user);
      return;
    }
    if (user) await client.auth.signOut();
    showLogin(user ? 'This account is not authorized for the dashboard.' : '');
  };

  const createPostListItem = post => {
    const item = document.createElement('article');
    item.className = 'rounded-lg border border-gray-200 p-4';
    const meta = document.createElement('p');
    meta.className = 'text-xs font-extrabold uppercase tracking-[0.12em] text-blue-600';
    meta.textContent = `${post.kind} · ${post.status}`;
    const title = document.createElement('h3');
    title.className = 'mt-2 font-extrabold';
    title.textContent = post.title;
    const updated = document.createElement('p');
    updated.className = 'mt-2 text-xs text-gray-500';
    updated.textContent = `Updated ${new Date(post.updated_at).toLocaleString()}`;
    const actions = document.createElement('div');
    actions.className = 'mt-4 flex gap-2';
    const editButton = document.createElement('button');
    editButton.className = 'rounded-lg border border-gray-300 px-3 py-2 text-xs font-bold hover:bg-gray-50';
    editButton.type = 'button';
    editButton.textContent = 'Edit';
    editButton.addEventListener('click', () => editPost(post.id));
    const deleteButton = document.createElement('button');
    deleteButton.className = 'rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-50';
    deleteButton.type = 'button';
    deleteButton.textContent = 'Delete';
    deleteButton.addEventListener('click', () => deletePost(post.id));
    actions.append(editButton, deleteButton);
    item.append(meta, title, updated, actions);
    return item;
  };

  const renderPosts = () => {
    const fragment = document.createDocumentFragment();
    posts.forEach(post => fragment.append(createPostListItem(post)));
    postsList.replaceChildren(fragment);
    postCount.textContent = String(posts.length);
    postsStatus.textContent = posts.length ? '' : 'No posts yet.';
  };

  const loadPosts = async () => {
    postsStatus.textContent = 'Loading posts...';
    try {
      const [newsResult, eventsResult] = await Promise.all([
        client.from('news').select('*').order('created_at', { ascending: false }),
        client.from('events').select('*').order('event_date', { ascending: false })
      ]);
      if (newsResult.error) throw newsResult.error;
      if (eventsResult.error) throw eventsResult.error;
      const newsPosts = newsResult.data.map(item => ({
        ...item, kind: 'News', status: 'published', description: item.content.slice(0, 320),
        published_at: item.created_at, updated_at: item.created_at
      }));
      const eventPosts = eventsResult.data.map(item => ({
        ...item, kind: 'Event', status: 'published', slug: '', content: item.location,
        published_at: item.event_date, updated_at: item.created_at
      }));
      posts = [...newsPosts, ...eventPosts].sort((left, right) => new Date(right.updated_at) - new Date(left.updated_at));
      renderPosts();
    } catch (error) {
      postsStatus.textContent = error.message || 'Unable to load content.';
      return;
    }
  };

  const editPost = id => {
    const post = posts.find(item => item.id === id);
    if (!post) return;
    document.getElementById('postId').value = post.id;
    document.getElementById('postKind').value = post.kind;
    document.getElementById('postStatus').value = post.status;
    document.getElementById('postTitle').value = post.title;
    document.getElementById('postSlug').value = post.slug || slugify(post.title);
    document.getElementById('postDescription').value = post.description;
    document.getElementById('postContent').value = post.content;
    document.getElementById('publishedAt').value = post.published_at ? new Date(post.published_at).toISOString().slice(0, 16) : '';
    document.getElementById('existingImageUrl').value = post.image_url || '';
    document.getElementById('existingImagePath').value = '';
    document.getElementById('editorTitle').textContent = 'Edit post';
    slugEdited = true;
    clearImage({ clearStored: false });
    if (post.image_url) showImage(post.image_url, 'Current featured image.');
    setVisible(newPostButton, true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deletePost = async id => {
    const post = posts.find(item => item.id === id);
    if (!post || !window.confirm(`Delete “${post.title}”? This cannot be undone.`)) return;
    postsStatus.textContent = 'Deleting post...';
    try {
      if (post.kind === 'News') await api.deleteNews(id);
      else await api.deleteEvent(id);
    } catch (error) {
      postsStatus.textContent = error.message || 'Unable to delete content.';
      return;
    }
    if (document.getElementById('postId').value === id) resetEditor();
    await loadPosts();
  };

  loginForm.addEventListener('submit', async event => {
    event.preventDefault();
    if (!configured || !window.supabase) {
      loginStatus.textContent = 'Configure supabase-config.js before signing in.';
      return;
    }
    loginStatus.textContent = 'Signing in...';
    try {
      const user = await api.adminLogin(COMPANY_EMAIL, document.getElementById('loginPassword').value);
      await requireAdmin(user);
    } catch (error) {
      loginStatus.textContent = 'Sign-in failed. Check your credentials.';
    }
  });

  document.getElementById('createPasswordButton').addEventListener('click', async () => {
    if (!configured || !window.supabase) {
      loginStatus.textContent = 'Configure supabase-config.js before creating a password.';
      return;
    }
    const password = document.getElementById('loginPassword').value;
    if (password.length < 8) {
      loginStatus.textContent = 'Enter a password with at least 8 characters.';
      return;
    }
    const redirectUrl = getAdminRedirectUrl();
    if (!redirectUrl) {
      loginStatus.textContent = 'Open this dashboard from an HTTPS website or localhost to create a password.';
      return;
    }
    loginStatus.textContent = 'Creating the company account...';
    const { data, error } = await client.auth.signUp({
      email: COMPANY_EMAIL,
      password,
      options: { emailRedirectTo: redirectUrl }
    });
    if (error) {
      loginStatus.textContent = error.message;
      return;
    }
    loginStatus.textContent = data.session
      ? 'Password created. Set this user\'s profile role to admin to enable dashboard access.'
      : 'Check the company email and confirm the account, then set its profile role to admin.';
  });

  document.getElementById('forgotPasswordButton').addEventListener('click', async () => {
    if (!configured || !window.supabase) {
      loginStatus.textContent = 'Configure supabase-config.js before resetting the password.';
      return;
    }
    const redirectUrl = getAdminRedirectUrl();
    if (!redirectUrl) {
      loginStatus.textContent = 'Open this dashboard from an HTTPS website or localhost to reset the password.';
      return;
    }
    loginStatus.textContent = 'Sending a password reset email...';
    const { error } = await client.auth.resetPasswordForEmail(COMPANY_EMAIL, {
      redirectTo: redirectUrl
    });
    loginStatus.textContent = error ? error.message : 'Check the company inbox for the password reset link.';
  });

  recoveryForm.addEventListener('submit', async event => {
    event.preventDefault();
    const password = document.getElementById('newPassword').value;
    const confirmation = document.getElementById('confirmPassword').value;
    if (password !== confirmation) {
      recoveryStatus.textContent = 'The passwords do not match.';
      return;
    }
    recoveryStatus.textContent = 'Updating password...';
    const { data: sessionData } = await client.auth.getSession();
    if (!sessionData.session) {
      recoveryStatus.textContent = 'This recovery link is invalid or expired. Request a new password reset email.';
      return;
    }
    const { data, error } = await client.auth.updateUser({ password });
    if (error) {
      recoveryStatus.textContent = error.message;
      return;
    }
    recoveryForm.reset();
    recoveryStatus.textContent = 'Password updated.';
    await requireAdmin(data.user);
  });

  document.getElementById('signOutButton').addEventListener('click', async () => {
    await client.auth.signOut();
    postForm.reset();
    showLogin('Signed out.');
  });

  document.getElementById('postTitle').addEventListener('input', event => {
    if (!slugEdited) document.getElementById('postSlug').value = slugify(event.target.value);
  });
  document.getElementById('postSlug').addEventListener('input', event => {
    slugEdited = true;
    event.target.value = slugify(event.target.value);
  });

  imageInput.addEventListener('change', () => {
    const file = imageInput.files[0];
    if (!file) return;
    if (!allowedImageTypes.has(file.type)) {
      imageInput.value = '';
      imageStatus.textContent = 'Choose a JPG, PNG, WebP or GIF image.';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      imageInput.value = '';
      imageStatus.textContent = 'Choose an image smaller than 5 MB.';
      return;
    }
    clearPreviewUrl();
    previewUrl = URL.createObjectURL(file);
    showImage(previewUrl, `${file.name} selected.`);
  });

  removeImageButton.addEventListener('click', () => {
    clearImage();
    imageStatus.textContent = 'Featured image removed.';
  });

  newPostButton.addEventListener('click', resetEditor);

  postForm.addEventListener('submit', async event => {
    event.preventDefault();
    if (!postForm.reportValidity()) return;
    editorStatus.textContent = 'Saving post...';
    const id = document.getElementById('postId').value;
    try {
      const file = imageInput.files[0];
      const dateValue = document.getElementById('publishedAt').value;
      const kind = document.getElementById('postKind').value;
      const title = document.getElementById('postTitle').value.trim();
      const description = document.getElementById('postDescription').value.trim();
      const content = document.getElementById('postContent').value.trim();
      if (kind === 'News') {
        if (id) await api.updateNews(id, title, content, file);
        else await api.postNews(title, content, file);
      } else {
        const details = { title, description, date: dateValue || new Date().toISOString(), location: content };
        if (id) await api.updateEvent(id, details, file);
        else await api.createEvent(title, description, details.date, content, file);
      }
      resetEditor();
      editorStatus.textContent = 'Post saved.';
      await loadPosts();
    } catch (error) {
      editorStatus.textContent = error.message || 'Unable to save the post.';
    }
  });

  window.addEventListener('pagehide', clearPreviewUrl, { once: true });

  const initialize = async () => {
    window.lucide?.createIcons();
    if (!configured || !window.supabase) {
      showLogin('Configure supabase-config.js before signing in.');
      return;
    }
    client = api.client;
    client.auth.onAuthStateChange(event => {
      if (event !== 'PASSWORD_RECOVERY') return;
      loginView.hidden = true;
      dashboardView.hidden = true;
      recoveryView.hidden = false;
      recoveryStatus.textContent = '';
      window.lucide?.createIcons();
    });
    const { data } = await client.auth.getSession();
    if (recoveryRequested) {
      if (!data.session) {
        showLogin('This recovery link is invalid or expired. Request a new password reset email.');
        return;
      }
      loginView.hidden = true;
      dashboardView.hidden = true;
      recoveryView.hidden = false;
      window.lucide?.createIcons();
      return;
    }
    await requireAdmin(data.session?.user);
  };

  initialize();
})();
